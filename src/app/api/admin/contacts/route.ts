import { listContactsByTags } from "@/lib/ghl";

export const maxDuration = 30;

// Token-protected. Returns the full client roster for the admin dashboard.
// Pulls every contact tagged with bioenergetics-scan or infoceutical-paid
// (i.e. anyone who ever paid us) and includes scan history + pickup status.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get("token") || "").trim();
  const expected = process.env.NATASHA_ADMIN_TOKEN;

  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });

  const contacts = await listContactsByTags([
    "bioenergetics-scan",
    "infoceutical-paid",
  ]);

  return Response.json({ contacts });
}
