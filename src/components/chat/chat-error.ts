export type ChatErrorView = {
  message: string;
  /** Whether "Try again" makes sense, or the customer has to wait. */
  canRetry: boolean;
};

const timeFormat = new Intl.DateTimeFormat("en-AU", {
  hour: "numeric",
  minute: "2-digit",
  weekday: "long",
});

/**
 * Turns a failed chat request into something to tell the customer.
 *
 * Refusals from our own API (too long, daily limit, busy) arrive as JSON in
 * the error's response body. Anything else is a network or model failure,
 * and retrying usually works.
 */
export function describeChatError(error: unknown): ChatErrorView {
  const body = readBody(error);

  switch (body?.error) {
    case "too-long":
      return { message: body.message ?? "That message is too long.", canRetry: false };
    case "daily-limit": {
      const reset = body.resetAt ? new Date(body.resetAt) : null;
      const when =
        reset && !Number.isNaN(reset.getTime()) ? ` It resets ${timeFormat.format(reset)}.` : "";
      return {
        message: `You've reached today's message limit for this demo.${when}`,
        canRetry: false,
      };
    }
    case "busy":
      return { message: "The assistant is busy right now. Try again in a minute.", canRetry: true };
    case "invalid-request":
      return { message: "Something went wrong sending that message. Try again.", canRetry: true };
  }

  if (error instanceof Error && error.message && !error.message.trim().startsWith("{")) {
    // Messages from the stream are already written for customers (see chat-handler).
    if (/try again/i.test(error.message)) return { message: error.message, canRetry: true };
  }
  return { message: "Something went wrong. Check your connection and try again.", canRetry: true };
}

type ErrorBody = { error?: string; message?: string; resetAt?: string };

function readBody(error: unknown): ErrorBody | null {
  if (!error || typeof error !== "object") return null;
  const raw =
    "responseBody" in error && typeof error.responseBody === "string"
      ? error.responseBody
      : error instanceof Error
        ? error.message
        : null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
