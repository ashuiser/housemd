import "server-only";

import {
  matchesSubscription,
  type ProtocolEvent,
  StreamChannel,
} from "@langchain/langgraph/stream";
import type {
  Command,
  CommandResponse,
  ErrorResponse,
  SubscribeParams,
} from "@langchain/protocol";
import { Command as LangGraphCommand } from "@langchain/langgraph";
import type { ReactAgent } from "langchain";

import { isRecord, sanitizeForJson } from "./serialize";
import { db } from "@/core/db/client";
import { chats } from "@/core/db/schema";
import { eq } from "drizzle-orm";

type AnyReactAgent = ReactAgent<any>;

type AgentRunInput = Parameters<AnyReactAgent["streamEvents"]>[0];

function sanitizeEvent(event: ProtocolEvent): ProtocolEvent {
  const params = event.params as Record<string, unknown>;
  const sanitizedParams: Record<string, unknown> = {
    ...params,
    data: sanitizeForJson(params.data),
  };
  if ("interrupts" in params) {
    sanitizedParams.interrupts = sanitizeForJson(params.interrupts);
  }
  return { ...event, params: sanitizedParams } as ProtocolEvent;
}

function encodeSse(event: ProtocolEvent) {
  const eventId = (event as { event_id?: string }).event_id;
  const id = eventId ?? (typeof event.seq === "number" ? `${event.seq}` : "");
  const idLine = id ? `id: ${id}\n` : "";
  return new TextEncoder().encode(
    `${idLine}event: message\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

export class LocalThreadSession {
  readonly #agent: AnyReactAgent;
  readonly #threadId: string;

  readonly #log = StreamChannel.local<ProtocolEvent>();

  #nextSeq = 0;

  #activeRun:
    | {
        abort(reason?: unknown): void;
      }
    | undefined;

  constructor(agent: AnyReactAgent, threadId: string) {
    this.#agent = agent;
    this.#threadId = threadId;
  }

  async handleCommand(
    command: Command,
  ): Promise<CommandResponse | ErrorResponse> {
    if (command.method !== "run.start" && command.method !== "input.respond") {
      return {
        type: "error",
        id: command.id,
        error: "unknown_command",
        message: `Unsupported command: ${command.method}`,
      } as ErrorResponse;
    }

    const runId = crypto.randomUUID();
    let agentInput: AgentRunInput = null;
    let configurable: Record<string, unknown> | undefined;

    if (command.method === "run.start") {
      const params = isRecord(command.params)
        ? (command.params as { input?: unknown, config?: { configurable?: Record<string, unknown> } })
        : {};
      agentInput = params.input as AgentRunInput;
      configurable = params.config?.configurable;
    } else if (command.method === "input.respond") {
      const params = isRecord(command.params) ? (command.params as any) : {};
      // Wrap the response in a LangGraph Command to resume the interrupt
      agentInput = new LangGraphCommand({
        resume: params.response,
      }) as unknown as AgentRunInput;
      configurable = params.config?.configurable;
    }

    void this.#startRun(agentInput, runId, configurable);

    return {
      type: "success",
      id: command.id,
      result: { run_id: runId },
    } as CommandResponse;
  }

  stream(params: SubscribeParams) {
    const cursor = this.#log.iterate();

    return new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        for (;;) {
          const { value: event, done } = await cursor.next();
          if (done) {
            controller.close();
            return;
          }
          if (matchesSubscription(event, params)) {
            controller.enqueue(encodeSse(event));
            return;
          }
        }
      },
      cancel: () => {
        void cursor.return?.(undefined);
      },
    });
  }

  #publish(rawEvent: ProtocolEvent) {
    const seq = this.#nextSeq;
    this.#nextSeq += 1;
    const event = sanitizeEvent({
      ...rawEvent,
      type: "event",
      seq,
    } as ProtocolEvent);
    this.#log.push(event);
  }

  async #startRun(input: AgentRunInput, runId: string, configurable?: Record<string, unknown>) {
    this.#activeRun?.abort("Starting a new run.");
    
    let userId: string | undefined;
    try {
      const chat = await db.select().from(chats).where(eq(chats.id, this.#threadId))
      userId = chat?.[0]?.userId;
    } catch (err) {
      console.error("Failed to fetch chat userId", err);
    }
    const run = await this.#agent.streamEvents(input, {
      version: "v3",
      configurable: { ...configurable, thread_id: this.#threadId, run_id: runId, userId },
    });
    this.#activeRun = run;

    try {
      for await (const rawEvent of run) {
        this.#publish(rawEvent as ProtocolEvent);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (this.#activeRun === run) {
        this.#activeRun = undefined;
      }
    }
  }
}
