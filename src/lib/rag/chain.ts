import { GoogleGenerativeAI } from "@google/generative-ai";
import { queryVectors } from "./pinecone";
import { getEmbeddingsInstance } from "./embeddings";
import {
  getAllDocuments,
  formatDocumentsForDisplay,
  getDocumentStats,
} from "./document-registry";

/**
 * RAG Chain Configuration
 */
export const RAG_CONFIG = {
  topK: 5, // Number of similar documents to retrieve
  temperature: 0.7, // Controls randomness of responses
  maxTokens: 1024, // Maximum length of generated response
};

/**
 * Initialize Google Gemini client
 */
let geminiClient: GoogleGenerativeAI | null = null;

export const getGeminiClient = () => {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }

  return geminiClient;
};

/**
 * System prompt for the RAG chatbot
 */
const SYSTEM_PROMPT = `You are an expert AI assistant specialized in document analysis and retrieval-augmented generation (RAG).

**Your Core Responsibilities:**
1. Answer user questions ONLY based on the provided document context
2. Be accurate, precise, and evidence-based in all responses
3. Always cite page number when referencing information
4. Maintain professional, clear, and helpful communication

**Available Resources:**
- Multiple documents with metadata (source name, page number, relevance score)
- Conversation history for context
- User's current question

**Response Decision Logic:**
- If the question is too vague or general, ask the user to clarify what they want to know
- If multiple documents are available, let the user know and offer to focus on specific documents
- If you have enough context to answer, provide a detailed, evidence-based response
- Always decide the best way to respond based on the question clarity and available information

**Guidelines:**
- If information is not in the provided context, clearly state: "This information is not available in the provided documents."
- When referencing multiple documents, clearly distinguish between them
- Provide direct quotes from documents when answering factual questions
- Organize complex answers with clear sections and bullet points
- Highlight key findings, statistics, and important data from documents
- If asked about topics outside the documents, politely redirect to document content
- Use your judgment to ask clarifying questions when needed

**Response Format:**
- Start with a direct answer or clarification request
- Support your answer with specific document references
- Use page numbers, and section titles when available
- Provide context and explanation for technical or complex information
- End with relevant follow-up suggestions if applicable

**Quality Standards:**
- Accuracy > Completeness: Better to partially answer correctly than fully answer incorrectly
- Be concise but informative - avoid unnecessary verbosity
- Use professional language while remaining accessible
- Cross-reference information when multiple documents contain related content`;

/**
 * Check if a query is asking about available documents
 * @param query - User's question
 * @returns True if query is about document inventory
 */
const isDocumentInventoryQuery = (query: string): boolean => {
  const patterns = [
    /what.*document/i,
    /list.*document/i,
    /available.*document/i,
    /which.*document/i,
    /how.*many.*document/i,
    /show.*document/i,
    /catalog/i,
    /inventory/i,
    /what.*pdf/i,
    /what.*file/i,
    /all.*document/i,
    /total.*document/i,
  ];

  return patterns.some((pattern) => pattern.test(query));
};

/**
 * Retrieve relevant document chunks from Pinecone
 * @param query - User's question
 * @param topK - Number of results to retrieve
 * @param namespace - Namespace to search in
 * @param userId - User ID for logging
 * @returns Array of relevant document chunks
 */
export const retrieveRelevantDocuments = async (
  query: string,
  topK: number = RAG_CONFIG.topK,
  namespace: string = "default",
  userId?: string
) => {
  try {
    const userPrefix = userId ? `[${userId}]` : "";
    console.log(`${userPrefix} Retrieving ${topK} relevant documents for query: "${query}"`);

    // Get embeddings for the query
    const embeddings = await getEmbeddingsInstance();
    const queryEmbedding = await embeddings.embedQuery(query);

    // Query Pinecone with the embedding
    const results = await queryVectors(queryEmbedding, topK, namespace);

    if (results.length === 0) {
      console.log(`${userPrefix} No relevant documents found in Pinecone`);
      
      // Check if index is empty by querying the database
      const registryDocs = await getAllDocuments(namespace);
      if (registryDocs.length === 0) {
        console.log(`${userPrefix} ✓ Confirmed: Pinecone index is empty.`);
      }
      
      return [];
    }

    console.log(`${userPrefix} Found ${results.length} relevant documents`);

    // Map Pinecone results to expected format
    return results.map((result) => ({
      id: result.id,
      score: result.score || 0,
      text: (result.metadata?.text as string) || "",
      source: (result.metadata?.source as string) || "unknown",
      page: parseInt((result.metadata?.page as string) || "0"),
    }));
  } catch (error) {
    console.error("Error retrieving documents:", error);
    throw error;
  }
};

/**
 * Format retrieved documents into context string
 * @param documents - Array of retrieved documents
 * @returns Formatted context string
 */
export const formatContext = (
  documents: Array<{
    text: string;
    source: string;
    page: number;
    score: number;
  }>
): string => {
  if (documents.length === 0) {
    return "No relevant documents found.";
  }

  const context = documents
    .map(
      (doc, index) =>
        `Document ${index + 1} (from ${doc.source}, page ${doc.page}, relevance: ${(doc.score * 100).toFixed(1)}%):\n${doc.text}`
    )
    .join("\n\n---\n\n");

  return context;
};

/**
 * Format conversation history for better context understanding
 * @param conversationHistory - Previous messages
 * @returns Formatted conversation summary
 */
