import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";
import { createDemoModel } from "./demo-model";

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export type ModelInfo = { model: LanguageModel; mode: "live" | "demo"; label: string };

/**
 * Groq when a key is set, the scripted demo model otherwise.
 *
 * Switching provider (Gemini, OpenRouter, a local Ollama) means adding a
 * branch here. Nothing else in the app knows which model it's talking to.
 */
export function getModel(env: NodeJS.ProcessEnv = process.env): ModelInfo {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey || env.AI_PROVIDER === "demo") {
    return { model: createDemoModel(), mode: "demo", label: "scripted demo" };
  }

  const modelId = env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  return { model: createGroq({ apiKey })(modelId), mode: "live", label: `groq/${modelId}` };
}

export function isDemoMode(env: NodeJS.ProcessEnv = process.env) {
  return !env.GROQ_API_KEY || env.AI_PROVIDER === "demo";
}
