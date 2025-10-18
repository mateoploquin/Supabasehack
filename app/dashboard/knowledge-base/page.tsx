"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Loader2, AlertCircle, Search, Play, Phone } from "lucide-react"
import { useState } from "react"
import { ProductListParser, ParsedProductList } from "@/lib/product-parser"
import { ProductDataTable } from "@/components/product-data-table"

export default function KnowledgeBasePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedProductList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedDocuments, setUploadedDocuments] = useState<ParsedProductList[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchResponse, setSearchResponse] = useState<any>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  
  // Negotiation state
  const [isNegotiating, setIsNegotiating] = useState(false)
  const [negotiationResponse, setNegotiationResponse] = useState<any>(null)
  const [negotiationError, setNegotiationError] = useState<string | null>(null)
  const [negotiationCallId, setNegotiationCallId] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
      "text/plain" // .txt
    ]
    
    if (file && supportedTypes.includes(file.type)) {
      setSelectedFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
      "text/plain" // .txt
    ]
    
    if (file && supportedTypes.includes(file.type)) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (selectedFile) {
      setIsParsing(true)
      setError(null)
      
      try {
        const parser = new ProductListParser()
        const result = await parser.parseProductList(selectedFile)
        
        setParsedData(result)
        setUploadedDocuments(prev => [...prev, result])
        
        // Reset file selection
        setSelectedFile(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse document')
      } finally {
        setIsParsing(false)
      }
    }
  }

  const handleViewDocument = (document: ParsedProductList) => {
    setParsedData(document)
  }

  const handleSearchSuppliers = async () => {
    if (!parsedData) {
      setSearchError("No product data available. Please upload and parse a document first.")
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setSearchResponse(null)

    try {
      // Format the product data as a string to send to the backend
      const dataString = parsedData.products.map(product =>
        `${product.name} - ${product.price} ${product.currency || 'USD'} - ${product.quantity} pieces`
      ).join('\n')

      const response = await fetch('http://localhost:8000/api/v1/browser/run-task', {
        method: 'POST',
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: `start seraching and finding the cheapest suppliers, these my current supplier prices:\n${dataString}`,
          max_steps: 50,
          include_screenshot: true,
          session_id: "550e8400-e29b-41d4-a716-446655440000",
          save_session: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSearchResponse(data)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search for suppliers')
    } finally {
      setIsSearching(false)
    }
  }

  const handleNegotiateWithSuppliers = async () => {
    if (!searchResponse) {
      setNegotiationError("No supplier search results available. Please search for suppliers first.")
      return
    }

    setIsNegotiating(true)
    setNegotiationError(null)
    setNegotiationResponse(null)

    try {
      // Extract supplier information from the search response
      // Parse the browser agent response to find phone numbers
      let supplierInfo = {
        name: "Unknown Supplier",
        phone: "+1234567890", // Default fallback
        contact: "supplier@example.com"
      }

      // Try to extract phone numbers from the search response
      if (searchResponse && typeof searchResponse === 'object') {
        // Convert response to string for regex matching
        const responseText = JSON.stringify(searchResponse)
        
        // Phone number regex patterns (international formats)
        const phonePatterns = [
          /\+?(\d{1,3})[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g, // +1 (123) 456-7890
          /\+?(\d{1,3})[-.\s]?(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/g,      // +1 123 456 7890
          /(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/g,                          // 123-456-7890
          /\+?(\d{1,3})[-.\s]?\(?(\d{2,4})\)?[-.\s]?(\d{2,4})[-.\s]?(\d{2,8})/g // Various formats
        ]
        
        // Extract all potential phone numbers
        let extractedNumbers: string[] = []
        phonePatterns.forEach(pattern => {
          const matches = responseText.match(pattern)
          if (matches) {
            extractedNumbers = [...extractedNumbers, ...matches]
          }
        })
        
        // Clean and format the extracted numbers
        const cleanNumbers = extractedNumbers.map(num => {
          // Remove all non-digit characters except +
          return num.replace(/[^\d+]/g, '')
        }).filter(num => {
          // Keep only numbers with 7-15 digits (valid phone number lengths)
          const digitsOnly = num.replace(/\D/g, '')
          return digitsOnly.length >= 7 && digitsOnly.length <= 15
        })
        
        // Use the first valid phone number found
        if (cleanNumbers.length > 0) {
          supplierInfo.phone = cleanNumbers[0]
          
          // Try to extract supplier name from the response
          // Look for patterns like "Supplier: Name" or "Company: Name"
          const namePatterns = [
            /supplier["']?\s*[:\-]\s*["']?([^"']+)["']?/gi,
            /company["']?\s*[:\-]\s*["']?([^"']+)["']?/gi,
            /store["']?\s*[:\-]\s*["']?([^"']+)["']?/gi,
            /vendor["']?\s*[:\-]\s*["']?([^"']+)["']?/gi
          ]
          
          for (const pattern of namePatterns) {
            const nameMatch = responseText.match(pattern)
            if (nameMatch && nameMatch[1]) {
              supplierInfo.name = nameMatch[1].trim()
              break
            }
          }
        }
      }

      // Use the product data from the parsed data
      const productInfo = parsedData?.products || []

      // Call the negotiation API
      const response = await fetch('/api/negotiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierInfo,
          productInfo
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setNegotiationCallId(data.call_id)
      setNegotiationResponse(data)

      // Start polling for the negotiation status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/negotiate?call_id=${data.call_id}`)
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            setNegotiationResponse(statusData)
            
            // Stop polling if the call is completed
            if (statusData.status === 'completed' || statusData.status === 'failed') {
              clearInterval(pollInterval)
            }
          }
        } catch (error) {
          console.error('Error polling negotiation status:', error)
          clearInterval(pollInterval)
        }
      }, 5000) // Poll every 5 seconds

    } catch (err) {
      setNegotiationError(err instanceof Error ? err.message : 'Failed to initiate negotiation')
    } finally {
      setIsNegotiating(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-lg font-semibold">Knowledge Base</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
          {error && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 pt-6">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Upload Product Cost List</CardTitle>
              <CardDescription>
                Upload your product cost list (PDF, Excel, CSV, or Text) to extract product names, quantities, and prices. Format: Product Name - Price - Quantity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                type="button"
                className={`w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drag and drop your product cost list here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, Excel (.xlsx, .xls), CSV, and Text files
                    </p>
                  </div>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Label
                  htmlFor="file-upload"
                  className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                >
                  Browse Files
                </Label>
              </button>

              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleUpload} disabled={isParsing}>
                    {isParsing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      'Upload & Parse'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                View and manage your uploaded product lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents uploaded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {uploadedDocuments.map((doc, index) => (
                    <button
                      type="button"
                      key={`doc-${index}-${doc.totalItems}-${doc.totalValue}`}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{doc.products.length} Products</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.totalItems} items • {doc.confidence}% confidence
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Products
                      </Button>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {parsedData && (
            <Card>
              <CardHeader>
                <CardTitle>Product Analysis</CardTitle>
                <CardDescription>
                  AI-powered analysis of your product cost list
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductDataTable
                  products={parsedData.products}
                  totalItems={parsedData.totalItems}
                  totalValue={parsedData.totalValue}
                  confidence={parsedData.confidence}
                />
                
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Find Cheaper Suppliers</h3>
                      <p className="text-sm text-muted-foreground">
                        Use AI to search for cheaper suppliers based on your current product prices
                      </p>
                    </div>
                    <Button
                      onClick={handleSearchSuppliers}
                      disabled={isSearching}
                      className="flex items-center gap-2"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Find Suppliers
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {searchError && (
                    <Card className="mt-4 border-destructive">
                      <CardContent className="flex items-center gap-2 pt-6">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <p className="text-sm text-destructive">{searchError}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {searchResponse && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Supplier Search Results</CardTitle>
                        <CardDescription>
                          Results from the AI-powered supplier search
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
                            {JSON.stringify(searchResponse, null, 2)}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {searchResponse && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Negotiate with Suppliers</h3>
                          <p className="text-sm text-muted-foreground">
                            Use AI voice agent to negotiate better pricing and terms
                          </p>
                        </div>
                        <Button
                          onClick={handleNegotiateWithSuppliers}
                          disabled={isNegotiating}
                          className="flex items-center gap-2"
                        >
                          {isNegotiating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Negotiating...
                            </>
                          ) : (
                            <>
                              <Phone className="h-4 w-4" />
                              Negotiate Now
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {negotiationError && (
                        <Card className="mt-4 border-destructive">
                          <CardContent className="flex items-center gap-2 pt-6">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <p className="text-sm text-destructive">{negotiationError}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {negotiationResponse && (
                        <Card className="mt-4">
                          <CardHeader>
                            <CardTitle>Negotiation Results</CardTitle>
                            <CardDescription>
                              {negotiationResponse.status === 'in-progress'
                                ? 'AI agent is currently negotiating with the supplier...'
                                : negotiationResponse.status === 'completed'
                                ? 'Negotiation completed successfully!'
                                : 'Negotiation status'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {negotiationCallId && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Call ID:</span>
                                  <span className="text-sm text-muted-foreground">{negotiationCallId}</span>
                                </div>
                              )}
                              
                              {negotiationResponse.status === 'in-progress' && (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">Negotiation in progress...</span>
                                </div>
                              )}
                              
                              {negotiationResponse.transcript && (
                                <div className="bg-muted p-4 rounded-lg">
                                  <h4 className="text-sm font-medium mb-2">Conversation Transcript</h4>
                                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-64">
                                    {negotiationResponse.transcript}
                                  </pre>
                                </div>
                              )}
                              
                              {negotiationResponse.duration && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Call Duration:</span>
                                  <span className="text-sm text-muted-foreground">
                                    {Math.round(negotiationResponse.duration / 60)} minutes
                                  </span>
                                </div>
                              )}
                              
                              {negotiationResponse.cost && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Call Cost:</span>
                                  <span className="text-sm text-muted-foreground">
                                    ${negotiationResponse.cost.toFixed(4)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}