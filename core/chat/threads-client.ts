import { Client } from "@langchain/langgraph-sdk/client";

export function getApiUrl(): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  return `${baseUrl}/api`;
}

export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string | null;
};

export async function fetchThreads(): Promise<ThreadSummary[]> {
  const response = await fetch(`${getApiUrl()}/threads`, { cache: "no-store" });
  if (!response.ok) return [];
  return (await response.json()) as ThreadSummary[];
}

async function ensureThreadExists(threadId: string) {
  const client = new Client({ apiUrl: getApiUrl() });
  try {
    await client.threads.getState(threadId);
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status !== 404) throw error;
    await client.threads.updateState(threadId, { values: { messages: [] } });
  }
}

export async function createThread(id: string): Promise<string> {
  await ensureThreadExists(id);
  return id;
}

export async function deleteThread(threadId: string): Promise<void> {
  await fetch(`${getApiUrl()}/threads/${threadId}`, { method: "DELETE" });
}
