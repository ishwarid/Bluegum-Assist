"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useRef, useState } from "react";
import type { SupportUIMessage } from "@/lib/assistant/agent";
import { describeChatError } from "./chat-error";
import { ChatPanel, type FeedbackRating } from "./chat-panel";

/**
 * The launcher and the connection to /api/chat. The conversation lives in
 * this component, so closing and reopening the panel keeps it.
 */
export function ChatWidget({ demoMode }: { demoMode: boolean }) {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const chat = useChat<SupportUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    // After the customer approves or cancels, send the decision straight
    // back so the agent can carry on.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  function close() {
    setOpen(false);
    // Wait for the launcher to render again before focusing it.
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  async function sendFeedback(messageId: string, rating: FeedbackRating) {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, rating }),
    });
    if (!response.ok) throw new Error("Feedback failed");
  }

  if (!open) {
    return (
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="bg-leaf text-on-leaf shadow-panel fixed right-4 bottom-4 z-40 flex h-12 items-center gap-2 rounded-full pr-5 pl-4 font-semibold sm:right-6 sm:bottom-6"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path
            d="M3 9.5C3 6 6 3.5 10 3.5s7 2.5 7 6-3 6-7 6c-.9 0-1.8-.1-2.6-.4L4 16.5l.9-2.9C3.7 12.5 3 11.1 3 9.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        Ask Bluegum
      </button>
    );
  }

  return (
    <ChatPanel
      messages={chat.messages}
      status={chat.status}
      error={chat.error ? describeChatError(chat.error) : null}
      demoMode={demoMode}
      onSend={(text) => chat.sendMessage({ text })}
      onStop={() => chat.stop()}
      onRetry={() => {
        chat.clearError();
        chat.regenerate();
      }}
      onApproval={(id, approved) => chat.addToolApprovalResponse({ id, approved })}
      onFeedback={sendFeedback}
      onClose={close}
    />
  );
}
