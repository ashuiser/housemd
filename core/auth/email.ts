import { Resend } from "resend";

// biome-ignore lint/style/noNonNullAssertion: env var validated at startup
const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "HouseMD <onboarding@resend.dev>";

export async function sendOtpEmail(
  email: string,
  otp: string,
  name: string,
): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your HouseMD verification code",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #666; margin-bottom: 24px;">Hi ${name}, use the code below to verify your HouseMD account:</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
