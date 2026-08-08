import "server-only";

import { BaseMessage } from "@langchain/core/messages";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeForJson(value: unknown): unknown {
  if (BaseMessage.isInstance(value)) {
    const { type, data } = value.toDict();
    return sanitizeForJson({ ...data, type });
  }
  if (Array.isArray(value)) return value.map(sanitizeForJson);
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = sanitizeForJson(item);
    }
    return result;
  }
  return value;
}
