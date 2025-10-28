import { NextResponse } from "next/server";
import { deleteAllRecords } from "@/lib/rag/pinecone";
import { clearRegistry } from "@/lib/rag/document-registry";
import { formatErrorDetails } from "@/lib/api/error";

/**
 * POST /api/delete-all-records
 * Deletes all records from the Pinecone index and clears the registry/cache
 */
export async function POST() {
  try {
    const result = await deleteAllRecords();

    // Clear the document registry and cache memory
    clearRegistry();
    console.log("✓ Document registry and cache cleared");

    return NextResponse.json({
      success: true,
      message: result.message,
      registryCleared: true,
      cacheCleared: true,
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
