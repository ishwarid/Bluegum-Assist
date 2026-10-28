import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";

/*
 * A scripted stand-in for a real model, used when no API key is set.
 *
 * It isn't clever: it routes on keywords and writes replies from the real
 * tool results. But it calls the same tools through the same agent, so the
 * search, approval and citation paths in the app are exercised for real.
 * That lets tests, CI and a key-less local run work end to end.
 */

type Decision =
  | { kind: "text"; text: string }
  | { kind: "tool"; toolName: string; input: Record<string, unknown> };

type Card = { id: string; name: string; last4: string; status: string };

const ADVICE =
  /\b(should i|invest|crypto|bitcoin|shares|stocks|which (loan|card|account) is best)\b/i;
const PROMPT_LEAK = /\b(system prompt|your instructions|your rules|ignore (all|your|previous))\b/i;
const CARD_ACTION = /\b(freeze|unfreeze|lock|block|lost|stolen)\b/i;
const CARD_STATUS =
  /\b(are my cards|is my \w+ card (active|frozen|working)|card status|(show|list) my cards)\b/i;

const SUPPORT_HINT = "You can reach our team in the app under Help > Message us.";

export function createDemoModel(): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "bluegum-demo",
    modelId: "scripted",
    supportedUrls: {},

    async doGenerate(options: LanguageModelV4CallOptions) {
      const decision = decide(options.prompt);
      return {
        content: [toContent(decision)],
        finishReason: finishReason(decision),
        usage: USAGE,
        warnings: [],
      };
    },

    async doStream(options: LanguageModelV4CallOptions) {
      const decision = decide(options.prompt);
      return {
        stream: simulateReadableStream<LanguageModelV4StreamPart>({
          chunks: toStreamParts(decision),
          initialDelayInMs: 250,
          chunkDelayInMs: 35,
        }),
      };
    },
  };
}

export function decide(prompt: LanguageModelV4Prompt): Decision {
  const last = prompt.at(-1);
  const userText = lastUserText(prompt);

  if (last?.role === "tool") {
    const result = last.content.findLast((part) => part.type === "tool-result");
    if (result?.type === "tool-result") return afterTool(result.toolName, result.output, userText);
  }

  if (PROMPT_LEAK.test(userText)) {
    return {
      kind: "text",
      text: "I can't share how I'm set up, but I'm happy to help with your banking questions.",
    };
  }
  if (ADVICE.test(userText)) {
    return {
      kind: "text",
      text: "I can't give financial advice, so I can't tell you what to do with your money. I can explain how Bluegum's accounts and fees work if that helps.",
    };
  }
  if (CARD_ACTION.test(userText) || CARD_STATUS.test(userText)) {
    return { kind: "tool", toolName: "getCardStatus", input: {} };
  }
  return { kind: "tool", toolName: "searchHelpCentre", input: { query: userText.slice(0, 200) } };
}

function afterTool(
  toolName: string,
  output: { type: string; value?: unknown; reason?: string },
  userText: string,
): Decision {
  if (output.type === "execution-denied") {
    return { kind: "text", text: "No problem, I haven't changed anything." };
  }
  if (output.type !== "json") {
    return { kind: "text", text: `Something went wrong on our side. ${SUPPORT_HINT}` };
  }

  const value = output.value as Record<string, unknown>;

  switch (toolName) {
    case "searchHelpCentre": {
      const results = (value.results ?? []) as Array<{ title: string; content: string }>;
      if (results.length === 0) {
        return {
          kind: "text",
          text: `I don't have information about that. I can only help with Bluegum banking questions. ${SUPPORT_HINT}`,
        };
      }
      // Like a real model, read every result, not just the top one.
      return {
        kind: "text",
        text: bestParagraph(
          results.map((r) => r.content),
          userText,
        ),
      };
    }

    case "getCardStatus": {
      const cards = (value.cards ?? []) as Card[];
      if (CARD_ACTION.test(userText)) {
        const wantsUnfreeze = /\bunfreeze\b/i.test(userText);
        const card = pickCard(cards, userText);
        if (!card) {
          const names = cards.map((c) => `${c.name} (ending ${c.last4})`).join(" or ");
          return { kind: "text", text: `Which card do you mean: ${names}?` };
        }
        return {
          kind: "tool",
          toolName: wantsUnfreeze ? "unfreezeCard" : "freezeCard",
          input: { cardId: card.id },
        };
      }
      const lines = cards.map((c) => `- ${c.name} ending ${c.last4}: ${c.status}`);
      return { kind: "text", text: `Here are your cards:\n${lines.join("\n")}` };
    }

    case "freezeCard":
    case "unfreezeCard": {
      if (!value.ok) return { kind: "text", text: `That didn't work. ${SUPPORT_HINT}` };
      const card = value.card as Card;
      const state = toolName === "freezeCard" ? "frozen" : "active again";
      const extra =
        toolName === "freezeCard" ? " You can unfreeze it any time if you find it." : "";
      return {
        kind: "text",
        text: `Done. Your ${card.name} card ending ${card.last4} is now ${state}.${extra}`,
      };
    }

    default:
      return { kind: "text", text: SUPPORT_HINT };
  }
}

