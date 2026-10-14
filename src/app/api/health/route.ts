import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 15;

const PRIMARY_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
// Probe newer snapshots so we can choose one with a higher output limit.
const CANDIDATE_MODELS = [
  "claude-sonnet-4-6-20260115",
  "claude-opus-4-6-20260205",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-5-20250929",
];

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const results: Record<string, { ok: boolean; error?: string }> = {};
  let anyOk = false;

  for (const model of CANDIDATE_MODELS) {
    try {
      // Ping the model with a trivial request (max_tokens=1 keeps it cheap)
      await anthropic.messages.create({
        model,
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      });
      results[model] = { ok: true };
      anyOk = true;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const type = (err as { error?: { type?: string } })?.error?.type;
      const msg =
        (err as { error?: { message?: string } })?.error?.message ||
        (err as Error).message ||
        "Unknown error";
      results[model] = {
        ok: false,
        error: `${type || status || "error"}: ${msg}`,
      };
    }
  }

  if (!anyOk) {
    return Response.json(
      {
        ok: false,
        models: results,
        error: "All Anthropic models unavailable",
      },
      { status: 503 }
    );
  }

  return Response.json({
    ok: true,
    primary: PRIMARY_MODEL,
    candidates: results,
  });
}
