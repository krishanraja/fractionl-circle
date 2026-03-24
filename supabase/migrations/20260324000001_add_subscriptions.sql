-- Subscription tiers enum
create type subscription_tier as enum ('free', 'pro', 'executive');

-- User subscriptions table
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  tier subscription_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text not null default 'active',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Usage tracking for metered features
create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  feature text not null,
  count integer not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz default now(),
  unique(user_id, feature, period_start)
);

-- RLS policies
alter table subscriptions enable row level security;
create policy "Users can view own subscription"
  on subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscription"
  on subscriptions for insert with check (auth.uid() = user_id);

alter table usage_tracking enable row level security;
create policy "Users can view own usage"
  on usage_tracking for select using (auth.uid() = user_id);
create policy "Users can insert own usage"
  on usage_tracking for insert with check (auth.uid() = user_id);
create policy "Users can update own usage"
  on usage_tracking for update using (auth.uid() = user_id);

-- Auto-create free subscription on user signup
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, tier, status, trial_ends_at)
  values (new.id, 'free', 'trialing', now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- Updated_at trigger
create trigger update_subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at_column();

-- Index for fast lookups
create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_stripe_customer_id on subscriptions(stripe_customer_id);
create index idx_usage_tracking_user_period on usage_tracking(user_id, feature, period_start);
