import { createHash, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { redis } from "@/core/redis/client";

// biome-ignore lint/style/noNonNullAssertion: env var validated at startup
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const TRUST_WINDOW_SECONDS = 120; // 2 minutes

export type AccessTokenPayload = {
  userId: string;
  verified: boolean;
  name: string;
  email: string;
  iat: number;
};

export type RefreshTokenData = {
  userId: string;
  verified: boolean;
  name: string;
  email: string;
  createdAt: number;
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function refreshKey(hash: string): string {
  return `refresh:${hash}`;
}

export async function createAccessToken(
  payload: Omit<AccessTokenPayload, "iat">,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

// Returns true if the access token was issued within the trust window
export function isWithinTrustWindow(iat: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - iat < TRUST_WINDOW_SECONDS;
}

export async function createRefreshToken(
  userId: string,
  userData: Omit<RefreshTokenData, "userId" | "createdAt">,
): Promise<string> {
  const raw = randomUUID();
  const hash = hashToken(raw);
  const data: RefreshTokenData = {
    userId,
    ...userData,
    createdAt: Date.now(),
  };
  await redis.set(refreshKey(hash), data, { ex: REFRESH_TOKEN_TTL_SECONDS });
  return raw;
}

export async function verifyRefreshToken(
  rawToken: string,
): Promise<RefreshTokenData | null> {
  const hash = hashToken(rawToken);
  const data = await redis.get<RefreshTokenData>(refreshKey(hash));
  return data ?? null;
}

// Returns { newRawToken, data } if rotated, null if not needed
export async function rotateRefreshTokenIfNeeded(
  rawToken: string,
): Promise<{ newRawToken: string; data: RefreshTokenData } | null> {
  const hash = hashToken(rawToken);
  const ttl = await redis.ttl(refreshKey(hash));

  // Rotate if less than 1 day remaining
  if (ttl > 0 && ttl < 24 * 60 * 60) {
    const data = await redis.get<RefreshTokenData>(refreshKey(hash));
    if (!data) return null;

    await redis.del(refreshKey(hash));
    const newRaw = randomUUID();
    const newHash = hashToken(newRaw);
    await redis.set(refreshKey(newHash), data, {
      ex: REFRESH_TOKEN_TTL_SECONDS,
    });
    return { newRawToken: newRaw, data };
  }

  return null;
}

export async function deleteRefreshToken(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken);
  await redis.del(refreshKey(hash));
}
