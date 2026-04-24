-- Phase 8 follow-up: observability + provenance for sunday_letters.text_body.
-- Tracks whether a letter came from the LLM or the no-activity fallback
-- so we can monitor LLM availability and detect drift in empty-week output.

alter table sunday_letters
  add column if not exists generation_source text
    check (generation_source in ('llm', 'fallback'));

alter table sunday_letters
  add column if not exists text_length int
    check (text_length >= 0);
