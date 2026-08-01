import type { NextRequest } from "next/server";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { createAgent } from "@/core/chat/agent";
import { generateChatTitle } from "@/core/chat/naming";
import { db } from "@/core/db/client";
import { chats } from "@/core/db/schema";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = (await req.json()) as {
    messages: Array<{ role: string; content: string; type?: string }>;
    id?: string;
  };

  let chatId = body.id;
  let isNewChat = false;

  if (!chatId) {
    isNewChat = true;
    const newChat = await db
      .insert(chats)
      .values({
        userId: payload.userId,
        title: "New Chat",
      })
      .returning({ id: chats.id });
    chatId = newChat[0].id;
  }

  const lastMsg = body.messages[body.messages.length - 1];
  const userText = lastMsg?.content;

  if (isNewChat && userText) {
    // Fire and forget async generation of chat title
    generateChatTitle(chatId, userText);
  }

  const agent = await createAgent();
  const config = { configurable: { thread_id: chatId } };

  const stream = await agent.stream(
    { messages: body.messages },
    { ...config, streamMode: "values" },
  );

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
        }
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-chat-id": chatId,
    },
  });
}
