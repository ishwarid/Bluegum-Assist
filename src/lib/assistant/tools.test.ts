import { describe, expect, it } from "vitest";
import { createMemoryCardStore } from "@/lib/cards/store";
import { createSupportTools } from "./tools";

const options = { toolCallId: "t1", messages: [] } as never;

/** Tool results can be values or streams; these tools always return values. */
async function run<T>(result: T | AsyncIterable<T> | PromiseLike<T | AsyncIterable<T>>) {
  return (await result) as T;
}

describe("support tools", () => {
  const cards = createMemoryCardStore();
  const tools = createSupportTools({ customerId: "customer-1", cards });

  it("search returns article ids, titles, urls and content", async () => {
    const out = await run(
      tools.searchHelpCentre.execute!({ query: "replace damaged card" }, options),
    );
    expect(out.results[0]).toMatchObject({ id: "replace-a-card", url: "/help/replace-a-card" });
  });

  it("lists only the customer's cards", async () => {
    const out = await run(tools.getCardStatus.execute!({}, options));
    expect(out.cards.map((c) => c.last4)).toEqual(["4417", "9032"]);
  });

  it("freezes and unfreezes, reporting when nothing changed", async () => {
    expect(await tools.freezeCard.execute!({ cardId: "card-debit" }, options)).toMatchObject({
      ok: true,
      unchanged: false,
      card: { status: "frozen" },
    });
    expect(await tools.freezeCard.execute!({ cardId: "card-debit" }, options)).toMatchObject({
      ok: true,
      unchanged: true,
    });
    expect(await tools.unfreezeCard.execute!({ cardId: "card-debit" }, options)).toMatchObject({
      ok: true,
      card: { status: "active" },
    });
  });

  it("refuses cards that aren't on the account", async () => {
    expect(await tools.freezeCard.execute!({ cardId: "card-999" }, options)).toEqual({
      ok: false,
      error: "That card isn't on this account.",
    });
  });
});
