import { NextRequest, NextResponse } from "next/server";
import { formatErrorDetails } from "@/lib/api/error";
import { getCurrentUser, getUserNamespace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteVectorsForDocument } from "@/lib/rag/pinecone";
import { clearRegistry, syncRegistryWithPinecone } from "@/lib/rag/document-registry";

/**
 * DELETE /api/documents/[id]
 * Delete a document and its vectors from Pinecone
 *
 * Expected request body:
 * None - just the document ID in the URL
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = id;

    // Get authenticated user from session
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - no active session" },
        { status: 401 }
      );
    }

    console.log(`[${user.id}] Deleting document: ${documentId}`);

    // Verify document belongs to user
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Document not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get user's namespace
    const namespace = getUserNamespace(user.id);

    // Delete vectors from Pinecone
    try {
      await deleteVectorsForDocument(documentId, namespace);
      console.log(`[${user.id}] Deleted vectors for document: ${documentId}`);
    } catch (error) {
      console.warn(
        `[${user.id}] Warning: Could not delete vectors from Pinecone:`,
        error
      );
      // Continue anyway - we'll delete from DB
    }

    // Delete chunks from Prisma (cascades)
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    // Delete document from Prisma
    await prisma.document.delete({
      where: { id: documentId },
    });

    console.log(`[${user.id}] Successfully deleted document: ${documentId}`);

    // CRITICAL: Clear the document registry cache
    clearRegistry();
    console.log(`[${user.id}] Cleared document registry cache`);

    // Resync registry with Pinecone to remove deleted document from cache
    try {
      await syncRegistryWithPinecone(namespace);
      console.log(
        `[${user.id}] Resynced registry with Pinecone after deletion`
      );
    } catch (syncErr) {
      console.warn(
        `[${user.id}] Warning - could not resync registry:`,
        syncErr
      );
      // Not critical - registry will be synced on next query
    }

    return NextResponse.json(
      {
        success: true,
        message: `Document "${document.fileName}" deleted successfully`,
        documentId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in documents DELETE endpoint:", error);

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
