// ============================================
// IMPORTS - Dependencies for vector storage
// ============================================
import { upsertVectors } from "./pinecone"; // Function to store vectors in Pinecone
import { getEmbeddingsInstance } from "./embeddings"; // Function to get embeddings model
import { generateChunkId } from "./document-processor"; // Function to generate unique chunk IDs

// ============================================
// INTERFACE - Data structure for documents
// ============================================
/**
 * Interface defining the structure of a document to be added to the vector store
 * 
 * INPUT STRUCTURE:
 * - pageContent: string - The actual text/content of the document chunk
 * - metadata: object - Additional information about the document
 *   - source?: string - Document source (file name, URL, etc.)
 *   - page?: string - Page number from the original document
 *   - uploadedAt?: string - ISO timestamp when document was uploaded
 *   - chunkIndex?: string - Index of this chunk within the document
 *   - [key: string]: unknown - Allows additional custom metadata
 */
interface DocumentToAdd {
  pageContent: string;
  metadata: {
    source?: string;
    page?: string;
    uploadedAt?: string;
    chunkIndex?: string;
    [key: string]: unknown;
  };
}

/**
 * Add documents to Pinecone vector store
 * Generates embeddings and stores them with metadata
 * 
 * PROCESS FLOW:
 * 1. Takes an array of document chunks
 * 2. Converts text content into vector embeddings (high-dimensional numbers)
 * 3. Stores vectors with metadata in Pinecone database
 * 4. Returns the IDs of stored documents for reference
 * 
 * @param documents - Array of documents to add
 *        INPUT: DocumentToAdd[] = [
 *          {
 *            pageContent: "Some text content...",
 *            metadata: { source: "file.pdf", page: "1", ... }
 *          },
 *          ...
 *        ]
 * @param namespace - Namespace to store documents in (default: "default")
 *        INPUT: string (e.g., "user123", "project-docs", "default")
 * 
 * @returns Array of document IDs that were inserted
 *        OUTPUT: string[] = ["chunk_1_file.pdf", "chunk_2_file.pdf", ...]
 */
export const addDocuments = async (
  documents: DocumentToAdd[],
  namespace: string = "default"
) => {
  try {
    // ============================================
    // STEP 1: LOG - Initialize the operation
    // ============================================
    // Logs how many documents will be processed and to which namespace
    console.log(
      `Adding ${documents.length} documents to Pinecone in namespace: ${namespace}`
    );

    // ============================================
    // STEP 2: GET EMBEDDINGS INSTANCE
    // ============================================
    // Retrieves the embeddings model instance (e.g., gemini embeddings)
    // This model converts text into vector representations
    // INPUT: none (fetches from configuration)
    // OUTPUT: Embeddings instance that can convert text to vectors
    const embeddings = await getEmbeddingsInstance();

    // ============================================
    // STEP 3: GENERATE EMBEDDINGS FOR ALL DOCUMENTS
    // ============================================
    // Converts the text content of each document into vector embeddings
    // INPUT: Array of strings (document contents)
    //   ["text chunk 1", "text chunk 2", ...]
    // OUTPUT: 2D array of numbers (vectors)
    //   [[0.123, 0.456, ...], [0.789, 0.012, ...], ...]
    const embeddings_array = await embeddings.embedDocuments(
      documents.map((doc) => doc.pageContent)
    );

    // ============================================
    // STEP 4: FORMAT DOCUMENTS FOR PINECONE
    // ============================================
    // Structures each document with its embedding and metadata
    // Creates the exact format that Pinecone expects
    // INPUT: Original documents + embeddings from step 3
    // OUTPUT: Array of objects ready for Pinecone:
    //   [{
    //     id: "unique_chunk_id",
    //     values: [0.123, 0.456, ...],  (embedding vectors)
    //     metadata: { text: "...", source: "...", ... }
    //   }, ...]
    const vectors = documents.map((doc, index) => {
      // Generate a unique ID for this chunk
      // INPUT: source filename + index
      // OUTPUT: unique string like "chunk_1_document.pdf"
      const chunkId = generateChunkId(
        doc.metadata?.source || "unknown",
        index
      );

      // Log metadata for first chunk
      if (index === 0) {
        console.log(
          `First chunk - source: "${doc.metadata?.source}", chunkId: "${chunkId}"`
        );
      }

      // Return Pinecone vector object
      return {
        id: chunkId, // Unique identifier
        values: embeddings_array[index], // The embedding vector (numerical representation of text)
        metadata: {
          text: doc.pageContent, // Original text content
          source: doc.metadata?.source || "unknown", // Where the document came from
          page: doc.metadata?.page || "0", // Page number from source
          uploadedAt: doc.metadata?.uploadedAt || new Date().toISOString(), // When it was uploaded
          chunkIndex: doc.metadata?.chunkIndex || String(index), // Position in document
        },
      };
    });

    // ============================================
    // STEP 5: UPSERT VECTORS TO PINECONE
    // ============================================
    // Sends the vectors and metadata to Pinecone database
    // "Upsert" = Update if exists, Insert if new
    // INPUT: vectors array + namespace
    // OUTPUT: Data stored in Pinecone vector database
    await upsertVectors(vectors, namespace);

    // ============================================
    // STEP 6: LOG SUCCESS
    // ============================================
    // Confirms successful storage
    console.log(
      `Successfully added ${documents.length} documents to Pinecone`
    );

    // ============================================
    // STEP 7: RETURN RESULTS
    // ============================================
    // Returns the IDs of all inserted documents for tracking
    // OUTPUT: Array of string IDs
    //   ["chunk_1_file.pdf", "chunk_2_file.pdf", ...]
    return vectors.map((v) => v.id);
  } catch (error) {
    // ============================================
    // ERROR HANDLING
    // ============================================
    // Logs any errors that occur during the process
    // Re-throws the error for the caller to handle
    console.error("Error adding documents to Pinecone:", error);
    throw error;
  }
};
