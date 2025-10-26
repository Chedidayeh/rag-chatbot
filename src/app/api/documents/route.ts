import { NextRequest, NextResponse } from "next/server";
import {
  getAllDocuments,
  getDocumentStats,
  formatDocumentsForDisplay,
  syncRegistryWithPinecone,
} from "@/lib/rag/document-registry";

/**
 * GET /api/documents
 * Get all available documents and statistics
 *
 * Query parameters:
 * - namespace: Optional namespace to filter by (default: "default")
 * - stats: Set to "true" to include statistics
 *
 * Response:
 * {
 *   "success": true,
 *   "totalDocuments": 5,
 *   "documents": [...],
 *   "stats": {...}  (optional)
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get("namespace") || "default";
    const includeStats = searchParams.get("stats") === "true";

    console.log(`Fetching documents from namespace: "${namespace}"`);

    // Sync registry with Pinecone to get latest documents
    await syncRegistryWithPinecone(namespace);

    // Get all documents
    const documents = await getAllDocuments(namespace);

    const baseResponse = {
      success: true,
      namespace,
      totalDocuments: documents.length,
      documents: documents.map((doc) => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        uploadedAt: doc.uploadedAt,
        totalChunks: doc.totalChunks,
        pages: doc.pages,
        status: doc.status,
      })),
      formatted: formatDocumentsForDisplay(documents),
    };

    if (includeStats) {
      const stats = await getDocumentStats(namespace);
      return NextResponse.json({ ...baseResponse, stats }, { status: 200 });
    }

    return NextResponse.json(baseResponse, { status: 200 });
  } catch (error) {
    console.error("Error in documents endpoint:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Manually sync registry with Pinecone
 *
 * Request body:
 * {
 *   "action": "sync",
 *   "namespace": "default" (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, namespace = "default" } = body;

    if (action === "sync") {
      console.log(`Syncing document registry for namespace: "${namespace}"`);
      await syncRegistryWithPinecone(namespace);

      const documents = await getAllDocuments(namespace);
      const stats = await getDocumentStats(namespace);

      return NextResponse.json(
        {
          success: true,
          message: `Registry synced. Found ${documents.length} documents.`,
          stats,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in documents POST endpoint:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
