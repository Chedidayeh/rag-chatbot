import { NextRequest, NextResponse } from "next/server";
import { ragPipeline } from "@/lib/rag/chain";
import { formatErrorDetails } from "@/lib/api/error";

/**
 * POST /api/chat
 * Send a message and get a RAG-powered response
 *
 * Expected request body:
 * {
 *   "message": "What is this document about?",
 *   "conversationHistory": [ (optional)
 *     { "role": "user", "content": "..." },
 *     { "role": "assistant", "content": "..." }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      conversationHistory = [],
    } = body;

    // Validate input
    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: "message cannot be empty" },
        { status: 400 }
      );
    }

    console.log(`Processing chat message: "${message}"`);

    // Run RAG pipeline with default namespace
    const { response, retrievedDocs } = await ragPipeline(
      message,
      "default",
      conversationHistory
    );

    console.log("Successfully generated chat response");

    return NextResponse.json(
      {
        success: true,
        response,
        retrievedDocuments: retrievedDocs,
        documentCount: retrievedDocs.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in chat endpoint:", error);

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
 * GET /api/chat
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Chat endpoint is ready",
  });
}
