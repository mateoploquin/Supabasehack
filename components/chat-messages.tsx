"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Bot className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a conversation by typing a message below
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            "flex gap-3",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {message.role === "assistant" && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
          )}
          <div
            className={cn(
              "rounded-lg px-4 py-2 max-w-[80%]",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          {message.role === "user" && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
