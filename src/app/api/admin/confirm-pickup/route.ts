import { addContactTags } from "@/lib/ghl";

export const maxDuration = 10;

// Token-protected. Applies the `infoceutical-picked-up` tag and writes a
// pickup-date custom field. Called from /admin/pickup when Natasha confirms
// the client physically walked out with their bottles.
//
// Uses addContactTags (additive) so the `infoceutical-ready-pickup` tag and
// any prior workflow tags stay intact for audit history.
export async function POST(request: Request) {
  const { email, token, items } = await request.json().catch(() => ({}));
  const expected = process.env.NATASHA_ADMIN_TOKEN;

  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "missing-or-invalid-email" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  const customFields = [
    { key: "infoceutical_pickup_date", field_value: today },
    ...(Array.isArray(items) && items.length
      ? [{ key: "infoceutical_pickup_verified", field_value: items.join(", ") }]
      : []),
  ];

  const ok = await addContactTags(email, ["infoceutical-picked-up"], customFields);

  if (!ok) return Response.json({ error: "ghl-update-failed" }, { status: 500 });
  return Response.json({ ok: true, pickupDate: today });
}