function pickCard(cards: Card[], text: string) {
  if (/\bcredit\b/i.test(text)) return cards.find((c) => /credit/i.test(c.name));
  if (/\bdebit\b/i.test(text)) return cards.find((c) => /debit/i.test(c.name));
  return cards.length === 1 ? cards[0] : undefined;
}

/**
 * The paragraph, across all articles, that best matches the question: shared
 * word stems, plus a nudge towards timeframes for "how long" and "when"
 * questions. Crude, but it's a scripted demo, not a model.
 */
function bestParagraph(contents: string[], question: string) {
  const stems = (text: string) =>
    new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? []).map((w) => w.slice(0, 6)));
  const asked = stems(question);
  const wantsTime = /\b(how long|when)\b/i.test(question);

  let best = "";
  let bestScore = -1;
  for (const paragraph of contents.flatMap(splitParagraphs)) {
    let score = [...stems(paragraph)].filter((stem) => asked.has(stem)).length;
    if (wantsTime && /\d+\s*(to\s*\d+\s*)?(business )?days?\b/i.test(paragraph)) score += 2;
    if (score > bestScore) {
      best = paragraph;
      bestScore = score;
    }
  }
  return best;
}

/** Paragraphs, keeping a lead-in that ends with ":" together with the list after it. */
function splitParagraphs(content: string) {
  const blocks = content.split(/\n\s*\n/);
  const merged: string[] = [];
  for (const block of blocks) {
    const previous = merged.at(-1);
    if (previous?.trimEnd().endsWith(":")) merged[merged.length - 1] = `${previous}\n${block}`;
    else merged.push(block);
  }
  return merged;
}

function lastUserText(prompt: LanguageModelV4Prompt) {
  const message = prompt.findLast((m) => m.role === "user");
  if (message?.role !== "user") return "";
  return message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

const USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

let callCounter = 0;

function toContent(decision: Decision): LanguageModelV4Content {
  return decision.kind === "text"
    ? { type: "text", text: decision.text }
    : {
        type: "tool-call",
        toolCallId: `demo-call-${++callCounter}`,
        toolName: decision.toolName,
        input: JSON.stringify(decision.input),
      };
}

function finishReason(decision: Decision) {
  return { unified: decision.kind === "text" ? "stop" : "tool-calls", raw: undefined } as const;
}

function toStreamParts(decision: Decision): LanguageModelV4StreamPart[] {
  const parts: LanguageModelV4StreamPart[] = [{ type: "stream-start", warnings: [] }];

  if (decision.kind === "text") {
    const id = `demo-text-${++callCounter}`;
    parts.push({ type: "text-start", id });
    // Word by word, so the UI streams like a real model.
    for (const word of decision.text.match(/\S+\s*/g) ?? []) {
      parts.push({ type: "text-delta", id, delta: word });
    }
    parts.push({ type: "text-end", id });
  } else {
    parts.push(toContent(decision) as LanguageModelV4StreamPart);
  }

  parts.push({ type: "finish", usage: USAGE, finishReason: finishReason(decision) });
  return parts;
}