const formatConversationContext = (
  conversationHistory: Array<{ role: string; content: string }>
): string => {
  if (conversationHistory.length === 0) {
    return "";
  }

  const summary = conversationHistory
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  return `\n\nPrevious conversation context:\n${summary}`;
};

/**
 * Generate response using Gemini with RAG context
 * @param query - User's question
 * @param context - Retrieved context from documents
 * @param conversationHistory - Previous messages for context
 * @param retrievedDocs - Retrieved documents for analysis
 * @param namespace - Namespace being searched
 * @param userId - User ID for logging
 * @returns Generated response text
 */
export const generateResponse = async (
  query: string,
  context: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  retrievedDocs: Array<{
    text: string;
    source: string;
    page: number;
    score: number;
  }> = [],
  namespace: string = "default",
  userId?: string
) => {
  try {
    const userPrefix = userId ? `[${userId}]` : "";
    
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Format conversation history for context
    const conversationContext = formatConversationContext(conversationHistory);
    
    // Check if user is asking about available documents
    const isDocQuery = isDocumentInventoryQuery(query);
    
    // Get global document catalog
    let documentCatalog = "";
    try {
      // Fetch fresh document list from database
      const allDocuments = await getAllDocuments(namespace);
      const stats = await getDocumentStats(namespace);
      
      if (allDocuments.length > 0) {
        documentCatalog = `\n**Global Document Catalog:**\n`;
        documentCatalog += formatDocumentsForDisplay(allDocuments);
        documentCatalog += `\n**Catalog Statistics:**\n`;
        documentCatalog += `- Total Documents: ${stats.totalDocuments}\n`;
        documentCatalog += `- Total Chunks: ${stats.totalChunks}\n`;
        documentCatalog += `- Total Pages: ${stats.totalPages}\n`;
        documentCatalog += `- Average Chunks per Document: ${stats.averageChunksPerDocument}\n\n`;
      }
    } catch (error) {
      console.warn(`${userPrefix} Could not fetch document catalog:`, error);
    }
    
    // Get summary of retrieved documents for current query
    const sources = Array.from(
      new Set(retrievedDocs.map((doc) => doc.source))
    );
    const retrievedSummary = 
      sources.length > 0
        ? `\n**Retrieved Context for Current Query:**\n- Sources Found: ${sources.join(", ")}\n- Chunks Retrieved: ${retrievedDocs.length}\n`
        : "\n**Retrieved Context for Current Query:**\n- No specific documents matched this query\n";
    
    // Build comprehensive message with all context and resources
    const fullMessage = `${SYSTEM_PROMPT}

${documentCatalog}
${retrievedSummary}
**Retrieved Content:**
${context}

${conversationContext}

**User Question:**
${query}

Now, please respond appropriately based on the question clarity and available resources. Use your judgment to either:
1. Answer the question directly with evidence from documents
2. Ask for clarification if the question is too vague
3. Offer to focus on specific documents if multiple are available
4. ${isDocQuery ? "Provide a comprehensive list of all available documents with their details" : "Suggest more specific questions if needed"}`;

    // Filter and validate conversation history - ensure it starts with user and alternates correctly
    const validatedHistory = conversationHistory
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }))
      .filter((msg) => msg.parts[0].text && msg.parts[0].text.trim().length > 0);

    // Ensure history starts with user message (or is empty)
    let chatHistory = validatedHistory;
    if (chatHistory.length > 0 && chatHistory[0].role !== "user") {
      // If it starts with model, remove it
      chatHistory = chatHistory.slice(1);
    }

    console.log(`${userPrefix} Generating response with Gemini 2.5 Flash...`);
    console.log(`${userPrefix} Conversation history length: ${conversationHistory.length} messages`);
    console.log(`${userPrefix} Retrieved documents: ${retrievedDocs.length} chunks from ${sources.length} source(s)`);
    console.log(`${userPrefix} Available documents in catalog: ${documentCatalog ? "Yes" : "No"}`);

    // Start chat session with validated history
    const chat = model.startChat({
      history: chatHistory,
    });

    // Send the current message and get response
    const result = await chat.sendMessage(fullMessage);

    const response = result.response.text();

    console.log(`${userPrefix} Successfully generated response`);

    return response;
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
};

/**
 * Complete RAG pipeline: Retrieve documents and generate response
 * @param query - User's question
 * @param namespace - Namespace to search in
 * @param conversationHistory - Previous messages
 * @param userId - User ID for logging
 * @returns Generated response and retrieved documents
 */
export const ragPipeline = async (
  query: string,
  namespace: string = "default",
  conversationHistory: Array<{ role: string; content: string }> = [],
  userId?: string
) => {
  try {
    const userPrefix = userId ? `[${userId}]` : "";
    console.log(`${userPrefix} Starting RAG pipeline...`);

    // Step 1: Retrieve relevant documents
    const retrievedDocs = await retrieveRelevantDocuments(
      query,
      RAG_CONFIG.topK,
      namespace,
      userId
    );

    // Step 2: Format context
    const context = formatContext(retrievedDocs);

    // Step 3: Generate response (passing retrieved docs and namespace for analysis)
    const response = await generateResponse(
      query,
      context,
      conversationHistory,
      retrievedDocs,
      namespace,
      userId
    );

    return {
      response,
      retrievedDocs,
      context,
    };
  } catch (error) {
    console.error("Error in RAG pipeline:", error);
    throw error;
  }
};

