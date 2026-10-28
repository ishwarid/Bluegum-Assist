// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { POST as feedback } from "@/app/api/feedback/route";
import { createDemoModel } from "@/lib/assistant/demo-model";
import { createMemoryCardStore } from "@/lib/cards/store";
import { createFixedWindowLimiter } from "@/lib/limits";
import { handleChat, VISITOR_COOKIE, type ChatDeps } from "./chat-handler";

const VISITOR = "0b6f3a52-7f1e-4c63-9a7e-2f0c1d9e8a11";

function deps(overrides: Partial<ChatDeps> = {}) {
  const model = createDemoModel();
  const doStream = vi.spyOn(model, "doStream");
  return {
    doStream,
    deps: {
      model,
      cards: createMemoryCardStore(),
      dailyLimiter: createFixedWindowLimiter({ limit: 30, windowMs: 86_400_000 }),
      globalLimiter: createFixedWindowLimiter({ limit: 100, windowMs: 60_000 }),
      approvalSecret: "route-test-secret-long-enough-for-hmac-signing",
      ...overrides,
    } satisfies ChatDeps,
  };
}

function chatRequest(text: string, { cookie }: { cookie?: string } = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
    }),
  });
}

describe("POST /api/chat", () => {
  it("streams an answer and gives a new visitor a cookie", async () => {
    const { deps: d } = deps();
    const response = await handleChat(
      chatRequest("How long does an international transfer take?"),
      d,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(
      new RegExp(`^${VISITOR_COOKIE}=[0-9a-f-]{36}; Path=/; HttpOnly; SameSite=Lax`),
    );
    const body = await response.text();
    expect(body).toContain("searchHelpCentre");
    expect(body).toContain("1 to 3 business days");
  });

  it("keeps the existing visitor id", async () => {
    const { deps: d } = deps();
    const response = await handleChat(
      chatRequest("hello", { cookie: `${VISITOR_COOKIE}=${VISITOR}` }),
      d,
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    await response.text();
  });

  it("rejects malformed messages", async () => {
    const { deps: d, doStream } = deps();
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", nonsense: true }] }),
    });
    const response = await handleChat(request, d);

    expect(response.status).toBe(400);
    expect(doStream).not.toHaveBeenCalled();
  });

  it("rejects messages over the length limit without calling the model", async () => {
    const { deps: d, doStream } = deps();
    const response = await handleChat(chatRequest("a".repeat(5_000)), d);

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: "too-long", limit: 1000 });
    expect(doStream).not.toHaveBeenCalled();
  });

  it("refuses visitors over the daily limit and says when it resets", async () => {
    const { deps: d, doStream } = deps({
      dailyLimiter: createFixedWindowLimiter({ limit: 1, windowMs: 86_400_000 }),
    });
    const cookie = `${VISITOR_COOKIE}=${VISITOR}`;
    await (await handleChat(chatRequest("hi", { cookie }), d)).text();
    doStream.mockClear();

    const response = await handleChat(chatRequest("hi again", { cookie }), d);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("daily-limit");
    expect(new Date(body.resetAt).getTime()).toBeGreaterThan(Date.now());
    expect(doStream).not.toHaveBeenCalled();
  });

  it("says the assistant is busy when the global limit is hit", async () => {
    const { deps: d } = deps({
      globalLimiter: createFixedWindowLimiter({ limit: 0, windowMs: 60_000 }),
    });
    const response = await handleChat(chatRequest("hi"), d);
    expect(response.status).toBe(429);
    expect((await response.json()).error).toBe("busy");
  });
});

describe("POST /api/feedback", () => {
  const send = (body: unknown) =>
    feedback(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

  it("records valid feedback", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const response = await send({ messageId: "msg-1", rating: "not-helpful" });

    expect(response.status).toBe(200);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"rating":"not-helpful"'));
    log.mockRestore();
  });

  it("rejects invalid feedback", async () => {
    expect((await send({ messageId: "", rating: "meh" })).status).toBe(400);
  });
});
