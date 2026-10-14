import { addContactTags } from "@/lib/ghl";

export const maxDuration = 10;

// Token-protected. Applies the `infoceutical-ready-pickup` tag and writes a
// "ready date" custom field. Triggers the pickup-ready SMS/email GHL workflow.
//
// Uses addContactTags (additive) instead of upsert (replace) so prior workflow
// tags like 'voice-scan-paid' / 'report-generated' aren't wiped.
async function applyReady(email: string): Promise<boolean> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return addContactTags(
    email,
    ["infoceutical-ready-pickup"],
    [{ key: "infoceutical_ready_date", field_value: today }]
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim();
  const token = (searchParams.get("token") || "").trim();
  const expected = process.env.NATASHA_ADMIN_TOKEN;

  if (!expected) {
    return new Response("Server misconfigured: NATASHA_ADMIN_TOKEN not set", { status: 500 });
  }
  if (token !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response("Missing or invalid email param", { status: 400 });
  }

  const ok = await applyReady(email);
  const pickupConsole = `/admin/pickup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pickup Ready</title>
    <style>body{font-family:-apple-system,sans-serif;max-width:520px;margin:60px auto;padding:32px;background:#F0EDED;color:#331D01;text-align:center}
    .card{background:#fff;border-radius:14px;padding:32px;border:1px solid #B49F90}
    h1{color:#EC9247;font-size:18px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 12px}
    p{color:#786455;line-height:1.6}
    a.btn{display:inline-block;background:#EC9247;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;margin-top:18px}</style></head><body><div class="card">
    <h1>${ok ? "✓ Marked Ready" : "⚠️ Tag Failed"}</h1>
    <p>${ok
      ? `<strong>${email}</strong> tagged. The pickup-ready message fires from GHL within seconds.`
      : `Could not apply tag for ${email}. Check GHL manually or contact tech support.`}</p>
    ${ok ? `<p><a class="btn" href="${pickupConsole}">→ Open Pickup Console</a></p><p style="font-size:12px">When the client picks up, click the link above and confirm the bottles match.</p>` : ""}
    <p style="font-size:12px;color:#B49F90;margin-top:24px">SoliVana Wellness · Internal Tool</p>
    </div></body></html>`,
    { status: ok ? 200 : 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function POST(request: Request) {
  const { email, token } = await request.json().catch(() => ({}));
  const expected = process.env.NATASHA_ADMIN_TOKEN;
  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "missing-or-invalid-email" }, { status: 400 });
  }
  const ok = await applyReady(email);
  if (!ok) return Response.json({ error: "ghl-update-failed" }, { status: 500 });
  return Response.json({ ok: true });
}
