import { type NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
} from "@/core/auth/session";
import { deleteRefreshToken } from "@/core/auth/tokens";

export async function POST(request: NextRequest) {
  const refreshToken = getRefreshTokenFromRequest(request);

  // Best-effort Redis DEL — no error if already gone
  if (refreshToken) {
    try {
      await deleteRefreshToken(refreshToken);
    } catch {
      // Ignore — logout should never fail
    }
  }

  const response = NextResponse.json({ message: "Logged out" });
  clearAuthCookies(response);
  return response;
}
