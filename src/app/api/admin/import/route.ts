import * as XLSX from "xlsx";
import { upsertGhlContact } from "@/lib/ghl";

export const maxDuration = 60;

// Bulk-import E4L's "Clients Information.xlsx" export → upsert each row as a
// GHL contact with `bioenergetics-scan` + `imported-from-e4l` tags so they
// appear in the /admin dashboard.
//
// Token-protected. Returns a per-row result so Natasha can see what was created
// vs skipped vs failed.
export async function POST(request: Request) {
  const formData = await request.formData();
  const token = (formData.get("token") as string | null)?.trim() || "";
  const file = formData.get("file") as File | null;

  const expected = process.env.NATASHA_ADMIN_TOKEN;
  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!file) return Response.json({ error: "missing-file" }, { status: 400 });

  let rows: Array<Record<string, unknown>> = [];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch (err) {
    console.error("XLSX parse failed:", err);
    return Response.json({ error: "parse-failed" }, { status: 400 });
  }

  if (rows.length === 0) {
    return Response.json({ error: "no-rows", processed: 0 }, { status: 400 });
  }

  // E4L's export columns vary slightly. Try common header names.
  const pickField = (row: Record<string, unknown>, ...candidates: string[]): string => {
    for (const c of candidates) {
      const v = row[c];
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
    // Case-insensitive fallback
    const keys = Object.keys(row);
    for (const c of candidates) {
      const k = keys.find((k) => k.toLowerCase() === c.toLowerCase());
      if (k && String(row[k]).trim()) return String(row[k]).trim();
    }
    return "";
  };

  const results: Array<{ email: string; name: string; status: "created" | "updated" | "skipped" | "failed"; reason?: string }> = [];

  // Sequentially upsert (parallel-ize later if volume grows)
  for (const row of rows) {
    const email = pickField(row, "Email", "Email Address", "email", "email_address").toLowerCase();
    const firstName = pickField(row, "First Name", "FirstName", "first_name", "First");
    const lastName = pickField(row, "Last Name", "LastName", "last_name", "Last");
    const fullName = pickField(row, "Name", "Full Name") || `${firstName} ${lastName}`.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      results.push({ email, name: fullName, status: "skipped", reason: "no-or-invalid-email" });
      continue;
    }

    const id = await upsertGhlContact({
      email,
      name: fullName,
      tags: ["bioenergetics-scan", "imported-from-e4l"],
    });

    if (id) {
      results.push({ email, name: fullName, status: "created" });
    } else {
      results.push({ email, name: fullName, status: "failed", reason: "ghl-upsert-failed" });
    }
  }

  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  return Response.json({ ok: true, summary, results });
}
