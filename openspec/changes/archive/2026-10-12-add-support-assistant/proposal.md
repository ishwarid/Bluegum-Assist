# Proposal

## Why

Bluegum Bank's help centre has the answers to most support questions, but customers have to find
the right article themselves, and simple account tasks (checking a card, freezing a lost one) mean
calling support. A chat assistant can answer from the help centre and do those tasks. However, a
bank cannot ship an assistant that makes up policy, gives financial advice, or changes an account
without the customer's say-so. Those constraints shape this change as much as the feature itself.

## What Changes

- Add a chat widget to the help centre that streams answers and can be stopped mid-answer.
- Answer questions only from Bluegum's help-centre articles, and show which articles each answer
  came from. When the articles don't cover a question, say so and point to human support.
- Let the signed-in customer check their cards' status, and freeze or unfreeze a card. Freezing
  and unfreezing only happen after the customer approves the exact action in the chat.
- Keep the assistant inside its role: no financial advice, no topics unrelated to Bluegum,
  no instructions taken from content it reads, and limits on message length and daily use.
- Add an evaluation harness: a fixed set of questions with expected outcomes, scored against the
  real model, plus a retrieval check that runs in CI without a model or API key.
- Run with no API key by falling back to a scripted demo model, so the app, tests and CI never
  need network access.

## Capabilities

### New Capabilities

- `help-answers`: answering customer questions from help-centre articles, with source citations
  and an honest fallback when the articles don't cover the question
- `card-actions`: reading the customer's card status and freezing or unfreezing a card, gated by
  explicit customer approval
- `assistant-guardrails`: the limits that keep the assistant in scope and protect the free model
  quota: topic scope, no financial advice, prompt-injection resistance, input and usage limits
- `chat-widget`: the customer-facing chat experience: streaming, stopping, tool progress,
  approvals, errors and accessibility
- `assistant-evaluation`: measuring answer and retrieval quality against a fixed question set,
  with pass thresholds that can fail a build

### Modified Capabilities

None. This is the first change in the project.

## Impact

- New Next.js app: help-centre pages, a chat API route, and the chat widget.
- New dependencies: the AI SDK and its Groq provider (free tier), a local full-text search
  library, and zod for tool input schemas.
- New environment variables: `GROQ_API_KEY` (optional; without it the scripted demo model is
  used), `TOOL_APPROVAL_SECRET` (signs approvals), and optional model and limit settings.
- Card state and usage counters are held in server memory for the demo. They reset on redeploy
  and are not shared across serverless instances. See design.md.
