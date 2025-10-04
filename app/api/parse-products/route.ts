import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';

interface ProductItem {
  name: string;
  price: number;
  quantity: number;
  currency?: string;
}

interface ParsedProductList {
  products: ProductItem[];
  totalItems: number;
  totalValue: number;
  rawText: string;
  confidence: number;
}

async function parseFileToText(buffer: Buffer, fileType: string): Promise<string> {
  try {
    let workbook;
    
    if (fileType === 'text/csv') {
      const csvData = buffer.toString('utf-8');
      workbook = XLSX.read(csvData, { 
        type: 'string',
        raw: false,
      });
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      workbook = XLSX.read(buffer, { 
        type: 'buffer',
        raw: false,
      });
    } else {
      // For PDF or other text-based files
      return buffer.toString('utf-8');
    }

    let allText = '';
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false
      });
      
      allText += `\n=== Sheet: ${sheetName} ===\n`;
      for (const row of sheetData) {
        if (row && Array.isArray(row) && row.length > 0) {
          const rowText = row.map(cell => String(cell || '').trim()).join(' | ');
          if (rowText.trim()) {
            allText += rowText + '\n';
          }
        }
      }
    }
    
    return allText;
  } catch (error) {
    throw new Error(`Failed to convert file to text: ${error}`);
  }
}

async function parseProductsWithAI(text: string): Promise<ParsedProductList> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not found, using fallback parsing...');
      return fallbackParsing(text);
    }

    const prompt = `
You are a product data extraction expert. Extract product information from the following text and return it in a structured JSON format.

Expected format for each product:
Product Name - Price USD - Quantity Pieces

For example:
Metal Thermos - 100 USD - 7 Pieces
Chargers - 100 USD - 30 Pieces

Please analyze the text and extract all products with their names, prices, and quantities. Return your response as a JSON object with the following structure:

{
  "products": [
    {
      "name": "string (product name)",
      "price": number (unit price in USD or detected currency),
      "quantity": number (quantity/pieces),
      "currency": "string (currency code like USD, EUR, etc.)"
    }
  ],
  "confidence": number (0-100, how confident you are in the extraction)
}

Text to analyze:
${text}

Instructions:
1. Extract all products with their names, prices, and quantities
2. If price is not explicitly stated, try to infer it from context
3. If quantity is not stated, set it to 1
4. Detect the currency from the text (USD, EUR, etc.)
5. Return only valid JSON, no additional text
6. Be flexible with formats - prices might be written as "$100", "100 USD", "100.00", etc.
7. Quantities might be written as "7 pieces", "7 units", "qty: 7", etc.

Please analyze the data and return the JSON response:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a product data extraction expert. Extract product names, prices, and quantities from text and return them in structured JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const products = (parsed.products || []).map((p: any) => ({
      name: String(p.name || 'Unknown Product'),
      price: parseFloat(p.price) || 0,
      quantity: parseInt(p.quantity) || 1,
      currency: String(p.currency || 'USD')
    }));

    const totalItems = products.reduce((sum: number, p: ProductItem) => sum + p.quantity, 0);
    const totalValue = products.reduce((sum: number, p: ProductItem) => sum + (p.price * p.quantity), 0);

    return {
      products,
      totalItems,
      totalValue,
      rawText: text,
      confidence: Math.min(Math.max(parsed.confidence || 0, 0), 100)
    };
  } catch (error) {
    console.error('AI parsing error:', error);
    console.log('Falling back to rule-based parsing...');
    return fallbackParsing(text);
  }
}

function fallbackParsing(text: string): ParsedProductList {
  const products: ProductItem[] = [];
  const lines = text.split('\n');

  const parsePrice = (str: string): number => {
    const match = str.match(/[\$€£¥]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
  };

  const parseQuantity = (str: string): number => {
    const match = str.match(/(\d+)\s*(?:pieces?|units?|pcs?|qty|quantity)?/i);
    if (match) {
      return parseInt(match[1]);
    }
    return 1;
  };

  const detectCurrency = (str: string): string => {
    if (str.includes('$') || str.toUpperCase().includes('USD')) return 'USD';
    if (str.includes('€') || str.toUpperCase().includes('EUR')) return 'EUR';
    if (str.includes('£') || str.toUpperCase().includes('GBP')) return 'GBP';
    if (str.includes('¥') || str.toUpperCase().includes('JPY')) return 'JPY';
    return 'USD';
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 3) continue;

    // Try to parse lines in various formats
    // Format 1: "Product Name - Price - Quantity"
    const format1 = trimmedLine.match(/^(.+?)\s*[-–—]\s*(.+?)\s*[-–—]\s*(.+?)$/);
    if (format1) {
      const [, name, priceStr, qtyStr] = format1;
      const price = parsePrice(priceStr);
      const quantity = parseQuantity(qtyStr);
      const currency = detectCurrency(priceStr);
      
      if (name && price > 0) {
        products.push({ name: name.trim(), price, quantity, currency });
        continue;
      }
    }

    // Format 2: Look for price and quantity patterns in the line
    const hasPrice = /[\$€£¥]\s*\d+|\d+\s*(?:USD|EUR|GBP|JPY)/i.test(trimmedLine);
    const hasQuantity = /\d+\s*(?:pieces?|units?|pcs?|qty)/i.test(trimmedLine);
    
    if (hasPrice || hasQuantity) {
      const price = parsePrice(trimmedLine);
      const quantity = parseQuantity(trimmedLine);
      const currency = detectCurrency(trimmedLine);
      
      // Extract product name (text before price/quantity indicators)
      let name = trimmedLine
        .replace(/[\$€£¥]\s*\d+(?:,\d{3})*(?:\.\d{2})?/g, '')
        .replace(/\d+\s*(?:USD|EUR|GBP|JPY)/gi, '')
        .replace(/\d+\s*(?:pieces?|units?|pcs?|qty|quantity)/gi, '')
        .replace(/[-–—]/g, '')
        .trim();
      
      if (name && name.length > 2 && (price > 0 || quantity > 0)) {
        products.push({ 
          name, 
          price: price || 0, 
          quantity: quantity || 1, 
          currency 
        });
      }
    }
  }

  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  return {
    products,
    totalItems,
    totalValue,
    rawText: text,
    confidence: products.length > 0 ? 60 : 0
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain'
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only PDF, Excel (.xlsx, .xls), CSV, and text files are supported' 
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const text = await parseFileToText(buffer, file.type);
    const parsedData = await parseProductsWithAI(text);

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { error: `Failed to parse file: ${error}` }, 
      { status: 500 }
    );
  }
}
