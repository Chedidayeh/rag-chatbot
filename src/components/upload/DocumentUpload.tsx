"use client";

import React from "react";
import { UploadCloud, AlertCircle, Zap, Loader2 } from "lucide-react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

interface DocumentUploadProps {
  onUploadSuccess: (fileUrl: string, fileName: string) => void;
  isProcessing?: boolean;
}

export const DocumentUpload = ({
  onUploadSuccess,
  isProcessing = false,
}: DocumentUploadProps) => {
  const [uploadStatus, setUploadStatus] = React.useState<{
    status: "idle" | "processing" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [uploadProgress, setUploadProgress] = React.useState(0);

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

  const handleUploadComplete = (
    res: Array<{ name: string; size: number; url: string }>
  ) => {
    if (res && res.length > 0) {
      const file = res[0];

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

  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-xl shadow-2xl hover:border-slate-600/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-lg">
          <UploadCloud className="w-5 h-5 text-yellow-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-50">
          Upload Documents
        </h3>
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
              } ${
                isUploading ? "opacity-50" : "opacity-100"
              } transition-opacity`;
            },
            allowedContent: "text-sm text-slate-400",
            container: "w-full",
          }}
          content={{
            button({ ready, isUploading }) {
              if (isUploading)
                return (
                  <div className="text-slate-50 font-medium">
                    <Loader2 className="animate-spin w-5 h-5" />
                  </div>
                );
              if (ready)
                return (
                  <div className="text-slate-50 font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Choose PDF or click
                  </div>
                );
              return <div className="text-slate-400">Preparing upload...</div>;
            },
            allowedContent({ ready, isUploading }) {
              if (!ready && !isUploading)
                return <p className="text-slate-400">Preparing upload...</p>;
              if (isUploading)
                return (
                  <p className="text-xs text-slate-400">
                    Uploading... this may take a moment
                  </p>
                );
              return (
                <p className="text-xs text-slate-400">
                  PDF files up to 8MB are supported
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
            <p className="text-sm font-semibold text-yellow-400">
              {uploadProgress}%
            </p>
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
          <p className="text-sm font-medium">{uploadStatus.message}</p>
        </div>
      )}


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
          <li>Get intelligent answers</li>
        </ul>
      </div>
    </div>
  );
};
