"use client";

import React from "react";
import {
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader,
  Calendar,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  pages?: number;
  uploadedAt: string;
  tags: string[];
  description?: string;
  vectorized: boolean;
}

interface DocumentListProps {
  onDocumentDeleted?: () => void;
  refreshTrigger?: number;
}

export const DocumentList = ({
  onDocumentDeleted,
  refreshTrigger = 0,
}: DocumentListProps) => {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = React.useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  // Fetch documents
  const fetchDocuments = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/documents");
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        setError(data.error || "Failed to fetch documents");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch documents on mount and when refreshTrigger changes
  React.useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger, fetchDocuments]);

  // Delete document
  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${fileName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(documentId);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        setDeleteStatus({
          show: true,
          message: `✅ "${fileName}" deleted successfully`,
          type: "success",
        });

        // Call callback if provided
        onDocumentDeleted?.();

        // Hide message after 3 seconds
        setTimeout(() => {
          setDeleteStatus({ show: false, message: "", type: "success" });
        }, 3000);
      } else {
        setDeleteStatus({
          show: true,
          message: `❌ Error: ${data.error || "Failed to delete document"}`,
          type: "error",
        });

        setTimeout(() => {
          setDeleteStatus({ show: false, message: "", type: "success" });
        }, 5000);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete document";
      setDeleteStatus({
        show: true,
        message: `❌ Error: ${errorMsg}`,
        type: "error",
      });

      setTimeout(() => {
        setDeleteStatus({ show: false, message: "", type: "success" });
      }, 5000);
    } finally {
      setDeletingId(null);
    }
  };



  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-xl shadow-2xl hover:border-slate-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-lg">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-50">
            Your Documents
          </h3>
        </div>
        <button
          onClick={() => fetchDocuments()}
          disabled={isLoading}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh documents"
        >
          <RefreshCw
            className={`w-4 h-4 text-slate-400 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Delete Status Message */}
      {deleteStatus.show && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-fade-in ${
            deleteStatus.type === "error"
              ? "bg-red-500/10 text-red-200 border border-red-500/30"
              : "bg-green-500/10 text-green-200 border border-green-500/30"
          }`}
        >
          {deleteStatus.type === "error" ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <p>{deleteStatus.message}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && documents.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-slate-400" />
          <p className="text-slate-400 ml-3">Loading documents...</p>
        </div>
      )}

      {/* Error State */}
      {error && documents.length !== 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && documents.length === 0 && (
        <div className="py-12 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No documents uploaded yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Upload a PDF from the upload section to get started
          </p>
        </div>
      )}

      {/* Documents List */}
      {!isLoading && documents.length > 0 && (
        <ScrollArea className="space-y-2 h-96 p-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`p-4 my-2 rounded-lg border transition-all group bg-slate-700/30 hover:bg-slate-700/50 border-slate-600/50 hover:border-slate-500/50`}
            >
              <div className="flex items-start justify-between">
                {/* Document Info */}
                <div className="flex-1 flex items-start gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />

                  <div className="flex-1 min-w-0">
                    {/* File Name */}
                    <h4 className="text-sm font-semibold text-slate-50 truncate group-hover:text-blue-400 transition-colors">
                      {doc.fileName}
                    </h4>

                    {/* Description if available */}
                    {doc.description && (
                      <p className="text-xs text-slate-400 truncate mt-1">
                        {doc.description}
                      </p>
                    )}

                    {/* Document Stats */}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {doc.totalChunks} chunks
                      </span>
                      {doc.pages && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {doc.pages} pages
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(doc.uploadedAt)}
                      </span>
                    </div>

                    {/* Tags if available */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-slate-600/50 text-slate-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-slate-400 text-xs">
                            +{doc.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Vectorization Status */}
                    <div className="flex items-center gap-1 mt-2">
                      {doc.vectorized ? (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          <span>Indexed & Ready</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <Loader className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(doc.id, doc.fileName);
                  }}
                  disabled={deletingId === doc.id}
                  className="ml-3 p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Delete document"
                >
                  {deletingId === doc.id ? (
                    <Loader className="w-4 h-4 animate-spin text-red-400" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-400/70 hover:text-red-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </ScrollArea>
      )}
    </div>
  );
};
