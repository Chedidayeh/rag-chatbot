// ============================================
// IMPORTS - Dependencies for document processing
// ============================================
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"; // Loads PDF files
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"; // Splits text into chunks
import { Document } from "@langchain/core/documents"; // Document type from LangChain
import * as fs from "fs"; // File system operations
import * as path from "path"; // Path manipulation utilities
import * as os from "os"; // OS utilities (for temp dir)

// ============================================
// CONFIGURATION - Chunking settings
// ============================================
/**
 * Configuration for document chunking
 * These settings determine how documents are split into smaller pieces
 * for vector embedding and storage
 */
export const CHUNK_CONFIG = {
  chunkSize: 1000, // Size of each chunk in characters (1000 chars per chunk)
  chunkOverlap: 200, // Overlap between chunks to maintain context (200 chars overlap)
};

// ============================================
// FUNCTION 1: LOAD PDF DOCUMENT
// ============================================
/**
 * Load and extract text from a PDF file
 * 
 * PURPOSE:
 * - Reads a PDF file from disk
 * - Extracts text and page information
 * - Returns structured Document objects
 * 
 * PROCESS:
 * 1. Validates that the file exists
 * 2. Uses PDFLoader to parse the PDF
 * 3. Extracts text from each page
 * 
 * @param filePath - Path to the PDF file
 *        INPUT: string (e.g., "c:\Users\Documents\report.pdf")
 * 
 * @returns Array of Document objects with extracted text
 *        OUTPUT: Document[] = [
 *          {
 *            pageContent: "The text extracted from page...",
 *            metadata: { loc: { pageNumber: 1 }, ... }
 *          },
 *          ...
 *        ]
 */
