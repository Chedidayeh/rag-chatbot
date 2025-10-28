"use client";

import React from "react";
import { MessageCircle } from "lucide-react";
import { DocumentUpload } from "@/components/upload/DocumentUpload";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  retrievedDocuments?: Array<{
    id: string;
    score: number;
    text: string;
    source: string;
    page: number;
  }>;
}

export default function Home() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleUploadSuccess = async (fileUrl: string, fileName: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/upload-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl,
          documentName: fileName.replace(".pdf", ""),
        }),
      });

      const data = await response.json();

  if (data.success) {
        // Add success message to chat
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `✅ Successfully uploaded and processed "${fileName}"!\n\n📊 Stats:\n• Total chunks: ${data.stats.totalChunks}\n\n Now you can ask me any questions about the document!`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, welcomeMessage]);
      } else {
        // Normalize error from API (can be string or structured object)
  const apiError = (data as unknown as { error?: unknown }).error;
        const maybeError = apiError as { message?: string } | undefined;
        const errorText =
          typeof apiError === "string"
            ? apiError
            : maybeError?.message || JSON.stringify(apiError) || "Unknown error";

        const errorMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Error uploading document: ${errorText}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${error instanceof Error ? error.message : "Failed to upload document"}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Convert messages to format expected by API (excluding retrievedDocuments)
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationHistory, // Send conversation history for context
        }),
      });

      const data = await response.json();

  if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          retrievedDocuments: data.retrievedDocuments,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
  const apiError = (data as unknown as { error?: unknown }).error;
        const maybeError2 = apiError as { message?: string } | undefined;
        const errorText =
          typeof apiError === "string"
            ? apiError
            : maybeError2?.message || JSON.stringify(apiError) || "Failed to generate response";

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `❌ Error: ${errorText}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

return (
  <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
    {/* Header */}
    <header className="sticky top-0 z-50 bg-slate-900/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
              <div className="relative bg-slate-900 p-2 rounded-lg">
                <MessageCircle className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
                RAG Chatbot
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Sidebar - Upload */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <DocumentUpload
              onUploadSuccess={handleUploadSuccess}
              isProcessing={isProcessing}
            />
          </div>
        </aside>

        {/* Right Content - Chat */}
        <div className="lg:col-span-2 flex flex-col h-[530px]">
          <div className="bg-slate-800/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col flex-1 hover:border-slate-600/50 transition-colors">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <MessageList messages={messages} isLoading={isLoading} />
            </div>

            {/* Chat Input */}
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>
    </main>

    {/* Footer */}
    <footer className="bg-slate-900/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-slate-400">
          Built with <span className="text-yellow-400">LangChain</span> •{" "}
          <span className="text-blue-400">Pinecone</span> •{" "}
          <span className="text-cyan-400">Google Gemini</span> •{" "}
          <span className="text-purple-400">Next.js</span>
        </p>
      </div>
    </footer>
  </div>
);
}
