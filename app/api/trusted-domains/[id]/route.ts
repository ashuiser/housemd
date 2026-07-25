import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { trustedDomains } from "@/core/db/schema";
import { deleteTrustedDomainSchema } from "@/lib/zod-schemas";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = getAccessTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyAccessToken(token);
    if (!payload || !payload.verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const parsed = deleteTrustedDomainSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(trustedDomains)
      .where(
        and(
          eq(trustedDomains.id, parsed.data.id),
          eq(trustedDomains.userId, payload.userId),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trusted domain error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
