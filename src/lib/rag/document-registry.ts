import { prisma } from "@/lib/prisma";

/**
 * Document Metadata Interface
 * Represents metadata about a processed document
 * Now backed by Prisma Document model instead of in-memory registry
 */
export interface DocumentMetadata {
  documentId: string;
  fileName: string;
  uploadedAt: string;
  namespace: string;
  totalChunks: number;
  totalSize?: number;
  pages?: number;
  preview?: string;
  status: "processing" | "completed" | "failed";
  processingTime?: number;
  embeddingModel?: string;
  keywords?: string[];
}

/**
 * Register a new document in the database
 * @param metadata - Document metadata to register
 * @param userId - User ID to associate with document
 */
export const registerDocument = async (
  metadata: DocumentMetadata,
  userId: string
): Promise<void> => {
  try {
    const documentId = metadata.documentId || `${metadata.fileName}-${Date.now()}`;

    // Check if document already exists
    const existing = await prisma.document.findUnique({
      where: { documentId },
    });

    if (existing) {
      // Update existing document
      await prisma.document.update({
        where: { documentId },
        data: {
          status: "completed",
          embeddingModel: metadata.embeddingModel,
          keywords: metadata.keywords || [],
          preview: metadata.preview,
          processingTime: metadata.processingTime,
          uploadedAt: new Date(metadata.uploadedAt),
        },
      });
      console.log(
        `✓ Updated document: "${metadata.fileName}" (${documentId})`
      );
    } else {
      // Create new document
      await prisma.document.create({
        data: {
          userId,
          documentId,
          fileName: metadata.fileName,
          fileSize: metadata.totalSize || 0,
          fileType: "pdf",
          totalChunks: metadata.totalChunks,
          pages: metadata.pages,
          storageUrl: "",
          namespace: metadata.namespace,
          status: "completed",
          embeddingModel: metadata.embeddingModel,
          keywords: metadata.keywords || [],
          preview: metadata.preview,
          processingTime: metadata.processingTime,
          uploadedAt: new Date(metadata.uploadedAt),
          vectorized: true,
        },
      });
      console.log(
        `✓ Registered document: "${metadata.fileName}" (${documentId})`
      );
    }
  } catch (error) {
    console.error("Error registering document:", error);
    throw error;
  }
};

/**
 * Get all registered documents
 * @param namespace - Optional namespace filter
 * @param userId - Optional user ID filter
 * @returns Array of all documents
 */
