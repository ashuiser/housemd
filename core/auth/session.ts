import { eq } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "../db/client";
import { chats } from "../db/schema";
import { verifyAccessToken, verifyRefreshToken } from "./tokens";

const ACCESS_COOKIE = "hmd_access";
const REFRESH_COOKIE = "hmd_refresh";
const IS_PROD = process.env.NODE_ENV === "production";

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge?: number;
};

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
): void {
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: 15 * 60, // 15 minutes (matches JWT expiry)
  });
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", {
    ...baseCookieOptions(),
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    ...baseCookieOptions(),
    maxAge: 0,
  });
}

export function getAccessTokenFromRequest(
  request: NextRequest,
): string | undefined {
  return request.cookies.get(ACCESS_COOKIE)?.value;
}

export function getRefreshTokenFromRequest(
  request: NextRequest,
): string | undefined {
  return request.cookies.get(REFRESH_COOKIE)?.value;
}

export async function getUserIdFromReq(req: NextRequest) {
  // Try access token first (zero Redis/Postgres hits if valid)
  let userId: string | null = null;
  const accessTokenValue = getAccessTokenFromRequest(req);
  if (accessTokenValue) {
    const payload = await verifyAccessToken(accessTokenValue);
    if (payload) {
      userId = payload.userId;
    }
  }

  if (!userId) {
    // Access token expired/missing — try refresh token (Redis hit, no Postgres)
    const refreshTokenValue = getRefreshTokenFromRequest(req);
    if (refreshTokenValue) {
      const data = await verifyRefreshToken(refreshTokenValue);
      if (data) {
        userId = data.userId;
      }
    }
  }

  return userId;
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function isChatIdValidAndExists(threadId: string): Promise<{
  isValid: boolean;
  exists: boolean;
  userId: string | null;
}> {
  if (!isValidUUID(threadId)) {
    return {
      isValid: false,
      exists: false,
      userId: null,
    };
  }
  const chatData = await db.select().from(chats).where(eq(chats.id, threadId));

  if (chatData.length === 0) {
    return {
      isValid: true,
      exists: false,
      userId: null,
    };
  }
  return {
    isValid: true,
    exists: true,
    userId: chatData[0].userId,
  };
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
