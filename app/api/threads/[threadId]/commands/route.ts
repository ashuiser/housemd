import type { Command } from "@langchain/protocol";
import type { NextRequest } from "next/server";
import { getUserIdFromReq, isChatIdValidAndExists } from "@/core/auth/session";
import { getSession } from "@/core/chat/registry";
import { db } from "@/core/db/client";
import { chats } from "@/core/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ threadId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { threadId } = await params;
  const { isValid, exists, userId } = await isChatIdValidAndExists(threadId);

  if (!isValid) {
    return Response.json({ error: "Invalid Chat ID" }, { status: 404 });
  }

  const userIdFromCookie = await getUserIdFromReq(request);
  if (!userIdFromCookie) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (userId && userId !== userIdFromCookie) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!exists) {
    // TODO: Call naming utils to name the chat
    await db.insert(chats).values({
      id: threadId,
      userId: userIdFromCookie,
      title: "New Chat",
    });
  }

  const command = (await request.json()) as Command;
  const result = await getSession(threadId).handleCommand(command);
  return Response.json(result);
}
