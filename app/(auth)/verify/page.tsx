"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyOtpSchema } from "@/lib/zod-schemas";

type VerifyFormValues = z.infer<typeof verifyOtpSchema>;

export default function VerifyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function onSubmit(data: VerifyFormValues) {
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Verification failed");
        return;
      }

      router.push("/dashboard/chat");
    } catch (_err) {
      setError("An unexpected error occurred");
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResendStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-otp", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to resend OTP");
        if (res.status === 429) setCooldown(60);
        return;
      }
      setResendStatus("OTP sent to your email!");
      setCooldown(60);
    } catch (_err) {
      setError("An unexpected error occurred");
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Verify Account</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to your email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2 text-center">
            <Label htmlFor="otp" className="sr-only">
              One-time password
            </Label>
            <Input
              id="otp"
              type="text"
              maxLength={6}
              placeholder="123456"
              className="text-center text-lg tracking-[0.5em]"
              {...register("otp")}
            />
            {errors.otp && (
              <p className="text-xs text-red-500">{errors.otp.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          {resendStatus && (
            <p className="text-sm text-green-500 text-center">{resendStatus}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
