export interface ProductItem {
  name: string;
  price: number;
  quantity: number;
  currency?: string;
}

export interface ParsedProductList {
  products: ProductItem[];
  totalItems: number;
  totalValue: number;
  rawText: string;
  confidence: number;
}

export class ProductListParser {
  private async parsePDF(file: File): Promise<ParsedProductList> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-products', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse file');
    }

    return await response.json();
  }

  async parseProductList(file: File): Promise<ParsedProductList> {
    try {
      return await this.parsePDF(file);
    } catch (error) {
      throw new Error(`Failed to parse product list: ${error}`);
    }
  }
}
