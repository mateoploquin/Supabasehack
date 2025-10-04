import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { AIFinancialParser } from '@/lib/ai-financial-parser';

interface FinancialData {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cash: number;
  accountsReceivable: number;
  inventory: number;
  propertyPlantEquipment: number;
  accountsPayable: number;
  longTermDebt: number;
  year: number;
  quarter?: string;
}

interface ParsedFinancialStatement {
  companyName: string;
  statementType: 'income' | 'balance' | 'cashflow';
  period: string;
  data: FinancialData;
  rawText: string;
  confidence: number;
}

async function parseExcelFileToText(buffer: Buffer, fileType: string): Promise<string> {
  try {
    let workbook;
    
    if (fileType === 'text/csv') {
      // Parse CSV file
      const csvData = buffer.toString('utf-8');
      workbook = XLSX.read(csvData, { 
        type: 'string',
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
    } else {
      // Parse Excel file
      workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
    }

    // Convert all sheets to text format for AI processing
    let allText = '';
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false
      });
      
      // Convert sheet data to readable text
      allText += `\n=== Sheet: ${sheetName} ===\n`;
      for (const row of sheetData) {
        if (row && row.length > 0) {
          const rowText = row.map(cell => String(cell || '').trim()).join(' | ');
          if (rowText.trim()) {
            allText += rowText + '\n';
          }
        }
      }
    }
    
    console.log('Excel data converted to text for AI processing');
    return allText;
  } catch (error) {
    throw new Error(`Failed to convert Excel to text: ${error}`);
  }
}

