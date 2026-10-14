import { getPickupState } from "@/lib/ghl";

export const maxDuration = 10;

// Token-protected: returns the pickup state for a contact (used by the
// /admin/pickup page to render Natasha's verification console).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim();
  const token = (searchParams.get("token") || "").trim();
  const expected = process.env.NATASHA_ADMIN_TOKEN;

  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!email) return Response.json({ error: "missing-email" }, { status: 400 });

  const state = await getPickupState(email);
  return Response.json(state);
}
