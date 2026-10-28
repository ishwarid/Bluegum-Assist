import { getModel } from "@/lib/assistant/model";
import { cardStore } from "@/lib/cards/store";
import { handleChat } from "@/lib/chat-handler";
import { dailyLimiter, globalLimiter } from "@/lib/limits";

// Vercel's free tier allows functions to run for up to 60 seconds.
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleChat(request, {
    model: getModel().model,
    cards: cardStore,
    dailyLimiter,
    globalLimiter,
  });
}
