import OpenAI from 'openai';

export interface FinancialData {
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

export interface ParsedFinancialStatement {
  companyName: string;
  statementType: 'income' | 'balance' | 'cashflow';
  period: string;
  data: FinancialData;
  rawText: string;
  confidence: number;
}

export class AIFinancialParser {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
    });
  }

  async parseFinancialDataFromText(text: string): Promise<ParsedFinancialStatement> {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key') {
        console.log('OpenAI API key not found, using fallback parsing...');
        return this.fallbackParsing(text);
      }

      const prompt = this.createFinancialExtractionPrompt(text);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a financial data extraction expert. Extract financial metrics from financial statements and return them in a structured JSON format."
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

      // Parse the AI response
      const parsedData = this.parseAIResponse(aiResponse);
      
      return {
        companyName: parsedData.companyName || 'Unknown Company',
        statementType: parsedData.statementType || 'income',
        period: parsedData.period || new Date().getFullYear().toString(),
        data: parsedData.data,
        rawText: text,
        confidence: parsedData.confidence || 0
      };
    } catch (error) {
      console.error('AI parsing error:', error);
      console.log('Falling back to rule-based parsing...');
      return this.fallbackParsing(text);
    }
  }

  private fallbackParsing(text: string): ParsedFinancialStatement {
    // Enhanced fallback parsing using the existing logic
    const lines = text.split('\n');
    const financialData = this.getDefaultFinancialData();
    
    // Extract company name from first few lines
    let companyName = 'Unknown Company';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 3 && line.length < 100 && !line.includes('$') && !line.match(/^\d+$/)) {
        companyName = line;
        break;
      }
    }

    // Extract financial data using pattern matching
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Revenue patterns
      if (lowerLine.includes('revenue') || lowerLine.includes('sales') || lowerLine.includes('income')) {
        const value = this.extractNumberFromLine(line);
        if (value > 0) financialData.revenue = value;
      }
      
      // Cost of Goods Sold
      if (lowerLine.includes('cost of goods sold') || lowerLine.includes('cogs')) {
        const value = this.extractNumberFromLine(line);
        if (value > 0) financialData.costOfGoodsSold = value;
      }
      
      // Net Income
      if (lowerLine.includes('net income') || lowerLine.includes('net profit')) {
        const value = this.extractNumberFromLine(line);
        if (value > 0) financialData.netIncome = value;
      }
      
      // Total Assets
      if (lowerLine.includes('total assets')) {
        const value = this.extractNumberFromLine(line);
        if (value > 0) financialData.totalAssets = value;
      }
      
      // Total Liabilities
      if (lowerLine.includes('total liabilities')) {
        const value = this.extractNumberFromLine(line);
        if (value > 0) financialData.totalLiabilities = value;
      }
      
      // Cash
      if (lowerLine.includes('cash')) {
        const value = this.extractNumberFromLine(line);
        if (value > 0) financialData.cash = value;
      }
    }

    // Calculate derived values
    if (financialData.grossProfit === 0 && financialData.revenue > 0 && financialData.costOfGoodsSold > 0) {
      financialData.grossProfit = financialData.revenue - financialData.costOfGoodsSold;
    }

    return {
      companyName,
      statementType: 'income',
      period: new Date().getFullYear().toString(),
      data: financialData,
      rawText: text,
      confidence: this.calculateConfidence(financialData)
    };
  }

  private extractNumberFromLine(line: string): number {
    // Extract numbers from a line of text
    const numbers = line.match(/-?\d{1,3}(,\d{3})*(\.\d{2})?/g);
    if (numbers && numbers.length > 0) {
      const value = parseFloat(numbers[0].replace(/,/g, ''));
      return isNaN(value) ? 0 : value;
    }
    return 0;
  }

  private calculateConfidence(data: FinancialData): number {
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

  private createFinancialExtractionPrompt(text: string): string {
    return `
Please analyze the following financial statement data and extract the key financial metrics. Return your response as a JSON object with the following structure:

{
  "companyName": "string",
  "statementType": "income|balance|cashflow",
  "period": "string (e.g., 'Q4 2023', '2023', 'December 2023')",
  "data": {
    "revenue": number,
    "costOfGoodsSold": number,
    "grossProfit": number,
    "operatingExpenses": number,
    "operatingIncome": number,
    "netIncome": number,
    "totalAssets": number,
    "totalLiabilities": number,
    "totalEquity": number,
    "cash": number,
    "accountsReceivable": number,
    "inventory": number,
    "propertyPlantEquipment": number,
    "accountsPayable": number,
    "longTermDebt": number,
    "year": number
  },
  "confidence": number (0-100)
}

Financial Statement Data:
${text}

Instructions:
1. Extract all available financial metrics from the data
2. If a metric is not found, set it to 0
3. Handle various formats and naming conventions
4. Calculate derived values if needed (e.g., grossProfit = revenue - costOfGoodsSold)
5. Set confidence based on how much financial data was successfully extracted
6. Identify the company name, statement type, and period from the data
7. Return only valid JSON, no additional text

Please analyze the data and return the JSON response:`;
  }

  private parseAIResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate and clean the data
        return this.validateAndCleanData(parsed);
      }
      
      throw new Error('No valid JSON found in AI response');
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('AI Response:', response);
      
      // Return default structure if parsing fails
      return {
        companyName: 'Unknown Company',
        statementType: 'income',
        period: new Date().getFullYear().toString(),
        data: this.getDefaultFinancialData(),
        confidence: 0
      };
    }
  }

  private validateAndCleanData(data: any): any {
    const defaultData = this.getDefaultFinancialData();
    
    return {
      companyName: data.companyName || 'Unknown Company',
      statementType: data.statementType || 'income',
      period: data.period || new Date().getFullYear().toString(),
      data: {
        revenue: this.cleanNumber(data.data?.revenue) || 0,
        costOfGoodsSold: this.cleanNumber(data.data?.costOfGoodsSold) || 0,
        grossProfit: this.cleanNumber(data.data?.grossProfit) || 0,
        operatingExpenses: this.cleanNumber(data.data?.operatingExpenses) || 0,
        operatingIncome: this.cleanNumber(data.data?.operatingIncome) || 0,
        netIncome: this.cleanNumber(data.data?.netIncome) || 0,
        totalAssets: this.cleanNumber(data.data?.totalAssets) || 0,
        totalLiabilities: this.cleanNumber(data.data?.totalLiabilities) || 0,
        totalEquity: this.cleanNumber(data.data?.totalEquity) || 0,
        cash: this.cleanNumber(data.data?.cash) || 0,
        accountsReceivable: this.cleanNumber(data.data?.accountsReceivable) || 0,
        inventory: this.cleanNumber(data.data?.inventory) || 0,
        propertyPlantEquipment: this.cleanNumber(data.data?.propertyPlantEquipment) || 0,
        accountsPayable: this.cleanNumber(data.data?.accountsPayable) || 0,
        longTermDebt: this.cleanNumber(data.data?.longTermDebt) || 0,
        year: this.cleanNumber(data.data?.year) || new Date().getFullYear()
      },
      confidence: Math.min(Math.max(this.cleanNumber(data.confidence) || 0, 0), 100)
    };
  }

  private cleanNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,$]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getDefaultFinancialData(): FinancialData {
    return {
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
  }
}
