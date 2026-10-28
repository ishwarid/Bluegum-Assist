"use client";

import type { SupportUIMessage } from "@/lib/assistant/agent";
import { RichText } from "./rich-text";

type Part = SupportUIMessage["parts"][number];

export type Source = { id: string; title: string; url: string };

export type ApprovalHandler = (id: string, approved: boolean) => void;

/**
 * Sources come from what the search tool actually returned, not from the
 * model's text. The model can't add a source the search didn't find.
 */
export function sourcesOf(message: SupportUIMessage): Source[] {
  const seen = new Map<string, Source>();
  for (const part of message.parts) {
    if (part.type === "tool-searchHelpCentre" && part.state === "output-available") {
      for (const { id, title, url } of part.output.results) seen.set(id, { id, title, url });
    }
  }
  return [...seen.values()];
}

export function hasPendingApproval(message: SupportUIMessage | undefined) {
  return Boolean(
    message?.parts.some(
      (part) =>
        (part.type === "tool-freezeCard" || part.type === "tool-unfreezeCard") &&
        part.state === "approval-requested" &&
        !part.approval.isAutomatic,
    ),
  );
}

export function textOf(message: SupportUIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n\n")
    .trim();
}

export function MessagePart({ part, onApproval }: { part: Part; onApproval: ApprovalHandler }) {
  switch (part.type) {
    case "text":
      return part.text.trim() ? <RichText text={part.text} className="space-y-2" /> : null;

    case "tool-searchHelpCentre": {
      const query = part.input?.query;
      if (part.state === "input-streaming" || part.state === "input-available") {
        return <Activity busy>Searching the help centre{query ? ` for "${query}"` : ""}</Activity>;
      }
      if (part.state === "output-available") {
        const count = part.output.results.length;
        return (
          <Activity>
            {count === 0
              ? "Searched the help centre: no matching articles"
              : `Read ${count} help centre ${count === 1 ? "article" : "articles"}`}
          </Activity>
        );
      }
      return part.state === "output-error" ? <Activity>Search didn&apos;t work</Activity> : null;
    }

    case "tool-getCardStatus":
      if (part.state === "output-available") return <Activity>Checked your cards</Activity>;
      if (part.state === "output-error") return <Activity>Couldn&apos;t check your cards</Activity>;
      return <Activity busy>Checking your cards</Activity>;

    case "tool-freezeCard":
    case "tool-unfreezeCard":
      return <CardChange part={part} onApproval={onApproval} />;

    default:
      return null;
  }
}

type CardChangePart = Extract<Part, { type: "tool-freezeCard" | "tool-unfreezeCard" }>;

function CardChange({ part, onApproval }: { part: CardChangePart; onApproval: ApprovalHandler }) {
  const freezing = part.type === "tool-freezeCard";
  const action = freezing ? "Freeze card" : "Unfreeze card";

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return <Activity busy>Preparing your request</Activity>;

    case "approval-requested":
      if (part.approval.isAutomatic) return <Activity busy>Checking the card</Activity>;
      return (
        <div
          role="group"
          aria-labelledby={`approval-${part.toolCallId}`}
          className="border-approve-line bg-approve-bg text-approve-ink rounded-lg border p-4"
        >
          <p id={`approval-${part.toolCallId}`} className="font-semibold">
            {part.approval.requestReason ?? action}?
          </p>
          <p className="mt-1 text-sm">
            {freezing
              ? "Purchases and withdrawals will be declined until you unfreeze it. You can unfreeze it any time."
              : "The card will work again straight away."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onApproval(part.approval.id, true)}
              className="bg-ink text-surface h-9 rounded-md px-4 text-sm font-semibold"
            >
              {action}
            </button>
            <button
              type="button"
              onClick={() => onApproval(part.approval.id, false)}
              className="border-approve-line h-9 rounded-md border px-4 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      );

    case "approval-responded":
      return part.approval.approved ? (
        <Activity busy>{freezing ? "Freezing your card" : "Unfreezing your card"}</Activity>
      ) : (
        <Activity>Cancelled. Nothing was changed.</Activity>
      );

    case "output-available":
      if (!part.output.ok) return <Activity>The card wasn&apos;t changed</Activity>;
      return (
        <Activity done>
          {freezing ? "Card frozen" : "Card unfrozen"}: {part.output.card.name} ending{" "}
          {part.output.card.last4}
        </Activity>
      );

    case "output-denied":
      return (
        <Activity>
          {part.approval?.isAutomatic && part.approval.reason
            ? part.approval.reason
            : "Cancelled. Nothing was changed."}
        </Activity>
      );

    case "output-error":
      return <Activity>The card couldn&apos;t be changed</Activity>;
  }
}

function Activity({
  children,
  busy,
  done,
}: {
  children: React.ReactNode;
  busy?: boolean;
  done?: boolean;
}) {
  return (
    <p className="text-ink-muted flex items-center gap-2 text-sm">
      {busy ? (
        <span aria-hidden className="thinking-dot bg-leaf size-1.5 rounded-full" />
      ) : done ? (
        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" className="text-leaf">
          <path
            d="M2.5 7.5 5.5 10.5 11.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
          />
        </svg>
      ) : (
        <span aria-hidden className="bg-line size-1.5 rounded-full" />
      )}
      <span>{children}</span>
    </p>
  );
}
