import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getVectorStore } from "@/core/pinecone/client";

export const pineconeSearch = tool(
  async ({ query }, config) => {
    const userId = config.configurable?.userId;

    if (!userId) {
      return "Error: userId is missing from config.";
    }

    try {
      const vectorStore = await getVectorStore(userId);
      const results = await vectorStore.similaritySearch(query, 4);

      if (results.length === 0) {
        return "No relevant documents found in your uploaded sources.";
      }

      return JSON.stringify(
        results.map((r) => ({
          content: r.pageContent,
          metadata: r.metadata,
        }))
      );
    } catch (error) {
      console.error("Pinecone search error:", error);
      return `Error searching documents: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
  {
    name: "pinecone_search",
    description: "Search the user's uploaded documents for context.",
    schema: z.object({
      query: z.string().describe("The search query to find relevant context in documents"),
    }),
  }
);
