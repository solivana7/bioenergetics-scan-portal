"use client";

import { Suspense, useState, useEffect } from "react";

function InfoceuticalsOrderContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<"ship" | "pickup" | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Load query params client-side (avoids Next.js useSearchParams Suspense boundary requirement
  // and keeps the page a single bundle).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    setName(p.get("name") || "");
    setEmail(p.get("email") || "");
    const raw = p.get("names") || "";
    setNames(raw.split("|").map((s) => s.trim()).filter(Boolean));
  }, []);

  const handleOrder = async () => {
    if (!deliveryMethod) {
      setError("Please choose shipping or pickup before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/infoceuticals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, clientName: name, infoceuticals: names, deliveryMethod }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setBusy(false);
      }
    } catch {
      setError("Unable to connect. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      <header className="bg-[#331D01] text-white py-5 px-8">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#EC9247] flex items-center justify-center font-bold text-lg">S</div>
          <span style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-lg font-light tracking-widest uppercase">SoliVana Wellness</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-2">Your Protocol</p>
          <h1 style={{ fontFamily: "Jost, sans-serif" }} className="text-3xl font-light text-[#331D01] uppercase mb-3">
            {name ? `Begin Your Protocol${name.split(" ")[0] ? `, ${name.split(" ")[0]}` : ""}` : "Begin Your Protocol"}
          </h1>
          <p className="text-[#786455] text-sm leading-relaxed max-w-md mx-auto">
            These five infoceuticals are what your scan called for. Natasha places the E4L order on your behalf — choose how you&apos;d like to receive them below.
          </p>
        </div>

        {/* Infoceutical list */}
        {names.length > 0 && (
          <div className="bg-white rounded-2xl p-6 mb-5 border border-[#B49F90]/30">
            <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#B49F90] text-xs uppercase tracking-widest mb-3 font-semibold">Your 5 infoceuticals</p>
            <ol className="space-y-2">
              {names.map((n, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#EC9247] text-white text-xs flex items-center justify-center flex-shrink-0 font-semibold">{i + 1}</span>
                  <span className="text-[#331D01]">{n}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Delivery method + Order */}
        <div className="bg-[#331D01] rounded-2xl p-6 mb-5">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-white text-2xl font-light" style={{ fontFamily: "Jost, sans-serif" }}>$175</p>
              <p className="text-[#B49F90] text-xs">5 bottles · $35 each</p>
            </div>
            <p className="text-[#EC9247] text-xs text-right">Most aligned when started<br />within 2–3 weeks of your scan</p>
          </div>

          <p className="text-white text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }}>
            How would you like them delivered?
          </p>
          <div className="space-y-2 mb-5">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${deliveryMethod === "ship" ? "border-[#EC9247] bg-[#EC9247]/10" : "border-white/15 hover:border-white/30"}`}>
              <input
                type="radio"
                name="delivery"
                value="ship"
                checked={deliveryMethod === "ship"}
                onChange={() => { setDeliveryMethod("ship"); setError(""); }}
                className="mt-0.5 accent-[#EC9247]"
              />
              <div>
                <p className="text-white text-sm font-medium" style={{ fontFamily: "Montserrat, sans-serif" }}>Discreet shipping to my door</p>
                <p className="text-[#B49F90] text-xs mt-0.5">E4L ships direct from the lab. You&apos;ll add your address at checkout — typically 5–7 business days.</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${deliveryMethod === "pickup" ? "border-[#EC9247] bg-[#EC9247]/10" : "border-white/15 hover:border-white/30"}`}>
              <input
                type="radio"
                name="delivery"
                value="pickup"
                checked={deliveryMethod === "pickup"}
                onChange={() => { setDeliveryMethod("pickup"); setError(""); }}
                className="mt-0.5 accent-[#EC9247]"
              />
              <div>
                <p className="text-white text-sm font-medium" style={{ fontFamily: "Montserrat, sans-serif" }}>Collect them at SoliVana</p>
                <p className="text-[#B49F90] text-xs mt-0.5">Redwood City, CA. Natasha will text the moment they&apos;re ready — usually 3–5 business days.</p>
              </div>
            </label>
          </div>

          {error && <div className="bg-red-900/30 border border-red-400/30 text-red-300 px-3 py-2 rounded-lg mb-3 text-xs">{error}</div>}

          <button
            onClick={handleOrder}
            disabled={busy}
            className="w-full py-3 bg-[#EC9247] text-white rounded-xl text-sm font-semibold hover:bg-[#d4813b] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {busy ? "Preparing checkout…" : "Begin My Protocol — $175"}
          </button>
          <p className="text-[#B49F90] text-xs text-center mt-2">Secure checkout via Stripe</p>
        </div>

        {/* Recipient block */}
        {(name || email) && (
          <div className="bg-white rounded-xl p-4 mb-6 border border-[#B49F90]/30 text-sm">
            <p className="text-[#B49F90] text-xs uppercase tracking-widest mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>Order details</p>
            {name && <p className="text-[#331D01]"><span className="text-[#786455]">Name:</span> {name}</p>}
            {email && <p className="text-[#331D01]"><span className="text-[#786455]">Email:</span> {email}</p>}
            <p className="text-[#B49F90] text-xs mt-2">Natasha will reach out to this email once your order is placed.</p>
          </div>
        )}

        <p className="text-center text-[#B49F90] text-sm">
          Questions?{" "}
          <a href="mailto:natasha@solivana.com" className="text-[#786455] underline">natasha@solivana.com</a>
          {" "}· (650) 564-4325
        </p>
      </main>

      <footer className="text-center py-8 text-[#B49F90] text-xs">
        <p>SoliVana Wellness · Redwood City, CA · Private. Restorative. Transformative.</p>
        <p className="mt-1">For wellness purposes only. Not intended to diagnose, treat, cure, or prevent any disease.</p>
      </footer>
    </div>
  );
}

export default function InfoceuticalsOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0EDED]" />}>
      <InfoceuticalsOrderContent />
    </Suspense>
  );
}
