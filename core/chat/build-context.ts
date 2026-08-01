import type { BaseMessage } from "@langchain/core/messages";

export async function buildContext(_userId: string, messages: BaseMessage[]) {
  // Skeleton: For now, just pass the messages through.
  return {
    summary: "",
    recentMessages: messages,
  };
}
