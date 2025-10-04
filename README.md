# AI Financial Analysis Platform

An intelligent financial document analysis platform powered by AI that provides detailed cost insights and recommendations.

## Features

- 🤖 **AI-Powered Analysis**: Uses OpenAI GPT-4 for intelligent financial document parsing
- 📊 **Interactive Data Tables**: Comprehensive financial metrics with cost analysis
- 💬 **Chatbot Interface**: ChatGPT-style onboarding experience
- 📄 **Multi-Format Support**: PDF, Excel (.xlsx, .xls), and CSV file support
- 📈 **Visual Analytics**: Interactive charts and financial ratio analysis
- 🎯 **Smart Recommendations**: AI-generated cost optimization suggestions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with your OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**To get your OpenAI API key:**
1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and add it to your `.env.local` file

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

### Onboarding Flow
1. Click "Get Started" on the homepage
2. Use the chatbot interface to upload your financial documents
3. Get AI-powered analysis and recommendations
4. Continue to the dashboard for detailed insights

### Dashboard Features
- Upload financial statements (PDF, Excel, CSV)
- View interactive data tables with cost analysis
- Explore financial ratios and metrics
- Generate comprehensive financial reports

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **AI**: OpenAI GPT-4 API
- **File Processing**: XLSX library for Excel/CSV parsing
- **Charts**: Recharts for data visualization

## File Structure

```
├── app/
│   ├── onboarding/          # Chatbot onboarding flow
│   ├── dashboard/           # Main dashboard
│   └── api/parse-pdf/       # AI parsing API endpoint
├── components/
│   ├── chatbot-interface.tsx    # ChatGPT-style interface
│   ├── financial-data-table.tsx # Interactive data tables
│   └── ui/                      # Reusable UI components
├── lib/
│   ├── ai-financial-parser.ts   # AI-powered parsing logic
│   └── financial-parser.ts      # Fallback parsing logic
└── README.md
```

## Security Notes

- Never commit your `.env.local` file to version control
- The `.env.local` file is already added to `.gitignore`
- Use environment variables for all sensitive data
- Keep your OpenAI API key secure and don't share it publicly

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.