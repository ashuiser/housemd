"use client";

import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { HttpAgentServerAdapter, useStream } from "@langchain/react";
import { RiChatNewLine } from "@remixicon/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import LoaderContent from "@/components/loading-content";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createThread, getApiUrl } from "@/core/chat/threads-client";

function getReasoningText(msg: AIMessage) {
  return (
    msg.contentBlocks.find((block) => block.type === "reasoning")?.reasoning ??
    ""
  );
}

function getTextContent(msg: AIMessage) {
  return msg.text;
}

function getToolCalls(msg: AIMessage, allMessages: BaseMessage[]) {
  return (msg.tool_calls ?? []).map((tc) => {
    // Find the corresponding ToolMessage in the stream
    const matchingToolMessage = allMessages.find(
      (m) => ToolMessage.isInstance(m) && m.tool_call_id === tc.id,
    ) as ToolMessage | undefined;

    return {
      id: tc.id,
      name: tc.name,
      args: tc.args,
      output: matchingToolMessage?.content,
      state: matchingToolMessage
        ? ("output-available" as const)
        : ("input-available" as const),
    };
  });
}

function ChatContent() {
  const router = useRouter();
  const threadId = useSearchParams().get("chatId");
  const [internetMode, setInternetMode] = useState<string>("all");

  const newThreadId = threadId || crypto.randomUUID();

  const transport = useMemo(() => {
    return new HttpAgentServerAdapter({
      apiUrl: getApiUrl(),
      threadId: newThreadId,
      paths: {
        commands: `/threads/${newThreadId}/commands`,
        stream: `/threads/${newThreadId}/stream`,
      },
    });
  }, [newThreadId]);

  const stream = useStream({
    transport,
    threadId: newThreadId,
  });

  const handleSubmit = async (text: string) => {
    if (!threadId) {
      await createThread(newThreadId);
      router.replace(`/dashboard/chat?chatId=${newThreadId}`);
    }
    stream.submit(
      { messages: new HumanMessage(text) },
      { config: { configurable: { internetMode } } },
    );
  };

  const handleInterruptResume = (approvedUrls: string[]) => {
    stream.respond({ approvedUrls }, { interruptId: stream.interrupt?.id });
  };

  return (
    <div className="relative flex flex-col flex-1 h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full overflow-hidden">
      <Conversation className="flex-1 bg-background">
        <ConversationContent className="max-w-4xl mx-auto w-full pb-48 px-4 sm:px-6">
          {!stream.isThreadLoading && stream.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RiChatNewLine />
                  </EmptyMedia>
                  <EmptyTitle>New Chat</EmptyTitle>
                  <EmptyDescription>
                    Ask me something about medicine, health, or anything else!
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
          {stream.isThreadLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <LoaderContent text="Loading Chat..." />
            </div>
          )}
          {stream.messages.map((msg, i) => {
            if (HumanMessage.isInstance(msg)) {
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: ignore
                <Message key={i} from="user">
                  <MessageContent>
                    {typeof msg.content === "string" ? msg.content : ""}
                  </MessageContent>
                </Message>
              );
            }
            if (AIMessage.isInstance(msg)) {
              const textContent = getTextContent(msg);
              const toolCalls = getToolCalls(msg, stream.messages);
              const reasoningText = getReasoningText(msg);

              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: ignore
                <div key={i} className="flex flex-col space-y-2">
                  {/* Reasoning block (shows when model emits thinking tokens) */}
                  {reasoningText && (
                    <Reasoning>
                      <ReasoningTrigger />
                      <ReasoningContent>{reasoningText}</ReasoningContent>
                    </Reasoning>
                  )}

                  {/* Inline tool calls with input/output display */}
                  {toolCalls.map((tc) => (
                    <Tool key={tc.id} defaultOpen>
                      <ToolHeader type={`tool-${tc.name}`} state={tc.state} />
                      <ToolContent>
                        <ToolInput input={tc.args} />
                        {tc.output && (
                          <ToolOutput
                            output={tc.output}
                            errorText={undefined}
                          />
                        )}
                      </ToolContent>
                    </Tool>
                  ))}

                  {/* Streamed text response */}
                  <Message from="assistant">
                    <MessageContent>
                      <MessageResponse>{textContent}</MessageResponse>
                    </MessageContent>
                  </Message>
                </div>
              );
            }
            return null;
          })}

          {stream.interrupt && (
            <div className="bg-card border p-4 sm:p-5 rounded-xl shadow-sm mt-4 space-y-4 w-full">
              <div>
                <h3 className="font-semibold text-lg wrap-break-word">
                  Approval Required: Search Results
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the results you want to include in the context.
                </p>
              </div>
              <div className="space-y-3">
                {/* biome-ignore lint/suspicious/noExplicitAny: ignore */}
                {(stream.interrupt.value as any).results?.map(
                  (r: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 border p-3 rounded-lg bg-background/50 transition-colors hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        id={`result-${idx}`}
                        className="mt-1 approval-checkbox shrink-0 h-4 w-4 rounded border-gray-300"
                        value={r.url}
                        defaultChecked
                      />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`result-${idx}`}
                          className="font-medium text-sm wrap-break-word cursor-pointer block"
                        >
                          {r.title}
                        </label>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-blue-500 hover:underline truncate mt-0.5"
                        >
                          {r.url}
                        </a>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 sm:line-clamp-3">
                          {r.content}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleInterruptResume([])}
                >
                  Reject All
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const checkboxes =
                      document.querySelectorAll<HTMLInputElement>(
                        ".approval-checkbox:checked",
                      );
                    const approvedUrls = Array.from(checkboxes).map(
                      (c) => c.value,
                    );
                    handleInterruptResume(approvedUrls);
                  }}
                >
                  Approve Selected
                </Button>
              </div>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-48 z-10" />
      </Conversation>

      <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-linear-to-t from-background via-background/60 to-transparent pointer-events-none z-10">
        <PromptInput
          className="max-w-2xl mx-auto w-full pointer-events-auto bg-background rounded-4xl shadow-md"
          onSubmit={async ({ text }) => {
            await handleSubmit(text);
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="px-4 pt-4"
              placeholder="Ask me something..."
            />
          </PromptInputBody>
          <PromptInputFooter className="flex justify-between items-center px-4 pb-3">
            <Select value={internetMode} onValueChange={setInternetMode}>
              <SelectTrigger>
                <SelectValue placeholder="Internet Mode" />
              </SelectTrigger>
              <SelectContent className="p-2">
                <SelectItem value="none">No Internet</SelectItem>
                <SelectItem value="all">Full Internet</SelectItem>
                <SelectItem value="trusted_only">Trusted Domains</SelectItem>
                <SelectItem value="ask">Ask Before Including</SelectItem>
              </SelectContent>
            </Select>
            <PromptInputSubmit
              status={stream.isLoading ? "streaming" : "ready"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <ChatContent />;
}
