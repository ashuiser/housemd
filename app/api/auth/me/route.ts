import { type NextRequest, NextResponse } from "next/server";
import {
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
} from "@/core/auth/session";
import { verifyAccessToken, verifyRefreshToken } from "@/core/auth/tokens";

export async function GET(request: NextRequest) {
  // Try access token first (zero Redis/Postgres hits if valid)
  const accessTokenValue = getAccessTokenFromRequest(request);
  if (accessTokenValue) {
    const payload = await verifyAccessToken(accessTokenValue);
    if (payload) {
      return NextResponse.json({
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
        verified: payload.verified,
      });
    }
  }

  // Access token expired/missing — try refresh token (Redis hit, no Postgres)
  const refreshTokenValue = getRefreshTokenFromRequest(request);
  if (refreshTokenValue) {
    const data = await verifyRefreshToken(refreshTokenValue);
    if (data) {
      return NextResponse.json({
        userId: data.userId,
        name: data.name,
        email: data.email,
        verified: data.verified,
      });
    }
  }

  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}
