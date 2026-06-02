-- Dual-role match engine.
--
-- Two structural changes that move Circle from a buyer-only matcher to a
-- combination engine that understands HOW a person relates to an offer:
--
--   1. ideas.pain — the keystone seed. A fractional's whole pitch is "I remove
--      this specific, expensive pain." Without it the engine overlaps job
--      titles instead of matching a pain to the people who have it.
--
--   2. matches.role — the relationship of the matched person to the offer:
--        buyer      — has the pain, fits the ICP, can pay.        (move: pitch)
--        amplifier  — reaches the ICP; can intro / refer / co-market /
--                     distribute. Not the buyer — the channel.    (move: intro-ask)
--        sharpener  — a peer/operator who helps refine the idea.  (move: ask to react)
--
--      Existing rows were all surfaced by the buyer-only engine, so they
--      backfill to 'buyer' — no behavioural change for data already on screen.

alter table public.ideas
  add column if not exists pain text;

comment on column public.ideas.pain is
  'The specific, expensive pain this offer removes. Keystone seed for matching: the engine matches this pain to the people who have it (buyers) or who reach the people who have it (amplifiers).';

alter table public.matches
  add column if not exists role text not null default 'buyer';

-- Constraint added separately + NOT VALID first so the column add is cheap and
-- the check never blocks on a long scan; existing rows already satisfy 'buyer'.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_role_check'
  ) then
    alter table public.matches
      add constraint matches_role_check
      check (role in ('buyer', 'amplifier', 'sharpener')) not valid;
    alter table public.matches validate constraint matches_role_check;
  end if;
end $$;

comment on column public.matches.role is
  'Relationship of the matched person to the offer: buyer (has the pain), amplifier (reaches the ICP and can distribute the offer), sharpener (helps refine the idea). Set by the match engine; defaults to buyer for pre-dual-role rows.';
