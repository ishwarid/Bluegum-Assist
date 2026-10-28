import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import { createMemoryCardStore } from "@/lib/cards/store";
import { cardChangeApproval, createSupportAgent } from "./agent";
import { createDemoModel } from "./demo-model";

/*
 * These run the real agent (instructions, tools, approval policy, signing)
 * against the scripted demo model, so they're deterministic and offline.
 */

const SECRET = "test-secret-that-is-long-enough-to-sign-approvals";

function setup() {
  const cards = createMemoryCardStore();
  const agent = createSupportAgent({
    model: createDemoModel(),
    customerId: "customer-1",
    cards,
    approvalSecret: SECRET,
  });
  return { cards, agent };
}

function toolNames(result: { steps: Array<{ toolCalls: Array<{ toolName: string }> }> }) {
  return result.steps.flatMap((step) => step.toolCalls.map((call) => call.toolName));
}

function approvalRequests(result: { content: Array<{ type: string }> }) {
  return result.content.filter((part) => part.type === "tool-approval-request") as Array<{
    type: "tool-approval-request";
    approvalId: string;
    isAutomatic?: boolean;
    reason?: string;
    toolCall: { toolName: string; input: unknown };
  }>;
}

async function askToFreezeCredit() {
  const { agent, cards } = setup();
  const messages: ModelMessage[] = [
    { role: "user", content: "I lost my credit card, please freeze it" },
  ];
  const first = await agent.generate({ messages });
  messages.push(...first.responseMessages);
  return { agent, cards, messages, first };
}

describe("support agent", () => {
  it("answers questions by searching the help centre", async () => {
    const { agent } = setup();
    const result = await agent.generate({
      prompt: "How long does an international transfer take?",
    });

    expect(toolNames(result)).toEqual(["searchHelpCentre"]);
    expect(result.text).toContain("1 to 3 business days");
  });

  it("asks for approval before freezing, and doesn't freeze yet", async () => {
    const { cards, first } = await askToFreezeCredit();

    const [request] = approvalRequests(first);
    expect(request?.toolCall.toolName).toBe("freezeCard");
    expect(request?.isAutomatic).toBeFalsy();
    expect(request?.reason).toBe("Freeze Low Rate credit card ending 9032");
    expect(cards.find("customer-1", "card-credit")?.status).toBe("active");
  });

  it("freezes the card once the customer approves", async () => {
    const { agent, cards, messages, first } = await askToFreezeCredit();
    const [request] = approvalRequests(first);

    messages.push({
      role: "tool",
      content: [
        { type: "tool-approval-response", approvalId: request!.approvalId, approved: true },
      ],
    });
    const second = await agent.generate({ messages });

    expect(cards.find("customer-1", "card-credit")?.status).toBe("frozen");
    expect(second.text).toContain("is now frozen");
  });

  it("leaves the card alone when the customer declines", async () => {
    const { agent, cards, messages, first } = await askToFreezeCredit();
    const [request] = approvalRequests(first);

    messages.push({
      role: "tool",
      content: [
        { type: "tool-approval-response", approvalId: request!.approvalId, approved: false },
      ],
    });
    const second = await agent.generate({ messages });

    expect(cards.find("customer-1", "card-credit")?.status).toBe("active");
    expect(second.text).toMatch(/haven't changed anything/);
  });

  it("rejects an approval signed by a different server", async () => {
    const { messages, first } = await askToFreezeCredit();
    const [request] = approvalRequests(first);

    // Same store, different secret: as if a client forged the approval.
    const cards = createMemoryCardStore();
    const otherServer = createSupportAgent({
      model: createDemoModel(),
      customerId: "customer-1",
      cards,
      approvalSecret: "a-completely-different-secret-value-here",
    });
    messages.push({
      role: "tool",
      content: [
        { type: "tool-approval-response", approvalId: request!.approvalId, approved: true },
      ],
    });

    await expect(otherServer.generate({ messages })).rejects.toThrow();
    expect(cards.find("customer-1", "card-credit")?.status).toBe("active");
  });

  it("denies, without asking, a change to a card that isn't the customer's", async () => {
    const cards = createMemoryCardStore();
    const policy = cardChangeApproval({ cards, customerId: "customer-1", verb: "Freeze" });

    expect(await policy({ cardId: "someone-elses-card" })).toEqual({
      type: "denied",
      reason: "That card isn't on this account.",
    });
    expect(await policy({ cardId: "card-debit" })).toEqual({
      type: "user-approval",
      reason: "Freeze Everyday debit card ending 4417",
    });
  });

  it("declines financial advice without calling any tools", async () => {
    const { agent } = setup();
    const result = await agent.generate({ prompt: "Should I put my savings into crypto?" });

    expect(toolNames(result)).toEqual([]);
    expect(result.text).toMatch(/can't give financial advice/);
  });
});
