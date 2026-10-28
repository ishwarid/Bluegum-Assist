import { randomBytes } from "node:crypto";
import { isStepCount, ToolLoopAgent, type InferAgentUIMessage, type LanguageModel } from "ai";
import { describeCard, type CardStore } from "@/lib/cards/store";
import { SUPPORT_INSTRUCTIONS } from "./instructions";
import { createSupportTools } from "./tools";

export const MAX_STEPS = 5;
export const MAX_OUTPUT_TOKENS = 600;

/**
 * Builds the support agent for one customer.
 *
 * The chat route and the eval harness both use this, so what we evaluate is
 * exactly what we ship. It's built per request because the tools are bound to
 * the signed-in customer.
 */
export function createSupportAgent({
  model,
  customerId,
  cards,
  approvalSecret = getApprovalSecret(),
}: {
  model: LanguageModel;
  customerId: string;
  cards: CardStore;
  approvalSecret?: string;
}) {
  return new ToolLoopAgent({
    model,
    instructions: SUPPORT_INSTRUCTIONS,
    tools: createSupportTools({ customerId, cards }),
    toolApproval: {
      freezeCard: cardChangeApproval({ cards, customerId, verb: "Freeze" }),
      unfreezeCard: cardChangeApproval({ cards, customerId, verb: "Unfreeze" }),
    },
    // Signs each approval request so the server can reject approvals it
    // didn't issue. The client sends the whole history every turn, so
    // without this a modified client could fake "approved".
    experimental_toolApprovalSecret: approvalSecret,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2,
  });
}

/**
 * Approval policy for card changes, decided on the server from the server's
 * own card data. Unknown cards are denied without asking. For real cards the
 * reason becomes the text on the approval card, so the customer approves the
 * exact card, not whatever the model chose to call it.
 */
export function cardChangeApproval({
  cards,
  customerId,
  verb,
}: {
  cards: CardStore;
  customerId: string;
  verb: "Freeze" | "Unfreeze";
}) {
  return async (input: { cardId: string }) => {
    const card = cards.find(customerId, input.cardId);
    if (!card) return { type: "denied" as const, reason: "That card isn't on this account." };
    return { type: "user-approval" as const, reason: `${verb} ${describeCard(card)}` };
  };
}

export type SupportAgent = ReturnType<typeof createSupportAgent>;
export type SupportUIMessage = InferAgentUIMessage<SupportAgent>;

let devSecret: string | undefined;

function getApprovalSecret() {
  const fromEnv = process.env.TOOL_APPROVAL_SECRET;
  if (fromEnv) return fromEnv;

  // Every serverless instance must share the secret, so production refuses
  // to run without it rather than silently accepting unsigned approvals.
  if (process.env.NODE_ENV === "production") {
    throw new Error("TOOL_APPROVAL_SECRET must be set in production.");
  }
  devSecret ??= randomBytes(32).toString("base64");
  return devSecret;
}
