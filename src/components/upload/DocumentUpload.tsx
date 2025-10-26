"use client";

import React from "react";
import { UploadCloud, X, CheckCircle, AlertCircle, Loader, FileText, Zap, Loader2, Trash2 } from "lucide-react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: Date;
}

interface DocumentUploadProps {
  onUploadSuccess: (fileUrl: string, fileName: string) => void;
  isProcessing?: boolean;
}

export const DocumentUpload = ({
  onUploadSuccess,
  isProcessing = false,
}: DocumentUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [uploadStatus, setUploadStatus] = React.useState<{
    status: "idle" | "processing" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Update status when processing completes
  React.useEffect(() => {
    if (!isProcessing && uploadStatus.status === "processing") {
      setUploadStatus({
        status: "success",
        message: "Document processed successfully! ✓",
      });

      // Clear success message after 3 seconds
      const timer = setTimeout(() => {
        setUploadStatus({ status: "idle", message: "" });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isProcessing, uploadStatus.status]);

  const handleUploadComplete = (res: Array<{ name: string; size: number; url: string }>) => {
    if (res && res.length > 0) {
      const file = res[0];

      // Add to uploaded files list
      setUploadedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
        },
      ]);

      setUploadStatus({
        status: "processing",
        message: `Processing "${file.name}"...`,
      });
      
      // Reset progress after upload completes
      setUploadProgress(0);

      // Call the upload success handler
      onUploadSuccess(file.url, file.name);
    }
  };

  const handleUploadError = (error: Error) => {
    setUploadStatus({
      status: "error",
      message: `Upload failed: ${error.message}`,
    });
    setTimeout(() => {
      setUploadStatus({ status: "idle", message: "" });
    }, 5000);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleDeleteAllRecords = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL records from the Pinecone index? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setUploadStatus({
      status: "processing",
      message: "Deleting all records from index...",
    });

    try {
      const response = await fetch("/api/delete-all-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setUploadStatus({
          status: "success",
          message: "✅ All records deleted successfully!",
        });

        // Clear success message after 4 seconds
        setTimeout(() => {
          setUploadStatus({ status: "idle", message: "" });
        }, 4000);
      } else {
        setUploadStatus({
          status: "error",
          message: `❌ Error: ${data.error || "Failed to delete records"}`,
        });

        setTimeout(() => {
          setUploadStatus({ status: "idle", message: "" });
        }, 5000);
      }
    } catch (error) {
      setUploadStatus({
        status: "error",
        message: `❌ Error: ${error instanceof Error ? error.message : "Failed to delete records"}`,
      });

      setTimeout(() => {
        setUploadStatus({ status: "idle", message: "" });
      }, 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-xl shadow-2xl hover:border-slate-600/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-lg">
          <UploadCloud className="w-5 h-5 text-yellow-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-50">Upload Documents</h3>
      </div>

      {/* Upload Zone */}
      <div className="mb-6">
        <UploadButton<OurFileRouter, "pdfUpload">
          endpoint="pdfUpload"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          appearance={{
            button({ ready, isUploading }) {
              return `relative w-full h-32 ${
                ready ? "cursor-pointer" : "cursor-default"
              } ${isUploading ? "opacity-50" : "opacity-100"} transition-opacity`;
            },
            allowedContent: "text-sm text-slate-400",
            container: "w-full",
          }}
          content={{
            button({ ready, isUploading }) {
              if (isUploading) return <div className="text-slate-50 font-medium"><Loader2 className="animate-spin w-5 h-5"/></div>;
              if (ready) return <div className="text-slate-50 font-medium flex items-center gap-2"><Zap className="w-4 h-4" /> Choose PDF or click</div>;
              return <div className="text-slate-400">Preparing upload...</div>;
            },
            allowedContent({ ready, isUploading }) {
              if (!ready && !isUploading) return <p className="text-slate-400">Preparing upload...</p>;
              if (isUploading)
                return (
                  <p className="text-xs text-slate-400">Uploading... this may take a moment</p>
                );
              return (
                <p className="text-xs text-slate-400">
                  PDF files up to 10MB are supported
                </p>
              );
            },
          }}
          className="bg-gradient-to-b from-slate-700/30 to-slate-800/30 border-2 border-dashed border-slate-600 rounded-xl hover:border-yellow-500/50 hover:bg-slate-700/40 transition-all"
          onUploadProgress={(progress) => {
            setUploadProgress(progress);
          }}
        />
      </div>

      {/* Upload Progress Bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-200">Uploading...</p>
            <p className="text-sm font-semibold text-yellow-400">{uploadProgress}%</p>
          </div>
          <div className="w-full h-3 bg-slate-600/80 rounded-full overflow-hidden border-2 border-slate-500/50 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-full transition-all duration-200 ease-out shadow-lg shadow-yellow-500/70"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {uploadStatus.message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-3 backdrop-blur-sm border animate-fade-in ${
            uploadStatus.status === "error"
              ? "bg-red-500/10 text-red-200 border-red-500/30"
              : uploadStatus.status === "success"
                ? "bg-green-500/10 text-green-200 border-green-500/30"
                : "bg-blue-500/10 text-blue-200 border-blue-500/30"
          }`}
        >
          {uploadStatus.status === "error" && (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {uploadStatus.status === "success" && (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {uploadStatus.status === "processing" && (
            <Loader className="w-5 h-5 flex-shrink-0 animate-spin" />
          )}
          <p className="text-sm font-medium">{uploadStatus.message}</p>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="border-t border-slate-700/50 pt-4">
          <h4 className="text-sm font-medium mb-3 text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-yellow-400" />
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-600/50 transition-colors group"
              >
                <div className="flex-1 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-yellow-400/70 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-50 group-hover:text-yellow-400 transition-colors">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatFileSize(file.size)} • {file.uploadedAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-yellow-500" />
                    <span className="text-xs text-yellow-400">Processing...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4 text-red-400/70 hover:text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete All Records Button */}
      <div className="mt-4 border-t border-slate-700/50 pt-4">
        <button
          onClick={handleDeleteAllRecords}
          disabled={isDeleting}
          className="w-full px-4 py-3 bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 disabled:from-red-700/50 disabled:to-red-800/50 disabled:cursor-not-allowed rounded-lg border border-red-500/50 hover:border-red-400/50 transition-all flex items-center justify-center gap-2 text-sm font-medium text-red-50 shadow-lg hover:shadow-xl"
        >
          {isDeleting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span>Delete All Records</span>
            </>
          )}
        </button>
        <p className="text-xs text-red-200/60 mt-2 text-center">
          ⚠️ This will remove all indexed documents from Pinecone
        </p>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20 text-sm text-yellow-100">
        <p className="font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          How it works:
        </p>
        <ul className="text-xs space-y-1.5 list-disc list-inside text-yellow-200/80">
          <li>Upload a PDF document</li>
          <li>AI processes and indexes the content</li>
          <li>Ask natural language questions</li>
          <li>Get intelligent answers with sources</li>
        </ul>
      </div>
    </div>
  );
};
