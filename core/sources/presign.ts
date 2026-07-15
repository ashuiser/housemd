// biome-ignore-all lint/style/noNonNullAssertion: env vars validated at startup
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

// Generate a presigned PUT URL for uploading a file to R2.
export async function generatePresignedPutUrl(params: {
  userId: string;
  sourceId: string;
  fileName: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const { userId, sourceId, fileName, expiresIn = 600 } = params;
  const key = `${userId}/${sourceId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: params.contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

// Generate a presigned GET URL for downloading a file from R2. Used by the ingestion worker webhook to fetch parsed results if needed.
export async function generatePresignedGetUrl(params: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const { key, expiresIn = 600 } = params;

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

// Build the R2 object key from its constituent parts.
export function buildR2Key(
  userId: string,
  sourceId: string,
  fileName: string,
): string {
  return `${userId}/${sourceId}/${fileName}`;
}