export const getAllDocuments = async (
  namespace?: string,
  userId?: string
): Promise<DocumentMetadata[]> => {
  try {
    const documents = await prisma.document.findMany({
      where: {
        ...(namespace ? { namespace } : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: { uploadedAt: "desc" },
    });

    return documents.map((doc) => ({
      documentId: doc.documentId,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt.toISOString(),
      namespace: doc.namespace,
      totalChunks: doc.totalChunks,
      totalSize: doc.fileSize,
      pages: doc.pages || undefined,
      preview: doc.preview || undefined,
      status: (doc.status as "processing" | "completed" | "failed") ||
        "completed",
      processingTime: doc.processingTime || undefined,
      embeddingModel: doc.embeddingModel || undefined,
      keywords: doc.keywords || [],
    }));
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};

/**
 * Get a specific document by ID
 * @param documentId - Document ID to retrieve
 * @returns Document metadata or undefined
 */
export const getDocument = async (
  documentId: string
): Promise<DocumentMetadata | undefined> => {
  try {
    const doc = await prisma.document.findUnique({
      where: { documentId },
    });

    if (!doc) return undefined;

    return {
      documentId: doc.documentId,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt.toISOString(),
      namespace: doc.namespace,
      totalChunks: doc.totalChunks,
      totalSize: doc.fileSize,
      pages: doc.pages || undefined,
      preview: doc.preview || undefined,
      status: (doc.status as "processing" | "completed" | "failed") ||
        "completed",
      processingTime: doc.processingTime || undefined,
      embeddingModel: doc.embeddingModel || undefined,
      keywords: doc.keywords || [],
    };
  } catch (error) {
    console.error("Error fetching document:", error);
    throw error;
  }
};

/**
 * Get document statistics
 * @param namespace - Optional namespace filter
 * @param userId - Optional user ID filter
 * @returns Statistics about documents
 */
export const getDocumentStats = async (
  namespace?: string,
  userId?: string
) => {
  try {
    const documents = await getAllDocuments(namespace, userId);

    const stats = {
      totalDocuments: documents.length,
      totalChunks: documents.reduce((sum, doc) => sum + doc.totalChunks, 0),
      totalPages: documents.reduce((sum, doc) => sum + (doc.pages || 0), 0),
      totalSize: documents.reduce((sum, doc) => sum + (doc.totalSize || 0), 0),
      averageChunksPerDocument:
        documents.length > 0
          ? (
              documents.reduce((sum, doc) => sum + doc.totalChunks, 0) /
              documents.length
            ).toFixed(1)
          : 0,
      documents: documents.map((doc) => ({
        fileName: doc.fileName,
        totalChunks: doc.totalChunks,
        pages: doc.pages,
        uploadedAt: doc.uploadedAt,
      })),
    };

    return stats;
  } catch (error) {
    console.error("Error calculating document stats:", error);
    throw error;
  }
};

/**
 * Get documents by status
 * @param status - Status to filter by
 * @param namespace - Optional namespace filter
 * @param userId - Optional user ID filter
 * @returns Array of documents with given status
 */
export const getDocumentsByStatus = async (
  status: "processing" | "completed" | "failed",
  namespace?: string,
  userId?: string
): Promise<DocumentMetadata[]> => {
  try {
    const documents = await getAllDocuments(namespace, userId);
    return documents.filter((doc) => doc.status === status);
  } catch (error) {
    console.error("Error fetching documents by status:", error);
    throw error;
  }
};

/**
 * Clear all documents (useful for reset)
 * @param namespace - Optional namespace to clear (if not provided, clears all)
 * @param userId - Optional user ID to filter (if not provided, clears all)
 */
export const clearRegistry = async (
  namespace?: string,
  userId?: string
): Promise<void> => {
  try {
    const result = await prisma.document.deleteMany({
      where: {
        ...(namespace ? { namespace } : {}),
        ...(userId ? { userId } : {}),
      },
    });

    console.log(`Registry cleared - deleted ${result.count} documents`);
  } catch (error) {
    console.error("Error clearing registry:", error);
    throw error;
  }
};

/**
 * Format documents for display to users
 * @param documents - Array of documents to format
 * @returns Formatted string for display
 */
export const formatDocumentsForDisplay = (
  documents: DocumentMetadata[]
): string => {
  if (documents.length === 0) {
    return "No documents available at this time.";
  }

  let formatted = `📚 **Document Catalog** (${documents.length} documents available)\n\n`;

  documents.forEach((doc, index) => {
    formatted += `${index + 1}. **${doc.fileName}**\n`;
    formatted += `   📄 Chunks: ${doc.totalChunks}`;
    if (doc.pages) {
      formatted += ` | 📖 Pages: ${doc.pages}`;
    }
    formatted += `\n`;
    formatted += `   📅 Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}\n`;
    if (doc.preview) {
      formatted += `   📝 Preview: ${doc.preview.substring(0, 100)}...\n`;
    }
    formatted += `\n`;
  });

  return formatted;
};

/**
 * Initialize registry on startup
 * With Prisma backend, this is now a no-op since data persists
 */
export const initializeRegistry = async (): Promise<void> => {
  try {
    console.log("🚀 Initializing document registry...");
    const count = await prisma.document.count();
    console.log(`✓ Document registry initialized - ${count} documents found in database`);
  } catch (error) {
    console.error("Error initializing registry:", error);
    // Continue anyway - documents can be queried later
  }
};

/**
 * Sync registry with Pinecone (legacy - now a no-op)
 * Data is persisted in Prisma database, no in-memory sync needed
 */
export const syncRegistryWithPinecone = async (
  namespace?: string,
  userId?: string
): Promise<void> => {
  try {
    console.log("🔄 Registry sync check...");
    const count = await prisma.document.count({
      where: {
        ...(namespace ? { namespace } : {}),
        ...(userId ? { userId } : {}),
      },
    });
    console.log(
      `✓ Registry check complete - ${count} documents in database`
    );
  } catch (error) {
    console.error("Error syncing registry:", error);
    throw error;
  }
};

/**
 * Discover documents from Pinecone (legacy - data now stored in Prisma)
 * This function is kept for backward compatibility but now reads from Prisma
 */
export const discoverDocumentsFromPinecone = async (
  namespace?: string,
  userId?: string
): Promise<DocumentMetadata[]> => {
  console.log(
    `🔍 Discovering documents${namespace ? ` in namespace: ${namespace}` : ""}...`
  );
  // Simply return documents from database
  return getAllDocuments(namespace, userId);
};
