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
import { Package, DollarSign, ShoppingCart, TrendingUp } from "lucide-react"
import { ProductItem } from "@/lib/product-parser"

interface ProductDataTableProps {
  products: ProductItem[]
  totalItems: number
  totalValue: number
  confidence: number
}

export function ProductDataTable({ products, totalItems, totalValue, confidence }: ProductDataTableProps) {
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product List</h2>
          <p className="text-muted-foreground">{products.length} products found</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={confidence > 70 ? "default" : confidence > 40 ? "secondary" : "destructive"}>
            {confidence}% Confidence
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              Unique items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalItems)}</div>
            <p className="text-xs text-muted-foreground">
              Total pieces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue, products[0]?.currency || 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            Complete list of products with pricing and quantities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.price, product.currency || 'USD')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(product.quantity)} pieces
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.price * product.quantity, product.currency || 'USD')}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {products.length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-right">Total:</TableCell>
                  <TableCell className="text-right">{formatNumber(totalItems)} pieces</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalValue, products[0]?.currency || 'USD')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Statistics */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Statistics</CardTitle>
            <CardDescription>
              Analysis of your product list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-4">Price Distribution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Highest Price:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        Math.max(...products.map(p => p.price)),
                        products[0]?.currency || 'USD'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lowest Price:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        Math.min(...products.map(p => p.price)),
                        products[0]?.currency || 'USD'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Price:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        products.reduce((sum, p) => sum + p.price, 0) / products.length,
                        products[0]?.currency || 'USD'
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-4">Quantity Distribution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Highest Quantity:</span>
                    <span className="font-medium">
                      {formatNumber(Math.max(...products.map(p => p.quantity)))} pieces
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lowest Quantity:</span>
                    <span className="font-medium">
                      {formatNumber(Math.min(...products.map(p => p.quantity)))} pieces
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average Quantity:</span>
                    <span className="font-medium">
                      {formatNumber(Math.round(totalItems / products.length))} pieces
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
