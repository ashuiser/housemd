import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { sources } from "@/core/db/schema";
import { generatePresignedPutUrl } from "@/core/sources/presign";
import { initiateUploadSchema } from "@/lib/zod-schemas";

export async function POST(request: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(request);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyAccessToken(token);
    if (!payload || !payload.verified)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = initiateUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { fileName, contentType, sizeBytes } = parsed.data;

    // Create db row
    const [source] = await db
      .insert(sources)
      .values({
        userId: payload.userId,
        fileName,
        sizeBytes,
        r2Key: "", // We'll update this in a second since we need the generated sourceId
        status: "uploading",
      })
      .returning({ id: sources.id });

    const sourceId = source.id;
    const r2Key = `${payload.userId}/${sourceId}/${fileName}`;

    await db.update(sources).set({ r2Key }).where(eq(sources.id, sourceId));

    const uploadUrl = await generatePresignedPutUrl({
      userId: payload.userId,
      sourceId,
      fileName,
      contentType,
    });

    return NextResponse.json({ sourceId, uploadUrl }, { status: 201 });
  } catch (error) {
    console.error("Initiate upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
