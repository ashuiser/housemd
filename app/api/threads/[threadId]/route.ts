import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getUserIdFromReq } from "@/core/auth/session";
import { deleteThread } from "@/core/chat/registry";
import { db } from "@/core/db/client";
import { chats } from "@/core/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ threadId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const { threadId } = await params;
  const userId = await getUserIdFromReq(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  await db
    .delete(chats)
    .where(and(eq(chats.id, threadId), eq(chats.userId, userId)));
  await deleteThread(threadId);
  return new Response(null, { status: 204 });
}