export const loadPdfDocument = async (filePath: string) => {
  try {
    // Validate file exists before processing
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found: ${filePath}`);
    }

    console.log(`Loading PDF from: ${filePath}`);

    // Create PDF loader and extract documents
    const loader = new PDFLoader(filePath);
    const documents = await loader.load();

    console.log(
      `Successfully loaded PDF with ${documents.length} pages/documents`
    );

    return documents;
  } catch (error) {
    console.error("Error loading PDF:", error);
    throw error;
  }
};

// ============================================
// FUNCTION 2: CHUNK DOCUMENTS
// ============================================
/**
 * Split documents into smaller chunks
 * 
 * PURPOSE:
 * - Breaks large documents into smaller, manageable pieces
 * - Maintains context with overlapping chunks
 * - Prepares documents for embedding and storage
 * 
 * HOW IT WORKS:
 * Uses RecursiveCharacterTextSplitter which:
 * 1. Tries to split on paragraph breaks (\n\n)
 * 2. Falls back to line breaks (\n)
 * 3. Then tries space separation ( )
 * 4. Finally splits individual characters if needed
 * 
 * This recursive approach maintains context and readability
 * 
 * @param documents - Array of Document objects
 *        INPUT: Document[] = [
 *          {
 *            pageContent: "Large text content that needs chunking...",
 *            metadata: { source: "file.pdf", ... }
 *          }
 *        ]
 * 
 * @returns Array of chunked documents
 *        OUTPUT: Document[] = [
 *          {
 *            pageContent: "Chunk 1 text (1000 chars)...",
 *            metadata: { ... }
 *          },
 *          {
 *            pageContent: "Chunk 2 text (1000 chars)...",
 *            metadata: { ... }
 *          },
 *          ...
 *        ]
 *        (Each chunk is ~1000 chars with 200 char overlap)
 */
export const chunkDocuments = async (documents: Document[]) => {
  try {
    // Create text splitter with configuration
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_CONFIG.chunkSize, // 1000 characters per chunk
      chunkOverlap: CHUNK_CONFIG.chunkOverlap, // 200 characters overlap between chunks
      separators: ["\n\n", "\n", " ", ""], // Try these separators in order
    });

    // Split all documents into chunks
    const chunkedDocuments = await splitter.splitDocuments(documents);

    console.log(
      `Successfully split documents into ${chunkedDocuments.length} chunks`
    );

    return chunkedDocuments;
  } catch (error) {
    console.error("Error chunking documents:", error);
    throw error;
  }
};

// ============================================
// FUNCTION 3: PROCESS PDF DOCUMENT (END-TO-END)
// ============================================
/**
 * Process a PDF file end-to-end: Load -> Extract -> Chunk
 * 
 * PURPOSE:
 * - Main entry point for document processing
 * - Combines loading, metadata addition, and chunking in one function
 * - Simplifies the workflow for processing uploaded PDFs
 * 
 * WORKFLOW:
 * 1. Load PDF file → Extract pages
 * 2. Add metadata (source, upload timestamp)
 * 3. Chunk documents → Split into manageable pieces
 * 4. Return all chunks ready for embedding
 * 
 * @param filePath - Path to the PDF file
 *        INPUT: string (e.g., "c:\Users\Documents\report.pdf")
 * 
 * @param documentName - Optional name for the document (for metadata)
 *        INPUT: string | undefined (e.g., "Annual Report 2024")
 *        (If not provided, uses the filename)
 * 
 * @returns Array of processed chunks ready for embedding
 *        OUTPUT: Document[] = [
 *          {
 *            pageContent: "Chunk 1 text...",
 *            metadata: {
 *              source: "Annual Report 2024",
 *              uploadedAt: "2025-10-26T10:30:00.000Z",
 *              loc: { pageNumber: 1 },
 *              ...
 *            }
 *          },
 *          ...
 *        ]
 *        (Total chunks depends on document size and CHUNK_CONFIG)
 */
export const processPdfDocument = async (
  filePath: string,
  documentName?: string
) => {
  try {
    // ============================================
    // STEP 1: Load PDF
    // ============================================
    const documents = await loadPdfDocument(filePath);

    // ============================================
    // STEP 2: Add document name to metadata
    // ============================================
    // Use provided name or extract from file path
    const docName = documentName || path.basename(filePath);
    
    // Add source and uploadedAt to metadata of each page
    const documentsWithMetadata = documents.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: docName, // Document name for tracking
        uploadedAt: new Date().toISOString(), // Timestamp when processed
      },
    }));

    // ============================================
    // STEP 3: Chunk documents
    // ============================================
    const chunks = await chunkDocuments(documentsWithMetadata);

    console.log(
      `Successfully processed PDF "${docName}" into ${chunks.length} chunks`
    );

    return chunks;
  } catch (error) {
    console.error("Error processing PDF document:", error);
    throw error;
  }
};

// ============================================
// FUNCTION 4: GENERATE CHUNK ID
// ============================================
/**
 * Generate unique ID for each chunk
 * 
 * PURPOSE:
 * - Creates a unique identifier for each document chunk
 * - Used for tracking chunks in the vector database
 * - Combines document name and chunk index
 * 
 * HOW IT WORKS:
 * 1. Replaces special characters in document name with underscores
 * 2. Combines with chunk index
 * 3. Result: safe string ID with no special characters
 * 
 * @param documentName - Name of the document
 *        INPUT: string (e.g., "Annual_Report_2024.pdf", "meeting-notes.txt")
 * 
 * @param chunkIndex - Index of the chunk (0, 1, 2, ...)
 *        INPUT: number (e.g., 0, 1, 2)
 * 
 * @returns Unique chunk ID
 *        OUTPUT: string (e.g., "Annual_Report_2024_pdf_chunk_0")
 */
export const generateChunkId = (
  documentName: string,
  chunkIndex: number
): string => {
  // Replace special characters with underscores for safe IDs
  return `${documentName.replace(/[^a-zA-Z0-9]/g, "_")}_chunk_${chunkIndex}`;
};

// ============================================
// FUNCTION 5: FORMAT CHUNKS FOR STORAGE
// ============================================
/**
 * Format documents for vector storage with embeddings
 * 
 * PURPOSE:
 * - Combines chunks with their embeddings
 * - Formats data into Pinecone-ready structure
 * - Preserves all necessary metadata for retrieval
 * 
 * WORKFLOW:
 * 1. Takes document chunks and their embeddings
 * 2. Extracts document source from metadata
 * 3. Maps each chunk to a Pinecone vector object
 * 4. Combines text, embeddings, and metadata
 * 
 * @param chunks - Array of document chunks
 *        INPUT: Document[] = [
 *          {
 *            pageContent: "Chunk 1 text...",
 *            metadata: { source: "report.pdf", loc: { pageNumber: 1 }, ... }
 *          },
 *          ...
 *        ]
 * 
 * @param embeddings - Array of embedding vectors (must match chunks length)
 *        INPUT: number[][] = [
 *          [0.123, 0.456, 0.789, ...],  // Embedding for chunk 1
 *          [0.234, 0.567, 0.890, ...],  // Embedding for chunk 2
 *          ...
 *        ]
 *        (Each embedding is a 1536-dimensional vector from OpenAI)
 * 
 * @returns Array of formatted vectors ready for storage
 *        OUTPUT: VectorObject[] = [
 *          {
 *            id: "report_pdf_chunk_0",
 *            values: [0.123, 0.456, 0.789, ...],
 *            metadata: {
 *              text: "Chunk 1 text...",
 *              source: "report.pdf",
 *              page: 1,
 *              uploadedAt: "2025-10-26T10:30:00.000Z",
 *              chunkIndex: 0
 *            }
 *          },
 *          ...
 *        ]
 */
export const formatChunksForStorage = (
  chunks: Document[],
  embeddings: number[][]
) => {
  // Extract document source from first chunk's metadata
  const documentSource = chunks[0]?.metadata?.source || "unknown";

  // Map each chunk to a Pinecone vector object
  return chunks.map((chunk, index) => ({
    id: generateChunkId(documentSource, index), // Unique ID combining source + index
    values: embeddings[index], // The embedding vector (numerical representation)
    metadata: {
      text: chunk.pageContent, // Original chunk text
      source: chunk.metadata?.source || "unknown", // Document source
      page: chunk.metadata?.loc?.pageNumber || 0, // Page number from PDF
      uploadedAt: chunk.metadata?.uploadedAt || new Date().toISOString(), // Upload timestamp
      chunkIndex: index, // Position in document
    },
  }));
};

// ============================================
// FUNCTION 6: DOWNLOAD FILE FROM URL
// ============================================
/**
 * Download file from URL to temporary location
 * 
 * PURPOSE:
 * - Downloads files from external URLs
 * - Stores them temporarily for processing
 * - Returns path to downloaded file for further processing
 * 
 * WORKFLOW:
 * 1. Create temp directory if it doesn't exist
 * 2. Fetch file from URL
 * 3. Convert to buffer
 * 4. Save to disk in temp folder
 * 5. Return path to saved file
 * 
 * @param url - URL of the file to download
 *        INPUT: string (e.g., "https://example.com/document.pdf")
 * 
 * @param fileName - Name for the saved file
 *        INPUT: string (e.g., "document.pdf", "report_2024.pdf")
 * 
 * @returns Path to the downloaded file
 *        OUTPUT: string (e.g., "c:\Users\Desktop\RAG Chatbot\chat-bot\tmp\document.pdf")
 */
export const downloadFileFromUrl = async (
  url: string,
  fileName: string
): Promise<string> => {
  try {
    // ============================================
    // STEP 1: Create temp directory (use OS temp dir on serverless)
    // ============================================
    // On platforms like Vercel/AWS Lambda, writing to process.cwd() is not allowed.
    // Use the platform-provided temp directory (os.tmpdir()) which typically
    // resolves to '/tmp' and is writable. Fall back to a local 'tmp' folder
    // in the project root only if necessary.
    const baseTempDir = os.tmpdir() || process.env.TMPDIR || path.join(process.cwd(), "tmp");
    const tempDir = path.join(baseTempDir, "rag-chatbot");

    // Ensure the temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // ============================================
    // STEP 2: Prepare file path
    // ============================================
    const filePath = path.join(tempDir, fileName);

    // ============================================
    // STEP 3: Fetch file from URL
    // ============================================
    const response = await fetch(url);

    // Check if fetch was successful
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // ============================================
    // STEP 4: Convert to buffer and save to disk
    // ============================================
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    console.log(`Successfully downloaded file to: ${filePath}`);

    // ============================================
    // STEP 5: Return path to saved file
    // ============================================
    return filePath;
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};

// ============================================
// FUNCTION 7: CLEANUP TEMPORARY FILES
// ============================================
/**
 * Clean up temporary files
 * 
 * PURPOSE:
 * - Deletes temporary files after processing
 * - Prevents disk space waste
 * - Called after file has been processed and stored
 * 
 * WORKFLOW:
 * 1. Check if file exists
 * 2. Delete file from disk
 * 3. Log the cleanup
 * 4. Handle errors gracefully
 * 
 * @param filePath - Path to the file to delete
 *        INPUT: string (e.g., "c:\Users\Desktop\RAG Chatbot\chat-bot\tmp\document.pdf")
 * 
 * @returns void (no return value, file is deleted)
 *        OUTPUT: File deleted from disk, console log message
 */
export const cleanupTempFile = (filePath: string) => {
  try {
    // Check if file exists before attempting deletion
    if (fs.existsSync(filePath)) {
      // Delete the file from disk
      fs.unlinkSync(filePath);
      console.log(`Cleaned up temporary file: ${filePath}`);
    }
  } catch (error) {
    // Log error but don't throw - cleanup failures shouldn't crash the app
    console.error("Error cleaning up temporary file:", error);
  }
};
