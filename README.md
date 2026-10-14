# SoliVana Bioenergetics Scan Portal

**Live:** https://scan.solivana.ai

Part of the SoliVana Wellness AI suite — AI instruments that measure and demonstrate how wellness affects biomarkers and everyday wellbeing.

## The problem

Bioenergetic voice scans (Energy4Life / E4L) produce dense, multi-page PDF reports — dozens of flagged body systems, emotions, sensitivities, toxins, and nutritional priorities. Clients can't interpret them on their own, and a practitioner reading every scan personally doesn't scale: each report takes deep, careful attention across every page of the PDF.

## The approach

A payment-gated client portal that turns a purchased scan into a personalized, brand-styled interpretation report:

1. **Stripe Checkout** — the client buys a $79 voice scan; the Stripe webhook records the purchaser's email and unlocks the portal for that email only.
2. **PDF intake** — the client uploads their E4L scan PDF through a streamed upload UI.
3. **LLM interpretation** — a large, tightly-specified system prompt drives Claude to read every page of the PDF and generate a complete HTML interpretation report (14 canonical sections, exact brand design tokens, email-client-safe markup, verbatim FDA not-evaluated disclaimer). Anthropic **prompt caching** caches the ~3,300-token system prompt and the parsed PDF across retries, and an **env-override model chain** lets the deployment switch models without code changes.
4. **Branded email delivery** — the report streams to the client's screen immediately (SSE) and is also emailed via Resend, with a $175 practitioner-selected infoceutical protocol purchase card injected after the recommendations section.
5. **CRM sync** — every report appends a dated entry to the client's GoHighLevel contact (infoceutical history, scan count, first-scan date), giving repeat clients a visible bioenergetic timeline.

An admin dashboard (gated by an env-configured access token, verified server-side on every admin API call) lets the practitioner manage protocol fulfillment: mark orders ready, verify pickup, and keep client notes.

## Engineering highlights

- **Idempotent Stripe webhook** — a `processed_stripe_events` table claims each event ID before side effects run, so Stripe retries never double-email or double-write.
- **SSE streaming with ping/close hardening** — the interpretation streams to the browser as it's generated, with 10s heartbeats and guarded enqueue/close paths so client disconnects never crash the handler.
- **402 payment gating** — the interpret endpoint verifies the upload email against the paid-emails table and returns `402` with a recovery link when there's no matching purchase.
- **Rate limiting** — simple in-memory limiter (3 interpret requests per IP per minute) on the expensive endpoint.
- **CCPA right-to-erasure hook** — `deleteClientByEmail` removes a client record by email on request.
- **Prompt caching + model resilience** — cached system prompt and document block; primary model from `ANTHROPIC_MODEL` with automatic fallback when a model is deprecated or unavailable.
- **Postgres schema init that survives restarts and races** — idempotent table creation, constraint checks against `pg_constraint` before adding unique indexes.

## Stack

Next.js (App Router) · Anthropic Claude · Stripe · Resend · GoHighLevel (LeadConnector v2) · Postgres (`pg`) · Tailwind CSS · deployed on Railway (Docker).

### Environment variables

Names only — values live in the deployment environment:

- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `DATABASE_URL`
- `GHL_API_KEY`, `GHL_LOCATION_ID`
- `NATASHA_ADMIN_TOKEN` — gates the admin dashboard
- `NEXT_PUBLIC_BASE_URL`
- `PORTAL_BYPASS_EMAIL_GATE` — internal testing bypass for the payment gate

## About

Built by Natasha Berness (SoliVana Wellness). This repo is one instrument in a wellness AI suite that pairs bioenergetic measurement with AI-generated interpretation to make practitioner-grade insight scalable.

Portfolio — code shared for review, not licensed for reuse.
