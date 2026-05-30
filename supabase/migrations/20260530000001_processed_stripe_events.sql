-- Idempotency ledger for Stripe webhook events.
-- Stripe delivers webhooks at-least-once. The stripe-webhook function inserts
-- each verified event.id here and short-circuits on a unique-violation so a
-- redelivered event is never reprocessed. Foundation for the 5d attribution
-- read-back (purchased/refunded/churned must each emit exactly once).
create table if not exists public.processed_stripe_events (
  event_id text primary key,
  event_type text,
  processed_at timestamptz not null default now()
);

-- Service-role only. The webhook uses the service role (which bypasses RLS).
-- RLS on with zero policies = deny-all for anon/authenticated, by design.
-- Mirrors the oauth_tokens / oauth_states / rate_limits pattern in this schema.
alter table public.processed_stripe_events enable row level security;

comment on table public.processed_stripe_events is
  'Stripe webhook idempotency ledger. Service-role-only; RLS on with no policies (deny-all). Safe to prune rows older than ~30 days.';
