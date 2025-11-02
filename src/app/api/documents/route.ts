import { NextResponse } from "next/server";
import { formatErrorDetails } from "@/lib/api/error";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/documents
 * Get all documents for the current user
 *
 * Response:
 * {
 *   "success": true,
 *   "documents": [
 *     {
 *       "id": "doc_id",
 *       "fileName": "document.pdf",
 *       "fileSize": 102400,
 *       "totalChunks": 45,
 *       "pages": 10,
 *       "uploadedAt": "2024-01-01T12:00:00Z",
 *       "tags": []
 *     }
 *   ]
 * }
 */
export async function GET() {
  try {
    // Get authenticated user from session
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - no active session" },
        { status: 401 }
      );
    }

    console.log(`[${user.id}] Fetching documents`);

    // Get all documents for this user
    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    const formattedDocs = documents.map((doc: typeof documents[0]) => ({
      id: doc.id,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      totalChunks: doc.totalChunks,
      pages: doc.pages,
      uploadedAt: doc.createdAt,
      tags: doc.tags,
      description: doc.description,
      vectorized: doc.vectorized,
    }));

    return NextResponse.json(
      {
        success: true,
        documents: formattedDocs,
        totalDocuments: formattedDocs.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in documents GET endpoint:", error);

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
 * POST /api/documents
 * Delete a document (will be implemented in separate route)
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Use DELETE /api/documents/[id] instead",
    },
    { status: 400 }
  );
}
