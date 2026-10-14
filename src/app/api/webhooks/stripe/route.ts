import Stripe from "stripe";
import { Resend } from "resend";
import { saveClientEmail, claimStripeEvent } from "@/lib/db";
import { upsertGhlContact } from "@/lib/ghl";

export const maxDuration = 30;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAddress(addr: Stripe.Address | null | undefined): string {
  if (!addr) return "(no address provided)";
  const parts = [
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "),
    addr.country,
  ].filter(Boolean);
  return parts.join("<br>");
}

function buildNatashaConfirmedEmail(
  clientName: string,
  email: string,
  names: string[],
  delivery: "ship" | "pickup",
  shippingName: string,
  shippingAddress: Stripe.Address | null,
  readyUrl: string
) {
  const isShip = delivery === "ship";
  const safeName = escapeHtml(clientName || "");
  const safeEmail = escapeHtml(email || "");
  const safeShipName = escapeHtml(shippingName || clientName || "");
  return {
    from: "SoliVana Portal <natasha@solivana.com>",
    to: "natasha@solivana.com",
    subject: `✅ Infoceutical Payment Confirmed — ${clientName || email}${isShip ? " (SHIP TO HOME)" : " (PICKUP)"}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#F0EDED;">
        <div style="background:#331D01;border-radius:12px;padding:24px;margin-bottom:24px;">
          <p style="color:#EC9247;font-size:12px;letter-spacing:0.10em;text-transform:uppercase;margin:0 0 8px 0;font-weight:600;">Payment Confirmed — Order Now</p>
          <p style="color:#ffffff;font-size:20px;font-weight:300;margin:0;">${safeName || "A client"} completed their infoceutical purchase</p>
        </div>
        <div style="background:#ffffff;border-radius:12px;padding:24px;margin-bottom:16px;">
          <p style="color:#786455;font-size:14px;margin:0 0 8px 0;"><strong style="color:#331D01;">Client:</strong> ${safeName || "(no name)"}</p>
          <p style="color:#786455;font-size:14px;margin:0 0 8px 0;"><strong style="color:#331D01;">Email:</strong> ${safeEmail || "(no email)"}</p>
          <p style="color:#786455;font-size:14px;margin:0 0 20px 0;"><strong style="color:#331D01;">Delivery:</strong> ${isShip ? "🚚 SHIP TO HOME (ask E4L to drop-ship to client)" : "🏠 PICKUP at SoliVana"}</p>
          ${isShip ? `
          <div style="background:#FFF8F0;border:1px solid rgba(236,146,71,0.3);border-radius:8px;padding:14px;margin:0 0 20px 0;">
            <p style="color:#331D01;font-weight:600;font-size:13px;margin:0 0 6px 0;">Ship-to address (give this to E4L):</p>
            <p style="color:#786455;font-size:14px;line-height:1.6;margin:0;">
              <strong>${safeShipName || "(no name)"}</strong><br>
              ${formatAddress(shippingAddress)}
            </p>
          </div>` : ""}
          <p style="color:#331D01;font-weight:600;font-size:14px;margin:0 0 10px 0;">Infoceuticals to order from E4L:</p>
          <ol style="color:#786455;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
            ${names.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}
          </ol>
        </div>
        <div style="background:#FFF8F0;border-radius:12px;padding:20px;border:1px solid rgba(236,146,71,0.2);">
          <p style="color:#331D01;font-weight:600;font-size:14px;margin:0 0 6px 0;">Amount paid: $175.00</p>
          <p style="color:#786455;font-size:13px;margin:0 0 ${isShip ? "0" : "16"}px 0;">
            Payment processed via Stripe. ${isShip
              ? "Place the E4L order with the ship-to address above for direct drop-ship to the client."
              : "Order from E4L for delivery to SoliVana, then notify the client when ready for pickup."}
          </p>
          ${!isShip && readyUrl ? `
          <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;">
            <tr><td style="background:#EC9247;border-radius:8px;">
              <a href="${readyUrl}" style="display:block;background:#EC9247;color:#ffffff !important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;font-family:-apple-system,sans-serif;">📦 Open Pickup Console</a>
            </td></tr>
          </table>
          <p style="color:#B49F90;font-size:11px;margin:8px 0 0 0;">Use this when the box arrives at SoliVana. The console shows the 5 bottles to verify, lets you mark ready (texts client), and confirms pickup with an audit trail.</p>
          ` : ""}
        </div>
      </div>
    `,
  };
}

