import { updateGhlCustomField } from "@/lib/ghl";

export const maxDuration = 10;

export async function PATCH(request: Request) {
  const { email, token, notes } = await request.json().catch(() => ({}));
  const expected = process.env.NATASHA_ADMIN_TOKEN;
  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!email) return Response.json({ error: "missing-email" }, { status: 400 });

  const ok = await updateGhlCustomField(email, "notes", typeof notes === "string" ? notes : "");
  if (!ok) return Response.json({ error: "ghl-update-failed" }, { status: 500 });
  return Response.json({ ok: true });
}
