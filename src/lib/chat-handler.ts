import { randomUUID } from "node:crypto";
import {
  APICallError,
  createAgentUIStreamResponse,
  safeValidateUIMessages,
  type LanguageModel,
} from "ai";
import { createSupportAgent, type SupportUIMessage } from "@/lib/assistant/agent";
import { createSupportTools } from "@/lib/assistant/tools";
import { type CardStore } from "@/lib/cards/store";
import { MAX_MESSAGE_LENGTH, type Limiter } from "@/lib/limits";

/** Only the most recent messages go to the model, to cap cost and context. */
export const HISTORY_LIMIT = 12;
export const VISITOR_COOKIE = "bg-visitor";

const VISITOR_ID = /^[0-9a-f-]{36}$/;
const ONE_YEAR = 60 * 60 * 24 * 365;

export type ChatDeps = {
  model: LanguageModel;
  cards: CardStore;
  dailyLimiter: Limiter;
  globalLimiter: Limiter;
  approvalSecret?: string;
  secureCookie?: boolean;
};

export type ChatErrorBody =
  | { error: "invalid-request"; message: string }
  | { error: "too-long"; message: string; limit: number }
  | { error: "daily-limit"; message: string; resetAt: string }
  | { error: "busy"; message: string };

/**
 * Handles one chat turn. Every check that can refuse a request runs before
 * the agent is created, so refused requests never cost a model call.
 */
export async function handleChat(request: Request, deps: ChatDeps): Promise<Response> {
  const { visitorId, isNew } = readVisitor(request);

  const body = await request.json().catch(() => null);
  // The client sends the whole conversation, so treat all of it as untrusted:
  // tool parts are checked against the tool schemas, not just their shape.
  const validated = await safeValidateUIMessages<SupportUIMessage>({
    messages: body?.messages,
    tools: createSupportTools({ customerId: visitorId, cards: deps.cards }),
  });
  if (!validated.success || validated.data.length === 0) {
    return json(400, { error: "invalid-request", message: "That message couldn't be read." });
  }
  const messages = validated.data;

  const last = messages.at(-1)!;
  const text = last.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
  if (text.length > MAX_MESSAGE_LENGTH) {
    return json(413, {
      error: "too-long",
      message: `Messages can be up to ${MAX_MESSAGE_LENGTH.toLocaleString("en-AU")} characters.`,
      limit: MAX_MESSAGE_LENGTH,
    });
  }

  const daily = deps.dailyLimiter.take(visitorId);
  if (!daily.ok) {
    return json(429, {
      error: "daily-limit",
      message: "You've reached today's message limit for this demo.",
      resetAt: daily.resetAt.toISOString(),
    });
  }
  if (!deps.globalLimiter.take("all").ok) {
    return json(429, {
      error: "busy",
      message: "The assistant is busy right now. Please try again in a minute.",
    });
  }

  const agent = createSupportAgent({
    model: deps.model,
    customerId: visitorId,
    cards: deps.cards,
    approvalSecret: deps.approvalSecret,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages.slice(-HISTORY_LIMIT),
    abortSignal: request.signal,
    headers: isNew ? { "Set-Cookie": visitorCookie(visitorId, deps.secureCookie) } : undefined,
    onError: streamErrorMessage,
  });
}

/** What the customer sees when a reply fails partway. Details stay in server logs. */
export function streamErrorMessage(error: unknown) {
  console.error("[chat] stream error", error);
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return "The assistant is busy right now. Please try again in a minute.";
  }
  return "Something went wrong while answering. Please try again.";
}

function readVisitor(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
  const existing = match?.[1];
  if (existing && VISITOR_ID.test(existing)) return { visitorId: existing, isNew: false };
  return { visitorId: randomUUID(), isNew: true };
}

function visitorCookie(id: string, secure = process.env.NODE_ENV === "production") {
  return [
    `${VISITOR_COOKIE}=${id}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ONE_YEAR}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function json(status: number, body: ChatErrorBody) {
  return Response.json(body, { status });
}
