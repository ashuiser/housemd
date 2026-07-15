// biome-ignore-all lint/style/noNonNullAssertion: ignore
import { Pinecone } from "@pinecone-database/pinecone";

export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const pineconeIndex = pc.index({
  name: process.env.PINECONE_INDEX_NAME!,
});
