import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

/**
 * Initialize Google Generative AI Embeddings
 * Using text-embedding-004 model for semantic search
 * Returns 1536-dimensional vectors
 */
export const getEmbeddings = () => {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: "models/text-embedding-004",
  });
};

/**
 * Export singleton instance for reuse
 */
let embeddingsInstance: GoogleGenerativeAIEmbeddings | null = null;

export const getEmbeddingsInstance = async () => {
  if (!embeddingsInstance) {
    embeddingsInstance = getEmbeddings();
  }
  return embeddingsInstance;
};
