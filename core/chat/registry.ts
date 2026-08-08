import "server-only";

import { Agent, checkpointer } from "./agent";
import { LocalThreadSession } from "./session";
import type { LocalProtocolGraph } from "./threads";

type Registry = {
  sessions: Map<string, LocalThreadSession>;
};

const globalForRegistry = globalThis as unknown as {
  __agentRegistry?: Registry;
};

globalForRegistry.__agentRegistry = globalForRegistry.__agentRegistry ?? {
  sessions: new Map(),
};

const registry: Registry = globalForRegistry.__agentRegistry;

export function getAgent() {
  return Agent;
}

export function getAgentGraph(): LocalProtocolGraph {
  return Agent.graph;
}

export function getCheckpointer() {
  return checkpointer;
}

export function getSession(threadId: string): LocalThreadSession {
  let session = registry.sessions.get(threadId);
  if (session == null) {
    session = new LocalThreadSession(Agent, threadId);
    registry.sessions.set(threadId, session);
  }
  return session;
}

export async function deleteThread(threadId: string): Promise<void> {
  registry.sessions.delete(threadId);
  await checkpointer.deleteThread(threadId);
}
