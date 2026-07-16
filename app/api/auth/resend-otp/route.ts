import { type NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/core/auth/email";
import { generateOtp, OtpRateLimitError, storeOtp } from "@/core/auth/otp";
import { getAccessTokenFromRequest } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";

export async function POST(request: NextRequest) {
  try {
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

    const otp = generateOtp();
    await storeOtp(payload.email, otp);
    await sendOtpEmail(payload.email, otp, payload.name);

    return NextResponse.json({ message: "OTP sent" });
  } catch (error) {
    if (error instanceof OtpRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
