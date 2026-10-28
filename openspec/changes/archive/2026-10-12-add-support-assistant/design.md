# Design

## Context

Greenfield Next.js app (App Router) deployed to Vercel's free tier, so request handling is
serverless and stateless between requests. The model is a free-tier hosted LLM (Groq), so request
volume is capped by the provider and every call matters. The help centre is about 15 short
articles. See proposal.md for motivation and the specs for required behaviour.

## Goals / Non-Goals

**Goals:**

- One agent definition shared by the chat route and the evaluation harness, so what we evaluate
  is exactly what we ship.
- Safety properties (approval, customer scoping, limits) enforced in code, not only in the prompt.
- Deterministic tests: nothing in `npm test` or CI calls a real model.

**Non-Goals:**

- Real authentication. A demo customer is assigned per visitor.
- Durable storage. Card state and usage counters live in memory (see Risks).
- Multi-language support, voice, and conversation history across sessions.

## Decisions

### Agent: AI SDK `ToolLoopAgent`, built per request by a factory

`createSupportAgent({ model, customerId, cards })` returns a `ToolLoopAgent` with the
instructions, tools and approval policy. The route streams it with
`createAgentUIStreamResponse`; the eval harness calls `agent.generate()` on the same factory.

- Per request, because tools close over the signed-in customer's ID. The model never supplies
  whose cards to touch, so it can't be talked into touching someone else's.
- Alternative: calling `streamText` directly in the route. Rejected because evals would then
  rebuild the configuration and could drift from production.

### Model: Groq by default, swappable, scripted fallback

`getModel()` returns Groq's `llama-3.3-70b-versatile` (overridable with `GROQ_MODEL`) when
`GROQ_API_KEY` is set. Otherwise it returns a scripted model built on the SDK's
`MockLanguageModelV4` that routes on keywords and replies from real tool results.

- Groq: free, no card needed, does not train on API data, and supports tool calling.
- Alternatives: Gemini's free tier (comparable, but free-tier prompts may be used by Google
  outside the EU/UK); Ollama (free and unlimited, but can't serve a hosted demo).
- The scripted model is what lets the hosted demo, tests and CI work with no key. Because it
  calls the same tools, it also exercises the real approval and citation paths in the UI.

### Retrieval: BM25 keyword search (MiniSearch), no embeddings

Articles are indexed in memory at module load with title boosted over body, prefix matching and
light fuzziness. The search tool returns the top 3 with a short excerpt.

- With about 15 articles, BM25 is fast, free, deterministic and fully unit-testable.
- Alternative: embeddings with a vector store. Rejected for now: Groq has no embedding API, it
  adds a second provider and cost, and the retrieval eval shows whether keyword search is good
  enough. If hit@3 drops as content grows, move to hybrid search (BM25 plus embeddings).
- Synonyms the corpus doesn't use ("overseas" vs "international") are handled by a small
  synonym list expanded at query time, checked by the retrieval eval.

### Citations come from tool output, not model text

The widget builds the sources list from the `searchHelpCentre` results in the message parts. The
model is told to answer from those results, but cannot add a source that wasn't returned.

### Approvals: AI SDK tool approval, HMAC-signed

`freezeCard` and `unfreezeCard` use `toolApproval: 'user-approval'`. Approvals are signed with
`experimental_toolApprovalSecret`, so the server rejects any approval it didn't issue.

- Alternative: a client-side "confirm" tool. Rejected: the client sends the full history every
  turn, so an unsigned confirmation could be forged.
- The prompt also tells the model to ask before acting, but safety doesn't depend on it.

### Visitor identity and limits

A random visitor ID in an httpOnly cookie identifies the demo customer and the usage bucket.
The route checks message length and the daily limit before creating the agent, so rejected
requests cost no model calls. The response sets the cookie through its headers.

### Context and cost limits

Only the last 12 UI messages are sent to the model. Output is capped at 600 tokens per step and
the tool loop stops after 5 steps.

### Evaluation: two layers

1. Retrieval eval: labelled question → article pairs scored with hit@1, hit@3 and MRR. It runs
   inside Vitest, so CI enforces the 90% hit@3 gate.
2. Assistant eval (`npm run eval`): cases run through `agent.generate()`. Most checks are
   deterministic: tools called, approval requested and not executed, articles cited. Cases about
   tone or refusals use the model as a judge, with a short rubric and structured output, at
   temperature 0. Results are written to `evals/results/` as JSON and Markdown.

- Alternative: only LLM-as-judge. Rejected: deterministic checks are cheaper, stable between
  runs, and cover the properties that matter most.

## Risks / Trade-offs

- [In-memory state resets on redeploy and isn't shared across serverless instances] → It's
  acceptable for a demo. Card and usage stores sit behind small interfaces so Postgres or
  Upstash Redis can replace them without touching the agent.
- [Free-tier rate limits (Groq ~30 requests/min)] → The per-visitor daily cap, step cap and
  history cap. A 429 from the provider is shown to the user as "busy, try again shortly".
- [The model skips the search tool and answers from memory] → The prompt requires searching
  first, and the assistant eval has cases that fail when it doesn't.
- [Groq retires the model] → The model ID is an environment variable; the eval shows whether a
  replacement behaves.
- [LLM-as-judge is itself non-deterministic] → It's used only for tone and refusal cases,
  temperature 0, and its reason is logged so failures can be reviewed by hand.
