import { NextRequest, NextResponse } from "next/server";
import { ragPipeline } from "@/lib/rag/chain";
import { formatErrorDetails } from "@/lib/api/error";
import { getOrCreateUser, getUserNamespace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Get or create user session (automatic session creation for first-time chat)
    const user = await getOrCreateUser();

    const userId = user.id;
    const namespace = getUserNamespace(userId);

    console.log(`[${userId}] Processing chat message: "${message}"`);

    // Run RAG pipeline with user-scoped namespace
    const { response, retrievedDocs } = await ragPipeline(
      message,
      namespace,
      conversationHistory,
      userId
    );

    console.log(`[${userId}] Successfully generated chat response`);

    // Optionally: Store chat message in database for history
    try {
      // Find or create chat session (simplified - can improve later)
      let chat = await prisma.chat.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            userId,
            title: message.substring(0, 50),
          },
        });
      }

      // Store user message
      await prisma.message.create({
        data: {
          chatId: chat.id,
          role: "user",
          content: message,
        },
      });

      // Store assistant message with retrieved docs
      await prisma.message.create({
        data: {
          chatId: chat.id,
          role: "assistant",
          content: response,
          retrievedDocs:
            retrievedDocs.length > 0 ? retrievedDocs : undefined,
        },
      });
    } catch (dbError) {
      console.warn(`[${userId}] Could not store chat message in database:`, dbError);
      // Continue anyway - DB storage is optional
    }

    return NextResponse.json(
      {
        success: true,
        response,
        retrievedDocuments: retrievedDocs,
        documentCount: user.documents?.length || 0,
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
