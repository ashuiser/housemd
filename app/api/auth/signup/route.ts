import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/core/auth/email";
import { generateOtp, OtpRateLimitError, storeOtp } from "@/core/auth/otp";
import { setAuthCookies } from "@/core/auth/session";
import { createAccessToken, createRefreshToken } from "@/core/auth/tokens";
import { db } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { signupSchema } from "@/lib/zod-schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, age, email, password } = parsed.data;

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await hash(password, { type: 2 }); // argon2id

    // Insert user
    const [user] = await db
      .insert(users)
      .values({ name, age, email, passwordHash })
      .returning({ id: users.id });

    // Generate and send OTP
    const otp = generateOtp();
    await storeOtp(email, otp);
    await sendOtpEmail(email, otp, name);

    // Issue restricted JWT (verified: false)
    const accessToken = await createAccessToken({
      userId: user.id,
      verified: false,
      name,
      email,
    });
    const refreshToken = await createRefreshToken(user.id, {
      verified: false,
      name,
      email,
    });

    const response = NextResponse.json(
      { userId: user.id, name, email, verified: false },
      { status: 201 },
    );
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    if (error instanceof OtpRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
