import { updateGhlCustomField } from "@/lib/ghl";

export const maxDuration = 10;

// Updates the recorded infoceutical protocol for a client. Used when Natasha
// realizes the wrong bottle list got recorded — she edits and saves.
export async function PATCH(request: Request) {
  const { email, token, infoceuticalNames } = await request.json().catch(() => ({}));
  const expected = process.env.NATASHA_ADMIN_TOKEN;
  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!email) return Response.json({ error: "missing-email" }, { status: 400 });

  const value = typeof infoceuticalNames === "string" ? infoceuticalNames : "";
  const ok = await updateGhlCustomField(email, "infoceutical_names", value);
  if (!ok) return Response.json({ error: "ghl-update-failed" }, { status: 500 });
  return Response.json({ ok: true });
}
