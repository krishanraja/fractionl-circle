-- The decision log grows up: thesis_answers stops being a consumable queue and
-- becomes compounding memory (the corpus's #1 make-or-break for an AI chief of
-- staff). Additive only.
--   options   - the choices the coach offered, so the log preserves the branches
--               considered, not just the one taken.
--   status    - 'answered' (a decision) or 'skipped' (the user declined the
--               question; the coach learns not to re-ask, and skips never count
--               as banked decisions or provisional score lift).
--   outcome   - a one-tap retrospective ("worked" / "didnt_work") that colors the
--               settled-decision memory future reads build on.
--
-- DEPLOY ORDER: apply this migration BEFORE deploying the updated validate-thesis
-- and next-question functions (they filter on `status`).

alter table public.thesis_answers
  add column if not exists options jsonb,
  add column if not exists status text not null default 'answered',
  add column if not exists outcome text,
  add column if not exists outcome_at timestamptz;

alter table public.thesis_answers
  drop constraint if exists thesis_answers_status_check;
alter table public.thesis_answers
  add constraint thesis_answers_status_check check (status in ('answered', 'skipped'));

alter table public.thesis_answers
  drop constraint if exists thesis_answers_outcome_check;
alter table public.thesis_answers
  add constraint thesis_answers_outcome_check check (outcome is null or outcome in ('worked', 'didnt_work'));
