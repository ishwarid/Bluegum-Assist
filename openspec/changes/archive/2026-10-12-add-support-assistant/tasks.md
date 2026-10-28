# Tasks

## 1. Help centre content and search

- [x] 1.1 Write the help-centre articles in `src/lib/help/articles.ts`; verify each has a unique ID, title, topic and body with a unit test
- [x] 1.2 Build BM25 search with synonym expansion in `src/lib/help/search.ts`; verify ranking, excerpts and the empty-result case with unit tests
- [x] 1.3 Add the labelled retrieval set in `evals/retrieval-cases.ts` and the scorer in `evals/retrieval.ts`; verify `src/lib/help/retrieval.test.ts` enforces hit@3 ≥ 90% and `npm run eval:retrieval` prints the report
- [x] 1.4 Add help-centre pages `src/app/page.tsx` and `src/app/help/[id]/page.tsx`; verify every article renders at its URL in the production build

## 2. Cards and usage state

- [x] 2.1 Implement the card store in `src/lib/cards/store.ts` with demo cards per visitor, scoped lookups and freeze/unfreeze; verify with unit tests, including another visitor's card ID
- [x] 2.2 Implement the daily usage limiter in `src/lib/limits.ts`; verify limit, reset time and separate visitors with unit tests

## 3. Agent

- [x] 3.1 Write the instructions in `src/lib/assistant/instructions.ts` covering grounding, citations, fallback, advice, scope, injection and approval
- [x] 3.2 Define tools in `src/lib/assistant/tools.ts` (`searchHelpCentre`, `getCardStatus`, `freezeCard`, `unfreezeCard`) bound to the customer ID; verify tool outputs with unit tests
- [x] 3.3 Build `createSupportAgent` in `src/lib/assistant/agent.ts` with approval policy, approval secret, step and token caps; verify with a mock-model test that a freeze produces an approval request and leaves the card active
- [x] 3.4 Implement `getModel` and the scripted demo model in `src/lib/assistant/model.ts` and `src/lib/assistant/demo-model.ts`; verify the demo model searches, reports cards and requests approval in tests

## 4. Chat API

- [x] 4.1 Implement `POST /api/chat` in `src/app/api/chat/route.ts`: visitor cookie, message validation, length and daily limits, history cap, streaming; verify 413 and 429 paths and the cookie in route tests
- [x] 4.2 Implement `POST /api/feedback` in `src/app/api/feedback/route.ts` with input validation; verify accepted and rejected payloads in route tests

## 5. Chat widget

- [x] 5.1 Build the launcher and panel in `src/components/chat/` with focus management and Escape to close; verify in a component test
- [x] 5.2 Render text, search progress, sources, card status, approval and outcome parts; verify the approval buttons call the approval response in a component test
- [x] 5.3 Add stop, error with retry, usage-limit message, demo-mode notice, feedback controls and live-region announcements; verify in component tests and by screenshot

## 6. Assistant evaluation

- [x] 6.1 Write assistant cases in `evals/assistant-cases.ts` covering answers, citations, fallback, cards, approval, advice, scope and injection
- [x] 6.2 Build the runner in `evals/run-assistant.ts` with deterministic checks, model-judged checks, a JSON and Markdown report and a pass threshold; verify `npm run eval` runs end to end with the demo model

## 7. Integration

- [x] 7.1 Add CI in `.github/workflows/ci.yml` running format, lint, typecheck, tests and build; verify every step passes locally
- [x] 7.2 Walk through the full flow in a browser (question, sources, card check, freeze approval and cancel, stop, limit); verify with screenshots in `docs/`
- [x] 7.3 Document setup, architecture and decisions in `README.md`; verify the setup steps from a clean clone

## Workflow follow-up

- Run the assistant eval once with a real `GROQ_API_KEY` and commit the report.
- Archive the change with `openspec archive add-support-assistant` and check the specs in `openspec/specs/`.