function buildClientConfirmedEmail(
  clientName: string,
  email: string,
  names: string[],
  delivery: "ship" | "pickup"
) {
  const firstName = clientName ? clientName.split(" ")[0] : "";
  const safeFirstName = escapeHtml(firstName);
  const isShip = delivery === "ship";
  return {
    from: "Natasha Berness | SoliVana Wellness <natasha@solivana.com>",
    to: email,
    replyTo: "natasha@solivana.com",
    subject: "Your protocol is in motion — what happens next",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F0EDED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr><td style="background-color:#331D01;border-radius:12px;padding:28px 24px;text-align:center;">
        <p style="color:#EC9247 !important;font-size:12px;letter-spacing:0.10em;text-transform:uppercase;margin:0 0 10px 0;font-weight:700;">Order Confirmed</p>
        <p style="color:#ffffff !important;font-size:22px;font-weight:300;margin:0;line-height:1.4;">Your infoceutical protocol is in motion</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr><td style="background-color:#ffffff;border-radius:12px;padding:28px 24px;">
        <p style="color:#786455;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hi${safeFirstName ? ` ${safeFirstName}` : ""},</p>
        <p style="color:#786455;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
          Beautiful — your protocol is in. Here are the five infoceuticals your scan called for:
        </p>
        ${names.length > 0 ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
          ${names.map((n, i) => `
          <tr><td style="padding:6px 0;border-bottom:1px solid #F0EDED;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="28">
                  <div style="width:22px;height:22px;background-color:#EC9247;border-radius:50%;text-align:center;line-height:22px;color:#ffffff;font-size:11px;font-weight:700;">${i + 1}</div>
                </td>
                <td style="padding-left:10px;">
                  <p style="color:#331D01;font-size:14px;font-weight:500;margin:0;">${n}</p>
                </td>
              </tr>
            </table>
          </td></tr>`).join("")}
        </table>` : ""}
        <p style="color:#786455;font-size:14px;line-height:1.6;margin:0;">
          ${isShip
            ? `Natasha will place the E4L order for direct shipment to the address you entered at checkout. You'll receive a tracking email once it ships — typically <strong style="color:#331D01;">5–7 business days</strong>.`
            : `Natasha will order these from E4L and let you know when they're ready for pickup at SoliVana — typically within <strong style="color:#331D01;">3–5 business days</strong>.`}
        </p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr><td style="background-color:#FFF8F0;border-radius:12px;padding:20px 24px;border:1px solid rgba(236,146,71,0.2);">
        <p style="color:#331D01;font-size:14px;font-weight:600;margin:0 0 8px 0;">For best results</p>
        <p style="color:#786455;font-size:13px;line-height:1.6;margin:0;">
          ${isShip
            ? `Start your protocol within 2–3 weeks of your scan for the best results. Dosage instructions are inside your bioenergetics report — Natasha is available if you have questions.`
            : `Start your protocol within 2–3 weeks of your scan for the best results. Natasha will walk you through the dosage schedule when you pick up your infoceuticals.`}
        </p>
      </td></tr>
    </table>
    <p style="color:#B49F90;font-size:11px;text-align:center;margin:0;line-height:1.6;">
      SoliVana Wellness · Redwood City, CA · (650) 564-4325 · natasha@solivana.com<br>
      Infoceuticals are for wellness support only. These statements have not been evaluated by the FDA.<br>
      Not intended to diagnose, treat, cure, or prevent any disease.
    </p>
  </div>
</body>
</html>
    `.trim(),
  };
}

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return Response.json({ error: "Webhook misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  // Idempotency: Stripe legitimately retries webhooks on transient failures and on initial
  // delivery confirmation timeouts. Without this guard, the same event_id would re-fire emails
  // and re-write client_emails. claimStripeEvent atomically inserts and returns false if the
  // event_id was already processed.
  try {
    const isFirstSeen = await claimStripeEvent(event.id);
    if (!isFirstSeen) {
      console.log(`Stripe webhook event ${event.id} already processed — skipping.`);
      return Response.json({ received: true, deduped: true });
    }
  } catch (err) {
    console.error("Idempotency claim failed (proceeding without dedup):", err);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const product = session.metadata?.product;
  const email = session.customer_details?.email || session.customer_email || "";
  const clientName = session.metadata?.client_name || session.customer_details?.name || "";

  if (product === "voice_scan") {
    if (clientName && email) {
      // Push to GHL (fire-and-forget — never block on this)
      upsertGhlContact({
        email,
        name: clientName,
        tags: ["voice-scan-paid", "bioenergetics-scan"],
      }).catch((err) => console.error("GHL voice_scan upsert error:", err));

      try {
        await saveClientEmail(clientName, email);
      } catch (err) {
        // Don't 500 — Stripe would retry indefinitely while the customer can't access /report.
        // Ack receipt to Stripe; alert Natasha to reconcile manually.
        console.error("Failed to save client email from voice_scan webhook:", err);
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "SoliVana Portal <natasha@solivana.com>",
            to: "natasha@solivana.com",
            subject: `⚠️ Manual reconcile needed — voice scan paid but DB write failed`,
            html: `<p>Stripe webhook received <code>${escapeHtml(event.id)}</code> for voice_scan but the <code>client_emails</code> insert threw.</p>
              <p><strong>Client:</strong> ${escapeHtml(clientName)}<br><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p>Add this row manually to <code>client_emails</code> so the client can access scan.solivana.ai/report:<br>
              <code>INSERT INTO client_emails (name, email) VALUES ('${escapeHtml(clientName.toLowerCase().trim())}', '${escapeHtml(email.toLowerCase().trim())}') ON CONFLICT DO NOTHING;</code></p>
              <p>Error: <pre>${escapeHtml(String(err))}</pre></p>`,
          });
        } catch (alertErr) {
          console.error("Reconciliation alert email also failed:", alertErr);
        }
      }
    }
  } else if (product === "infoceutical_protocol") {
    const names = (session.metadata?.infoceutical_names || "").split("|").filter(Boolean);
    const delivery: "ship" | "pickup" = session.metadata?.delivery_method === "ship" ? "ship" : "pickup";
    const shippingDetails = (session as Stripe.Checkout.Session & {
      shipping_details?: { name?: string; address?: Stripe.Address };
    }).shipping_details;
    const shippingName = shippingDetails?.name || "";
    const shippingAddress = shippingDetails?.address || null;

    // Push to GHL with delivery method tag and infoceutical names as a custom field
    if (email) {
      upsertGhlContact({
        email,
        name: clientName,
        tags: ["infoceutical-paid", `delivery-${delivery}`],
        customFields: [
          { key: "infoceutical_names", field_value: names.join(", ") },
          { key: "delivery_method", field_value: delivery },
        ],
      }).catch((err) => console.error("GHL infoceutical upsert error:", err));
    }

    // Build the Pickup Console URL for the Natasha email. Sends her into the full
    // verification UI (bottle checklist + Mark Ready + Confirm Pickup), not just
    // an instant tag-application — so we keep an audit trail of which bottles
    // each client actually walked out with.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://scan.solivana.ai";
    const adminToken = process.env.NATASHA_ADMIN_TOKEN || "";
    const readyUrl = adminToken && email
      ? `${baseUrl}/admin/pickup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(adminToken)}`
      : "";

    const resend = new Resend(process.env.RESEND_API_KEY);
    const sends: Promise<unknown>[] = [
      resend.emails.send(buildNatashaConfirmedEmail(clientName, email, names, delivery, shippingName, shippingAddress, readyUrl)),
    ];
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sends.push(resend.emails.send(buildClientConfirmedEmail(clientName, email, names, delivery)));
    }
    await Promise.all(sends).catch(console.error);
  }

  return Response.json({ received: true });
}
