import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/core/db/client";
import { sources } from "@/core/db/schema";
import { processSourceIngestion } from "@/core/sources/ingest";

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get("sourceId");
    const userId = searchParams.get("userId");

    if (!sourceId || !userId) {
      return NextResponse.json(
        { error: "Missing query parameters" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const markdownText = body.md; // LlamaParse sends markdown directly in webhook

    if (!markdownText) {
      // If we got here but there's no markdown, the payload might be malformed or it failed
      console.error(`LlamaParse webhook payload missing 'md' field:`, Object.keys(body));
      await db
        .update(sources)
        .set({ status: "failed" })
        .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)));
      return NextResponse.json(
        { error: "Missing markdown in payload" },
        { status: 400 },
      );
    }

    await processSourceIngestion(sourceId, userId, markdownText);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LlamaParse webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
