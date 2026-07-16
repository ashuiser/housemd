import { type NextRequest, NextResponse } from "next/server";
import {
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from "@/core/auth/session";
import {
  createAccessToken,
  isWithinTrustWindow,
  rotateRefreshTokenIfNeeded,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/core/auth/tokens";

// Routes that require no authentication at all
const PUBLIC_ROUTES = [
  "/api/auth/signup",
  "/api/auth/login",
  "/login",
  "/signup",
];

// Routes accessible with an unverified JWT
const UNVERIFIED_ROUTES = [
  "/api/auth/verify",
  "/api/auth/resend-otp",
  "/verify",
];

// Prefixes that bypass the proxy entirely
const BYPASS_PREFIXES = ["/_next", "/favicon.ico", "/api/webhooks"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

function isUnverifiedRoute(pathname: string): boolean {
  return UNVERIFIED_ROUTES.includes(pathname);
}

function shouldBypass(pathname: string): boolean {
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

function unauthorizedJson(): NextResponse {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

function redirectToVerify(request: NextRequest): NextResponse {
  const verifyUrl = new URL("/verify", request.url);
  return NextResponse.redirect(verifyUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, webhooks — skip entirely
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  // Public routes — always accessible
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Unverified routes — accessible with any valid JWT (even unverified)
  if (isUnverifiedRoute(pathname)) {
    const accessToken = getAccessTokenFromRequest(request);
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      if (payload) return NextResponse.next();
    }
    return isApiRoute(pathname) ? unauthorizedJson() : redirectToLogin(request);
  }

  // ── Everything below requires a verified JWT ─────────────────────────
  const accessToken = getAccessTokenFromRequest(request);
  const refreshToken = getRefreshTokenFromRequest(request);

  // Step 1: Try access token
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      // Unverified user trying to access a protected route
      if (!payload.verified) {
        return isApiRoute(pathname)
          ? unauthorizedJson()
          : redirectToVerify(request);
      }

      // Within trust window — skip Redis, pass through
      if (isWithinTrustWindow(payload.iat)) {
        return NextResponse.next();
      }

      // Past trust window — must revalidate via refresh token
      if (refreshToken) {
        const refreshData = await verifyRefreshToken(refreshToken);
        if (refreshData) {
          // Refresh token is valid — check rotation
          const rotation = await rotateRefreshTokenIfNeeded(refreshToken);
          if (rotation) {
            const newAccessToken = await createAccessToken({
              userId: rotation.data.userId,
              verified: rotation.data.verified,
              name: rotation.data.name,
              email: rotation.data.email,
            });
            const response = NextResponse.next();
            setAuthCookies(response, newAccessToken, rotation.newRawToken);
            return response;
          }
          return NextResponse.next();
        }
      }

      // Refresh token invalid/missing but access token still valid (within its 15min life)
      // Allow through since JWT is cryptographically valid
      return NextResponse.next();
    }
  }

  // Step 2: Access token invalid/expired — try refresh token only
  if (refreshToken) {
    const refreshData = await verifyRefreshToken(refreshToken);
    if (refreshData) {
      if (!refreshData.verified) {
        return isApiRoute(pathname)
          ? unauthorizedJson()
          : redirectToVerify(request);
      }

      // Reissue access token from refresh data
      const newAccessToken = await createAccessToken({
        userId: refreshData.userId,
        verified: refreshData.verified,
        name: refreshData.name,
        email: refreshData.email,
      });

      const rotation = await rotateRefreshTokenIfNeeded(refreshToken);
      const response = NextResponse.next();
      setAuthCookies(
        response,
        newAccessToken,
        rotation ? rotation.newRawToken : refreshToken,
      );
      return response;
    }
  }

  // No valid tokens — unauthorized
  return isApiRoute(pathname) ? unauthorizedJson() : redirectToLogin(request);
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
