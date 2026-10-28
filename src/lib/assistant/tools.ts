import { tool } from "ai";
import { z } from "zod";
import { type CardStore } from "@/lib/cards/store";
import { searchHelpCentre } from "@/lib/help/search";

/**
 * The assistant's tools, bound to one customer.
 *
 * The customer ID comes from the server session and is captured here. No
 * tool takes a customer ID as input, so the model can't be talked into
 * reading or changing another customer's cards.
 */
export function createSupportTools({
  customerId,
  cards,
}: {
  customerId: string;
  cards: CardStore;
}) {
  return {
    searchHelpCentre: tool({
      description:
        "Search Bluegum's help-centre articles. Returns up to 3 articles with their full text, or none if nothing matches.",
      inputSchema: z.object({
        query: z.string().min(2).max(200).describe("The key terms to search for"),
      }),
      execute: async ({ query }) => ({
        results: searchHelpCentre(query).map(({ id, title, url, content }) => ({
          id,
          title,
          url,
          content,
        })),
      }),
    }),

    getCardStatus: tool({
      description:
        "List the customer's cards with their ID, name, network, last four digits and status (active or frozen).",
      inputSchema: z.object({}),
      execute: async () => ({ cards: cards.list(customerId) }),
    }),

    freezeCard: tool({
      description:
        "Freeze one of the customer's cards. The customer is asked to approve before it runs.",
      inputSchema: z.object({ cardId: z.string().describe("Card ID from getCardStatus") }),
      execute: async ({ cardId }) => setStatus(cards, customerId, cardId, "frozen"),
    }),

    unfreezeCard: tool({
      description:
        "Unfreeze one of the customer's frozen cards. The customer is asked to approve before it runs.",
      inputSchema: z.object({ cardId: z.string().describe("Card ID from getCardStatus") }),
      execute: async ({ cardId }) => setStatus(cards, customerId, cardId, "active"),
    }),
  };
}

function setStatus(
  cards: CardStore,
  customerId: string,
  cardId: string,
  status: "frozen" | "active",
) {
  const before = cards.find(customerId, cardId);
  if (!before) return { ok: false as const, error: "That card isn't on this account." };

  const result = cards.setStatus(customerId, cardId, status);
  if (!result.ok) return { ok: false as const, error: "The card couldn't be updated." };

  return {
    ok: true as const,
    card: result.card,
    unchanged: before.status === status,
  };
}

export type SupportTools = ReturnType<typeof createSupportTools>;
