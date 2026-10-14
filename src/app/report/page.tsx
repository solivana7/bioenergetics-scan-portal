"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type Stage = "upload" | "processing" | "done" | "error";

const PROGRESS_MESSAGES = [
  "Reading your scan report…",
  "Identifying your body's key priorities…",
  "Analyzing bioenergetics patterns across body systems…",
  "Interpreting your infoceutical recommendations…",
  "Crafting your personalized wellness insights…",
  "Finalizing your report and sending to your inbox…",
];

const TESTIMONIALS = [
  {
    quote: "I had no idea my body was dealing with so much. The report put it into words I actually understood — and the infoceuticals made a noticeable difference within two weeks.",
    name: "Priya M.",
    location: "Palo Alto, CA",
  },
  {
    quote: "As someone who's very data-driven, I was skeptical. But seeing exactly which body systems were flagged and getting specific recommendations was exactly what I needed.",
    name: "James T.",
    location: "Redwood City, CA",
  },
  {
    quote: "The report felt like it was written just for me. Natasha has a gift for translating complex scan data into something actionable and warm.",
    name: "Lauren K.",
    location: "San Jose, CA",
  },
];

export default function ClientPortal() {
  const [stage, setStage] = useState<Stage>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [progressIdx, setProgressIdx] = useState(0);
  const [clientName, setClientName] = useState("");
  const [reportHtml, setReportHtml] = useState("");
  const [infoceuticals, setInfoceuticals] = useState<string[]>([]);
  const [orderingInfoceuticals, setOrderingInfoceuticals] = useState(false);
  const [infoceuticalError, setInfoceuticalError] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"ship" | "pickup" | "">("");
  const [error, setError] = useState("");
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prefill name + email from URL params (set by /scan/success after Stripe payment).
  // Inputs stay editable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const n = params.get("name");
    const e = params.get("email");
    if (n) setName((prev) => prev || n);
    if (e) setEmail((prev) => prev || e);
  }, []);

  // Cycle progress messages while processing
  useEffect(() => {
    if (stage === "processing") {
      setProgressIdx(0);
      progressTimer.current = setInterval(() => {
        setProgressIdx((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1));
      }, 18000);
    } else {
      if (progressTimer.current) clearInterval(progressTimer.current);
    }
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [stage]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") { setFile(dropped); setError(""); }
    else setError("Please upload a PDF file.");
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") { setFile(selected); setError(""); }
    else setError("Please upload a PDF file.");
  };

  const handleSubmit = async () => {
    let valid = true;
    if (!name.trim()) { setNameError("Please enter your first name."); valid = false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address."); valid = false;
    }
    if (!file || !valid) return;
    setNameError(""); setEmailError(""); setStage("processing"); setError("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("email", email.trim());
      formData.append("name", name.trim());

      const res = await fetch("/api/interpret-report", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 402 && errData.code === "not_paid") {
          setStage("error");
          setError("NO_PURCHASE_FOUND");
          return;
        }
        throw new Error(errData.error || "Failed to connect");
      }
      if (!res.body) throw new Error("Failed to connect");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resultReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          for (const line of message.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            const event = JSON.parse(jsonStr) as Record<string, unknown>;

            if (event.type === "ping") {
              setProgressIdx((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1));
            } else if (event.type === "result") {
              resultReceived = true;
              setClientName(event.clientName as string);
              setInfoceuticals((event.infoceuticals as string[]) || []);
              setReportHtml((event.html as string) || "");
              setStage("done");
            } else if (event.type === "error") {
              throw new Error(event.message as string);
            }
          }
        }
      }

      if (!resultReceived) {
        throw new Error("The server stopped responding. Please try again — if your PDF is large it may take a couple attempts.");
      }
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const handleOrderInfoceuticals = async () => {
    if (!deliveryMethod) {
      setInfoceuticalError("Please choose shipping or pickup before continuing.");
      return;
    }
    setOrderingInfoceuticals(true);
    setInfoceuticalError("");
    try {
      const res = await fetch("/api/infoceuticals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, clientName: clientName || name, infoceuticals, deliveryMethod }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { setInfoceuticalError(data.error || "Something went wrong. Please try again."); setOrderingInfoceuticals(false); }
    } catch {
      setInfoceuticalError("Unable to connect. Please try again.");
      setOrderingInfoceuticals(false);
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
      <div className="bg-[#F0EDED] border-b border-[#B49F90]/30 py-2 px-6 text-center">
        <p className="text-[#B49F90] text-xs">For wellness discussion only · Not a medical device, diagnosis, or treatment · Individual experiences vary</p>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-14">

        {/* ── UPLOAD ── */}
        {stage === "upload" && (
          <>
            <div className="text-center mb-10">
              <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-3">
                Bioenergetics Interpretation Portal
              </p>
              <h1 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.04em" }} className="text-4xl font-light text-[#331D01] uppercase mb-4">
                Your Scan, Interpreted
              </h1>
              <p className="text-[#786455] leading-relaxed max-w-lg mx-auto">
                Drop in your Energy4Life PDF. We&apos;ll translate the bioenergetics into plain English — what your body is signaling, and where to focus first. In your inbox within minutes.
              </p>
            </div>

            {/* E4L instructions — collapsible feel, always visible */}
            <div className="bg-white rounded-xl p-5 mb-6 border border-[#B49F90]/30">
              <p style={{ fontFamily: "Montserrat, sans-serif" }} className="text-[#B49F90] text-xs uppercase tracking-wide mb-3 font-semibold">Need your scan PDF first?</p>
              <ol className="space-y-1.5">
                {[
                  ["Log in to your E4L portal — ", "portal.e4l.com"],
                  ["Open your most recent scan results", ""],
                  ['Click "Scan Report" → Download PDF', ""],
                  ["Come back here and upload it below", ""],
                ].map(([step, sub], i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#786455]">
                    <span className="w-5 h-5 rounded-full bg-[#EC9247]/20 text-[#EC9247] text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                    <span>
                      {step}
                      {sub && (
                        <a href={`https://${sub}`} target="_blank" rel="noopener noreferrer" className="text-[#EC9247] hover:underline ml-0">{sub}</a>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Upload area */}
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput")?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-5 ${
                isDragging ? "border-[#EC9247] bg-orange-50 scale-[1.01]"
                  : file ? "border-green-400 bg-green-50"
                  : "border-[#B49F90] bg-white hover:border-[#EC9247] hover:bg-orange-50/20"
              }`}
            >
              <input id="fileInput" type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
              {file ? (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[#331D01] font-medium text-sm">{file.name}</p>
                  <p className="text-[#B49F90] text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB · tap to change</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 bg-[#F0EDED] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#B49F90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-[#331D01] font-medium text-sm">Drop your E4L scan PDF here</p>
                  <p className="text-[#B49F90] text-xs mt-1">or click to browse · PDF only</p>
                </>
              )}
            </div>

            {/* Name + Email */}
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-[#331D01] mb-1.5" style={{ fontFamily: "Montserrat, sans-serif" }}>Your first name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  placeholder="e.g. Sarah"
                  className="w-full px-4 py-3 rounded-xl border border-[#B49F90] bg-white text-[#331D01] placeholder-[#B49F90] focus:outline-none focus:ring-2 focus:ring-[#EC9247] focus:border-transparent"
                />
                {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#331D01] mb-1.5" style={{ fontFamily: "Montserrat, sans-serif" }}>Your email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#B49F90] bg-white text-[#331D01] placeholder-[#B49F90] focus:outline-none focus:ring-2 focus:ring-[#EC9247] focus:border-transparent"
                />
                <p className="text-[#B49F90] text-xs mt-1.5">Your full report will be emailed here within minutes.</p>
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={!file || !name.trim() || !email.trim()}
              className="w-full py-4 bg-[#EC9247] text-white text-lg rounded-xl hover:bg-[#d4813b] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600 }}
            >
              Interpret My Scan →
            </button>
            <p className="text-center text-[#B49F90] text-xs mt-3">Takes 1–2 minutes · Secure & private</p>
            <p className="text-center text-[#B49F90] text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              Your PDF is processed by our AI system and is never stored. Your name and email are used only to send your report and are never shared with third parties.
            </p>

            {/* Testimonials */}
            <div className="mt-14">
              <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-center text-[#B49F90] text-xs uppercase tracking-widest mb-6">
                What clients are saying
              </p>
              <div className="space-y-4">
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-[#B49F90]/20">
                    <p className="text-[#786455] text-sm leading-relaxed mb-3 italic">&ldquo;{t.quote}&rdquo;</p>
                    <p className="text-[#331D01] text-xs font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>{t.name}</p>
                    <p className="text-[#B49F90] text-xs">{t.location}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-[#B49F90] text-xs mt-4">*Individual experiences vary. Not a substitute for medical advice.</p>
            </div>
          </>
        )}

        {/* ── PROCESSING ── */}
        {stage === "processing" && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-8 relative">
              <div className="absolute inset-0 border-4 border-[#F0EDED] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-[#EC9247] border-r-[#EC9247]/30 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#EC9247]/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#EC9247] animate-pulse"></div>
                </div>
              </div>
            </div>
            <h2 style={{ fontFamily: "Jost, sans-serif" }} className="text-2xl font-light text-[#331D01] uppercase mb-3">
              Interpreting Your Scan
            </h2>
            <p className="text-[#786455] mb-6 min-h-[1.5em] transition-all duration-500">{PROGRESS_MESSAGES[progressIdx]}</p>

            {/* Step progress */}
            <div className="max-w-xs mx-auto mb-6">
              <div className="flex justify-between text-xs text-[#B49F90] mb-2">
                <span>Reading scan</span>
                <span>Building report</span>
                <span>Sending</span>
              </div>
              <div className="bg-white rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#EC9247] to-[#331D01] rounded-full transition-all duration-[3000ms]"
                  style={{ width: `${Math.min(100, 15 + progressIdx * 17)}%` }}
                ></div>
              </div>
            </div>

            <p className="text-[#B49F90] text-sm mb-10">Usually 1–2 minutes. Don&apos;t close this tab.</p>

            {/* Testimonials while waiting */}
            <div className="max-w-md mx-auto text-left">
              <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-center text-[#B49F90] text-xs uppercase tracking-widest mb-5">
                While you wait — what clients say
              </p>
              <div className="space-y-3">
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-[#B49F90]/20">
                    <p className="text-[#786455] text-sm leading-relaxed mb-2 italic">&ldquo;{t.quote}&rdquo;</p>
                    <p className="text-[#331D01] text-xs font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>{t.name} · <span className="text-[#B49F90] font-normal">{t.location}</span></p>
                  </div>
                ))}
              </div>
              <p className="text-center text-[#B49F90] text-xs mt-3">*Individual experiences vary. Not a substitute for medical advice.</p>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {stage === "done" && (
          <div className="py-12">
            {/* Success header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-5 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontFamily: "Jost, sans-serif" }} className="text-3xl font-light text-[#331D01] uppercase mb-3">
                {clientName ? `Your Report Is Ready, ${clientName.split(" ")[0]}` : "Your Report Is On Its Way"}
              </h2>
              <p className="text-[#786455] max-w-md mx-auto">
                Your interpreted bioenergetics report is on screen below — and a copy is waiting in your inbox.
              </p>
            </div>

            {/* Email confirmation — prominent */}
            <div className="bg-white rounded-xl border border-[#EC9247]/40 px-5 py-4 mb-6 flex items-start gap-3 max-w-md mx-auto">
              <svg className="w-5 h-5 text-[#EC9247] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-[#331D01] text-sm font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>Check your inbox</p>
                <p className="text-[#786455] text-sm">Sent to <strong>{email}</strong></p>
                <p className="text-[#B49F90] text-xs mt-1">Not there? Check your spam / promotions folder and mark as not spam.</p>
              </div>
            </div>

            {/* Inline report — sandboxed iframe so its own styles don't escape */}
            {reportHtml && (
              <div className="bg-white rounded-xl border border-[#B49F90]/30 overflow-hidden mb-6 max-w-3xl mx-auto" style={{ minHeight: "70vh" }}>
                <iframe
                  title="Your Bioenergetic Report"
                  srcDoc={reportHtml}
                  sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                  style={{ width: "100%", height: "85vh", border: "none", display: "block" }}
                />
              </div>
            )}

            {/* Infoceutical purchase card */}
            {infoceuticals.length > 0 && (
              <div className="bg-[#331D01] rounded-2xl p-6 max-w-md mx-auto mb-5">
                <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-1">
                  Next Step
                </p>
                <h3 style={{ fontFamily: "Jost, sans-serif" }} className="text-white text-xl font-light mb-1">
                  Begin your infoceutical protocol
                </h3>
                <p className="text-[#B49F90] text-xs mb-4 leading-relaxed">These five drops are what your scan is asking for. Natasha places the E4L order on your behalf — you choose how you&apos;d like to receive them below.</p>
                <ol className="space-y-2 mb-5">
                  {infoceuticals.map((iName, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-[#EC9247] text-white text-xs flex items-center justify-center flex-shrink-0 font-semibold">{i + 1}</span>
                      <span className="text-[#B49F90]">{iName}</span>
                    </li>
                  ))}
                </ol>
                <div className="border-t border-white/10 pt-4 mb-4 flex items-end justify-between">
                  <div>
                    <p className="text-white text-2xl font-light" style={{ fontFamily: "Jost, sans-serif" }}>$175</p>
                    <p className="text-[#B49F90] text-xs">5 bottles · $35 each</p>
                  </div>
                  <p className="text-[#EC9247] text-xs text-right">Most aligned when started<br />within 2–3 weeks of your scan</p>
                </div>

                <p className="text-white text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }}>
                  How would you like them delivered?
                </p>
                <div className="space-y-2 mb-4">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${deliveryMethod === "ship" ? "border-[#EC9247] bg-[#EC9247]/10" : "border-white/15 hover:border-white/30"}`}>
                    <input
                      type="radio"
                      name="delivery"
                      value="ship"
                      checked={deliveryMethod === "ship"}
                      onChange={() => { setDeliveryMethod("ship"); setInfoceuticalError(""); }}
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
                      onChange={() => { setDeliveryMethod("pickup"); setInfoceuticalError(""); }}
                      className="mt-0.5 accent-[#EC9247]"
                    />
                    <div>
                      <p className="text-white text-sm font-medium" style={{ fontFamily: "Montserrat, sans-serif" }}>Collect them at SoliVana</p>
                      <p className="text-[#B49F90] text-xs mt-0.5">Redwood City, CA. Natasha will text the moment they&apos;re ready — usually 3–5 business days.</p>
                    </div>
                  </label>
                </div>

                {infoceuticalError && (
                  <div className="bg-red-900/30 border border-red-400/30 text-red-300 px-3 py-2 rounded-lg mb-3 text-xs">{infoceuticalError}</div>
                )}
                <button
                  onClick={handleOrderInfoceuticals}
                  disabled={orderingInfoceuticals}
                  className="w-full py-3 bg-[#EC9247] text-white rounded-xl text-sm font-semibold hover:bg-[#d4813b] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {orderingInfoceuticals ? "Preparing checkout…" : "Begin My Protocol — $175"}
                </button>
                <p className="text-[#B49F90] text-xs text-center mt-2">Secure checkout · You can also place this order later from your report email</p>
              </div>
            )}

            {/* Consultation */}
            <div className="bg-white rounded-xl p-5 max-w-md mx-auto mb-5 border border-[#B49F90]/30">
              <p style={{ fontFamily: "Montserrat, sans-serif" }} className="text-[#331D01] font-semibold text-sm mb-1">Want to walk through your results with Natasha?</p>
              <p className="text-[#786455] text-sm leading-relaxed mb-4">
                Book a 30-minute personal consultation to review your scan together and build your wellness plan.
              </p>
              <a
                href="https://solivanaspa.floathelm.com/store/services/1245816"
                target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 bg-[#331D01] text-white text-center rounded-lg hover:bg-[#4a2e08] transition-colors text-sm font-semibold"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Book a Consultation with Natasha
              </a>
            </div>

            {/* Re-scan */}
            <div className="bg-white rounded-xl p-5 max-w-md mx-auto mb-8 border border-[#B49F90]/30">
              <p style={{ fontFamily: "Montserrat, sans-serif" }} className="text-[#331D01] font-semibold text-sm mb-1">Ready to track your progress?</p>
              <p className="text-[#786455] text-sm leading-relaxed mb-4">
                Most clients rescan every 4–6 weeks to measure shifts and update their protocol.
              </p>
              <a
                href="https://scan.solivana.ai"
                className="block w-full py-3 bg-white border border-[#B49F90] text-[#331D01] text-center rounded-lg hover:bg-[#F0EDED] transition-colors text-sm font-semibold"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Order a New Voice Scan — $79
              </a>
            </div>

            <p className="text-center text-[#B49F90] text-sm">
              Questions? <a href="mailto:natasha@solivana.com" className="text-[#786455] underline">natasha@solivana.com</a> · (650) 564-4325
            </p>
          </div>
        )}

        {/* ── ERROR: No purchase found ── */}
        {stage === "error" && error === "NO_PURCHASE_FOUND" && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#FFF8F0] rounded-full flex items-center justify-center border-2 border-[#EC9247]">
              <svg className="w-8 h-8 text-[#EC9247]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "Jost, sans-serif" }} className="text-2xl font-light text-[#331D01] uppercase mb-3">No Voice Scan Purchase Found</h2>
            <p className="text-[#786455] mb-2 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find a purchase tied to <strong className="text-[#331D01]">{email}</strong>.
            </p>
            <p className="text-[#786455] mb-8 max-w-md mx-auto leading-relaxed text-sm">
              Each interpretation requires a $79 voice scan purchase. If you used a different email at checkout, try again with that one.
            </p>
            <a
              href="https://scan.solivana.ai"
              className="inline-block px-10 py-4 bg-[#EC9247] text-white rounded-xl hover:bg-[#d4813b] transition-colors mb-3 shadow-md"
              style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, letterSpacing: "0.03em" }}
            >
              Get Your Voice Scan — $79
            </a>
            <div className="mb-8">
              <button
                onClick={() => { setStage("upload"); setError(""); }}
                className="text-[#786455] text-sm underline hover:text-[#331D01] transition-colors"
              >
                Try a different email
              </button>
            </div>
            <div className="bg-white rounded-xl p-5 max-w-sm mx-auto border border-[#B49F90]/30 text-left">
              <p className="text-[#331D01] font-semibold text-sm mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>Already paid but seeing this?</p>
              <p className="text-[#786455] text-sm leading-relaxed">
                Email <a href="mailto:natasha@solivana.com" className="text-[#EC9247] underline">natasha@solivana.com</a> and Natasha will sort it out and send your report manually.
              </p>
            </div>
          </div>
        )}

        {/* ── ERROR: General ── */}
        {stage === "error" && error !== "NO_PURCHASE_FOUND" && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "Jost, sans-serif" }} className="text-2xl font-light text-[#331D01] uppercase mb-3">Something Went Wrong</h2>
            <p className="text-[#786455] mb-8 max-w-sm mx-auto leading-relaxed">{error}</p>
            <button
              onClick={() => { setStage("upload"); setError(""); }}
              className="px-8 py-3 bg-[#EC9247] text-white rounded-xl hover:bg-[#d4813b] transition-colors mb-6"
              style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600 }}
            >
              Try Again
            </button>
            <div className="bg-white rounded-xl p-5 max-w-sm mx-auto border border-[#B49F90]/30 text-left">
              <p className="text-[#331D01] font-semibold text-sm mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>Still not working?</p>
              <p className="text-[#786455] text-sm leading-relaxed">
                Email your PDF scan directly to{" "}
                <a href="mailto:natasha@solivana.com" className="text-[#EC9247] underline">natasha@solivana.com</a>
                {" "}and Natasha will send your report manually.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-[#B49F90] text-xs">
        <p>SoliVana Wellness · Redwood City, CA · (650) 564-4325 · natasha@solivana.com</p>
        <p className="mt-1">This report is for wellness discussion purposes only and does not constitute medical advice.</p>
      </footer>
    </div>
  );
}
