import { NextResponse } from "next/server";
import { deleteAllRecords } from "@/lib/rag/pinecone";

/**
 * POST /api/delete-all-records
 * Deletes all records from the Pinecone index
 */
export async function POST() {
  try {
    const result = await deleteAllRecords();

    return NextResponse.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in delete-all-records API:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete records",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
