"use client";

import { useEffect, useState, useCallback } from "react";

type Contact = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  tags: string[];
  scanCount: string;
  lastScanDate: string;
  firstScanDate: string;
  infoceuticalNames: string;
  deliveryMethod: string;
  readyDate: string;
  pickupDate: string;
  hasInfoceuticalPaid: boolean;
  hasReadyTag: boolean;
  hasPickedUpTag: boolean;
};

const TOKEN_KEY = "solivana_admin_token";
type SortKey = "name" | "email" | "scans" | "lastScan" | "pickup";

export default function AdminDashboard() {
  const [token, setToken] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs-action" | "scanned" | "ordered" | "ready" | "picked-up">("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastScan");
  const [sortDesc, setSortDesc] = useState(true);

  // On mount, restore token from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(TOKEN_KEY) || "";
    if (saved) setToken(saved);
    setAuthChecked(true);
  }, []);

  const load = useCallback(async (t: string) => {
    if (!t) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/contacts?token=${encodeURIComponent(t)}`);
      if (res.status === 401) {
        setError("Wrong token. Try again.");
        setContacts(null);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(TOKEN_KEY);
        setToken("");
        return;
      }
      if (!res.ok) {
        setError(`Server error (${res.status})`);
        return;
      }
      const data = (await res.json()) as { contacts: Contact[] };
      setContacts(data.contacts);
      if (typeof window !== "undefined") window.sessionStorage.setItem(TOKEN_KEY, t);
    } catch {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && authChecked) load(token);
  }, [token, authChecked, load]);

  const submitToken = (e: React.FormEvent) => {
    e.preventDefault();
    const v = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("input[name=token]")?.value || "";
    setToken(v.trim());
  };

  const logout = () => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setContacts(null);
  };

  const statusOf = (c: Contact): { label: string; color: string } => {
    if (c.hasPickedUpTag) return { label: "Picked up", color: "bg-green-100 text-green-800" };
    if (c.hasReadyTag) return { label: "Ready — awaiting pickup", color: "bg-orange-100 text-orange-800" };
    if (c.hasInfoceuticalPaid) return { label: "Ordered — fulfilling", color: "bg-blue-100 text-blue-800" };
    if (c.scanCount && parseInt(c.scanCount, 10) > 0) return { label: "Scanned", color: "bg-purple-100 text-purple-800" };
    if (c.tags.includes("voice-scan-paid")) return { label: "Paid — not scanned yet", color: "bg-yellow-100 text-yellow-800" };
    if (c.tags.includes("imported-from-e4l")) return { label: "Imported from E4L", color: "bg-gray-100 text-gray-700" };
    return { label: "—", color: "bg-gray-100 text-gray-600" };
  };

  const filtered = (contacts || [])
    .filter((c) => {
      if (statusFilter === "needs-action") return c.hasInfoceuticalPaid && !c.hasPickedUpTag;
      if (statusFilter === "scanned") return c.scanCount && parseInt(c.scanCount, 10) > 0 && !c.hasInfoceuticalPaid;
      if (statusFilter === "ordered") return c.hasInfoceuticalPaid && !c.hasReadyTag && !c.hasPickedUpTag;
      if (statusFilter === "ready") return c.hasReadyTag && !c.hasPickedUpTag;
      if (statusFilter === "picked-up") return c.hasPickedUpTag;
      return true;
    })
    .filter((c) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        c.email.toLowerCase().includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.infoceuticalNames || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDesc ? -1 : 1;
      switch (sortKey) {
        case "name":
          return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case "email":
          return dir * a.email.localeCompare(b.email);
        case "scans":
          return dir * ((parseInt(a.scanCount, 10) || 0) - (parseInt(b.scanCount, 10) || 0));
        case "lastScan":
          return dir * (a.lastScanDate || "").localeCompare(b.lastScanDate || "");
        case "pickup":
          return dir * (a.pickupDate || "").localeCompare(b.pickupDate || "");
        default:
          return 0;
      }
    });

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDesc(!sortDesc);
    else { setSortKey(k); setSortDesc(true); }
  };

  // E4L XLSX import
  type ImportResult = {
    summary?: { total: number; created: number; skipped: number; failed: number };
    error?: string;
    results?: Array<{ email: string; name: string; status: string; reason?: string }>;
  };
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImport, setShowImport] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("token", token);
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const d = (await res.json()) as ImportResult;
      setImportResult(d);
      if ((d as ImportResult).summary) await load(token); // refresh roster
    } catch {
      setImportResult({ error: "Connection error" });
    } finally {
      setImporting(false);
      e.target.value = ""; // allow re-upload of same file
    }
  };

  // Truncate GHL date fields ("2026-04-28T00:00:00.000Z" or "2026-04-28") to just the date portion
  const fmtDate = (s: string): string => (s ? s.slice(0, 10) : "");

  if (!authChecked) {
    return <div className="min-h-screen bg-[#F0EDED]" />;
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F0EDED] flex items-center justify-center px-6" style={{ fontFamily: "Poppins, sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-[#B49F90]/30">
          <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-2">Admin</p>
          <h1 style={{ fontFamily: "Jost, sans-serif" }} className="text-2xl font-light text-[#331D01] mb-6">SoliVana Admin</h1>
          <form onSubmit={submitToken}>
            <label className="text-[#786455] text-sm block mb-2">Admin token</label>
            <input
              name="token"
              type="password"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-[#B49F90] bg-[#F0EDED]/40 text-[#331D01] focus:outline-none focus:ring-2 focus:ring-[#EC9247]"
              placeholder="Paste your admin token"
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            <button type="submit" className="mt-4 w-full py-3 bg-[#EC9247] text-white rounded-xl font-semibold hover:bg-[#d4813b]">
              Sign in
            </button>
          </form>
          <p className="text-[#B49F90] text-xs mt-4">For Natasha&apos;s use only. The token rotates via Railway env vars.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      <header className="bg-[#331D01] text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EC9247] flex items-center justify-center font-bold text-sm">S</div>
            <span style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-base font-light tracking-widest uppercase">SoliVana Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href={`/admin?token=${encodeURIComponent(token)}`} className="text-[#EC9247]">Clients</a>
            <button onClick={logout} className="text-[#B49F90] hover:text-white">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        {contacts && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Total clients", val: contacts.length, color: "text-[#331D01]" },
              { label: "Scanned", val: contacts.filter((c) => parseInt(c.scanCount, 10) > 0).length, color: "text-purple-800" },
              { label: "Ordered protocol", val: contacts.filter((c) => c.hasInfoceuticalPaid).length, color: "text-blue-800" },
              { label: "Awaiting pickup", val: contacts.filter((c) => c.hasReadyTag && !c.hasPickedUpTag).length, color: "text-orange-800" },
              { label: "Picked up", val: contacts.filter((c) => c.hasPickedUpTag).length, color: "text-green-800" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 border border-[#B49F90]/30">
                <p className="text-[#B49F90] text-xs uppercase tracking-wide" style={{ fontFamily: "Montserrat, sans-serif" }}>{s.label}</p>
                <p className={`text-2xl font-light mt-1 ${s.color}`} style={{ fontFamily: "Jost, sans-serif" }}>{s.val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-4 border border-[#B49F90]/30 flex flex-wrap gap-3 items-center">
          <input
            type="search"
            placeholder="Search name, email, or infoceutical…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-[#B49F90] bg-[#F0EDED]/40 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 rounded-lg border border-[#B49F90] bg-white text-sm"
          >
            <option value="all">All clients</option>
            <option value="needs-action">⚡ Needs action (open orders)</option>
            <option value="scanned">Scanned only (no order)</option>
            <option value="ordered">Ordered, fulfilling</option>
            <option value="ready">Ready — awaiting pickup</option>
            <option value="picked-up">Picked up</option>
          </select>
          <button onClick={() => load(token)} className="px-3 py-2 text-sm text-[#EC9247] hover:text-[#d4813b]">↻ Refresh</button>
          <button onClick={() => setShowImport(!showImport)} className="px-3 py-2 text-sm text-[#EC9247] hover:text-[#d4813b]">⤴ Import from E4L</button>
        </div>

        {/* Import panel */}
        {showImport && (
          <div className="bg-[#FFF8F0] border border-[#EC9247]/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-[#331D01] font-semibold mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>Import from E4L</p>
            <ol className="text-xs text-[#786455] mb-3 list-decimal pl-5 space-y-1">
              <li>In E4L portal → <code className="bg-white px-1 rounded">Clients</code> → click <strong>Export Client Information</strong></li>
              <li>Save the downloaded <code className="bg-white px-1 rounded">Clients Information.xlsx</code></li>
              <li>Upload it below — each row becomes a GHL contact tagged <code className="bg-white px-1 rounded">imported-from-e4l</code> + <code className="bg-white px-1 rounded">bioenergetics-scan</code></li>
              <li>They appear in this dashboard immediately. Existing contacts (matched by email) are updated, not duplicated.</li>
            </ol>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleImport}
              disabled={importing}
              className="block text-sm text-[#786455] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#EC9247] file:text-white hover:file:bg-[#d4813b] disabled:opacity-50"
            />
            {importing && <p className="text-[#B49F90] text-xs mt-3">Parsing & uploading to GHL… (may take 30-60s for ~120 clients)</p>}
            {importResult?.error && <p className="text-red-600 text-sm mt-3">Error: {importResult.error}</p>}
            {importResult?.summary && (
              <div className="mt-3 text-sm">
                <p className="text-[#331D01]">
                  ✓ Imported <strong>{importResult.summary.created}</strong> contacts
                  {importResult.summary.skipped > 0 && ` · ${importResult.summary.skipped} skipped (no/invalid email)`}
                  {importResult.summary.failed > 0 && ` · ${importResult.summary.failed} failed`}
                </p>
                {importResult.summary.failed > 0 && importResult.results && (
                  <details className="mt-2 text-xs text-[#786455]">
                    <summary className="cursor-pointer">Show failures</summary>
                    <ul className="mt-1 ml-4">
                      {importResult.results.filter(r => r.status === "failed").map((r, i) => (
                        <li key={i}>{r.email} ({r.reason})</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-3">{error}</div>}
        {loading && <div className="text-center py-12 text-[#786455] text-sm">Loading client roster from GHL…</div>}

        {/* Table */}
        {!loading && contacts && (
          <div className="bg-white rounded-xl border border-[#B49F90]/30 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0EDED]/60 text-[#786455] text-xs uppercase tracking-wide" style={{ fontFamily: "Montserrat, sans-serif" }}>
                <tr>
                  <th className="px-4 py-3 text-left cursor-pointer hover:text-[#331D01]" onClick={() => onSort("name")}>
                    Name {sortKey === "name" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:text-[#331D01]" onClick={() => onSort("email")}>
                    Email {sortKey === "email" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  <th className="px-4 py-3 text-center cursor-pointer hover:text-[#331D01]" onClick={() => onSort("scans")}>
                    Scans {sortKey === "scans" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:text-[#331D01]" onClick={() => onSort("lastScan")}>
                    Last scan {sortKey === "lastScan" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  <th className="px-4 py-3 text-left">Protocol</th>
                  <th className="px-4 py-3 text-center">Delivery</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-[#331D01]" onClick={() => onSort("pickup")}>
                    Pickup {sortKey === "pickup" ? (sortDesc ? "↓" : "↑") : ""}
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="text-[#331D01]">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-[#B49F90] italic">No clients match this filter.</td></tr>
                )}
                {filtered.map((c) => {
                  const status = statusOf(c);
                  return (
                    <tr key={c.id} className="border-t border-[#F0EDED] hover:bg-[#F0EDED]/30">
                      <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                      <td className="px-4 py-3 text-[#786455]">{c.email}</td>
                      <td className="px-4 py-3 text-center">{c.scanCount || "0"}</td>
                      <td className="px-4 py-3 text-[#786455] whitespace-nowrap">{fmtDate(c.lastScanDate) || "—"}</td>
                      <td className="px-4 py-3 text-[#786455] max-w-xs truncate" title={c.infoceuticalNames}>{c.infoceuticalNames || "—"}</td>
                      <td className="px-4 py-3 text-center text-[#786455]">{c.deliveryMethod ? (c.deliveryMethod === "ship" ? "🚚" : "🏠") : ""}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${status.color}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#786455] whitespace-nowrap">{fmtDate(c.pickupDate) || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/admin/client/${encodeURIComponent(c.email)}`}
                          className="text-[#EC9247] hover:text-[#d4813b] text-xs whitespace-nowrap"
                        >
                          Open →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && contacts && filtered.length > 0 && (
          <p className="text-[#B49F90] text-xs text-center mt-3">
            Showing {filtered.length} of {contacts.length} clients · synced from GHL · click any pickup row to open the bottle-verification console
          </p>
        )}
      </main>

      <footer className="text-center py-6 text-[#B49F90] text-xs">
        SoliVana Wellness · Admin Console · Internal use only
      </footer>
    </div>
  );
}
