import { searchHelpCentre } from "../src/lib/help/search";
import type { RetrievalCase } from "./retrieval-cases";

export type RetrievalMiss = {
  question: string;
  expected: string | null;
  got: string[];
};

export type RetrievalReport = {
  total: number;
  hitAt1: number;
  hitAt3: number;
  mrr: number;
  /** Uncovered questions that still returned results. */
  falsePositiveRate: number;
  misses: RetrievalMiss[];
};

/**
 * Scores search against labelled questions.
 * - hit@k: share of questions whose expected article is in the top k
 * - MRR: mean of 1/rank of the expected article (0 when it's missing)
 */
export function evaluateRetrieval(cases: RetrievalCase[]): RetrievalReport {
  const answerable = cases.filter((c) => c.expected !== null);
  const uncovered = cases.filter((c) => c.expected === null);
  const misses: RetrievalMiss[] = [];

  let hitAt1 = 0;
  let hitAt3 = 0;
  let reciprocalRanks = 0;

  for (const c of answerable) {
    const ids = searchHelpCentre(c.question, 3).map((r) => r.id);
    const rank = ids.indexOf(c.expected!) + 1;

    if (rank === 1) hitAt1++;
    if (rank >= 1) {
      hitAt3++;
      reciprocalRanks += 1 / rank;
    } else {
      misses.push({ question: c.question, expected: c.expected, got: ids });
    }
  }

  let falsePositives = 0;
  for (const c of uncovered) {
    const ids = searchHelpCentre(c.question, 3).map((r) => r.id);
    if (ids.length > 0) {
      falsePositives++;
      misses.push({ question: c.question, expected: null, got: ids });
    }
  }

  const n = answerable.length || 1;
  return {
    total: cases.length,
    hitAt1: hitAt1 / n,
    hitAt3: hitAt3 / n,
    mrr: reciprocalRanks / n,
    falsePositiveRate: uncovered.length ? falsePositives / uncovered.length : 0,
    misses,
  };
}

export function formatRetrievalReport(report: RetrievalReport) {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `Retrieval eval: ${report.total} questions`,
    `  hit@1   ${pct(report.hitAt1)}`,
    `  hit@3   ${pct(report.hitAt3)}`,
    `  MRR     ${report.mrr.toFixed(3)}`,
    `  false positives on uncovered questions  ${pct(report.falsePositiveRate)}`,
  ];
  if (report.misses.length) {
    lines.push("", "Misses:");
    for (const m of report.misses) {
      lines.push(
        `  - "${m.question}"  expected ${m.expected ?? "no results"}, got [${m.got.join(", ")}]`,
      );
    }
  }
  return lines.join("\n");
}