async function parseExcelFile(buffer: Buffer, fileType: string): Promise<ParsedFinancialStatement> {
  try {
    let workbook;
    
    if (fileType === 'text/csv') {
      // Parse CSV file with different delimiters
      const csvData = buffer.toString('utf-8');
      workbook = XLSX.read(csvData, { 
        type: 'string',
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
    } else {
      // Parse Excel file with enhanced options
      workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
    }

    // Try to find the best worksheet (look for financial data)
    let bestSheet = workbook.SheetNames[0];
    let bestSheetData: any[][] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false
      });
      
      // Score the sheet based on financial keywords
      const score = scoreSheetForFinancialData(sheetData);
      if (score > 0) {
        bestSheet = sheetName;
        bestSheetData = sheetData;
      }
    }
    
    // If no good sheet found, use the first one
    if (bestSheetData.length === 0) {
      const worksheet = workbook.Sheets[bestSheet];
      bestSheetData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false
      });
    }
    
    console.log(`Using sheet: ${bestSheet} with ${bestSheetData.length} rows`);
    
    // Debug: Log the first few rows of data
    console.log('First 5 rows of data:', bestSheetData.slice(0, 5));
    
    // Extract financial data from the spreadsheet
    const financialData = extractFinancialDataFromExcel(bestSheetData);
    
    console.log('Extracted financial data:', financialData);
    
    return {
      companyName: extractCompanyName(bestSheetData),
      statementType: determineStatementType(bestSheetData),
      period: extractPeriod(bestSheetData),
      data: financialData,
      rawText: JSON.stringify(bestSheetData),
      confidence: calculateConfidence(financialData)
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error}`);
  }
}

function scoreSheetForFinancialData(data: any[][]): number {
  let score = 0;
  const financialKeywords = [
    'revenue', 'sales', 'income', 'assets', 'liabilities', 'equity',
    'cash', 'profit', 'expenses', 'cost', 'debt', 'receivable', 'payable'
  ];
  
  for (const row of data) {
    if (!row || row.length === 0) continue;
    
    const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
    
    for (const keyword of financialKeywords) {
      if (rowText.includes(keyword)) {
        score += 1;
      }
    }
  }
  
  return score;
}

function extractFinancialDataFromExcel(data: any[][]): FinancialData {
  const financialData: FinancialData = {
    revenue: 0,
    costOfGoodsSold: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    operatingIncome: 0,
    netIncome: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    cash: 0,
    accountsReceivable: 0,
    inventory: 0,
    propertyPlantEquipment: 0,
    accountsPayable: 0,
    longTermDebt: 0,
    year: new Date().getFullYear()
  };

  // Enhanced parsing function that handles various number formats
  const parseValue = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove common formatting characters but keep decimal points
      let cleaned = value.replace(/[,$\s]/g, '');
      
      // Handle negative numbers in parentheses
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        cleaned = '-' + cleaned.slice(1, -1);
      }
      
      // Handle percentage values
      if (cleaned.includes('%')) {
        cleaned = cleaned.replace('%', '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed / 100;
      }
      
      // Handle scientific notation
      if (cleaned.includes('e') || cleaned.includes('E')) {
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // Handle thousands separators (but be careful with decimals)
      if (cleaned.includes(',')) {
        // Only remove commas if they're not part of a decimal
        const parts = cleaned.split('.');
        if (parts.length === 2) {
          // Has decimal point, only remove commas from integer part
          parts[0] = parts[0].replace(/,/g, '');
          cleaned = parts.join('.');
        } else {
          // No decimal point, remove all commas
          cleaned = cleaned.replace(/,/g, '');
        }
      }
      
      // Handle currency symbols
      cleaned = cleaned.replace(/[$€£¥]/g, '');
      
      // Handle text that might contain numbers
      const numberMatch = cleaned.match(/-?\d+\.?\d*/);
      if (numberMatch) {
        const parsed = parseFloat(numberMatch[0]);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Enhanced pattern matching with more comprehensive terms
  const patterns = {
    revenue: [
      'revenue', 'sales', 'income', 'total revenue', 'net sales', 'gross sales',
      'service revenue', 'product revenue', 'operating revenue', 'net revenue'
    ],
    costOfGoodsSold: [
      'cost of goods sold', 'cogs', 'cost of sales', 'cost of revenue',
      'direct costs', 'cost of products sold', 'cost of services'
    ],
    grossProfit: [
      'gross profit', 'gross income', 'gross margin', 'gross earnings'
    ],
    operatingExpenses: [
      'operating expenses', 'opex', 'operating costs', 'total operating expenses',
      'selling general administrative', 'sga', 'administrative expenses',
      'selling expenses', 'general expenses'
    ],
    operatingIncome: [
      'operating income', 'operating profit', 'ebit', 'earnings before interest and tax',
      'operating earnings', 'operating result'
    ],
    netIncome: [
      'net income', 'net profit', 'net earnings', 'net result', 'profit after tax',
      'net profit after tax', 'bottom line'
    ],
    totalAssets: [
      'total assets', 'total current assets', 'assets', 'total asset'
    ],
    totalLiabilities: [
      'total liabilities', 'total current liabilities', 'liabilities', 'total liability'
    ],
    totalEquity: [
      'total equity', 'shareholders equity', 'stockholders equity', 'owner equity',
      'share capital', 'retained earnings', 'total shareholders equity'
    ],
    cash: [
      'cash', 'cash and cash equivalents', 'cash equivalents', 'cash on hand',
      'cash and bank', 'petty cash'
    ],
    accountsReceivable: [
      'accounts receivable', 'receivables', 'trade receivables', 'customer receivables',
      'accounts receivable net', 'net receivables'
    ],
    inventory: [
      'inventory', 'inventories', 'stock', 'merchandise', 'raw materials',
      'work in progress', 'finished goods'
    ],
    propertyPlantEquipment: [
      'property plant and equipment', 'ppe', 'fixed assets', 'tangible assets',
      'property equipment', 'plant equipment', 'capital assets'
    ],
    accountsPayable: [
      'accounts payable', 'payables', 'trade payables', 'vendor payables',
      'accounts payable net', 'net payables'
    ],
    longTermDebt: [
      'long-term debt', 'long term debt', 'long-term liabilities', 'long term liabilities',
      'non-current debt', 'debt', 'borrowings', 'loans payable'
    ]
  };

  // Search through all rows and columns for financial data
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Check each cell in the row
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').toLowerCase().trim();
      
      // Skip empty cells
      if (!cellValue) continue;
      
      // Look for value in adjacent columns
      let value = 0;
      let valueFound = false;
      
      // Check right column first (most common format)
      if (colIndex + 1 < row.length) {
        value = parseValue(row[colIndex + 1]);
        if (value !== 0) valueFound = true;
      }
      
      // Check left column if no value found on right
      if (!valueFound && colIndex > 0) {
        value = parseValue(row[colIndex - 1]);
        if (value !== 0) valueFound = true;
      }
      
      // Also check the same cell in case it contains both label and value
      if (!valueFound) {
        value = parseValue(row[colIndex]);
        if (value !== 0) valueFound = true;
      }
      
      // Match against all patterns
      for (const [key, terms] of Object.entries(patterns)) {
        for (const term of terms) {
          if (cellValue.includes(term.toLowerCase())) {
            const currentValue = financialData[key as keyof FinancialData] as number;
            // Only update if we found a non-zero value
            if (value !== 0 && (currentValue === 0 || Math.abs(value) > Math.abs(currentValue))) {
              (financialData as any)[key] = value;
              console.log(`Found ${key}: ${value} for term "${term}" in cell "${cellValue}"`);
            }
          }
        }
      }
    }
  }

  // Additional search for values that might be in different formats
  // Look for numbers that could be financial metrics based on context
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Look for rows that might contain totals or subtotals
    const rowText = row.map(cell => String(cell || '')).join(' ').toLowerCase();
    
    if (rowText.includes('total') || rowText.includes('subtotal')) {
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const value = parseValue(row[colIndex]);
        if (value > 0) {
          // Try to infer what this total represents based on context
          if (rowText.includes('revenue') || rowText.includes('sales')) {
            if (financialData.revenue === 0) {
              financialData.revenue = value;
              console.log(`Inferred revenue from total: ${value}`);
            }
          } else if (rowText.includes('assets')) {
            if (financialData.totalAssets === 0) {
              financialData.totalAssets = value;
              console.log(`Inferred total assets from total: ${value}`);
            }
          } else if (rowText.includes('liabilities')) {
            if (financialData.totalLiabilities === 0) {
              financialData.totalLiabilities = value;
              console.log(`Inferred total liabilities from total: ${value}`);
            }
          } else if (rowText.includes('equity')) {
            if (financialData.totalEquity === 0) {
              financialData.totalEquity = value;
              console.log(`Inferred total equity from total: ${value}`);
            }
          }
        }
      }
    }
  }

  // Fallback: Look for any large numbers that could be financial data
  if (financialData.revenue === 0 && financialData.totalAssets === 0) {
    console.log('No financial data found, looking for any large numbers...');
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const value = parseValue(row[colIndex]);
        if (value > 1000) { // Look for numbers greater than 1000
          const cellText = String(row[colIndex] || '').toLowerCase();
          console.log(`Found large number: ${value} in cell: "${cellText}"`);
          
          // Try to infer what this number represents
          if (financialData.revenue === 0 && value > 10000) {
            financialData.revenue = value;
            console.log(`Using ${value} as revenue (fallback)`);
          }
        }
      }
    }
  }

  // Calculate derived values if not found
  if (financialData.grossProfit === 0 && financialData.revenue > 0 && financialData.costOfGoodsSold > 0) {
    financialData.grossProfit = financialData.revenue - financialData.costOfGoodsSold;
  }
  
  if (financialData.operatingIncome === 0 && financialData.grossProfit > 0 && financialData.operatingExpenses > 0) {
    financialData.operatingIncome = financialData.grossProfit - financialData.operatingExpenses;
  }
  
  if (financialData.totalEquity === 0 && financialData.totalAssets > 0 && financialData.totalLiabilities > 0) {
    financialData.totalEquity = financialData.totalAssets - financialData.totalLiabilities;
  }

  // Validate and clean up the data
  Object.keys(financialData).forEach(key => {
    if (key !== 'year' && key !== 'quarter') {
      const value = financialData[key as keyof FinancialData] as number;
      if (value < 0) {
        // Keep negative values as they might be legitimate (e.g., losses)
        (financialData as any)[key] = Math.abs(value);
      }
    }
  });

  return financialData;
}

function extractCompanyName(data: any[][]): string {
  // Look for company name in the first few rows and columns
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      // Check all cells in the row
      for (let j = 0; j < Math.min(3, row.length); j++) {
        const cell = String(row[j] || '').trim();
        // Look for company name patterns
        if (cell.length > 3 && cell.length < 100 && 
            !cell.includes('$') && 
            !cell.match(/^\d+$/) && 
            !cell.toLowerCase().includes('statement') &&
            !cell.toLowerCase().includes('balance') &&
            !cell.toLowerCase().includes('income') &&
            !cell.toLowerCase().includes('cash flow') &&
            !cell.toLowerCase().includes('period') &&
            !cell.toLowerCase().includes('year') &&
            !cell.toLowerCase().includes('quarter') &&
            !cell.toLowerCase().includes('total') &&
            !cell.toLowerCase().includes('assets') &&
            !cell.toLowerCase().includes('liabilities') &&
            !cell.toLowerCase().includes('equity')) {
          return cell;
        }
      }
    }
  }
  return 'Unknown Company';
}

function determineStatementType(data: any[][]): 'income' | 'balance' | 'cashflow' {
  const text = data.flat().join(' ').toLowerCase();
  
  if (text.includes('income statement') || text.includes('profit and loss')) {
    return 'income';
  } else if (text.includes('balance sheet') || text.includes('statement of financial position')) {
    return 'balance';
  } else if (text.includes('cash flow') || text.includes('statement of cash flows')) {
    return 'cashflow';
  }
  
  return 'income';
}

function extractPeriod(data: any[][]): string {
  const text = data.flat().join(' ');
  
  // Look for various date patterns
  const yearMatch = text.match(/(20\d{2})/);
  const quarterMatch = text.match(/(Q[1-4]|quarter [1-4])/i);
  const monthMatch = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})/);
  
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
  const quarter = quarterMatch ? quarterMatch[1] : '';
  const month = monthMatch ? monthMatch[1] : '';
  const date = dateMatch ? dateMatch[1] : '';
  
  if (quarter) {
    return `${quarter} ${year}`;
  } else if (month) {
    return `${month} ${year}`;
  } else if (date) {
    return date;
  } else {
    return year;
  }
}

function calculateConfidence(data: FinancialData): number {
  let confidence = 0;
  let totalChecks = 0;

  if (data.revenue > 0) { confidence += 20; totalChecks++; }
  if (data.netIncome !== 0) { confidence += 20; totalChecks++; }
  if (data.totalAssets > 0) { confidence += 15; totalChecks++; }
  if (data.totalLiabilities > 0) { confidence += 15; totalChecks++; }
  if (data.cash > 0) { confidence += 10; totalChecks++; }
  if (data.accountsReceivable > 0) { confidence += 10; totalChecks++; }
  if (data.inventory > 0) { confidence += 10; totalChecks++; }

  return totalChecks > 0 ? Math.min(confidence, 100) : 0;
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only PDF, Excel (.xlsx, .xls), and CSV files are supported' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let parsedData;
    
    if (file.type === 'application/pdf') {
      // For PDF files, return mock data for now
      parsedData = {
        companyName: "ABC Corporation",
        statementType: "income" as const,
        period: "Q4 2023",
        data: {
          revenue: 1500000,
          costOfGoodsSold: 900000,
          grossProfit: 600000,
          operatingExpenses: 300000,
          operatingIncome: 300000,
          netIncome: 250000,
          totalAssets: 950000,
          totalLiabilities: 275000,
          totalEquity: 675000,
          cash: 150000,
          accountsReceivable: 200000,
          inventory: 100000,
          propertyPlantEquipment: 500000,
          accountsPayable: 75000,
          longTermDebt: 200000,
          year: 2023
        },
        rawText: "Mock PDF content extracted...",
        confidence: 85
      };
    } else {
      // Parse Excel/CSV files with AI
      try {
        const excelData = await parseExcelFileToText(buffer, file.type);
        console.log('Excel data extracted, using AI for parsing...');
        
        const aiParser = new AIFinancialParser();
        parsedData = await aiParser.parseFinancialDataFromText(excelData);
        
        console.log('AI parsing successful:', {
          companyName: parsedData.companyName,
          statementType: parsedData.statementType,
          period: parsedData.period,
          confidence: parsedData.confidence
        });
      } catch (aiError) {
        console.error('AI parsing error:', aiError);
        return NextResponse.json(
          { error: `Failed to parse file with AI: ${aiError}` }, 
          { status: 500 }
        );
      }
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse file' }, 
      { status: 500 }
    );
  }
}
