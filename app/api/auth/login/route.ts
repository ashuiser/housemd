import { verify } from "argon2";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { setAuthCookies } from "@/core/auth/session";
import { createAccessToken, createRefreshToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { loginSchema } from "@/lib/zod-schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    // Look up user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Verify password
    const valid = await verify(user.passwordHash, password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Issue tokens
    const accessToken = await createAccessToken({
      userId: user.id,
      verified: user.verified,
      name: user.name,
      email: user.email,
    });
    const refreshToken = await createRefreshToken(user.id, {
      verified: user.verified,
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified,
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
