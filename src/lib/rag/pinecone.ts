import { Pinecone } from "@pinecone-database/pinecone";

/**
 * Initialize Pinecone client
 * Connects to Pinecone serverless index
 */
let pineconeClient: Pinecone | null = null;

export const getPineconeClient = () => {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY environment variable is not set");
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  return pineconeClient;
};

/**
 * Get Pinecone index instance
 * @param indexName - Name of the Pinecone index (defaults to env variable)
 */
export const getPineconeIndex = (indexName?: string) => {
  const client = getPineconeClient();
  const index = indexName || process.env.PINECONE_INDEX_NAME;

  if (!index) {
    throw new Error("PINECONE_INDEX_NAME environment variable is not set");
  }

  return client.Index(index);
};

/**
 * Upsert vectors to Pinecone
 * @param vectors - Array of vectors with id, values, and metadata
 * @param namespace - Optional namespace for organizing vectors
 */
export const upsertVectors = async (
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>,
  namespace?: string
) => {
  try {
    const index = getPineconeIndex();
    const ns = index.namespace(namespace || "default");

    await ns.upsert(
      vectors.map((v) => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata || {},
      }))
    );

    console.log(
      `Successfully upserted ${vectors.length} vectors to Pinecone${
        namespace ? ` in namespace: ${namespace}` : ""
      }`
    );
  } catch (error) {
    console.error("Error upserting vectors to Pinecone:", error);
    throw error;
  }
};

/**
 * Query vectors from Pinecone
 * @param queryVector - The query embedding vector
 * @param topK - Number of top results to return
 * @param namespace - Optional namespace to search in
 * @param filter - Optional metadata filter
 */
export const queryVectors = async (
  queryVector: number[],
  topK: number = 5,
  namespace?: string,
  filter?: Record<string, any>
) => {
  try {
    const index = getPineconeIndex();
    const ns = index.namespace(namespace || "default");

    const results = await ns.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    });

    return results.matches || [];
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    throw error;
  }
};

/**
 * Delete vectors from Pinecone
 * @param ids - Array of vector IDs to delete
 * @param namespace - Optional namespace
 */
export const deleteVectors = async (
  ids: string[],
  namespace?: string
) => {
  try {
    const index = getPineconeIndex();
    const ns = index.namespace(namespace || "default");

    await ns.deleteMany(ids);

    console.log(
      `Successfully deleted ${ids.length} vectors from Pinecone${
        namespace ? ` in namespace: ${namespace}` : ""
      }`
    );
  } catch (error) {
    console.error("Error deleting vectors from Pinecone:", error);
    throw error;
  }
};

/**
 * Delete all records from Pinecone index
 * @param namespace - Optional namespace (defaults to "default")
 * @param indexName - Optional index name (defaults to env variable)
 * @returns Object with success status and message
 */
export const deleteAllRecords = async (
  namespace?: string,
  indexName?: string
) => {
  try {
    const client = getPineconeClient();
    const index = indexName || process.env.PINECONE_INDEX_NAME;

    if (!index) {
      throw new Error("PINECONE_INDEX_NAME environment variable is not set");
    }

    const pineconeIndex = client.Index(index);
    const ns = pineconeIndex.namespace(namespace || "default");

    // Delete all vectors using deleteAll()
    await ns.deleteAll();

    console.log(
      `✓ Successfully deleted all records from Pinecone index "${index}"${
        namespace ? ` in namespace: ${namespace}` : ""
      }`
    );

    return {
      success: true,
      message: `All records deleted from index "${index}"${
        namespace ? ` in namespace: ${namespace}` : ""
      }`,
      namespace: namespace || "default",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error deleting all records from Pinecone:", error);
    throw error;
  }
};
