import Stripe from "stripe";
import { saveClientEmail } from "@/lib/db";

export const maxDuration = 30;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const VOICE_SCAN_PRICE_CENTS = 7900;

const rateLimit = new Map<string, { count: number; reset: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip) ?? { count: 0, reset: now + 60_000 };
  if (now > entry.reset) {
    rateLimit.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  rateLimit.set(ip, { count: entry.count + 1, reset: entry.reset });
  return false;
}

async function lookupPromoCode(stripe: Stripe, code: string) {
  const list = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ["data.promotion.coupon"],
  });
  return list.data[0] ?? null;
}

function discountCents(promo: Stripe.PromotionCode): number {
  const coupon = promo.promotion.coupon;
  if (!coupon || typeof coupon === "string") return 0;
  if (coupon.percent_off) return Math.round((VOICE_SCAN_PRICE_CENTS * coupon.percent_off) / 100);
  if (coupon.amount_off) return Math.min(coupon.amount_off, VOICE_SCAN_PRICE_CENTS);
  return 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim() || "";
  if (!code) return Response.json({ valid: false });

  try {
    const promo = await lookupPromoCode(getStripe(), code);
    if (!promo) return Response.json({ valid: false });

    const offCents = discountCents(promo);
    const finalCents = Math.max(0, VOICE_SCAN_PRICE_CENTS - offCents);
    return Response.json({
      valid: true,
      off: offCents / 100,
      finalPrice: finalCents / 100,
    });
  } catch (err) {
    console.error("Promo lookup error:", err);
    return Response.json({ valid: false });
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { name, email, promoCode } = await request
    .json()
    .catch(() => ({ name: "", email: "", promoCode: "" }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://scan.solivana.ai";
  const stripe = getStripe();

  let promo: Stripe.PromotionCode | null = null;
  let finalCents = VOICE_SCAN_PRICE_CENTS;
  if (promoCode) {
    try {
      promo = await lookupPromoCode(stripe, promoCode.trim());
      if (promo) finalCents = Math.max(0, VOICE_SCAN_PRICE_CENTS - discountCents(promo));
    } catch (err) {
      console.error("Promo apply error:", err);
    }
  }

  // 100% off path: Stripe can't issue $0 sessions. Skip Checkout, save email directly,
  // and redirect straight to the success page.
  if (finalCents === 0) {
    if (name && email) {
      await saveClientEmail(name, email).catch((err) =>
        console.error("Failed to save free-tier client email:", err)
      );
    }
    const successParams = new URLSearchParams({ name: name || "", email: email || "", free: "1" });
    return Response.json({ url: `${baseUrl}/scan/success?${successParams.toString()}` });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: VOICE_SCAN_PRICE_CENTS,
            product_data: {
              name: "SoliVana Voice Scan",
              description: "Bioenergetics Report & E4L Portal Access",
            },
          },
        },
      ],
      discounts: promo ? [{ promotion_code: promo.id }] : undefined,
      customer_email: email || undefined,
      metadata: {
        product: "voice_scan",
        client_name: name || "",
      },
      success_url: `${baseUrl}/scan/success?name=${encodeURIComponent(name || "")}&email=${encodeURIComponent(email || "")}`,
      cancel_url: `${baseUrl}/`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return Response.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}
