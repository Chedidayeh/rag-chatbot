import { NextRequest, NextResponse } from "next/server";
import {
  processPdfDocument,
  downloadFileFromUrl,
  cleanupTempFile,
} from "@/lib/rag/document-processor";
import { formatErrorDetails } from "@/lib/api/error";
import { getOrCreateUser, getUserNamespace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertVectors } from "@/lib/rag/pinecone";
import { getEmbeddingsInstance } from "@/lib/rag/embeddings";

/**
 * POST /api/upload-document
 * Upload a PDF document and store it in Pinecone
 *
 * Expected request body:
 * {
 *   "fileUrl": "https://uploadthing.com/file.pdf",
 *   "documentName": "my-document"
 * }
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const body = await request.json();
    const { fileUrl, documentName } = body;

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

    // Get authenticated user from session
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create or get user session" },
        { status: 500 }
      );
    }

    const userId = user.id;
    const namespace = getUserNamespace(userId);

    console.log(
      `[${userId}] Processing document: ${documentName} from URL: ${fileUrl}`
    );

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

    console.log(`[${userId}] Generated ${chunks.length} chunks`);

    // Step 3: Generate embeddings
    const embeddings = await getEmbeddingsInstance();
    const vectors = await embeddings.embedDocuments(
      chunks.map((chunk) => chunk.pageContent)
    );

    console.log(`[${userId}] Generated embeddings for ${vectors.length} chunks`);

    // Step 4: Create Document record in Prisma with full metadata
    const documentId = `${documentName}-${Date.now()}`;
    const uploadedAt = new Date().toISOString();
    const preview = chunks.length > 0 ? chunks[0].pageContent.substring(0, 200) : "";
    
    const dbDocument = await prisma.document.create({
      data: {
        userId,
        documentId,
        fileName: documentName,
        fileSize: 0, // Will calculate from chunks if needed
        fileType: "pdf",
        totalChunks: chunks.length,
        pages: chunks[chunks.length - 1]?.metadata?.loc?.pageNumber || 1,
        storageUrl: fileUrl,
        vectorized: true,
        description: `Uploaded on ${new Date().toLocaleDateString()}`,
        tags: [],
        namespace,
        uploadedAt: new Date(uploadedAt),
        status: "completed",
        embeddingModel: "gemini-2.5",
        keywords: [],
        preview,
      },
    });

    console.log(`[${userId}] Created document record: ${dbDocument.id}`);
    console.log(`[${userId}] Document registry entry created with ID: ${documentId}`);

    // Step 5: Upsert vectors to Pinecone with user namespace
    const vectorsToUpsert = vectors.map((vector, idx) => ({
      id: `${dbDocument.id}_chunk_${idx}`,
      values: vector,
      metadata: {
        documentId: dbDocument.id,
        userId,
        chunkIndex: idx,
        page: chunks[idx]?.metadata?.loc?.pageNumber || 1,
        text: chunks[idx].pageContent,
        source: documentName,
      },
    }));

    await upsertVectors(vectorsToUpsert, namespace);

    console.log(
      `[${userId}] Stored ${vectorsToUpsert.length} vectors in Pinecone`
    );

    // Step 6: Store chunks in database
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk, idx) => ({
        documentId: dbDocument.id,
        chunkIndex: idx,
        text: chunk.pageContent,
        page: chunk.metadata?.loc?.pageNumber,
        embedding: JSON.stringify(vectors[idx]),
      })),
    });

    console.log(`[${userId}] Stored ${chunks.length} chunks in database`);

    // Step 7: Clean up temporary file
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully processed and stored ${chunks.length} chunks from "${documentName}"`,
        stats: {
          totalChunks: chunks.length,
          totalVectors: vectorsToUpsert.length,
          documentId: dbDocument.id,
          documentName,
          namespace,
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
