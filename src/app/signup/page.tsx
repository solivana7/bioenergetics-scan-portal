// SoliVana-branded landing for the Energy4Life portal sign-up.
// Replaces the raw E4L /user/create page with our voice + chrome.
// The actual account creation (with reCAPTCHA, anti-forgery, address
// autocomplete) still happens on portal.e4l.com — we just funnel there.

const E4L_SIGNUP_URL =
  "https://portal.e4l.com/user/create/SDRzSUFBQUFBQUFFQUROa01HSXdZekJoTUdjQUFBTCtQcDRLQUFBQQ__";

const STEPS = [
  {
    title: "Log in to your E4L account",
    body: (
      <>
        Once your account is created, sign in at{" "}
        <a
          href="https://portal.neshealth.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#EC9247] underline"
        >
          portal.neshealth.com
        </a>
        .
      </>
    ),
  },
  { title: 'Open "Scans"', body: "It's in your portal navigation along the top." },
  { title: 'Click "BWS Voice Scan"', body: "Then follow the prompts in the popup." },
  {
    title: "Speak naturally",
    body:
      "Allow microphone access, then count out loud while the scan runs. If anything sounds off, you can re-record before clicking Proceed. That's it — your scan is sent straight to me.",
  },
];

export const metadata = {
  title: "Create your Energy4Life account — SoliVana Wellness",
  description:
    "Set up your Energy4Life portal account with Natasha Berness as your practitioner. Branded sign-up funnel to portal.e4l.com — secure, takes about a minute.",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#F0EDED]" style={{ fontFamily: "Poppins, sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&family=Montserrat:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <header className="bg-[#331D01] text-white py-5 px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#EC9247] flex items-center justify-center font-bold text-lg">
            S
          </div>
          <span
            style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }}
            className="text-lg font-light tracking-widest uppercase"
          >
            SoliVana Wellness
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <p
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.12em" }}
            className="text-[#EC9247] text-xs uppercase tracking-widest mb-3"
          >
            Step One — Set Up Your Voice Scan
          </p>
          <h1
            style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.04em" }}
            className="text-4xl font-light text-[#331D01] uppercase mb-4"
          >
            Create Your Energy4Life Account
          </h1>
          <p className="text-[#786455] leading-relaxed max-w-xl mx-auto">
            Bioenergetic voice scans are run through the secure{" "}
            <strong className="text-[#331D01]">Energy4Life portal</strong>. The account takes
            about a minute to set up, links you directly to me as your practitioner, and is
            where you&apos;ll record your scan.
          </p>
        </div>

        {/* Practitioner card */}
        <div className="bg-white rounded-2xl border border-[#B49F90]/30 p-7 mb-8 max-w-2xl mx-auto">
          <p
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }}
            className="text-[#EC9247] text-xs uppercase tracking-widest mb-3"
          >
            Your Practitioner
          </p>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-[#331D01] text-[#EC9247] flex items-center justify-center flex-shrink-0">
              <span
                style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }}
                className="text-2xl font-light"
              >
                NB
              </span>
            </div>
            <div>
              <p
                style={{ fontFamily: "Jost, sans-serif" }}
                className="text-[#331D01] text-xl font-light mb-1"
              >
                Natasha Berness
              </p>
              <p className="text-[#786455] text-sm leading-relaxed">
                Co-Founder &amp; Practitioner, SoliVana Wellness.<br />
                E4L-certified bioenergetics master practitioner — 25+ years in holistic
                wellness.
              </p>
              <p className="text-[#B49F90] text-xs mt-3 leading-relaxed">
                <a
                  href="mailto:info@solivana.com"
                  className="text-[#786455] hover:text-[#EC9247]"
                >
                  info@solivana.com
                </a>
                {" · "}
                <a
                  href="tel:6505644325"
                  className="text-[#786455] hover:text-[#EC9247]"
                >
                  (650) 564-4325
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* What is bioenergetics */}
        <div className="bg-white rounded-2xl border border-[#B49F90]/30 p-7 mb-8 max-w-2xl mx-auto">
          <p
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }}
            className="text-[#EC9247] text-xs uppercase tracking-widest mb-3"
          >
            What You&apos;re Doing
          </p>
          <h2
            style={{ fontFamily: "Jost, sans-serif" }}
            className="text-xl font-light text-[#331D01] mb-3"
          >
            Bioenergetics, in a sentence
          </h2>
          <p className="text-[#786455] text-sm leading-relaxed mb-3">
            The Energy4Life Bioenergetics System uses a non-invasive voice scan to read the
            communication patterns of your body-field — the network that regulates how your
            cells, organs, and emotions signal each other.
          </p>
          <p className="text-[#786455] text-sm leading-relaxed">
            Within minutes, the scan flags where signaling is strong, where it&apos;s
            distorted, and which natural recommendations support a return to balance. We use
            it to build personalized protocols you actually understand.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="bg-[#331D01] rounded-2xl p-8 text-center max-w-2xl mx-auto mb-8">
          <p
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }}
            className="text-[#EC9247] text-xs uppercase tracking-widest mb-3"
          >
            Continue to secure sign-up
          </p>
          <h2
            style={{ fontFamily: "Jost, sans-serif" }}
            className="text-white text-2xl font-light mb-3"
          >
            Create your account on Energy4Life
          </h2>
          <p className="text-[#B49F90] text-sm leading-relaxed mb-6">
            You&apos;ll set up your name, email, and password on E4L&apos;s secure portal —
            the same place you&apos;ll log in to record your voice scan. SoliVana never sees
            or stores your password.
          </p>
          <a
            href={E4L_SIGNUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-4 bg-[#EC9247] text-white rounded-xl hover:bg-[#d4813b] transition-colors shadow-md text-base font-semibold"
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.03em" }}
          >
            Continue to E4L Sign-Up →
          </a>
          <p className="text-[#B49F90] text-xs mt-4">
            Opens portal.e4l.com in a new tab · Takes about a minute
          </p>
        </div>

        {/* How to do the voice scan */}
        <div className="bg-white rounded-2xl border border-[#B49F90]/30 p-7 mb-8 max-w-2xl mx-auto">
          <p
            style={{ fontFamily: "Montserrat, sans-serif", letterSpacing: "0.10em" }}
            className="text-[#EC9247] text-xs uppercase tracking-widest mb-3"
          >
            What Happens Next
          </p>
          <h2
            style={{ fontFamily: "Jost, sans-serif" }}
            className="text-xl font-light text-[#331D01] mb-4"
          >
            Recording your voice scan
          </h2>
          <p className="text-[#786455] text-sm leading-relaxed mb-5">
            Once your account is live, you can run your scan from any phone or computer with
            a microphone. No extra hardware or app to install.
          </p>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#EC9247]/15 text-[#EC9247] text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </span>
                <div>
                  <p
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                    className="text-[#331D01] text-sm font-semibold mb-0.5"
                  >
                    {step.title}
                  </p>
                  <p className="text-[#786455] text-sm leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Trust line */}
        <p className="text-center text-[#B49F90] text-xs leading-relaxed max-w-md mx-auto mb-3">
          Energy4Life is the company that builds the bioenergetic scanning technology. Their
          portal is where the actual scans run. SoliVana is your practitioner inside that
          system.
        </p>
        <p className="text-center text-[#B49F90] text-xs leading-relaxed max-w-md mx-auto">
          Already have an account?{" "}
          <a
            href="https://portal.neshealth.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#786455] underline hover:text-[#EC9247]"
          >
            Sign in here
          </a>
          .
        </p>
      </main>

      <footer className="text-center py-8 text-[#B49F90] text-xs">
        <p>SoliVana Wellness · Redwood City, CA · (650) 564-4325 · info@solivana.com</p>
        <p className="mt-1">
          Bioenergetic scans are for wellness discussion purposes only and do not constitute
          medical advice.
        </p>
      </footer>
    </div>
  );
}
