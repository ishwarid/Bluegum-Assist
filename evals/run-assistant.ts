/*
 * Assistant eval CLI.
 *
 *   npm run eval                           Groq if GROQ_API_KEY is set,
 *                                          otherwise the scripted demo model
 *   EVAL_ONLY="Card status" npm run eval   only cases whose name contains this
 *
 * Writes evals/results/<mode>-latest.{json,md} and exits non-zero if the
 * pass rate is below the threshold.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { getModel } from "../src/lib/assistant/model";
import { PASS_THRESHOLD, runCase, toMarkdown, type CaseResult } from "./assistant";
import { ASSISTANT_CASES } from "./assistant-cases";

async function main() {
  const { model, mode, label } = getModel();
  const judge = mode === "live" ? model : null;
  const only = process.env.EVAL_ONLY?.toLowerCase();
  const cases = ASSISTANT_CASES.filter((c) => !only || c.name.toLowerCase().includes(only));
  // Groq's free tier allows about 30 requests a minute; each case uses 2 to 5.
  const pause = mode === "live" ? Number(process.env.EVAL_DELAY_MS ?? 3000) : 0;

  console.log(
    `Assistant eval with ${label}${mode === "demo" ? " (no GROQ_API_KEY, judges skipped)" : ""}\n`,
  );

  const results: CaseResult[] = [];
  for (const c of cases) {
    let result: CaseResult;
    try {
      result = await runCase(c, model, judge);
    } catch (error) {
      result = {
        name: c.name,
        spec: c.spec,
        pass: false,
        checks: [{ name: "runs without error", pass: false, detail: String(error) }],
        reply: "",
        tools: [],
        ms: 0,
      };
    }
    results.push(result);
    const failed = result.checks.filter((ch) => ch.pass === false).map((ch) => ch.name);
    console.log(
      `${result.pass ? "PASS" : "FAIL"}  ${c.name}${failed.length ? `  (${failed.join("; ")})` : ""}`,
    );
    if (pause) await new Promise((resolve) => setTimeout(resolve, pause));
  }

  const passRate = results.filter((r) => r.pass).length / (results.length || 1);
  console.log(`\n${(passRate * 100).toFixed(0)}% passed (threshold ${PASS_THRESHOLD * 100}%)`);

  mkdirSync("evals/results", { recursive: true });
  const base = `evals/results/${mode}-latest`;
  writeFileSync(`${base}.json`, JSON.stringify({ model: label, passRate, results }, null, 2));
  writeFileSync(`${base}.md`, toMarkdown(results, label, passRate));
  console.log(`Report written to ${base}.md`);

  if (passRate < PASS_THRESHOLD) process.exitCode = 1;
}

main();
