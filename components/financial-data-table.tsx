"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Calculator, PieChart as PieChartIcon, BarChart3 } from "lucide-react"
import { FinancialData } from "@/lib/financial-parser"

interface FinancialDataTableProps {
  data: FinancialData
  companyName: string
  period: string
  confidence: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function FinancialDataTable({ data, companyName, period, confidence }: FinancialDataTableProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'balance' | 'ratios' | 'charts'>('overview')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Calculate financial ratios
  const grossMargin = data.revenue > 0 ? (data.grossProfit / data.revenue) * 100 : 0
  const operatingMargin = data.revenue > 0 ? (data.operatingIncome / data.revenue) * 100 : 0
  const netMargin = data.revenue > 0 ? (data.netIncome / data.revenue) * 100 : 0
  const currentRatio = data.totalLiabilities > 0 ? data.totalAssets / data.totalLiabilities : 0
  const debtToEquity = data.totalEquity > 0 ? data.totalLiabilities / data.totalEquity : 0

  // Chart data
  const incomeStatementData = [
    { name: 'Revenue', value: data.revenue, color: '#0088FE' },
    { name: 'COGS', value: data.costOfGoodsSold, color: '#FF8042' },
    { name: 'Operating Expenses', value: data.operatingExpenses, color: '#FFBB28' },
    { name: 'Net Income', value: data.netIncome, color: '#00C49F' }
  ]

  const balanceSheetData = [
    { name: 'Cash', value: data.cash, color: '#0088FE' },
    { name: 'A/R', value: data.accountsReceivable, color: '#00C49F' },
    { name: 'Inventory', value: data.inventory, color: '#FFBB28' },
    { name: 'PP&E', value: data.propertyPlantEquipment, color: '#FF8042' }
  ]

  const ratioData = [
    { name: 'Gross Margin', value: grossMargin, color: '#0088FE' },
    { name: 'Operating Margin', value: operatingMargin, color: '#00C49F' },
    { name: 'Net Margin', value: netMargin, color: '#FFBB28' }
  ]

  const costAnalysisData = [
    { category: 'Cost of Goods Sold', amount: data.costOfGoodsSold, percentage: (data.costOfGoodsSold / data.revenue) * 100 },
    { category: 'Operating Expenses', amount: data.operatingExpenses, percentage: (data.operatingExpenses / data.revenue) * 100 },
    { category: 'Net Income', amount: data.netIncome, percentage: (data.netIncome / data.revenue) * 100 }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.revenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.netIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(netMargin)} margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalAssets)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Financial Ratios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatPercentage(grossMargin)}</div>
              <div className="text-sm text-muted-foreground">Gross Margin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatPercentage(operatingMargin)}</div>
              <div className="text-sm text-muted-foreground">Operating Margin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatPercentage(netMargin)}</div>
              <div className="text-sm text-muted-foreground">Net Margin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{currentRatio.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Current Ratio</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderIncomeStatement = () => (
    <Card>
      <CardHeader>
        <CardTitle>Income Statement</CardTitle>
        <CardDescription>Revenue and expense breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">% of Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Revenue</TableCell>
              <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
              <TableCell className="text-right">100.0%</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Cost of Goods Sold</TableCell>
              <TableCell className="text-right">{formatCurrency(data.costOfGoodsSold)}</TableCell>
              <TableCell className="text-right">{formatPercentage((data.costOfGoodsSold / data.revenue) * 100)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Gross Profit</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(data.grossProfit)}</TableCell>
              <TableCell className="text-right font-medium">{formatPercentage(grossMargin)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Operating Expenses</TableCell>
              <TableCell className="text-right">{formatCurrency(data.operatingExpenses)}</TableCell>
              <TableCell className="text-right">{formatPercentage((data.operatingExpenses / data.revenue) * 100)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Operating Income</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(data.operatingIncome)}</TableCell>
              <TableCell className="text-right font-medium">{formatPercentage(operatingMargin)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Net Income</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(data.netIncome)}</TableCell>
              <TableCell className="text-right font-bold">{formatPercentage(netMargin)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  const renderBalanceSheet = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Cash</TableCell>
                <TableCell className="text-right">{formatCurrency(data.cash)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Accounts Receivable</TableCell>
                <TableCell className="text-right">{formatCurrency(data.accountsReceivable)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Inventory</TableCell>
                <TableCell className="text-right">{formatCurrency(data.inventory)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Property, Plant & Equipment</TableCell>
                <TableCell className="text-right">{formatCurrency(data.propertyPlantEquipment)}</TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell>Total Assets</TableCell>
                <TableCell className="text-right">{formatCurrency(data.totalAssets)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liabilities & Equity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Accounts Payable</TableCell>
                <TableCell className="text-right">{formatCurrency(data.accountsPayable)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Long-term Debt</TableCell>
                <TableCell className="text-right">{formatCurrency(data.longTermDebt)}</TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell>Total Liabilities</TableCell>
                <TableCell className="text-right">{formatCurrency(data.totalLiabilities)}</TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell>Total Equity</TableCell>
                <TableCell className="text-right">{formatCurrency(data.totalEquity)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  const renderCostAnalysis = () => (
    <Card>
      <CardHeader>
        <CardTitle>Cost Analysis</CardTitle>
        <CardDescription>Breakdown of costs and profitability</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-4">Cost Breakdown</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">% of Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costAnalysisData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right">{formatPercentage(item.percentage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Cost Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costAnalysisData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {costAnalysisData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderCharts = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Income Statement Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={incomeStatementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profitability Ratios</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratioData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{companyName}</h2>
          <p className="text-muted-foreground">{period}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={confidence > 70 ? "default" : confidence > 40 ? "secondary" : "destructive"}>
            {confidence}% Confidence
          </Badge>
        </div>
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'income' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('income')}
        >
          Income Statement
        </Button>
        <Button
          variant={activeTab === 'balance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('balance')}
        >
          Balance Sheet
        </Button>
        <Button
          variant={activeTab === 'ratios' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ratios')}
        >
          Cost Analysis
        </Button>
        <Button
          variant={activeTab === 'charts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('charts')}
        >
          Charts
        </Button>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'income' && renderIncomeStatement()}
      {activeTab === 'balance' && renderBalanceSheet()}
      {activeTab === 'ratios' && renderCostAnalysis()}
      {activeTab === 'charts' && renderCharts()}
    </div>
  )
}
