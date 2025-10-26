"use client";

import React from "react";
import { Send, Loader } from "lucide-react";
import { Input } from "../ui/input";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled: boolean;
  placeholder?: string;
}

export const ChatInput = ({
  onSendMessage,
  disabled,
  placeholder = "Ask anything about your documents...",
}: ChatInputProps) => {
  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSendMessage = async () => {
    if (!message.trim() || disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onSendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle Enter key to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="flex gap-3 p-4 bg-slate-800/50 dark:bg-slate-800/50 backdrop-blur-sm border-t border-slate-700/50">
      <div className="flex-1 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-300"></div>
        <Input
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="relative w-full px-4 py-3 bg-slate-700/50 dark:bg-slate-700/50 border border-slate-600/50 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 disabled:bg-slate-700/30 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto text-slate-50 placeholder-slate-400 backdrop-blur-sm transition-all"
          style={{ maxHeight: "120px", minHeight: "44px" }}
        />
      </div>
      <button
        onClick={handleSendMessage}
        disabled={disabled || isLoading || !message.trim()}
        className="relative px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium hover:shadow-lg hover:shadow-yellow-500/20 disabled:shadow-none group"
        title="Send message (press Enter)"
      >
        {isLoading ? (
          <Loader className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline text-sm">Send</span>
          </>
        )}
      </button>
    </div>
  );
};
