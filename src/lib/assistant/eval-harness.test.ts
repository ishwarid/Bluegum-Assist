import { describe, expect, it } from "vitest";
import { runCase } from "../../../evals/assistant";
import { ASSISTANT_CASES } from "../../../evals/assistant-cases";
import { createDemoModel } from "./demo-model";

/*
 * Runs every assistant eval case against the scripted model. This checks the
 * harness itself (and the app's search, approval and card paths) in CI with
 * no API key. Model-judged checks are skipped here; `npm run eval` with a
 * GROQ_API_KEY runs them against the real model.
 */
describe("assistant eval harness (scripted model)", () => {
  it.each(ASSISTANT_CASES.map((c) => [c.name, c] as const))("%s", async (_name, c) => {
    const result = await runCase(c, createDemoModel(), null);
    const failed = result.checks.filter((check) => check.pass === false);
    expect(failed, JSON.stringify({ failed, reply: result.reply }, null, 2)).toEqual([]);
  });
});
