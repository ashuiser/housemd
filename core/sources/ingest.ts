import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { and, eq } from "drizzle-orm";
import { db } from "@/core/db/client";
import { sources } from "@/core/db/schema";
import { getVectorStore } from "@/core/pinecone/client";

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

    const pineconeVector = await getVectorStore(userId);

    await pineconeVector.addDocuments(docs, {
      ids: Array.from(
        { length: docs.length },
        (_, i) => `${sourceId}_chunk_${i}`,
      ),
    });

    // 4. Update DB
    await db
      .update(sources)
      .set({
        status: "ready",
        vectorIdsCount: docs.length,
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
