import { NextRequest, NextResponse } from "next/server";
import {
  processPdfDocument,
  downloadFileFromUrl,
  cleanupTempFile,
} from "@/lib/rag/document-processor";
import { addDocuments } from "@/lib/rag/vectorstore";
import { registerDocument } from "@/lib/rag/document-registry";
import { formatErrorDetails } from "@/lib/api/error";

/**
 * POST /api/upload-document
 * Upload a PDF document and store it in Pinecone
 *
 * Expected request body:
 * {
 *   "fileUrl": "https://uploadthing.com/file.pdf",
 *   "documentName": "my-document",
 *   "namespace": "default" (optional)
 * }
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const body = await request.json();
    const { fileUrl, documentName, namespace = "default" } = body;

    // Validate input
    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    if (!documentName) {
      return NextResponse.json(
        { error: "documentName is required" },
        { status: 400 }
      );
    }

    console.log(`Processing document: ${documentName} from URL: ${fileUrl}`);

    // Step 1: Download file from Uploadthing
    const fileName = `${documentName}-${Date.now()}.pdf`;
    tempFilePath = await downloadFileFromUrl(fileUrl, fileName);

    // Step 2: Process PDF (load, extract, chunk)
    const chunks = await processPdfDocument(tempFilePath, documentName);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No content extracted from PDF" },
        { status: 400 }
      );
    }

    console.log(`Generated ${chunks.length} chunks, storing in Pinecone...`);

    // Step 3: Format documents for Pinecone storage
    const documents = chunks.map((chunk, index) => ({
      pageContent: chunk.pageContent,
      metadata: {
        source: chunk.metadata?.source || documentName,
        page: String(chunk.metadata?.loc?.pageNumber || 0),
        uploadedAt: chunk.metadata?.uploadedAt || new Date().toISOString(),
        chunkIndex: String(index),
        namespace: namespace,
      },
    }));

    // Log first document metadata for debugging
    console.log(
      `First document metadata:`,
      JSON.stringify(documents[0]?.metadata)
    );

    // Step 4: Add documents to Pinecone (embeddings are generated automatically)
    const insertedIds = await addDocuments(documents);

    console.log(
      `Successfully stored ${insertedIds.length} documents in Pinecone`
    );

    // Step 5: Register document in the document registry for tracking
    await registerDocument({
      documentId: `${documentName}-${Date.now()}`,
      fileName: documentName,
      uploadedAt: new Date().toISOString(),
      namespace: namespace,
      totalChunks: chunks.length,
      status: "completed",
    });

    // Step 6: Clean up temporary file
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully processed and stored ${chunks.length} chunks from "${documentName}"`,
        stats: {
          totalChunks: chunks.length,
          totalDocuments: insertedIds.length,
          namespace,
          documentName,
          registered: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in upload-document endpoint:", error);

    // Clean up temporary file on error
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }

    const details = formatErrorDetails(error);

    return NextResponse.json(
      {
        success: false,
        error: details,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload-document
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Upload document endpoint is ready",
  });
}
