import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, summarizationMiddleware } from "langchain";
import { tavilySearch } from "./tools/tavily";
import { pineconeSearch } from "./tools/pinecone";

const llm = new ChatOpenAI({
  model: "gpt-5-nano",
});

const globalForAgent = globalThis as unknown as {
  checkpointer?: PostgresSaver;
  agent?: ReturnType<typeof createAgent>;
};

const DB_URI = process.env.NEON_DATABASE_URL;
if (!DB_URI) {
  throw new Error("NEON_DATABASE_URL is not defined.");
}

export const checkpointer =
  globalForAgent.checkpointer ?? PostgresSaver.fromConnString(DB_URI);

export const Agent =
  globalForAgent.agent ??
  createAgent({
    model: llm,
    tools: [tavilySearch, pineconeSearch],
    middleware: [
      summarizationMiddleware({
        model: llm,
        trigger: { tokens: 4000 },
        keep: { messages: 20 },
      }),
    ],
    checkpointer,
    systemPrompt: `You are HouseMD, an intelligent medical AI assistant.
You have access to a Tavily internet search tool and a Pinecone search tool.
If the user asks about something that requires up-to-date knowledge or something from their uploaded files, use the appropriate tool.
For uploaded documents, ALWAYS use the pinecone_search tool to find context. Don't tell anything which is not in the documents provided or web search results.`,
  });

if (process.env.NODE_ENV !== "production") {
  globalForAgent.checkpointer = checkpointer;
  globalForAgent.agent = Agent;
}
