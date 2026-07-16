import { randomInt } from "node:crypto";
import { redis } from "@/core/redis/client";

const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_MIN_INTERVAL_SECONDS = 60; // 1 minute between sends
const OTP_MAX_SENDS = 5; // max sends per OTP window

type OtpRecord = {
  otp: number;
  sentCount: number;
  updatedTime: number;
};

// Atomic Lua script: rate-limits OTP sends and stores the new OTP
// Returns sentCount on success, throws "TOO_SOON" or "TOO_MANY" on failure
const OTP_SCRIPT = `
  local raw = redis.call('GET', KEYS[1])
  local sentCount = 0
  if raw then
    local data = cjson.decode(raw)
    sentCount = data.sentCount
    if (tonumber(ARGV[1]) - data.updatedTime) < tonumber(ARGV[2]) then return redis.error_reply('TOO_SOON') end
    if sentCount >= tonumber(ARGV[3]) then return redis.error_reply('TOO_MANY') end
  end
  redis.call('SET', KEYS[1], cjson.encode({otp = tonumber(ARGV[5]), sentCount = sentCount + 1, updatedTime = tonumber(ARGV[1])}), 'EX', ARGV[4])
  return sentCount + 1
`;

function otpKey(email: string): string {
  return `otp:${email}`;
}

export function generateOtp(): string {
  return randomInt(0, 999999).toString().padStart(6, "0");
}

// Stores OTP in Redis with rate limiting. Throws on rate limit violation.
export async function storeOtp(email: string, otp: string): Promise<number> {
  const now = Math.floor(Date.now() / 1000);

  try {
    const result = await redis.eval(
      OTP_SCRIPT,
      [otpKey(email)],
      [
        now.toString(),
        OTP_MIN_INTERVAL_SECONDS.toString(),
        OTP_MAX_SENDS.toString(),
        OTP_TTL_SECONDS.toString(),
        otp,
      ],
    );
    return Number(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("TOO_SOON")) {
      throw new OtpRateLimitError("Please wait before requesting another OTP");
    }
    if (message.includes("TOO_MANY")) {
      throw new OtpRateLimitError(
        "Too many OTP requests. Please try again later",
      );
    }
    throw error;
  }
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const raw = await redis.get<OtpRecord>(otpKey(email));
  if (!raw) return false;
  if (raw.otp.toString().padStart(6, "0") !== otp) return false;

  // OTP verified — delete it
  await redis.del(otpKey(email));
  return true;
}

export class OtpRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpRateLimitError";
  }
}
