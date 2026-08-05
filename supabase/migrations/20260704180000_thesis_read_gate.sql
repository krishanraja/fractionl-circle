-- Atomic free-read gate for validate-thesis.
--
-- The free plan is one read then a Pro gate. Enforcing that with a
-- read-count-then-insert in the edge function is a check-then-act (TOCTOU) race:
-- N concurrent requests all read count = 0 before any run row lands, so all N run
-- the paid Perplexity + LLM work and all persist. This function makes the
-- count-check and the insert atomic by taking a per-user transaction-scoped
-- advisory lock, so concurrent reads for the same user serialize: the first
-- inserts the run (count becomes 1), the rest see count >= limit and get NULL
-- (the caller returns 402). Non-free tiers (trial / pro / executive) always insert.
--
-- Returns the new thesis_runs.id, or NULL when a free user is at their cap.

create or replace function public.insert_thesis_run_gated(
  p_thesis text,
  p_background text,
  p_result jsonb,
  p_is_free boolean,
  p_limit int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Serialize concurrent reads for this one user (released at transaction end).
  perform pg_advisory_xact_lock(hashtext('thesis_read:' || v_uid::text));

  if p_is_free and (
    select count(*) from public.thesis_runs where user_id = v_uid
  ) >= p_limit then
    return null;
  end if;

  insert into public.thesis_runs (user_id, thesis, background, result)
  values (v_uid, p_thesis, coalesce(nullif(p_background, ''), null), p_result)
  returning id into v_id;

  return v_id;
end;
$$;

-- Only authenticated users, acting as themselves (auth.uid()), may call it.
revoke all on function public.insert_thesis_run_gated(text, text, jsonb, boolean, int) from public;
grant execute on function public.insert_thesis_run_gated(text, text, jsonb, boolean, int) to authenticated;
