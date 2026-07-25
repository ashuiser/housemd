import { OpenAIEmbeddings } from "@langchain/openai";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db/client";
import { sources } from "@/core/db/schema";
import { pineconeIndex } from "@/core/pinecone/client";

export async function processSourceIngestion(
  sourceId: string,
  userId: string,
  markdownText: string,
) {
  try {
    // 1. Chunking
    const splitter = new MarkdownTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([markdownText]);
    if (docs.length === 0) {
      throw new Error("No content found after splitting");
    }

    // 2. Embedding
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      dimensions: 1536,
    });
    const vectors = await embeddings.embedDocuments(
      docs.map((d) => d.pageContent),
    );

    // 3. Upsert to Pinecone
    const pineconeVectors = docs.map((doc, i) => {
      // Pinecone only allows string, number, boolean, or array of strings in metadata
      const safeMetadata: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(doc.metadata)) {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          safeMetadata[key] = value;
        } else if (
          Array.isArray(value) &&
          value.every((v) => typeof v === "string")
        ) {
          safeMetadata[key] = value;
        } else {
          safeMetadata[key] = JSON.stringify(value);
        }
      }

      return {
        id: `${sourceId}_chunk_${i}`,
        values: vectors[i],
        metadata: {
          sourceId,
          userId,
          text: doc.pageContent,
          ...safeMetadata,
        },
      };
    });

    const batchSize = 100;
    for (let i = 0; i < pineconeVectors.length; i += batchSize) {
      const batch = pineconeVectors.slice(i, i + batchSize);
      await pineconeIndex.namespace(userId).upsert({ records: batch });
    }

    // 4. Update DB
    await db
      .update(sources)
      .set({
        status: "ready",
        vectorIdsCount: pineconeVectors.length,
      })
      .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)));
  } catch (error) {
    console.error("Ingestion error:", error);
    await db
      .update(sources)
      .set({ status: "failed" })
      .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)));
    throw error;
  }
}
