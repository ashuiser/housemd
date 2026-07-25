import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { trustedDomains } from "@/core/db/schema";
import { addTrustedDomainSchema } from "@/lib/zod-schemas";

export async function GET(request: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyAccessToken(token);
    if (!payload || !payload.verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domains = await db
      .select()
      .from(trustedDomains)
      .where(eq(trustedDomains.userId, payload.userId))
      .orderBy(desc(trustedDomains.createdAt));

    return NextResponse.json(domains);
  } catch (error) {
    console.error("Fetch trusted domains error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyAccessToken(token);
    if (!payload || !payload.verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Normalization logic
    let rawPrefix = (body.prefix || "").trim();
    if (rawPrefix.startsWith("http://")) rawPrefix = rawPrefix.slice(7);
    if (rawPrefix.startsWith("https://")) rawPrefix = rawPrefix.slice(8);
    if (rawPrefix.endsWith("/")) rawPrefix = rawPrefix.slice(0, -1);

    const parsed = addTrustedDomainSchema.safeParse({
      ...body,
      prefix: rawPrefix,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { prefix, scope } = parsed.data;

    const [domain] = await db
      .insert(trustedDomains)
      .values({
        userId: payload.userId,
        prefix,
        scope,
      })
      .returning();

    return NextResponse.json(domain, { status: 201 });
  } catch (error) {
    console.error("Add trusted domain error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
