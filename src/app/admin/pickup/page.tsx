"use client";

import { Suspense, useEffect, useState, useCallback } from "react";

type State = {
  found: boolean;
  email: string;
  firstName: string;
  lastName: string;
  infoceuticalNames: string;
  lastScanDate: string;
  paymentDate: string;
  readyDate: string;
  pickupDate: string;
  pickupVerified: string;
  tags: string[];
  hasReadyTag: boolean;
  hasPickedUpTag: boolean;
};

function PickupConsoleContent() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "ready" | "pickup">("");
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [params, setParams] = useState({ email: "", token: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    setParams({ email: p.get("email") || "", token: p.get("token") || "" });
  }, []);

  const refresh = useCallback(async () => {
    if (!params.email || !params.token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/contact?email=${encodeURIComponent(params.email)}&token=${encodeURIComponent(params.token)}`);
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized — token invalid." : `Server error (${res.status})`);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as State;
      setState(data);
    } catch {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (params.email && params.token) refresh();
  }, [params, refresh]);

  const markReady = async () => {
    if (!state || busy) return;
    setBusy("ready");
    try {
      const res = await fetch("/api/admin/mark-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: params.email, token: params.token }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to mark ready");
      } else {
        await refresh();
      }
    } finally {
      setBusy("");
    }
  };

  const confirmPickup = async () => {
    if (!state || busy) return;
    const items = Object.entries(verified).filter(([, v]) => v).map(([k]) => k);
    setBusy("pickup");
    try {
      const res = await fetch("/api/admin/confirm-pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: params.email, token: params.token, items }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed to confirm pickup");
      } else {
        await refresh();
      }
    } finally {
      setBusy("");
    }
  };

  const items = state?.infoceuticalNames
    ? state.infoceuticalNames.split(/,\s*/).filter(Boolean)
    : [];
  const verifiedFromGhl = state?.pickupVerified
    ? new Set(state.pickupVerified.split(/,\s*/).filter(Boolean))
    : null;
  const allVerified = items.length > 0 && items.every((n) => verified[n]);

  // When the contact has already picked up, prefill the checkboxes from the
  // audit field so the page shows what was verified at the original handover.
  useEffect(() => {
    if (state?.hasPickedUpTag && verifiedFromGhl) {
      const next: Record<string, boolean> = {};
      items.forEach((n) => { next[n] = verifiedFromGhl.has(n); });
      setVerified(next);
    }
    // Intentional — only reset when the picked-up state flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.hasPickedUpTag, state?.pickupVerified]);

  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      <header className="bg-[#331D01] text-white py-5 px-8">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#EC9247] flex items-center justify-center font-bold text-lg">S</div>
          <span style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-lg font-light tracking-widest uppercase">Pickup Console</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[#EC9247] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#786455] text-sm mt-4">Loading client info…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
        )}

        {state && !loading && !error && !state.found && (
          <div className="bg-white rounded-2xl p-6 border border-[#B49F90]/30 text-center">
            <p className="text-[#331D01] font-semibold mb-2">Contact not found in GHL</p>
            <p className="text-[#786455] text-sm">Email <code className="bg-[#F0EDED] px-2 py-0.5 rounded">{params.email}</code> isn&apos;t in GHL yet. Pickup tools work once they&apos;ve paid for infoceuticals.</p>
          </div>
        )}

        {state && !loading && !error && state.found && (
          <>
            {/* Client header */}
            <div className="bg-white rounded-2xl p-6 mb-5 border border-[#B49F90]/30">
              <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-2">Client</p>
              <p style={{ fontFamily: "Jost, sans-serif" }} className="text-2xl font-light text-[#331D01]">
                {state.firstName} {state.lastName}
              </p>
              <p className="text-[#786455] text-sm mt-1">{state.email}</p>
              {state.lastScanDate && <p className="text-[#B49F90] text-xs mt-2">Last scan: {state.lastScanDate}</p>}
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl p-6 mb-5 border border-[#B49F90]/30">
              <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#B49F90] text-xs uppercase tracking-widest mb-3">Status</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={state.hasReadyTag ? "text-green-600" : "text-[#B49F90]"}>{state.hasReadyTag ? "✓" : "○"}</span>
                  <span className={state.hasReadyTag ? "text-[#331D01]" : "text-[#786455]"}>
                    Marked ready for pickup{state.readyDate ? ` (${state.readyDate})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={state.hasPickedUpTag ? "text-green-600" : "text-[#B49F90]"}>{state.hasPickedUpTag ? "✓" : "○"}</span>
                  <span className={state.hasPickedUpTag ? "text-[#331D01]" : "text-[#786455]"}>
                    Picked up by client{state.pickupDate ? ` (${state.pickupDate})` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Infoceuticals */}
            <div className="bg-white rounded-2xl p-6 mb-5 border border-[#B49F90]/30">
              <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#B49F90] text-xs uppercase tracking-widest mb-3">
                Their 5 Infoceuticals — verify each bottle before pickup
              </p>
              {items.length === 0 ? (
                <p className="text-[#786455] text-sm italic">No infoceutical names recorded for this client. Check the original Stripe payment email.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((n, i) => (
                    <li key={i}>
                      <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[#F0EDED]/50">
                        <input
                          type="checkbox"
                          checked={!!verified[n]}
                          onChange={(e) => setVerified((v) => ({ ...v, [n]: e.target.checked }))}
                          disabled={state.hasPickedUpTag}
                          className="w-5 h-5 accent-[#EC9247]"
                        />
                        <span className={`text-sm ${verified[n] ? "text-[#331D01] font-medium line-through" : "text-[#331D01]"}`}>
                          {i + 1}. {n}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {items.length > 0 && !state.hasPickedUpTag && (
                <p className="text-[#B49F90] text-xs mt-3">Tick each bottle as you confirm it&apos;s in the box. The verified list is logged in GHL for audit.</p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-[#331D01] rounded-2xl p-6 mb-5">
              <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-3">
                {state.hasPickedUpTag ? "Order Complete" : "Actions"}
              </p>

              {!state.hasReadyTag && !state.hasPickedUpTag && (
                <>
                  <button
                    onClick={markReady}
                    disabled={!!busy}
                    className="w-full py-3 mb-3 bg-[#EC9247] text-white rounded-xl text-sm font-semibold hover:bg-[#d4813b] transition-all disabled:opacity-50"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {busy === "ready" ? "Marking ready…" : "📦 Mark Ready for Pickup (text/email client)"}
                  </button>
                  <p className="text-[#B49F90] text-xs text-center mt-1">Click when the box arrives at SoliVana. The client will get an SMS/email.</p>
                </>
              )}

              {state.hasReadyTag && !state.hasPickedUpTag && (
                <>
                  <button
                    onClick={confirmPickup}
                    disabled={!!busy || (items.length > 0 && !allVerified)}
                    className="w-full py-3 bg-[#EC9247] text-white rounded-xl text-sm font-semibold hover:bg-[#d4813b] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                    title={items.length > 0 && !allVerified ? "Tick all bottles first" : ""}
                  >
                    {busy === "pickup" ? "Confirming pickup…" : "🤝 Confirm Client Picked Up"}
                  </button>
                  <p className="text-[#B49F90] text-xs text-center mt-3">Already texted the client. Tick each bottle as you hand it over, then click confirm.</p>
                </>
              )}

              {state.hasPickedUpTag && (
                <div className="text-[#B49F90] text-sm space-y-2">
                  <p className="text-white text-base">✓ Picked up {state.pickupDate}</p>
                  {state.readyDate && state.readyDate !== state.pickupDate && (
                    <p className="text-xs">Marked ready: {state.readyDate}</p>
                  )}
                  {state.pickupVerified && (
                    <p className="text-xs">Verified at handover: <span className="text-white">{state.pickupVerified}</span></p>
                  )}
                  <p className="text-xs italic mt-3">This audit record is permanent. If the client returns for another scan + protocol, a new pickup record is created — old ones stay readable here for any client.</p>
                </div>
              )}
            </div>

            <p className="text-center text-[#B49F90] text-xs">
              Tags & dates synced to GHL contact. Refresh this page anytime to re-check status.
            </p>
          </>
        )}
      </main>

      <footer className="text-center py-6 text-[#B49F90] text-xs">
        SoliVana Wellness · Internal Pickup Console · Not for client distribution
      </footer>
    </div>
  );
}

export default function PickupConsolePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0EDED]" />}>
      <PickupConsoleContent />
    </Suspense>
  );
}
