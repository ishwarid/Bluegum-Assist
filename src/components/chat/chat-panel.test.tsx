import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SupportUIMessage } from "@/lib/assistant/agent";
import { describeChatError } from "./chat-error";
import { ChatPanel, SUGGESTIONS, type ChatPanelProps } from "./chat-panel";

function renderPanel(props: Partial<ChatPanelProps> = {}) {
  const handlers = {
    onSend: vi.fn(),
    onStop: vi.fn(),
    onRetry: vi.fn(),
    onApproval: vi.fn(),
    onFeedback: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };
  render(
    <ChatPanel
      messages={[]}
      status="ready"
      error={null}
      demoMode={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

const user = (text: string): SupportUIMessage => ({
  id: `u-${text}`,
  role: "user",
  parts: [{ type: "text", text }],
});

const assistant = (parts: unknown[]): SupportUIMessage =>
  ({ id: "a1", role: "assistant", parts }) as SupportUIMessage;

const searchPart = {
  type: "tool-searchHelpCentre",
  toolCallId: "s1",
  state: "output-available",
  input: { query: "replace card" },
  output: {
    results: [
      { id: "replace-a-card", title: "Replacing a card", url: "/help/replace-a-card", content: "" },
    ],
  },
};

const approvalPart = {
  type: "tool-freezeCard",
  toolCallId: "f1",
  state: "approval-requested",
  input: { cardId: "card-credit" },
  approval: { id: "approval-1", requestReason: "Freeze Low Rate credit card ending 9032" },
};

describe("ChatPanel", () => {
  it("focuses the message box and offers suggestions when empty", async () => {
    const { onSend } = renderPanel();

    expect(screen.getByLabelText("Message")).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: SUGGESTIONS[1] }));
    expect(onSend).toHaveBeenCalledWith(SUGGESTIONS[1]);
  });

  it("sends on Enter and clears the box", async () => {
    const { onSend } = renderPanel();
    const box = screen.getByLabelText("Message");

    await userEvent.type(box, "Do you charge fees?{Enter}");

    expect(onSend).toHaveBeenCalledWith("Do you charge fees?");
    expect(box).toHaveValue("");
  });

  it("closes on Escape", async () => {
    const { onClose } = renderPanel();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Stop while a reply is streaming", async () => {
    const { onStop } = renderPanel({ messages: [user("hi")], status: "streaming" });
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalled();
  });

  it("lists sources from the search results, linking to each article", () => {
    renderPanel({
      messages: [
        user("my card is damaged"),
        assistant([searchPart, { type: "text", text: "Replacements are free." }]),
      ],
    });

    expect(screen.getByRole("link", { name: "Replacing a card" })).toHaveAttribute(
      "href",
      "/help/replace-a-card",
    );
  });

  it("asks for approval with the exact card, and blocks new messages until answered", async () => {
    const { onApproval } = renderPanel({
      messages: [user("I lost my credit card"), assistant([approvalPart])],
    });

    expect(screen.getByText("Freeze Low Rate credit card ending 9032?")).toBeInTheDocument();
    expect(screen.getByText("Approve or cancel the request above first.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Freeze card" }));
    expect(onApproval).toHaveBeenCalledWith("approval-1", true);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onApproval).toHaveBeenCalledWith("approval-1", false);
  });

  it("shows the reason when the server denied a change automatically", () => {
    renderPanel({
      messages: [
        user("freeze card 123"),
        assistant([
          {
            ...approvalPart,
            state: "output-denied",
            approval: {
              id: "approval-2",
              approved: false,
              isAutomatic: true,
              reason: "That card isn't on this account.",
            },
          },
        ]),
      ],
    });
    expect(screen.getByText("That card isn't on this account.")).toBeInTheDocument();
  });

  it("offers Try again for temporary errors only", async () => {
    const { onRetry } = renderPanel({
      messages: [user("hi")],
      error: { message: "Something went wrong.", canRetry: true },
    });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("records feedback and confirms it", async () => {
    const { onFeedback } = renderPanel({
      messages: [user("hi"), assistant([{ type: "text", text: "Hello!" }])],
    });

    await userEvent.click(screen.getByRole("button", { name: "Not helpful" }));

    expect(onFeedback).toHaveBeenCalledWith("a1", "not-helpful");
    await waitFor(() => expect(screen.getByText("Thanks for the feedback.")).toBeInTheDocument());
  });

  it("announces the finished reply to screen readers", () => {
    renderPanel({ messages: [user("hi"), assistant([{ type: "text", text: "Hello there" }])] });
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("Hello there");
  });

  it("labels demo mode", () => {
    renderPanel({ demoMode: true });
    expect(screen.getByText(/replies are scripted/)).toBeInTheDocument();
  });
});

describe("describeChatError", () => {
  const apiError = (body: object) =>
    Object.assign(new Error(JSON.stringify(body)), { responseBody: JSON.stringify(body) });

  it("tells the customer when the daily limit resets, without a retry", () => {
    const view = describeChatError(
      apiError({ error: "daily-limit", resetAt: "2026-10-13T09:00:00.000Z" }),
    );
    expect(view.canRetry).toBe(false);
    expect(view.message).toMatch(/today's message limit.*It resets/);
  });

  it("explains a message that's too long", () => {
    expect(
      describeChatError(
        apiError({ error: "too-long", message: "Messages can be up to 1,000 characters." }),
      ),
    ).toEqual({ message: "Messages can be up to 1,000 characters.", canRetry: false });
  });

  it("falls back to a retryable message for network failures", () => {
    expect(describeChatError(new TypeError("Failed to fetch"))).toMatchObject({ canRetry: true });
  });
});
