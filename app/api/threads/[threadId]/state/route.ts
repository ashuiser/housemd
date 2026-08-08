import type { NextRequest } from "next/server";
import { getUserIdFromReq, isChatIdValidAndExists } from "@/core/auth/session";
import { getAgentGraph } from "@/core/chat/registry";
import {
  getThreadState,
  ThreadNotFoundError,
  updateThreadState,
} from "@/core/chat/threads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
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
  try {
    const state = await getThreadState(getAgentGraph(), threadId);
    return Response.json(state);
  } catch (error) {
    if (error instanceof ThreadNotFoundError) {
      return Response.json(
        { error: "not_found", message: error.message },
        { status: 404 },
      );
    }
    throw error;
  }
}

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

  const body = (await request.json().catch(() => ({}))) as {
    values?: Record<string, unknown> | null;
    checkpoint?: Record<string, unknown> | null;
    as_node?: string;
  };
  try {
    const state = await updateThreadState(getAgentGraph(), threadId, {
      values: body.values ?? null,
      checkpoint: body.checkpoint ?? null,
      asNode: body.as_node,
    });
    return Response.json(state);
  } catch (error) {
    return Response.json(
      { error: "invalid_state_update", message: String(error) },
      { status: 422 },
    );
  }
}
