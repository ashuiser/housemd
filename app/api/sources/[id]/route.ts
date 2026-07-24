import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { sources } from "@/core/db/schema";
import { pineconeIndex } from "@/core/pinecone/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = getAccessTokenFromRequest(request);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyAccessToken(token);
    if (!payload || !payload.verified)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sourceId } = await params;

    // Verify ownership
    const existing = await db
      .select({ id: sources.id })
      .from(sources)
      .where(and(eq(sources.id, sourceId), eq(sources.userId, payload.userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    await db
      .delete(sources)
      .where(and(eq(sources.id, sourceId), eq(sources.userId, payload.userId)));

    try {
      await pineconeIndex.namespace(payload.userId).deleteMany({
        filter: {
          sourceId: sourceId,
        },
      });
    } catch (pineconeErr) {
      console.warn(
        "Failed to delete from Pinecone, proceeding anyway",
        pineconeErr,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete source error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
