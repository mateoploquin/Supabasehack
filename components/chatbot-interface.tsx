"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Upload, 
  FileText, 
  Bot, 
  User, 
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calculator
} from "lucide-react"

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  isTyping?: boolean
  attachments?: File[]
  analysis?: any
}

interface ChatbotInterfaceProps {
  onComplete: (data: any) => void
}

export function ChatbotInterface({ onComplete }: ChatbotInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "👋 Welcome! I'm your Financial Analysis Assistant. I'll help you analyze your financial documents and provide detailed cost insights.\n\nLet's start by uploading your financial statement (PDF, Excel, or CSV). What would you like to analyze today?",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentStep, setCurrentStep] = useState<'greeting' | 'upload' | 'analysis' | 'complete'>('greeting')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (content: string, type: 'user' | 'bot', attachments?: File[], analysis?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      attachments,
      analysis
    }
    setMessages(prev => [...prev, newMessage])
  }

  const simulateTyping = (response: string, delay: number = 1000) => {
    setIsTyping(true)
    setTimeout(() => {
      addMessage(response, 'bot')
      setIsTyping(false)
    }, delay)
  }

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file)
    setIsProcessing(true)
    
    addMessage(`📄 Uploaded: ${file.name}`, 'user', [file])
    
    // Simulate processing
    simulateTyping("🔍 Analyzing your financial document... This may take a moment.", 2000)
    
    try {
      // Call the parsing API
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to parse document')
      }
      
      const result = await response.json()
      
      // Generate detailed analysis
      const analysis = generateCostAnalysis(result.data)
      
      simulateTyping("✅ Analysis complete! Here's what I found:", 1500)
      
      // Add analysis message
      setTimeout(() => {
        addMessage("", 'bot', undefined, analysis)
        setCurrentStep('complete')
        setIsProcessing(false)
      }, 2000)
      
    } catch (error) {
      simulateTyping("❌ Sorry, I had trouble analyzing your document. Please try uploading a different file.", 1000)
      setIsProcessing(false)
    }
  }

  const generateCostAnalysis = (data: any) => {
    const revenue = data.revenue || 0
    const cogs = data.costOfGoodsSold || 0
    const operatingExpenses = data.operatingExpenses || 0
    const netIncome = data.netIncome || 0
    
    const grossMargin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0
    const operatingMargin = revenue > 0 ? ((revenue - cogs - operatingExpenses) / revenue) * 100 : 0
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0
    
    return {
      summary: {
        revenue,
        grossMargin,
        operatingMargin,
        netMargin,
        netIncome
      },
      insights: [
        {
          title: "Revenue Performance",
          value: `$${revenue.toLocaleString()}`,
          status: revenue > 1000000 ? "excellent" : revenue > 500000 ? "good" : "needs_improvement",
          description: revenue > 1000000 ? "Strong revenue performance" : "Consider revenue growth strategies"
        },
        {
          title: "Gross Margin",
          value: `${grossMargin.toFixed(1)}%`,
          status: grossMargin > 50 ? "excellent" : grossMargin > 30 ? "good" : "needs_improvement",
          description: grossMargin > 50 ? "Healthy gross margins" : "Review cost of goods sold"
        },
        {
          title: "Operating Efficiency",
          value: `${operatingMargin.toFixed(1)}%`,
          status: operatingMargin > 15 ? "excellent" : operatingMargin > 5 ? "good" : "needs_improvement",
          description: operatingMargin > 15 ? "Efficient operations" : "Optimize operating expenses"
        },
        {
          title: "Net Profitability",
          value: `${netMargin.toFixed(1)}%`,
          status: netMargin > 10 ? "excellent" : netMargin > 5 ? "good" : "needs_improvement",
          description: netMargin > 10 ? "Strong profitability" : "Focus on profit improvement"
        }
      ],
      recommendations: [
        grossMargin < 30 ? "Consider negotiating better supplier terms or increasing prices" : null,
        operatingMargin < 10 ? "Review and optimize operating expenses" : null,
        netMargin < 5 ? "Focus on improving overall profitability through cost reduction or revenue growth" : null,
        "Regular financial monitoring and analysis"
      ].filter(Boolean)
    }
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() && !uploadedFile) return
    
    if (uploadedFile) {
      handleFileUpload(uploadedFile)
    } else {
      addMessage(inputValue, 'user')
      
      // Bot responses based on current step
      if (currentStep === 'greeting') {
        simulateTyping("Great! Please upload your financial document (PDF, Excel, or CSV) so I can analyze it for you.", 1000)
        setCurrentStep('upload')
      }
    }
    
    setInputValue('')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <Card className={`${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <CardContent className="p-3">
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.attachments && (
                    <div className="mt-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{message.attachments[0].name}</span>
                    </div>
                  )}
                  
                  {message.analysis && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {message.analysis.insights.map((insight: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{insight.title}</h4>
                              <Badge variant={
                                insight.status === 'excellent' ? 'default' : 
                                insight.status === 'good' ? 'secondary' : 'destructive'
                              }>
                                {insight.value}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{insight.description}</p>
                          </div>
                        ))}
                      </div>
                      
                      {message.analysis.recommendations.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {message.analysis.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <Input
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </Label>
          
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isProcessing}
            className="flex-1"
          />
          
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() && !uploadedFile || isProcessing}
            size="sm"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {uploadedFile && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{uploadedFile.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadedFile(null)}
              className="h-auto p-1"
            >
              ×
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
