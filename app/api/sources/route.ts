import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { sources } from "@/core/db/schema";

export async function GET(request: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(request);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyAccessToken(token);
    if (!payload || !payload.verified)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userSources = await db
      .select()
      .from(sources)
      .where(eq(sources.userId, payload.userId))
      .orderBy(desc(sources.createdAt));

    return NextResponse.json(userSources);
  } catch (error) {
    console.error("Fetch sources error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
