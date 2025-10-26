import { getPineconeIndex } from "./pinecone";

/**
 * Document Metadata Interface
 * Represents metadata about a processed document
 */
export interface DocumentMetadata {
  documentId: string; // Unique identifier (hash of filename + timestamp)
  fileName: string; // Original filename
  uploadedAt: string; // ISO timestamp
  namespace: string; // Pinecone namespace
  totalChunks: number; // Number of chunks created
  totalSize?: number; // File size in bytes (optional)
  pages?: number; // Total pages in PDF (optional)
  preview?: string; // First 200 chars of content
  status: "processing" | "completed" | "failed";
  processingTime?: number; // Time in milliseconds
  embeddingModel?: string; // Model used for embeddings
  keywords?: string[]; // Auto-extracted keywords
}

/**
 * In-memory document registry
 * Stores metadata about all processed documents
 * Syncs with Pinecone on startup and periodically
 */
const documentRegistry: Map<string, DocumentMetadata> = new Map();
let lastSyncTime: number = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Register a new document in the registry
 * @param metadata - Document metadata to register
 */
export const registerDocument = async (
  metadata: DocumentMetadata
): Promise<void> => {
  try {
    const documentId = metadata.documentId || `${metadata.fileName}-${Date.now()}`;
    
    const fullMetadata: DocumentMetadata = {
      ...metadata,
      documentId,
      status: "completed",
    };

    documentRegistry.set(documentId, fullMetadata);
    
    console.log(`✓ Registered document: "${metadata.fileName}" (${documentId})`);
  } catch (error) {
    console.error("Error registering document:", error);
    throw error;
  }
};

/**
 * Discover all documents currently stored in Pinecone
 * Queries metadata from all vectors to build a comprehensive document list
 * @param namespace - Optional namespace to search in
 * @returns Array of unique documents found in Pinecone
 */
export const discoverDocumentsFromPinecone = async (
  namespace?: string
): Promise<DocumentMetadata[]> => {
  try {
    console.log(
      `🔍 Discovering documents from Pinecone${namespace ? ` in namespace: ${namespace}` : ""}...`
    );

    const index = getPineconeIndex();
    const ns = index.namespace(namespace || "default");

    // List all vectors to get metadata
    // Note: This is a workaround. In production, use Pinecone's stats API if available
    const allDocuments = new Map<string, DocumentMetadata>();

    // Query with a broad search to get document metadata
    // Using a dummy query to retrieve maximum results
    const results = await ns.query({
      vector: new Array(768).fill(0.1), // Dummy vector (768 dims for Gemini embeddings)
      topK: 10000, // Get as many as possible
      includeMetadata: true,
    });

    // Extract unique documents from results
    if (results.matches && results.matches.length > 0) {
      const sourceMap = new Map<string, { count: number; pages: string[] }>();

      results.matches.forEach((match) => {
        const source = (match.metadata?.source as string) || "unknown";
        const page = (match.metadata?.page as string) || "0";

        if (!sourceMap.has(source)) {
          sourceMap.set(source, { count: 0, pages: [] });
        }

        const doc = sourceMap.get(source)!;
        doc.count++;
        if (!doc.pages.includes(page)) {
          doc.pages.push(page);
        }
      });

      // Convert to DocumentMetadata array
      sourceMap.forEach((data, source) => {
        const documentId = `${source}-${namespace || "default"}`;
        const pages = Math.max(...data.pages.map(p => parseInt(p))) + 1;

        allDocuments.set(documentId, {
          documentId,
          fileName: source,
          uploadedAt: new Date().toISOString(),
          namespace: namespace || "default",
          totalChunks: data.count,
          pages,
          status: "completed",
        });
      });
    }

    const discoveredDocs = Array.from(allDocuments.values());
    console.log(`✓ Discovered ${discoveredDocs.length} unique documents from Pinecone`);

    return discoveredDocs;
  } catch (error) {
    console.error("Error discovering documents from Pinecone:", error);
    throw error;
  }
};

/**
 * Sync registry with Pinecone
 * Discovers all documents currently stored and updates the registry
 * @param namespace - Optional namespace to sync
 */
export const syncRegistryWithPinecone = async (
  namespace?: string
): Promise<void> => {
  try {
    const now = Date.now();

    // Skip if synced recently
    if (now - lastSyncTime < SYNC_INTERVAL && documentRegistry.size > 0) {
      console.log("ℹ Registry recently synced, skipping...");
      return;
    }

    console.log("🔄 Syncing document registry with Pinecone...");

    const discoveredDocs = await discoverDocumentsFromPinecone(namespace);

    // Update registry
    discoveredDocs.forEach((doc) => {
      documentRegistry.set(doc.documentId, doc);
    });

    lastSyncTime = now;
    console.log(`✓ Registry synced. Total documents: ${documentRegistry.size}`);
  } catch (error) {
    console.error("Error syncing registry:", error);
    throw error;
  }
};

/**
 * Get all registered documents
 * @param namespace - Optional namespace filter
 * @returns Array of all documents
 */
export const getAllDocuments = async (
  namespace?: string
): Promise<DocumentMetadata[]> => {
  // Sync if needed
  await syncRegistryWithPinecone(namespace);

  if (namespace) {
    return Array.from(documentRegistry.values()).filter(
      (doc) => doc.namespace === namespace
    );
  }

  return Array.from(documentRegistry.values());
};

/**
 * Get a specific document by ID
 * @param documentId - Document ID to retrieve
 * @returns Document metadata or undefined
 */
export const getDocument = async (
  documentId: string
): Promise<DocumentMetadata | undefined> => {
  return documentRegistry.get(documentId);
};

/**
 * Get document statistics
 * @param namespace - Optional namespace filter
 * @returns Statistics about documents
 */
export const getDocumentStats = async (namespace?: string) => {
  const documents = await getAllDocuments(namespace);

  const stats = {
    totalDocuments: documents.length,
    totalChunks: documents.reduce((sum, doc) => sum + doc.totalChunks, 0),
    totalPages: documents.reduce((sum, doc) => sum + (doc.pages || 0), 0),
    totalSize: documents.reduce((sum, doc) => sum + (doc.totalSize || 0), 0),
    averageChunksPerDocument:
      documents.length > 0
        ? (documents.reduce((sum, doc) => sum + doc.totalChunks, 0) /
            documents.length).toFixed(1)
        : 0,
    documents: documents.map((doc) => ({
      fileName: doc.fileName,
      totalChunks: doc.totalChunks,
      pages: doc.pages,
      uploadedAt: doc.uploadedAt,
    })),
  };

  return stats;
};

/**
 * Get documents by status
 * @param status - Status to filter by
 * @param namespace - Optional namespace filter
 * @returns Array of documents with given status
 */
export const getDocumentsByStatus = async (
  status: "processing" | "completed" | "failed",
  namespace?: string
): Promise<DocumentMetadata[]> => {
  const documents = await getAllDocuments(namespace);
  return documents.filter((doc) => doc.status === status);
};

/**
 * Clear the registry (useful for reset)
 */
export const clearRegistry = (): void => {
  documentRegistry.clear();
  lastSyncTime = 0;
  console.log("Registry cleared");
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
 * Syncs with Pinecone to build initial document list
 */
export const initializeRegistry = async (): Promise<void> => {
  try {
    console.log("🚀 Initializing document registry...");
    await syncRegistryWithPinecone();
    console.log("✓ Document registry initialized");
  } catch (error) {
    console.error("Error initializing registry:", error);
    // Continue anyway - registry can be populated later
  }
};
