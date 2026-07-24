// biome-ignore-all lint/style/noNonNullAssertion: env vars validated at startup
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME!;

// Generate a presigned PUT URL for uploading a file to S3.
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

  return getSignedUrl(s3Client, command, { expiresIn });
}

// Generate a presigned GET URL for downloading a file from S3. Used by the ingestion worker webhook to fetch parsed results if needed.
export async function generatePresignedGetUrl(params: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const { key, expiresIn = 600 } = params;

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// Build the S3 object key from its constituent parts.
export function buildS3Key(
  userId: string,
  sourceId: string,
  fileName: string,
): string {
  return `${userId}/${sourceId}/${fileName}`;
}
