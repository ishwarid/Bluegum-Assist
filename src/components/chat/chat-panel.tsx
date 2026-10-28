"use client";

import type { ChatStatus } from "ai";
import { useEffect, useId, useRef, useState } from "react";
import { BluegumMark } from "@/components/brand";
import type { SupportUIMessage } from "@/lib/assistant/agent";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";
import type { ChatErrorView } from "./chat-error";
import {
  hasPendingApproval,
  MessagePart,
  sourcesOf,
  textOf,
  type ApprovalHandler,
} from "./message-parts";

export const SUGGESTIONS = [
  "How long do international transfers take?",
  "I lost my credit card",
  "Are my cards active?",
  "Do you charge monthly fees?",
];

export type FeedbackRating = "helpful" | "not-helpful";

export type ChatPanelProps = {
  messages: SupportUIMessage[];
  status: ChatStatus;
  error: ChatErrorView | null;
  demoMode: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onApproval: ApprovalHandler;
  onFeedback: (messageId: string, rating: FeedbackRating) => Promise<void>;
  onClose: () => void;
};

/**
 * Everything the customer sees inside the chat window. It takes plain props
 * and holds no connection state, so it can be tested without a server.
 */
export function ChatPanel({
  messages,
  status,
  error,
  demoMode,
  onSend,
  onStop,
  onRetry,
  onApproval,
  onFeedback,
  onClose,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const busy = status === "submitted" || status === "streaming";
  const awaitingApproval = hasPendingApproval(messages.at(-1));
  const tooLong = draft.length > MAX_MESSAGE_LENGTH;
  const canSend = draft.trim().length > 0 && !busy && !awaitingApproval && !tooLong;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the newest message in view as it streams.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, status]);

  function send(text: string) {
    if (!text.trim() || busy || awaitingApproval) return;
    onSend(text.trim());
    setDraft("");
  }

  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  const announcement = !busy && lastAssistant ? textOf(lastAssistant) : "";

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="panel-in bg-surface shadow-panel border-line fixed inset-0 z-40 flex flex-col sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-2xl sm:border"
    >
      <header className="border-line flex items-center gap-3 border-b px-4 py-3">
        <BluegumMark size={22} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-semibold">
            Bluegum Assist
          </h2>
          <p className="text-ink-muted text-xs">Answers from the help centre</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="text-ink-soft hover:bg-page grid size-9 place-items-center rounded-md"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </header>

      {demoMode && (
        <p className="bg-leaf-soft text-ink-soft px-4 py-2 text-xs">
          Demo mode: replies are scripted because no AI key is set. Search, card checks and
          approvals still run for real.
        </p>
      )}

      <div
        ref={logRef}
        role="log"
        aria-label="Conversation"
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <ol className="space-y-5">
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              return message.role === "user" ? (
                <li key={message.id} className="flex justify-end">
                  <p className="bg-leaf text-on-leaf max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 whitespace-pre-wrap">
                    {textOf(message)}
                  </p>
                </li>
              ) : (
                <li key={message.id} className="space-y-2.5">
                  {message.parts.map((part, i) => (
                    <MessagePart key={i} part={part} onApproval={onApproval} />
                  ))}
                  <Sources message={message} />
                  {(!isLast || !busy) && textOf(message) && (
                    <Feedback messageId={message.id} onFeedback={onFeedback} />
                  )}
                </li>
              );
            })}
            {status === "submitted" && (
              <li className="text-ink-muted flex items-center gap-2 text-sm">
                <span aria-hidden className="thinking-dot bg-leaf size-1.5 rounded-full" />
                Thinking
              </li>
            )}
          </ol>
        )}

        {error && (
          <div
            role="alert"
            className="border-danger/40 text-ink mt-4 rounded-lg border p-3 text-sm"
          >
            <p>{error.message}</p>
            {error.canRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-leaf-strong mt-2 font-semibold underline underline-offset-4"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Announced once a reply is complete, not word by word. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <form
        className="border-line border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        {awaitingApproval && (
          <p className="text-ink-muted mb-2 text-xs">Approve or cancel the request above first.</p>
        )}
        <div className="border-line focus-within:border-leaf focus-within:ring-leaf/25 flex items-end gap-2 rounded-xl border px-3 py-2 focus-within:ring-2">
          <label className="sr-only" htmlFor={`${titleId}-input`}>
            Message
          </label>
          <textarea
            id={`${titleId}-input`}
            ref={inputRef}
            value={draft}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH + 200}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask a question"
            className="placeholder:text-ink-muted [field-sizing:content] max-h-32 min-h-6 flex-1 resize-none bg-transparent outline-none"
            aria-describedby={tooLong ? `${titleId}-count` : undefined}
          />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="bg-ink text-surface h-8 shrink-0 rounded-lg px-3 text-sm font-semibold"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className="bg-leaf text-on-leaf h-8 shrink-0 rounded-lg px-3 text-sm font-semibold disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
        {draft.length > MAX_MESSAGE_LENGTH * 0.8 && (
          <p
            id={`${titleId}-count`}
            className={`mt-1 text-right text-xs ${tooLong ? "text-danger" : "text-ink-muted"}`}
          >
            {draft.length.toLocaleString("en-AU")} / {MAX_MESSAGE_LENGTH.toLocaleString("en-AU")}
          </p>
        )}
      </form>
    </section>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div>
      <p className="text-lg font-semibold">Hi, how can I help?</p>
      <p className="text-ink-soft mt-1 text-sm">
        I answer from Bluegum&apos;s help centre and can check or freeze your cards. I can&apos;t
        give financial advice.
      </p>
      <ul className="mt-5 space-y-2" aria-label="Suggested questions">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="border-line hover:border-leaf hover:bg-leaf-soft w-full rounded-lg border px-3 py-2 text-left text-sm"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sources({ message }: { message: SupportUIMessage }) {
  const sources = sourcesOf(message);
  if (sources.length === 0 || !textOf(message)) return null;
  return (
    <div className="text-sm">
      <p className="text-ink-muted">Articles checked</p>
      <ul className="mt-1 space-y-1">
        {sources.map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              className="text-leaf-strong decoration-leaf/40 underline underline-offset-4"
            >
              {source.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feedback({
  messageId,
  onFeedback,
}: {
  messageId: string;
  onFeedback: ChatPanelProps["onFeedback"];
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  if (state === "sent") return <p className="text-ink-muted text-xs">Thanks for the feedback.</p>;

  async function rate(rating: FeedbackRating) {
    setState("sending");
    try {
      await onFeedback(messageId, rating);
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="text-ink-muted flex items-center gap-1 text-xs">
      <span className="mr-1">
        {state === "failed" ? "Couldn't send. Try again?" : "Was this helpful?"}
      </span>
      <FeedbackButton
        label="Helpful"
        disabled={state === "sending"}
        onClick={() => rate("helpful")}
      >
        <path d="M5 7v6H3V7h2Zm1 6V7l2.5-4.5c.8 0 1.5.7 1.5 1.5V6h2.6a1 1 0 0 1 1 1.2l-.9 4.8a1.5 1.5 0 0 1-1.5 1H6Z" />
      </FeedbackButton>
      <FeedbackButton
        label="Not helpful"
        disabled={state === "sending"}
        onClick={() => rate("not-helpful")}
      >
        <path d="M5 9V3H3v6h2Zm1-6v6l2.5 4.5c.8 0 1.5-.7 1.5-1.5V10h2.6a1 1 0 0 0 1-1.2l-.9-4.8a1.5 1.5 0 0 0-1.5-1H6Z" />
      </FeedbackButton>
    </div>
  );
}

function FeedbackButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="hover:bg-page hover:text-ink grid size-7 place-items-center rounded-md"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
