import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { chats } from "@/core/db/schema";

export async function GET(req: NextRequest) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userChats = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, payload.userId))
    .orderBy(desc(chats.createdAt));

  return NextResponse.json(userChats);
}
