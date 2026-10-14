"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function InfoceuticalSuccessContent() {
  const searchParams = useSearchParams();
  const clientName = searchParams.get("clientName") || "";
  const delivery = searchParams.get("delivery") === "ship" ? "ship" : "pickup";

  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />

      <header className="bg-[#331D01] text-white py-5 px-8">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#EC9247] flex items-center justify-center font-bold text-lg">S</div>
          <span style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }} className="text-lg font-light tracking-widest uppercase">SoliVana Wellness</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-5 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-3">
          Order Confirmed
        </p>
        <h1 style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.06em" }} className="text-3xl font-light text-[#331D01] uppercase mb-4">
          {clientName ? `Thank You, ${clientName.split(" ")[0]}` : "Protocol Ordered"}
        </h1>
        <p className="text-[#786455] text-base mb-8 leading-relaxed max-w-sm mx-auto">
          {delivery === "ship"
            ? "Natasha has your protocol. She'll place the E4L order on your behalf for direct shipment to the address you entered at checkout."
            : "Natasha has your protocol. She'll place the E4L order and let you know the moment it's ready to collect at SoliVana."}
        </p>

        {/* What happens next */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-left">
          <h2 style={{ fontFamily: "Montserrat, sans-serif" }} className="text-[#331D01] font-semibold text-sm uppercase tracking-wide mb-4">What happens next</h2>
          <ol className="space-y-4">
            {(delivery === "ship"
              ? [
                  ["Natasha reviews your protocol", "She confirms your 5 infoceuticals and orders them through E4L for direct shipment."],
                  ["E4L ships to your address", "Typically arrives within 5–7 business days from when Natasha places the order."],
                  ["You get a tracking notification", "Natasha will email you a tracking number once the order ships."],
                  ["Start your protocol", "Dosage instructions are inside your bioenergetics report — Natasha is available if you have questions."],
                ]
              : [
                  ["Natasha reviews your protocol", "She confirms your 5 infoceuticals and orders them through E4L."],
                  ["They arrive at SoliVana", "Typically within 3–5 business days."],
                  ["You get a notification", "Natasha will contact you when everything is ready for pickup."],
                  ["Start your protocol", "She'll walk you through the dosage schedule and answer any questions."],
                ]
            ).map(([title, desc], i) => (
              <li key={i} className="flex gap-4">
                <span className="w-7 h-7 rounded-full bg-[#EC9247] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-[#331D01] font-medium text-sm" style={{ fontFamily: "Montserrat, sans-serif" }}>{title}</p>
                  <p className="text-[#786455] text-sm mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Upsell: book a consultation */}
        <div className="bg-[#331D01] rounded-2xl p-6 mb-6 text-left">
          <p style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }} className="text-[#EC9247] text-xs uppercase tracking-widest mb-2">Make the most of it</p>
          <p style={{ fontFamily: "Jost, sans-serif" }} className="text-white text-xl font-light mb-2">
            Book a consultation with Natasha
          </p>
          <p className="text-[#B49F90] text-sm mb-4 leading-relaxed">
            Thirty private minutes with Natasha to walk through your scan, fine-tune your protocol, and map out the rest of your wellness plan.
          </p>
          <a
            href="https://solivanaspa.floathelm.com/store/services/1245816"
            target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 bg-[#EC9247] text-white text-center rounded-xl text-sm font-semibold hover:bg-[#d4813b] transition-colors"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Book a 30-Min Consultation
          </a>
        </div>

        <p className="text-[#B49F90] text-sm">
          Questions?{" "}
          <a href="mailto:natasha@solivana.com" className="text-[#786455] underline">natasha@solivana.com</a>
          {" "}· (650) 564-4325
        </p>
      </main>

      <footer className="text-center py-8 text-[#B49F90] text-xs">
        <p>SoliVana Wellness · Redwood City, CA · Private. Restorative. Transformative.</p>
        <p className="mt-1">This scan and report are for wellness purposes only and do not constitute medical advice.</p>
      </footer>
    </div>
  );
}

export default function InfoceuticalSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0EDED]" />}>
      <InfoceuticalSuccessContent />
    </Suspense>
  );
}
