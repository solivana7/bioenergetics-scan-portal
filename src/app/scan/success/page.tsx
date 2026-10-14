"use client";

import Link from "next/link";
import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ScanSuccessContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "";
  const email = searchParams.get("email") || "";
  const isFree = searchParams.get("free") === "1";
  const receiptSent = useRef(false);

  useEffect(() => {
    if (receiptSent.current || !email) return;
    receiptSent.current = true;
    fetch("/api/scan/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, isFree }),
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      <header className="bg-[#331D01] text-white py-5 px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#EC9247] flex items-center justify-center font-bold text-lg">S</div>
          <span style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-lg font-light tracking-widest uppercase">SoliVana Wellness</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.06em" }} className="text-3xl font-light text-[#331D01] uppercase mb-4">
          {name ? `You're all set, ${name.split(" ")[0]}` : "Payment Confirmed"}
        </h1>

        <p className="text-[#786455] text-lg mb-4 leading-relaxed">
          {isFree
            ? "Your complimentary scan is reserved. Three short steps and your report is on its way."
            : "Your scan is reserved. Three short steps and your personalized report is on its way."}
        </p>

        {email && (
          <p className="text-[#B49F90] text-sm mb-10">
            A confirmation with these steps was also sent to <strong className="text-[#786455]">{email}</strong>.
          </p>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-left">
          <h2 style={{ fontFamily: "Montserrat, sans-serif" }} className="text-[#331D01] font-semibold text-lg mb-5">
            Your next steps
          </h2>
          <ol className="space-y-5">
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-[#EC9247] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-[#331D01] font-medium" style={{ fontFamily: "Montserrat, sans-serif" }}>Open your Energy4Life portal</p>
                <p className="text-[#786455] text-sm mt-1">Tap the button below. Returning clients log in. First-time clients create a free account in under a minute — your scan is already paid for and waiting.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-[#EC9247] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-[#331D01] font-medium" style={{ fontFamily: "Montserrat, sans-serif" }}>Record your 10-second voice scan</p>
                <p className="text-[#786455] text-sm mt-1">Speak the prompt into your phone or laptop. When the scan finishes, download the PDF from your E4L dashboard — that&apos;s the file you&apos;ll bring back here.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-[#EC9247] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-[#331D01] font-medium" style={{ fontFamily: "Montserrat, sans-serif" }}>Return here and upload your PDF</p>
                <p className="text-[#786455] text-sm mt-1">Use the dark button below to come back to your SoliVana portal. Drop in the PDF and your interpreted report appears on screen — and lands in your inbox within minutes.</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Step 1 CTA */}
        <a
          href="https://portal.e4l.com/user/create/SDRzSUFBQUFBQUFFQUROa01HSXdZekJoTUdjQUFBTCtQcDRLQUFBQQ__"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#EC9247] text-white px-10 py-4 rounded-xl text-base font-semibold hover:bg-[#d4813b] transition-colors shadow-md mb-3"
          style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.03em" }}
        >
          Go to Your E4L Portal →
        </a>

        <p className="text-[#B49F90] text-xs mb-8">Opens in a new tab — come back here when you have your PDF downloaded.</p>

        {/* Step 3 CTA */}
        <div className="bg-[#331D01] rounded-2xl p-6 mb-8">
          <p className="text-[#EC9247] text-xs mb-1 font-semibold uppercase tracking-widest" style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }}>
            Step 3
          </p>
          <p className="text-white text-lg font-light mb-2" style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.04em" }}>
            PDF in hand? You&apos;re ready.
          </p>
          <p className="text-[#B49F90] text-sm mb-5">Drop your scan PDF in here. Your interpreted report follows within minutes.</p>
          <a
            href={`/report?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`}
            className="inline-block bg-[#EC9247] text-white px-10 py-4 rounded-xl text-base font-semibold hover:bg-[#d4813b] transition-colors shadow-md"
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.03em" }}
          >
            Upload My Scan Report →
          </a>
        </div>

        <p className="text-[#B49F90] text-sm">
          Questions? Email us at{" "}
          <a href="mailto:natasha@solivana.com" className="text-[#786455] underline">natasha@solivana.com</a>
          {" "}or call (650) 564-4325.
        </p>
      </main>

      <footer className="text-center py-8 text-[#B49F90] text-xs">
        <p>SoliVana Wellness · Redwood City, CA · Private. Restorative. Transformative.</p>
        <p className="mt-1">This scan and report are for wellness purposes only and do not constitute medical advice.</p>
      </footer>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0EDED]" />}>
      <ScanSuccessContent />
    </Suspense>
  );
}
