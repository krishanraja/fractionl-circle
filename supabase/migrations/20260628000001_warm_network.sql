-- Network warmth + reminders (the "keep your circle warm" slice).
--
-- 1. recompute_circle_warmth(): a set-based, deterministic recompute of every
--    circle_person.warmth from facts the app already owns — recency of last
--    interaction, response_rate, and whether the person has a recent signal.
--    No LLM, no per-row round trips. Called nightly by the compute-warmth edge
--    function (service role) right after the Google/Microsoft sync refreshes
--    last_interaction_at, so the warmth the digest reads is current.
-- 2. user_preferences.warm_digest: an opt-out for the weekly warm-reach digest,
--    mirroring the existing weekly_summary flag the Sunday Letter respects.

-- ---------------------------------------------------------------------------
-- Warmth model. warmth in [0,1], numeric(4,3):
--   0.70 * recency  (exp decay, ~0.6 at 60 days, ~0.37 at 120, ~0.05 at a year;
--                    a never-contacted person gets a low 0.12 floor, not 0)
-- + 0.20 * response_rate (how often they reply; 0.30 assumed when unknown)
-- + 0.10 * recent-signal boost (a person signal in the last 30 days)
-- Only rows whose value actually changes are written, so updated_at does not
-- churn for the whole table on a no-op night.
-- ---------------------------------------------------------------------------

create or replace function public.recompute_circle_warmth()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  with computed as (
    select
      cp.id,
      round(
        least(1.0, greatest(0.0,
          0.70 * case
                   when cp.last_interaction_at is null then 0.12
                   else exp(
                     - (extract(epoch from (now() - cp.last_interaction_at)) / 86400.0) / 120.0
                   )
                 end
          + 0.20 * coalesce(cp.response_rate, 0.30)
          + 0.10 * (
              case when exists (
                select 1 from signals sg
                where sg.circle_person_id = cp.id
                  and sg.subject = 'person'
                  and coalesce(sg.occurred_at, sg.created_at) > now() - interval '30 days'
              ) then 1.0 else 0.0 end
            )
        ))::numeric,
        3
      ) as w
    from circle_person cp
  )
  update circle_person cp
  set warmth = computed.w
  from computed
  where computed.id = cp.id
    and cp.warmth is distinct from computed.w;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- Service role (the cron edge fn) runs this across all users; keep it off the
-- public/anon/authenticated surface so a signed-in user can't recompute the
-- whole table.
revoke all on function public.recompute_circle_warmth() from public;
revoke all on function public.recompute_circle_warmth() from anon;
revoke all on function public.recompute_circle_warmth() from authenticated;
grant execute on function public.recompute_circle_warmth() to service_role;

-- ---------------------------------------------------------------------------
-- Weekly warm-reach digest opt-out. Default on, like weekly_summary.
-- ---------------------------------------------------------------------------
alter table public.user_preferences
  add column if not exists warm_digest boolean default true;
