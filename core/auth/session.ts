import type { NextRequest, NextResponse } from "next/server";

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

export { ACCESS_COOKIE, REFRESH_COOKIE };
