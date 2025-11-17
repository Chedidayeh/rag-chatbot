"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const ErrorMessage = ({
  error,
  onRetry,
  showRetry = true,
}: ErrorMessageProps) => {
  // Determine error type and icon
  const isServiceError = error.toLowerCase().includes("overload") || 
                         error.toLowerCase().includes("service unavailable") ||
                         error.toLowerCase().includes("try again later");
  
  const isNetworkError = error.toLowerCase().includes("network") ||
                         error.toLowerCase().includes("connection") ||
                         error.toLowerCase().includes("fetch");

  const retryMessage = isServiceError 
    ? "The service is temporarily busy. Give it a moment and try again."
    : isNetworkError
    ? "Please check your connection and try again."
    : "Please try again or contact support if the problem persists.";

  return (
    <div className="w-full max-w-md lg:max-w-lg px-4 py-3 rounded-xl backdrop-blur-sm bg-red-500/10 border border-red-500/30 text-red-300 rounded-bl-none">
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-red-200 mb-1">Something went wrong</p>
          <p className="text-sm text-red-300/90 mb-2">
            {error}
          </p>
          <p className="text-xs text-red-400/70 mb-3">
            {retryMessage}
          </p>
          
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500/70 rounded text-red-200 text-xs font-medium transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          )}
        </div>
      </div>
      
      <p className="text-xs opacity-60 mt-2 text-red-400/60">
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
};
