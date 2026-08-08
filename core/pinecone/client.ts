import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";

import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

export const pinecone = new PineconeClient();
// biome-ignore lint/style/noNonNullAssertion: ignore
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

export async function getVectorStore(namespace: string) {
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
    maxConcurrency: 5,
    namespace: namespace,
  });

  return vectorStore;
}
