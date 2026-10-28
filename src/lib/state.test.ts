import { describe, expect, it } from "vitest";
import { createMemoryCardStore, describeCard } from "./cards/store";
import { createFixedWindowLimiter } from "./limits";

describe("card store", () => {
  it("gives each customer their own demo cards", () => {
    const store = createMemoryCardStore();
    store.setStatus("alice", "card-credit", "frozen");

    expect(store.find("alice", "card-credit")?.status).toBe("frozen");
    expect(store.find("bob", "card-credit")?.status).toBe("active");
  });

  it("refuses card ids the customer doesn't have", () => {
    const store = createMemoryCardStore();
    expect(store.setStatus("alice", "someone-elses-card", "frozen")).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(store.list("alice").every((c) => c.status === "active")).toBe(true);
  });

  it("returns copies so callers can't change stored state", () => {
    const store = createMemoryCardStore();
    const [card] = store.list("alice");
    card!.status = "frozen";
    expect(store.list("alice")[0]?.status).toBe("active");
  });

  it("describes a card the way the customer sees it", () => {
    expect(describeCard({ name: "Everyday debit", last4: "4417" })).toBe(
      "Everyday debit card ending 4417",
    );
  });
});

describe("fixed window limiter", () => {
  const start = new Date("2026-10-12T00:00:00Z");
  const later = (ms: number) => new Date(start.getTime() + ms);

  it("allows up to the limit, then refuses until the window resets", () => {
    const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 1000 });

    expect(limiter.take("v1", start)).toEqual({ ok: true, remaining: 1 });
    expect(limiter.take("v1", later(10))).toEqual({ ok: true, remaining: 0 });
    expect(limiter.take("v1", later(20))).toEqual({ ok: false, resetAt: later(1000) });
    expect(limiter.take("v1", later(1000))).toEqual({ ok: true, remaining: 1 });
  });

  it("counts each key separately", () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.take("v1", start).ok).toBe(true);
    expect(limiter.take("v2", start).ok).toBe(true);
    expect(limiter.take("v1", start).ok).toBe(false);
  });

  it("forgets the oldest key when full", () => {
    const limiter = createFixedWindowLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    limiter.take("a", start);
    limiter.take("b", start);
    limiter.take("c", start); // evicts "a"
    expect(limiter.take("a", start).ok).toBe(true);
  });
});
