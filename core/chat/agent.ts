import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import { type DynamicTool, createAgent as lcCreateAgent } from "langchain";

let checkpointer: PostgresSaver | null = null;
let setupDone = false;

export async function getCheckpointer(): Promise<PostgresSaver> {
  if (!checkpointer) {
    // biome-ignore lint/style/noNonNullAssertion: ignore
    const DB_URI = process.env.NEON_DATABASE_URL!;
    checkpointer = PostgresSaver.fromConnString(DB_URI);
  }
  if (!setupDone) {
    await checkpointer.setup();
    setupDone = true;
  }
  return checkpointer;
}

export async function createAgent() {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });

  const checkpointer = await getCheckpointer();

  const tools: DynamicTool<string, unknown>[] = [];

  const agent = lcCreateAgent({
    model: llm,
    tools,
    checkpointer,
    systemPrompt: "You are HouseMD, an intelligent medical AI assistant.",
  });

  return agent;
}
