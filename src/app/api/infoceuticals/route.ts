import Stripe from "stripe";

export const maxDuration = 30;

const INFOCEUTICAL_PRICE_CENTS = 17500;

export async function POST(request: Request) {
  const { email, clientName, infoceuticals, deliveryMethod } = await request.json().catch(() => ({
    email: "",
    clientName: "",
    infoceuticals: [] as string[],
    deliveryMethod: "",
  }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://scan.solivana.ai";
  const names = Array.isArray(infoceuticals) ? infoceuticals : [];
  const method: "ship" | "pickup" = deliveryMethod === "ship" ? "ship" : "pickup";

  // Note: the post-payment webhook is the single source of truth — Natasha gets the full
  // "✅ Payment Confirmed — Order Now" email (with shipping address if applicable) only
  // after Stripe confirms the charge. We previously sent a duplicate "checkout started"
  // email here; removed because (a) Natasha can't fulfill until payment confirms anyway,
  // (b) ~30% cart abandonment = 30% noise in her inbox, (c) the post-payment email contains
  // strictly more info (the shipping address).

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const orderDescription = names.length > 0
    ? `Infoceutical Protocol: ${names.slice(0, 3).join(", ")}${names.length > 3 ? " +" + (names.length - 3) + " more" : ""}`
    : "SoliVana Infoceutical Protocol — 5 bottles";

  try {
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: INFOCEUTICAL_PRICE_CENTS,
            product_data: {
              name: "SoliVana Infoceutical Protocol",
              description: orderDescription,
            },
          },
        },
      ],
      allow_promotion_codes: true,
      customer_email: email || undefined,
      metadata: {
        product: "infoceutical_protocol",
        client_name: clientName || "",
        delivery_method: method,
        infoceutical_names: names.join("|").slice(0, 480),
      },
      success_url: `${baseUrl}/infoceuticals/success?names=${encodeURIComponent(names.join("|"))}&clientName=${encodeURIComponent(clientName || "")}&email=${encodeURIComponent(email || "")}&delivery=${method}`,
      cancel_url: `${baseUrl}/report`,
    };
    if (method === "ship") {
      checkoutParams.shipping_address_collection = { allowed_countries: ["US"] };
    }
    const session = await stripe.checkout.sessions.create(checkoutParams);

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return Response.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}
