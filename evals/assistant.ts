/*
 * Runs assistant cases through the real agent and scores them.
 * The CLI is evals/run-assistant.ts; the harness itself is tested in
 * src/lib/assistant/eval-harness.test.ts against the scripted model.
 */
import { generateText, Output, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { createSupportAgent } from "../src/lib/assistant/agent";
import { createMemoryCardStore } from "../src/lib/cards/store";
import type { AssistantCase } from "./assistant-cases";

export const PASS_THRESHOLD = 0.85;
const CUSTOMER = "eval-customer";
const SECRET = "eval-approval-secret-at-least-32-characters";

export type Check = { name: string; pass: boolean | "skipped"; detail?: string };
export type CaseResult = {
  name: string;
  spec: string;
  pass: boolean;
  checks: Check[];
  reply: string;
  tools: string[];
  ms: number;
};

export async function runCase(
  c: AssistantCase,
  model: LanguageModel,
  judge: LanguageModel | null,
): Promise<CaseResult> {
  const started = Date.now();
  const cards = createMemoryCardStore();
  const agent = createSupportAgent({ model, customerId: CUSTOMER, cards, approvalSecret: SECRET });

  const messages: ModelMessage[] = [{ role: "user", content: c.message }];
  const first = await agent.generate({ messages });
  const results = [first];

  const approvals = first.content.filter(
    (part) => part.type === "tool-approval-request" && !part.isAutomatic,
  ) as Array<{ approvalId: string; toolCall: { toolName: string; input: unknown } }>;

  if (c.approval && approvals.length > 0) {
    messages.push(...first.responseMessages, {
      role: "tool",
      content: approvals.map((a) => ({
        type: "tool-approval-response" as const,
        approvalId: a.approvalId,
        approved: c.approval === "approve",
      })),
    });
    results.push(await agent.generate({ messages }));
  }

  const steps = results.flatMap((r) => r.steps);
  const tools = steps.flatMap((s) => s.toolCalls.map((call) => call.toolName));
  const cited = new Set(
    steps.flatMap((s) =>
      s.toolResults
        .filter((r) => r.toolName === "searchHelpCentre")
        .flatMap((r) => (r.output as { results: Array<{ id: string }> }).results.map((a) => a.id)),
    ),
  );
  const reply = results.at(-1)!.text.trim();
  const checks: Check[] = [];

  for (const tool of c.expectTools ?? []) {
    checks.push({
      name: `calls ${tool}`,
      pass: tools.includes(tool),
      detail: `called [${tools.join(", ")}]`,
    });
  }
  for (const tool of c.forbidTools ?? []) {
    checks.push({ name: `doesn't call ${tool}`, pass: !tools.includes(tool) });
  }
  for (const id of c.expectCitations ?? []) {
    checks.push({
      name: `cites ${id}`,
      pass: cited.has(id),
      detail: `found [${[...cited].join(", ")}]`,
    });
  }
  if (c.expectApprovalFor) {
    const { tool, cardId } = c.expectApprovalFor;
    const asked = approvals.some(
      (a) =>
        a.toolCall.toolName === tool && (a.toolCall.input as { cardId?: string }).cardId === cardId,
    );
    checks.push({
      name: `asks approval to ${tool} ${cardId}`,
      pass: asked,
      detail: `approvals: ${approvals.map((a) => `${a.toolCall.toolName}(${JSON.stringify(a.toolCall.input)})`).join(", ") || "none"}`,
    });
  }
  for (const [cardId, status] of Object.entries(c.expectCards ?? {})) {
    const actual = cards.find(CUSTOMER, cardId)?.status;
    checks.push({
      name: `${cardId} is ${status}`,
      pass: actual === status,
      detail: `was ${actual}`,
    });
  }
  for (const pattern of c.textMatches ?? []) {
    checks.push({ name: `reply matches ${pattern}`, pass: pattern.test(reply) });
  }
  for (const pattern of c.textExcludes ?? []) {
    checks.push({ name: `reply avoids ${pattern}`, pass: !pattern.test(reply) });
  }
  if (c.judge) {
    checks.push(judge ? await judgeReply(judge, c, reply) : { name: "judge", pass: "skipped" });
  }

  return {
    name: c.name,
    spec: c.spec,
    pass: checks.every((check) => check.pass !== false),
    checks,
    reply,
    tools,
    ms: Date.now() - started,
  };
}

/** Model-as-judge for things code can't check. Low temperature, short rubric, reason logged. */
async function judgeReply(model: LanguageModel, c: AssistantCase, reply: string): Promise<Check> {
  const { output } = await generateText({
    model,
    temperature: 0,
    output: Output.object({
      schema: z.object({ pass: z.boolean(), reason: z.string() }),
    }),
    prompt: `You are reviewing a bank support assistant's reply.

Customer message:
${c.message}

Assistant reply:
${reply || "(empty)"}

Requirement:
${c.judge}

Does the reply meet the requirement? Answer pass true or false, with a one-sentence reason.`,
  });
  return { name: "judge", pass: output.pass, detail: output.reason };
}

export function toMarkdown(results: CaseResult[], label: string, passRate: number) {
  const lines = [
    `# Assistant eval: ${label}`,
    "",
    `Run ${new Date().toISOString()}. **${results.filter((r) => r.pass).length}/${results.length} passed (${(passRate * 100).toFixed(0)}%)**, threshold ${PASS_THRESHOLD * 100}%.`,
    "",
    "| Case | Result | Tools | Time |",
    "| --- | --- | --- | --- |",
    ...results.map(
      (r) =>
        `| ${r.name} | ${r.pass ? "Pass" : "**Fail**"} | ${r.tools.join(", ") || "none"} | ${(r.ms / 1000).toFixed(1)}s |`,
    ),
  ];
  const failures = results.filter((r) => !r.pass);
  if (failures.length) {
    lines.push("", "## Failures");
    for (const r of failures) {
      lines.push("", `### ${r.name}`, `Spec: ${r.spec}`, "");
      for (const check of r.checks.filter((ch) => ch.pass === false)) {
        lines.push(`- ${check.name}${check.detail ? `: ${check.detail}` : ""}`);
      }
      lines.push("", "Reply:", "", "> " + (r.reply || "(empty)").replace(/\n/g, "\n> "));
    }
  }
  return lines.join("\n") + "\n";
}
