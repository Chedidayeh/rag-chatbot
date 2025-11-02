import { NextResponse } from "next/server";
import { deleteAllRecords } from "@/lib/rag/pinecone";
import { prisma } from "@/lib/prisma";
import { formatErrorDetails } from "@/lib/api/error";

/**
 * POST /api/delete-all-records
 * Deletes all records from the Pinecone index and the database
 */
export async function POST() {
  try {
    // Delete all vectors from Pinecone
    const pineconeResult = await deleteAllRecords();

    // Delete all documents and chunks from database
    const deletedChunks = await prisma.documentChunk.deleteMany({});
    const deletedDocs = await prisma.document.deleteMany({});
    
    console.log(`✓ Deleted ${deletedDocs.count} documents from database`);
    console.log(`✓ Deleted ${deletedChunks.count} chunks from database`);

    return NextResponse.json({
      success: true,
      message: pineconeResult.message,
      deleted: {
        documents: deletedDocs.count,
        chunks: deletedChunks.count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in delete-all-records API:", error);

    const details = formatErrorDetails(error);

    return NextResponse.json(
      {
        success: false,
        error: details,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
