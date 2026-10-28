import { z } from "zod";

const Feedback = z.object({
  messageId: z.string().min(1).max(100),
  rating: z.enum(["helpful", "not-helpful"]),
});

/**
 * Records whether an answer helped. For the demo this is a structured log
 * line, which Vercel keeps in its log viewer. A real deployment would write
 * to a table and review the not-helpful answers each week alongside the eval
 * results.
 */
export async function POST(request: Request) {
  const parsed = Feedback.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }

  console.info(JSON.stringify({ event: "answer-feedback", ...parsed.data, at: new Date() }));
  return Response.json({ ok: true });
}
