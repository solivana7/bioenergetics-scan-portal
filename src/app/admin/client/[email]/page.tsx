"use client";

import { Suspense, useEffect, useState, useCallback, use } from "react";

type Tab = "profile" | "pickup" | "payments" | "history" | "notes";

type State = {
  found: boolean;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  infoceuticalNames: string;
  lastScanDate: string;
  paymentDate: string;
  readyDate: string;
  pickupDate: string;
  pickupVerified: string;
  notes: string;
  tags: string[];
  hasReadyTag: boolean;
  hasPickedUpTag: boolean;
};

type Order = {
  id: string;
  product: string;
  amount: number;
  currency: string;
  paidAt: string;
  paymentStatus: string;
  delivery: string;
  infoceuticalNames: string[];
  receiptUrl: string;
};

const TOKEN_KEY = "solivana_admin_token";

function ClientView({ email }: { email: string }) {
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [state, setState] = useState<State | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState("");

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [protocol, setProtocol] = useState("");
  const [notes, setNotes] = useState("");
  const [verified, setVerified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.sessionStorage.getItem(TOKEN_KEY) || "";
    setToken(t);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setError("Not signed in. Open /admin first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/contact?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
      if (res.status === 401) {
        if (typeof window !== "undefined") window.sessionStorage.removeItem(TOKEN_KEY);
        setError("Session expired. Open /admin to sign in again.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(`Server error ${res.status}`);
        setLoading(false);
        return;
      }
      const d = (await res.json()) as State;
      setState(d);
      setFirstName(d.firstName || "");
      setLastName(d.lastName || "");
      setPhone(d.phone || "");
      setProtocol(d.infoceuticalNames || "");
      setNotes(d.notes || "");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, [email, token]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/client/orders?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const d = (await res.json()) as { orders: Order[] };
      setOrders(d.orders || []);
    } catch {}
  }, [email, token]);

  useEffect(() => { if (token) refresh(); }, [token, refresh]);
  useEffect(() => {
    if (activeTab === "payments" && token && !orders) loadOrders();
  }, [activeTab, token, orders, loadOrders]);

  const flash = (msg: string) => { setSavedFlash(msg); setTimeout(() => setSavedFlash(""), 2200); };

  const handle401 = (res: Response) => {
    if (res.status !== 401) return false;
    if (typeof window !== "undefined") window.sessionStorage.removeItem(TOKEN_KEY);
    flash("Session expired — redirecting to sign in");
    setTimeout(() => { window.location.href = "/admin"; }, 1200);
    return true;
  };

  const saveProfile = async () => {
    const res = await fetch("/api/admin/client/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, firstName, lastName, phone }),
    });
    if (handle401(res)) return;
    if (res.ok) { flash("Profile saved"); refresh(); }
    else flash("Save failed");
  };

  const saveProtocol = async () => {
    const res = await fetch("/api/admin/client/protocol", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, infoceuticalNames: protocol }),
    });
    if (handle401(res)) return;
    if (res.ok) { flash("Protocol updated"); refresh(); }
    else flash("Save failed");
  };

  const saveNotes = async () => {
    const res = await fetch("/api/admin/client/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, notes }),
    });
    if (handle401(res)) return;
    if (res.ok) flash("Notes saved");
    else flash("Save failed");
  };

  const markReady = async () => {
    const res = await fetch("/api/admin/mark-ready", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    });
    if (res.ok) { flash("Marked ready — client notified"); refresh(); }
    else flash("Failed");
  };

  const confirmPickup = async () => {
    const items = Object.entries(verified).filter(([, v]) => v).map(([k]) => k);
    const res = await fetch("/api/admin/confirm-pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, items }),
    });
    if (res.ok) { flash("Pickup confirmed"); refresh(); }
    else flash("Failed");
  };

  const fmt = (s: string) => (s ? s.slice(0, 10) : "");
  const parseBottles = (raw: string): string[] => {
    if (!raw) return [];
    const cleaned = raw.replace(/^\s*\d+\.\s*/, "").trim();
    const byComma = cleaned.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
    if (byComma.length > 1) return byComma;
    const byCode = cleaned.split(/\s+(?=[A-Z]{1,4}\d+\s*-\s*)/).map((s) => s.trim()).filter(Boolean);
    return byCode.length > 0 ? byCode : [cleaned];
  };
  const items = state?.infoceuticalNames ? parseBottles(state.infoceuticalNames) : [];
  const allVerified = items.length > 0 && items.every((n) => verified[n]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "pickup", label: "Pickup" },
    { id: "payments", label: "Payments" },
    { id: "history", label: "Scan History" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      <header className="bg-[#331D01] text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={`/admin?token=${encodeURIComponent(token)}`} className="text-[#B49F90] hover:text-white text-sm">← Admin</a>
            <span className="text-[#786455]">/</span>
            <span style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.06em" }} className="text-base font-light">Client</span>
          </div>
          {savedFlash && <span className="text-green-400 text-sm">{savedFlash}</span>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading && <div className="text-center py-20 text-[#786455] text-sm">Loading…</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-4">{error}</div>}

        {state && state.found && !loading && (
          <>
            <div className="mb-4">
              <h1 style={{ fontFamily: "Jost, sans-serif" }} className="text-3xl font-light text-[#331D01]">
                {state.firstName} {state.lastName}
              </h1>
              <p className="text-[#786455] text-sm">{state.email}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-[#B49F90]/40 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    activeTab === t.id
                      ? "border-[#EC9247] text-[#331D01] font-semibold"
                      : "border-transparent text-[#786455] hover:text-[#331D01]"
                  }`}
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30 max-w-2xl space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#B49F90] mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>First name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[#B49F90] bg-[#F0EDED]/40" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#B49F90] mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>Last name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[#B49F90] bg-[#F0EDED]/40" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#B49F90] mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (650) 555-1212" className="w-full px-4 py-2 rounded-lg border border-[#B49F90] bg-[#F0EDED]/40" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#B49F90] mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>Email</label>
                  <input value={state.email} disabled className="w-full px-4 py-2 rounded-lg border border-[#B49F90] bg-[#F0EDED]/40 text-[#786455]" />
                  <p className="text-[#B49F90] text-xs mt-1">Email is the lookup key — change carefully via support.</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#B49F90] mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {state.tags.map((t) => (
                      <span key={t} className="text-xs bg-[#F0EDED] text-[#786455] px-2 py-1 rounded-full">{t}</span>
                    ))}
                    {state.tags.length === 0 && <span className="text-[#B49F90] text-xs italic">No tags</span>}
                  </div>
                </div>
                <button onClick={saveProfile} className="px-5 py-2 bg-[#EC9247] text-white rounded-lg text-sm font-semibold hover:bg-[#d4813b]">Save</button>
              </div>
            )}

            {/* PICKUP TAB */}
            {activeTab === "pickup" && (
              <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30 max-w-2xl">
                <div className="space-y-3 mb-5">
                  <div className="text-sm flex items-center gap-2">
                    <span className={state.hasReadyTag ? "text-green-600" : "text-[#B49F90]"}>{state.hasReadyTag ? "✓" : "○"}</span>
                    <span>Marked ready{state.readyDate ? ` (${fmt(state.readyDate)})` : ""}</span>
                  </div>
                  <div className="text-sm flex items-center gap-2">
                    <span className={state.hasPickedUpTag ? "text-green-600" : "text-[#B49F90]"}>{state.hasPickedUpTag ? "✓" : "○"}</span>
                    <span>Picked up{state.pickupDate ? ` (${fmt(state.pickupDate)})` : ""}</span>
                  </div>
                </div>

                {items.length > 0 && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-[#B49F90] mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      {state.hasPickedUpTag ? "Verified at handover" : "Verify each bottle"}
                    </p>
                    <ul className="space-y-1 mb-4">
                      {items.map((n, i) => (
                        <li key={i}>
                          <label className="flex items-center gap-3 p-2 rounded hover:bg-[#F0EDED]/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.hasPickedUpTag ? state.pickupVerified.includes(n) : !!verified[n]}
                              onChange={(e) => setVerified((v) => ({ ...v, [n]: e.target.checked }))}
                              disabled={state.hasPickedUpTag}
                              className="w-5 h-5 accent-[#EC9247]"
                            />
                            <span className="text-sm">{i + 1}. {n}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {!state.hasReadyTag && !state.hasPickedUpTag && (
                  <button onClick={markReady} className="w-full py-2.5 bg-[#EC9247] text-white rounded-lg text-sm font-semibold hover:bg-[#d4813b]">📦 Mark Ready (text/email client)</button>
                )}
                {state.hasReadyTag && !state.hasPickedUpTag && (
                  <button onClick={confirmPickup} disabled={items.length > 0 && !allVerified} className="w-full py-2.5 bg-[#EC9247] text-white rounded-lg text-sm font-semibold hover:bg-[#d4813b] disabled:opacity-40">🤝 Confirm Pickup</button>
                )}
                {state.hasPickedUpTag && (
                  <p className="text-[#B49F90] text-sm italic">Order complete on {fmt(state.pickupDate)}.</p>
                )}
              </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === "payments" && (
              <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30">
                <p className="text-xs uppercase tracking-wide text-[#B49F90] mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>Stripe payment history</p>
                {orders === null && <p className="text-[#786455] text-sm">Loading from Stripe…</p>}
                {orders !== null && orders.length === 0 && <p className="text-[#786455] text-sm italic">No completed payments found in Stripe for this email.</p>}
                {orders !== null && orders.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-[#B49F90]">
                      <tr><th className="text-left py-2">Date</th><th className="text-left">Product</th><th className="text-right">Amount</th><th className="text-left">Delivery</th><th></th></tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-t border-[#F0EDED]">
                          <td className="py-2 text-[#786455]">{o.paidAt.slice(0, 10)}</td>
                          <td className="py-2 text-[#331D01]">{o.product === "voice_scan" ? "Voice scan" : o.product === "infoceutical_protocol" ? "Infoceutical protocol" : o.product}</td>
                          <td className="py-2 text-right font-medium">${o.amount.toFixed(2)}</td>
                          <td className="py-2 text-[#786455]">{o.delivery || "—"}</td>
                          <td className="py-2 text-right"><a href={o.receiptUrl} target="_blank" rel="noreferrer" className="text-[#EC9247] text-xs hover:text-[#d4813b]">View →</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* SCAN HISTORY TAB */}
            {activeTab === "history" && (
              <div className="space-y-4 max-w-2xl">
                <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30">
                  <p className="text-xs uppercase tracking-wide text-[#B49F90] mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>Latest protocol</p>
                  <p className="text-[#786455] text-xs mb-2">Edit if a bottle was recorded incorrectly. Saves to GHL immediately.</p>
                  <textarea
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-[#B49F90] bg-[#F0EDED]/40 text-sm"
                  />
                  <button onClick={saveProtocol} className="mt-3 px-4 py-2 bg-[#EC9247] text-white rounded-lg text-sm font-semibold hover:bg-[#d4813b]">Save protocol</button>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30 text-sm">
                  <p className="text-xs uppercase tracking-wide text-[#B49F90] mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>Stats</p>
                  <p className="text-[#786455]">Last scan: <span className="text-[#331D01]">{fmt(state.lastScanDate) || "—"}</span></p>
                  {state.readyDate && <p className="text-[#786455]">Last marked ready: <span className="text-[#331D01]">{fmt(state.readyDate)}</span></p>}
                  {state.pickupDate && <p className="text-[#786455]">Last picked up: <span className="text-[#331D01]">{fmt(state.pickupDate)}</span></p>}
                </div>
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === "notes" && (
              <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30 max-w-2xl">
                <p className="text-xs uppercase tracking-wide text-[#B49F90] mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>Private notes (not visible to client)</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={10}
                  placeholder="e.g. Client has known sensitivity to citrus. Last consultation called out fatigue + sleep onset issues. Recommended REST Float weekly. — 4/28"
                  className="w-full px-3 py-2 rounded-lg border border-[#B49F90] bg-[#F0EDED]/40 text-sm font-mono"
                />
                <button onClick={saveNotes} className="mt-3 px-4 py-2 bg-[#EC9247] text-white rounded-lg text-sm font-semibold hover:bg-[#d4813b]">Save notes</button>
                <p className="text-[#B49F90] text-xs mt-2">Saved to GHL custom field <code>notes</code> on this contact.</p>
              </div>
            )}
          </>
        )}

        {state && !state.found && !loading && (
          <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30">
            <p className="text-[#331D01] font-semibold">Contact not found</p>
            <p className="text-[#786455] text-sm">No GHL contact for <code className="text-xs">{email}</code>. They probably haven&apos;t paid yet.</p>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-[#B49F90] text-xs">SoliVana Wellness · Admin · {email}</footer>
    </div>
  );
}

export default function ClientPage({ params }: { params: Promise<{ email: string }> }) {
  // Next.js 16: params is async
  const resolvedParams = use(params);
  const decodedEmail = decodeURIComponent(resolvedParams.email);
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0EDED]" />}>
      <ClientView email={decodedEmail} />
    </Suspense>
  );
}
