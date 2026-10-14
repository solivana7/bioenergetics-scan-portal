import Stripe from "stripe";

export const maxDuration = 15;

// Returns the Stripe payment history for a client (by email). Searches
// Checkout Sessions for the email and returns the matching paid sessions.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const token = (searchParams.get("token") || "").trim();
  const expected = process.env.NATASHA_ADMIN_TOKEN;

  if (!expected) return Response.json({ error: "server-misconfigured" }, { status: 500 });
  if (token !== expected) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!email) return Response.json({ error: "missing-email" }, { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Stripe SDK v22 doesn't expose checkout.sessions.search() — fall back to
  // paginated list + client-side filter by customer_details.email. Volume is
  // low so 100-per-page x a few pages is fine.
  try {
    const sessionsList = await stripe.checkout.sessions.list({ limit: 100 });
    const matching = sessionsList.data.filter((s) => {
      const e = s.customer_details?.email || s.customer_email || "";
      return e.toLowerCase() === email && s.status === "complete";
    });

    const orders = matching.map((s) => ({
      id: s.id,
      product: s.metadata?.product || "unknown",
      amount: (s.amount_total ?? 0) / 100,
      currency: s.currency || "usd",
      paidAt: s.created ? new Date(s.created * 1000).toISOString() : "",
      paymentStatus: s.payment_status,
      delivery: s.metadata?.delivery_method || "",
      infoceuticalNames: (s.metadata?.infoceutical_names || "").split("|").filter(Boolean),
      receiptUrl: typeof s.payment_intent === "string"
        ? `https://dashboard.stripe.com/payments/${s.payment_intent}`
        : "",
    }));

    orders.sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));

    return Response.json({ orders });
  } catch (err) {
    console.error("Stripe orders list threw:", err);
    return Response.json({ error: "stripe-list-failed", orders: [] }, { status: 500 });
  }
}
