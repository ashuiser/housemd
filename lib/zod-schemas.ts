import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(1, { error: "Name is required" }).max(100),
    age: z.number().int().min(13, { error: "Must be at least 13" }).max(150),
    email: z.email({ error: "Invalid email address" }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" })
      .max(128),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const loginSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
});

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, { error: "OTP must be 6 digits" }),
});

export const resendOtpSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
});

export const initiateUploadSchema = z.object({
  fileName: z.string().min(1, { error: "File name is required" }),
  contentType: z.string().refine((val) => val === "application/pdf", {
    error: "Only PDF files are supported",
  }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024, { error: "File must be under 50MB" }),
});

export const addTrustedDomainSchema = z.object({
  url: z.url(),
});

export const deleteTrustedDomainSchema = z.object({
  id: z.string().uuid({ error: "Invalid domain ID" }),
});

export const internetModeSchema = z.enum([
  "none",
  "trusted_only",
  "all",
  "all_verified",
]);

export const sendMessageSchema = z.object({
  chatId: z.uuid().optional(), // omit to create a new chat
  message: z.string().min(1, { error: "Message cannot be empty" }).max(10000),
  selectedSourceIds: z.array(z.uuid()).optional(),
  internetMode: internetModeSchema.default("none"),
});

export const resumeSchema = z.object({
  chatId: z.uuid(),
  resume: z.unknown(), // trust-escalation decisions — shape validated by the tool
});

export const chatRequestSchema = z.union([sendMessageSchema, resumeSchema]);

export const pdfCitationSchema = z.object({
  type: z.literal("pdf"),
  sourceId: z.string(),
  page: z.number(),
  quote: z.string().max(200),
});

export const webCitationSchema = z.object({
  type: z.literal("web"),
  url: z.string(),
  quote: z.string().max(200),
  trustBasis: z.enum(["pre_trusted", "this_time_only"]).optional(),
});

export const citationSchema = z.discriminatedUnion("type", [
  pdfCitationSchema,
  webCitationSchema,
]);

export const citedAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(citationSchema),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type InitiateUploadInput = z.infer<typeof initiateUploadSchema>;
export type AddTrustedDomainInput = z.infer<typeof addTrustedDomainSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ResumeInput = z.infer<typeof resumeSchema>;
export type InternetMode = z.infer<typeof internetModeSchema>;
export type PdfCitation = z.infer<typeof pdfCitationSchema>;
export type WebCitation = z.infer<typeof webCitationSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type CitedAnswer = z.infer<typeof citedAnswerSchema>;
