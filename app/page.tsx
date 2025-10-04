import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI Financial Analysis Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload your financial documents and get instant AI-powered insights
        </p>
        <div className="space-x-4">
          <Link 
            href="/onboarding" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Get Started
          </Link>
          <Link 
            href="/dashboard" 
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors inline-block"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
