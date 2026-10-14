import { updateGhlContactProfile } from "@/lib/ghl";

export const maxDuration = 10;

export async function PATCH(request: Request) {
  const { email, token, firstName, lastName, phone, newEmail } = await request
    .json()
    .catch(() => ({}));
  const expected = process.env.NATASHA_ADMIN_TOKEN;
  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!email) return Response.json({ error: "missing-email" }, { status: 400 });

  const ok = await updateGhlContactProfile(email, { firstName, lastName, phone, newEmail });
  if (!ok) return Response.json({ error: "ghl-update-failed" }, { status: 500 });
  return Response.json({ ok: true });
}
