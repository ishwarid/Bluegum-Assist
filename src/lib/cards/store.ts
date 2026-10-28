/*
 * Demo card storage.
 *
 * Every visitor gets their own copy of two demo cards, kept in memory. That
 * means state resets on redeploy and isn't shared between serverless
 * instances, which is fine for a portfolio demo. In production this would be
 * a call to the card platform. The CardStore interface is the seam.
 */

export type CardStatus = "active" | "frozen";

export type Card = {
  id: string;
  name: string;
  network: "Visa" | "Mastercard";
  last4: string;
  status: CardStatus;
};

export type CardResult = { ok: true; card: Card } | { ok: false; error: "not-found" };

export interface CardStore {
  list(customerId: string): Card[];
  find(customerId: string, cardId: string): Card | undefined;
  setStatus(customerId: string, cardId: string, status: CardStatus): CardResult;
}

const DEMO_CARDS: readonly Card[] = [
  { id: "card-debit", name: "Everyday debit", network: "Visa", last4: "4417", status: "active" },
  {
    id: "card-credit",
    name: "Low Rate credit",
    network: "Mastercard",
    last4: "9032",
    status: "active",
  },
];

/** Stops the map growing forever on a long-lived dev server. */
const MAX_CUSTOMERS = 5_000;

export function createMemoryCardStore(): CardStore {
  const byCustomer = new Map<string, Card[]>();

  function cardsFor(customerId: string): Card[] {
    let cards = byCustomer.get(customerId);
    if (!cards) {
      if (byCustomer.size >= MAX_CUSTOMERS) {
        // Maps iterate in insertion order, so this drops the oldest visitor.
        const oldest = byCustomer.keys().next().value;
        if (oldest !== undefined) byCustomer.delete(oldest);
      }
      cards = DEMO_CARDS.map((card) => ({ ...card }));
      byCustomer.set(customerId, cards);
    }
    return cards;
  }

  return {
    list(customerId) {
      // Copies, so callers can't change stored state by accident.
      return cardsFor(customerId).map((card) => ({ ...card }));
    },
    find(customerId, cardId) {
      const card = cardsFor(customerId).find((c) => c.id === cardId);
      return card && { ...card };
    },
    setStatus(customerId, cardId, status) {
      const card = cardsFor(customerId).find((c) => c.id === cardId);
      if (!card) return { ok: false, error: "not-found" };
      card.status = status;
      return { ok: true, card: { ...card } };
    },
  };
}

// One store per server instance, shared by every request it handles.
export const cardStore = createMemoryCardStore();

export function describeCard(card: Pick<Card, "name" | "last4">) {
  return `${card.name} card ending ${card.last4}`;
}
