import type { SubscribeParams } from "@langchain/protocol";
import type { NextRequest } from "next/server";
import { getUserIdFromReq, isChatIdValidAndExists } from "@/core/auth/session";
import { getSession } from "@/core/chat/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ threadId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { threadId } = await params;
  const { isValid, userId } = await isChatIdValidAndExists(threadId);

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
  const subscribeParams = (await request.json().catch(() => ({}))) as SubscribeParams;

  return new Response(getSession(threadId).stream(subscribeParams), {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
