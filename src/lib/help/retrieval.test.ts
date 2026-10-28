import { describe, expect, it } from "vitest";
import { evaluateRetrieval, formatRetrievalReport } from "../../../evals/retrieval";
import { RETRIEVAL_CASES } from "../../../evals/retrieval-cases";

/*
 * The retrieval quality gate. Any change to articles, synonyms or search
 * settings that makes retrieval worse than these thresholds fails CI.
 * Run `npm run eval:retrieval` to see the full report.
 */
describe("retrieval quality", () => {
  const report = evaluateRetrieval(RETRIEVAL_CASES);

  it("finds the right article in the top 3 for at least 90% of questions", () => {
    expect(report.hitAt3, formatRetrievalReport(report)).toBeGreaterThanOrEqual(0.9);
  });

  it("returns nothing for most questions the help centre doesn't cover", () => {
    expect(report.falsePositiveRate, formatRetrievalReport(report)).toBeLessThanOrEqual(0.34);
  });
});
