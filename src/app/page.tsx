"use client";

import { useState } from "react";

export default function SalesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  const finalPrice = Math.max(0, 79 - promoDiscount);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError("");
    try {
      const res = await fetch(`/api/payment?code=${encodeURIComponent(promoInput.trim())}`);
      const data = await res.json();
      if (data.valid) {
        setPromoCode(promoInput.trim().toUpperCase());
        setPromoDiscount(data.off);
        setPromoError("");
      } else {
        setPromoCode("");
        setPromoDiscount(0);
        setPromoError("That code isn't valid. Double-check and try again.");
      }
    } catch {
      setPromoError("Couldn't verify code. Please try again.");
    } finally {
      setPromoChecking(false);
    }
  };

  const handlePurchase = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), promoCode: promoCode || undefined }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Unable to start checkout. Please try again or contact us.");
      }
    } catch {
      setError("Unable to start checkout. Please try again or contact us.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="bg-[#331D01] text-white py-5 px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#EC9247] flex items-center justify-center font-bold text-lg">S</div>
            <span style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-lg font-light tracking-widest uppercase">SoliVana Wellness</span>
          </div>
          <a href="https://solivana.com" className="text-[#B49F90] text-sm hover:text-white transition-colors">solivana.com</a>
        </div>
      </header>

      {/* Compliance banner */}
      <div className="bg-[#F0EDED] border-b border-[#B49F90]/30 py-2 px-6 text-center">
        <p className="text-[#B49F90] text-xs">For wellness discussion only · Not a medical device, diagnosis, or treatment · Individual experiences vary · <a href="#disclaimer" className="underline hover:text-[#786455]">Full disclaimer ↓</a></p>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em" }} className="text-[#EC9247] text-xs font-600 uppercase tracking-widest mb-4">
          Energy4Life Bioenergetics
        </p>
        <h1 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.04em" }} className="text-5xl font-light text-[#331D01] uppercase mb-6 leading-tight">
          Your Voice Holds<br />the Map to Your Health
        </h1>
        <p className="text-[#786455] text-lg max-w-2xl mx-auto leading-relaxed mb-4">
          A 10-second voice recording reveals where your body is asking for support — a quiet read on what&apos;s driving the fatigue, stress, or static you&apos;ve been carrying.
        </p>
        <p className="text-[#786455] text-lg max-w-2xl mx-auto leading-relaxed mb-10">
          You&apos;ll get a clear, plain-English report with specific next steps — interpreted personally by Natasha Berness, Bioenergetics Practitioner at SoliVana Wellness.
        </p>

        <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#B49F90] bg-white text-[#331D01] placeholder-[#B49F90] focus:outline-none focus:ring-2 focus:ring-[#EC9247] focus:border-transparent"
            style={{ fontFamily: "Poppins, sans-serif" }}
          />
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#B49F90] bg-white text-[#331D01] placeholder-[#B49F90] focus:outline-none focus:ring-2 focus:ring-[#EC9247] focus:border-transparent"
            style={{ fontFamily: "Poppins, sans-serif" }}
          />

          {/* Promo code */}
          {!showPromo && !promoCode && (
            <button onClick={() => setShowPromo(true)} className="text-[#B49F90] text-sm underline self-start hover:text-[#786455] transition-colors">
              Have a promo code?
            </button>
          )}
          {showPromo && !promoCode && (
            <div className="flex gap-2 w-full">
              <input
                type="text"
                placeholder="Promo code"
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                className="flex-1 px-4 py-2 rounded-xl border border-[#B49F90] bg-white text-[#331D01] placeholder-[#B49F90] focus:outline-none focus:ring-2 focus:ring-[#EC9247] focus:border-transparent text-sm uppercase tracking-widest"
                style={{ fontFamily: "Poppins, sans-serif" }}
              />
              <button
                onClick={applyPromo}
                disabled={promoChecking || !promoInput.trim()}
                className="px-4 py-2 bg-[#331D01] text-white rounded-xl text-sm disabled:opacity-50 hover:bg-[#4a2e08] transition-colors"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {promoChecking ? "…" : "Apply"}
              </button>
            </div>
          )}
          {promoError && <p className="text-red-500 text-xs self-start">{promoError}</p>}
          {promoCode && (
            <div className="flex items-center justify-between w-full bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm">
              <span className="text-green-800">Code <strong>{promoCode}</strong> applied — ${promoDiscount} off</span>
              <button onClick={() => { setPromoCode(""); setPromoDiscount(0); setPromoInput(""); setShowPromo(false); }} className="text-green-600 hover:text-green-800 ml-2 text-xs underline">Remove</button>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full py-4 bg-[#EC9247] text-white text-lg rounded-xl hover:bg-[#d4813b] transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, letterSpacing: "0.03em" }}
          >
            {loading ? "Starting checkout…" : promoDiscount > 0 ? `Get Your Voice Scan — $${finalPrice}` : "Get Your Voice Scan — $79"}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <p className="text-[#B49F90] text-sm">Secure payment · No subscription · One-time purchase</p>
        </div>
      </section>

      {/* What's included */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-2xl font-light text-[#331D01] uppercase text-center mb-12">
            What&apos;s Included
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Your Bioenergetics Read, Translated",
                body: "A plain-English interpretation of your scan — what your body is signaling, how it may be showing up day-to-day, and where to focus first.",
              },
              {
                title: "A 5-Bottle Infoceutical Protocol",
                body: "The specific drops your scan calls for, plus targeted supplement suggestions — organized by body system so you know exactly what to take and why.",
              },
              {
                title: "Therapies Matched to Your Scan",
                body: "Which SoliVana modalities — PEMF, Red Light, Float, Contrast, Halo — line up with what your body is asking for right now.",
              },
              {
                title: "Lifetime Energy4Life Library",
                body: "Standing access to the E4L member portal: bioenergetics education, recipes, practitioner podcasts, and a growing library of wellness resources.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-[#F0EDED] rounded-xl p-6">
                <h3 style={{ fontFamily: "Montserrat, sans-serif" }} className="text-[#331D01] font-semibold mb-2">{item.title}</h3>
                <p className="text-[#786455] text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Important note */}
          <div className="mt-8 border border-[#B49F90] rounded-xl px-6 py-5 flex gap-4 items-start">
            <span className="text-[#EC9247] text-xl mt-0.5">ℹ</span>
            <p className="text-[#786455] text-sm leading-relaxed">
              <strong className="text-[#331D01]">Please note:</strong> This purchase includes your voice scan and a written report with recommendations. It does not include a live consultation with Natasha. To book a personal consultation,{" "}
              <a href="https://solivanaspa.floathelm.com/store/services/1245816" className="text-[#EC9247] underline" target="_blank" rel="noopener noreferrer">click here</a>.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-2xl font-light text-[#331D01] uppercase text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Reserve your scan", body: "Complete your $79 checkout. You'll land directly inside the Energy4Life portal — already paid up, ready to record." },
            { step: "02", title: "Record & download", body: "Speak for 10 seconds into any phone or laptop. The E4L portal generates your raw scan PDF — download it, then come right back here." },
            { step: "03", title: "Upload & receive your read", body: "Drop the PDF into your portal at scan.solivana.ai/report. Your interpreted report opens on-screen and lands in your inbox — usually under 3 minutes." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#331D01] text-white flex items-center justify-center mx-auto mb-4" style={{ fontFamily: "Jost, sans-serif", fontSize: "1.1em", letterSpacing: "0.05em" }}>
                {item.step}
              </div>
              <h3 style={{ fontFamily: "Montserrat, sans-serif" }} className="text-[#331D01] font-semibold mb-2">{item.title}</h3>
              <p className="text-[#786455] text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em" }} className="text-center text-[#EC9247] text-xs uppercase tracking-widest mb-3">Client Experiences</p>
          <h2 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-2xl font-light text-[#331D01] uppercase text-center mb-10">
            What Clients Are Saying
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                stars: 5,
                quote: "I had no idea my body was dealing with so much. The report put it into words I actually understood — and the infoceuticals Natasha recommended were exactly what I needed.",
                name: "Priya M.",
                location: "Palo Alto, CA",
              },
              {
                stars: 5,
                quote: "As someone who's very data-driven, I was skeptical. But seeing exactly which body systems were flagged and getting specific, actionable recommendations was exactly what I needed.",
                name: "James T.",
                location: "Redwood City, CA",
              },
              {
                stars: 5,
                quote: "The report felt like it was written just for me. Natasha has a gift for translating complex scan data into something warm, specific, and actually useful.",
                name: "Lauren K.",
                location: "San Jose, CA",
              },
              {
                stars: 5,
                quote: "I've done bioenergetics scans before but never had them interpreted this clearly. The service recommendations were spot-on — I booked PEMF and felt supported within days.",
                name: "Michelle R.",
                location: "Menlo Park, CA",
              },
              {
                stars: 5,
                quote: "Quick, easy, and shockingly accurate. The scan took seconds, the report was in my inbox fast, and it addressed things I hadn't mentioned to anyone.",
                name: "David S.",
                location: "San Francisco, CA",
              },
              {
                stars: 5,
                quote: "Worth every penny. I rescan every month now to track my progress. It keeps me accountable and helps me know exactly where to focus my energy.",
                name: "Anika P.",
                location: "Cupertino, CA",
              },
            ].map((r, i) => (
              <div key={i} className="bg-[#F0EDED] rounded-xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: r.stars }).map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-[#EC9247]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[#786455] text-sm leading-relaxed mb-4 italic">&ldquo;{r.quote}&rdquo;</p>
                <p className="text-[#331D01] text-xs font-semibold" style={{ fontFamily: "Montserrat, sans-serif" }}>{r.name}</p>
                <p className="text-[#B49F90] text-xs">{r.location}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[#B49F90] text-xs mt-8">*Individual experiences vary. These statements reflect personal wellness journeys and have not been evaluated by the FDA. Results are not typical or guaranteed.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em" }} className="text-center text-[#EC9247] text-xs uppercase tracking-widest mb-3">Got Questions</p>
        <h2 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-2xl font-light text-[#331D01] uppercase text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "What exactly is a bioenergetics voice scan?",
              a: "The E4L (Energy4Life) voice scan uses a 10-second voice recording to generate a bioenergetics wellness map. The scan does not diagnose disease or any medical condition. It is a wellness assessment tool that identifies priority areas for discussion — not a medical device.",
            },
            {
              q: "How long does the voice recording take?",
              a: "Just 10 seconds. You speak a short phrase into your phone or computer microphone inside the E4L portal. That's it. The scan report generates instantly.",
            },
            {
              q: "How quickly will I get my report?",
              a: "Once you upload your PDF at scan.solivana.ai/report, your AI-interpreted report appears on screen and is emailed to you within minutes — typically under 3 minutes.",
            },
            {
              q: "What's in the report?",
              a: "Your report includes: top body-system insights in plain English, key themes, body systems asking for support, personalized infoceutical recommendations with dosages, environment and lifestyle insights, supplement suggestions, mind-body patterns, recommended SoliVana services, and a full wellness action plan.",
            },
            {
              q: "What are infoceuticals?",
              a: "Infoceuticals are liquid supplements developed by E4L that carry specific bioenergetic information. They're taken as drops in water. Your scan will recommend a protocol of 5 infoceuticals specific to your results. Natasha can order these for you through E4L — available for pickup at SoliVana.",
            },
            {
              q: "Is this a substitute for medical care?",
              a: "No. This scan and report are for wellness discussion purposes only. They do not constitute a medical diagnosis and are not a replacement for appropriate medical testing or advice. Always consult your healthcare provider for medical decisions.",
            },
            {
              q: "Can I rescan to track my progress?",
              a: "Yes — and we recommend it. Most clients rescan every 4–6 weeks to measure shifts and update their infoceutical protocol. Each scan costs $79 and reflects what your body is prioritizing at that moment in time.",
            },
            {
              q: "What if I want to talk through my results with Natasha?",
              a: "You can book a personal 30-minute consultation with Natasha to review your report together and build a custom wellness plan. This is available separately after your scan.",
            },
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-[#B49F90]/20">
              <p className="text-[#331D01] font-semibold text-sm mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>{faq.q}</p>
              <p className="text-[#786455] text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-[#331D01] py-16 px-6 text-center">
        <h2 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.06em" }} className="text-3xl font-light text-white uppercase mb-4">
          Start With Your Voice
        </h2>
        <p className="text-[#B49F90] mb-8 max-w-xl mx-auto">Private. Restorative. Transformative. A quiet read on what your body is asking for — for wellness discussion, not diagnosis.</p>
        <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#786455] bg-[#F0EDED] text-[#331D01] placeholder-[#786455] focus:outline-none focus:ring-2 focus:ring-[#EC9247]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          />
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#786455] bg-[#F0EDED] text-[#331D01] placeholder-[#786455] focus:outline-none focus:ring-2 focus:ring-[#EC9247]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          />

          {/* Promo code — mirrors hero section */}
          {!showPromo && !promoCode && (
            <button onClick={() => setShowPromo(true)} className="text-[#B49F90] text-sm underline self-start hover:text-white transition-colors">
              Have a promo code?
            </button>
          )}
          {showPromo && !promoCode && (
            <div className="flex gap-2 w-full">
              <input
                type="text"
                placeholder="Promo code"
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                className="flex-1 px-4 py-2 rounded-xl border border-[#786455] bg-[#F0EDED] text-[#331D01] placeholder-[#786455] focus:outline-none focus:ring-2 focus:ring-[#EC9247] text-sm uppercase tracking-widest"
                style={{ fontFamily: "Poppins, sans-serif" }}
              />
              <button
                onClick={applyPromo}
                disabled={promoChecking || !promoInput.trim()}
                className="px-4 py-2 bg-[#EC9247] text-white rounded-xl text-sm disabled:opacity-50 hover:bg-[#d4813b] transition-colors"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {promoChecking ? "…" : "Apply"}
              </button>
            </div>
          )}
          {promoError && <p className="text-red-400 text-xs self-start">{promoError}</p>}
          {promoCode && (
            <div className="flex items-center justify-between w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
              <span className="text-white">Code <strong>{promoCode}</strong> applied — ${promoDiscount} off</span>
              <button onClick={() => { setPromoCode(""); setPromoDiscount(0); setPromoInput(""); setShowPromo(false); }} className="text-[#B49F90] hover:text-white ml-2 text-xs underline">Remove</button>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full py-4 bg-[#EC9247] text-white text-lg rounded-xl hover:bg-[#d4813b] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600 }}
          >
            {loading ? "Starting checkout…" : promoDiscount > 0 ? `Get Your Voice Scan — $${finalPrice}` : "Get Your Voice Scan — $79"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </section>

      <footer id="disclaimer" className="text-center py-8 text-[#B49F90] text-xs bg-[#F0EDED]">
        <p>SoliVana Wellness · Redwood City, CA · (650) 564-4325 · natasha@solivana.com</p>
        <p className="mt-1 max-w-2xl mx-auto leading-relaxed">This scan and report are for wellness discussion purposes only. They do not constitute a medical diagnosis, treatment, or advice, and are not a substitute for professional medical care. The E4L voice scan is not a medical device and has not been evaluated or approved by the FDA. These statements have not been evaluated by the FDA. Individual experiences vary and results are not guaranteed.</p>
        <p className="mt-2">
          <a href="https://portal.solivana.ai" className="text-[#B49F90] underline">Practitioner login</a>
        </p>
      </footer>
    </div>
  );
}
