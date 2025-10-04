import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AI_Prompt } from "@/components/ui/animated-ai-input"

export default function AgentPage() {
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
          <h1 className="text-lg font-semibold">Agent</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8">
          <div className="w-full flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2">Chat with Chamba.AI</h2>
            <p className="text-muted-foreground mb-8 text-center">
              Ask questions about your balance sheet and financial data
            </p>
            <AI_Prompt />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}