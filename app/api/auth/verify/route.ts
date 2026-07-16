import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/core/auth/otp";
import {
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from "@/core/auth/session";
import {
  createAccessToken,
  createRefreshToken,
  deleteRefreshToken,
  verifyAccessToken,
} from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { verifyOtpSchema } from "@/lib/zod-schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Read user from access token (must be present even if unverified)
    const accessTokenValue = getAccessTokenFromRequest(request);
    if (!accessTokenValue) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyAccessToken(accessTokenValue);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    if (payload.verified) {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }

    // Verify OTP
    const valid = await verifyOtp(payload.email, parsed.data.otp);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    // Mark user as verified in Postgres
    await db
      .update(users)
      .set({ verified: true })
      .where(eq(users.id, payload.userId));

    // Delete old refresh token
    const oldRefreshToken = getRefreshTokenFromRequest(request);
    if (oldRefreshToken) {
      await deleteRefreshToken(oldRefreshToken);
    }

    // Reissue tokens with verified: true
    const newAccessToken = await createAccessToken({
      userId: payload.userId,
      verified: true,
      name: payload.name,
      email: payload.email,
    });
    const newRefreshToken = await createRefreshToken(payload.userId, {
      verified: true,
      name: payload.name,
      email: payload.email,
    });

    const response = NextResponse.json({
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      verified: true,
    });
    setAuthCookies(response, newAccessToken, newRefreshToken);
    return response;
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
