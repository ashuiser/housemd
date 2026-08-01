"use client";

import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { useStream } from "@langchain/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id");

  const stream = useStream({
    apiUrl: "/api/chat",
    assistantId: "ai-elements",
  });

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)] max-w-4xl mx-auto w-full pt-4 pb-4 px-4">
      <Conversation className="flex-1 rounded-lg p-4 bg-background">
        <ConversationContent>
          {/** biome-ignore lint/suspicious/useIterableCallbackReturn: ignore */}
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
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        className="mt-4"
        onSubmit={({ text }) => {
          stream.submit({
            messages: [{ role: "user", content: text }],
            ...(chatId ? { id: chatId } : {}),
          });
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="px-4 pt-4"
            placeholder="Ask me something..."
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit
            status={stream.isLoading ? "streaming" : "ready"}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
