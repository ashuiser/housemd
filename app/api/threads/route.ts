import { type NextRequest, NextResponse } from "next/server";
import { getUserIdFromReq } from "@/core/auth/session";
import { listThreads } from "@/core/chat/threads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromReq(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const threads = await listThreads(userId);
  return NextResponse.json(threads);
}
