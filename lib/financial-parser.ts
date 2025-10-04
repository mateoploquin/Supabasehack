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

export class FinancialStatementParser {
  private async parsePDF(file: File): Promise<ParsedFinancialStatement> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse PDF');
    }

    return await response.json();
  }


  async parseFinancialStatement(file: File): Promise<ParsedFinancialStatement> {
    try {
      return await this.parsePDF(file);
    } catch (error) {
      throw new Error(`Failed to parse financial statement: ${error}`);
    }
  }
}
