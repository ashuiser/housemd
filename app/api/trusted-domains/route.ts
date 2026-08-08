import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as z from "zod";
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

    const parsed = addTrustedDomainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: z.flattenError(parsed.error) },
        { status: 400 },
      );
    }

    const { url } = parsed.data;

    const [insertedDomain] = await db
      .insert(trustedDomains)
      .values({
        userId: payload.userId,
        url,
      })
      .returning();

    return NextResponse.json(insertedDomain, { status: 201 });
  } catch (error) {
    console.error("Add trusted domain error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
