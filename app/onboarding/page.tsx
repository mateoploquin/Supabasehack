"use client"

import { useState } from "react"
import { ChatbotInterface } from "@/components/chatbot-interface"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export default function OnboardingPage() {
  const [isComplete, setIsComplete] = useState(false)
  const [analysisData, setAnalysisData] = useState<any>(null)

  const handleComplete = (data: any) => {
    setAnalysisData(data)
    setIsComplete(true)
  }

  const handleContinue = () => {
    // Redirect to dashboard with analysis data
    window.location.href = '/dashboard/knowledge-base'
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Analysis Complete!</CardTitle>
            <CardDescription>
              Your financial analysis is ready. You can now access detailed insights and continue analyzing more documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">What's Next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View detailed financial metrics and ratios</li>
                <li>• Explore interactive charts and visualizations</li>
                <li>• Upload additional documents for comparison</li>
                <li>• Generate comprehensive financial reports</li>
              </ul>
            </div>
            
            <Button onClick={handleContinue} className="w-full">
              Continue to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Financial Analysis
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get started with our AI-powered financial analysis. Upload your documents and get instant insights.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Financial Analysis Assistant
              </CardTitle>
              <CardDescription>
                Chat with our AI assistant to analyze your financial documents
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-120px)]">
              <ChatbotInterface onComplete={handleComplete} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
