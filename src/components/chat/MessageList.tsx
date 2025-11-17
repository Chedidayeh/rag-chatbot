"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

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
  isError?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList = ({ messages, isLoading }: MessageListProps) => {

  return (
    <div className="flex flex-col space-y-4 overflow-y-auto p-6 bg-gradient-to-b from-slate-800/20 to-slate-900/20 rounded-lg">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <p className="text-center text-lg font-medium">
            No messages yet
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            Upload a document and start asking questions to get started or chat on existing ones
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
          >
            {message.isError ? (
              <div className="max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-xl backdrop-blur-sm bg-red-500/10 border border-red-500/30 text-red-300 rounded-bl-none">
                <p className="text-sm font-medium text-red-200 mb-1">⚠️ Error</p>
                <p className="text-sm text-red-300/90">{message.content}</p>
                <p className="text-xs opacity-60 mt-2 text-red-400/60">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ) : (
              <div
                className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-xl backdrop-blur-sm transition-all hover:shadow-lg ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-yellow-500/80 to-orange-500/80 dark:from-yellow-500/80 dark:to-orange-500/80 text-white rounded-br-none shadow-lg"
                    : "bg-slate-700/50 dark:bg-slate-700/50 text-slate-50 rounded-bl-none border border-slate-600/50 hover:border-slate-500/50"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap break-words">
                  <ReactMarkdown
                    components={{
                      p: (props) => <p className="mb-2 last:mb-0" {...props} />,
                      strong: (props) => <strong className="font-bold" {...props} />,
                      em: (props) => <em className="italic" {...props} />,
                      ul: (props) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                      ol: (props) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                      li: (props) => <li className="ml-2" {...props} />,
                      code: (props) => {
                        const { className, children } = props as { className?: string; children: React.ReactNode };
                        const isInline = !className;
                        return isInline ? (
                          <code className="bg-black/30 px-2 py-0.5 rounded font-mono text-xs whitespace-nowrap">
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-black/30 p-3 rounded font-mono text-xs overflow-x-auto mb-2 border border-white/10">
                            {children}
                          </code>
                        );
                      },
                      h1: (props) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0" {...props} />,
                      h2: (props) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0" {...props} />,
                      h3: (props) => <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Show retrieved documents for assistant messages */}
                {/* {message.role === "assistant" &&
                  message.retrievedDocuments &&
                  message.retrievedDocuments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/20 text-xs">
                      <p className="font-semibold mb-2 text-slate-100">📚 Sources:</p>
                      <div className="space-y-1.5">
                        {message.retrievedDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="text-slate-200 bg-black/20 p-2.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                          >
                            <p className="font-medium">{doc.source}</p>
                            <p className="text-xs text-slate-300 mt-1">
                              📄 Page {doc.page} • Relevance: <span className="bg-green-500/30 px-1.5 py-0.5 rounded">{(doc.score * 100).toFixed(0)}%</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )} */}

                <p className="text-xs opacity-60 mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        ))
      )}

      {isLoading && (
        <div className="flex justify-start animate-fade-in">
          <div className="bg-slate-700/50 dark:bg-slate-700/50 text-slate-50 px-4 py-3 rounded-xl rounded-bl-none border border-slate-600/50 backdrop-blur-sm">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
