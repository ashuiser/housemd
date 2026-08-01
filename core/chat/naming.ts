import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { chats } from "../db/schema";

export async function generateChatTitle(chatId: string, firstMessage: string) {
  try {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    const response = await llm.invoke([
      new SystemMessage(
        "Generate a very short, concise title (max 5 words) for a chat based on this first message. Do not include quotes.",
      ),
      new HumanMessage(firstMessage),
    ]);

    const title = response.content.toString().replace(/['"]+/g, "").trim();

    await db.update(chats).set({ title }).where(eq(chats.id, chatId));
  } catch (error) {
    console.error("Failed to generate chat title", error);
  }
}
