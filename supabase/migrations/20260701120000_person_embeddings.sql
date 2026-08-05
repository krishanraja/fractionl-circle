-- Semantic layer for the "who can help me with X" search. Each circle person gets
-- a vector embedding of a composed profile blob (name, title, company, tags, note,
-- and the enrichment dossier) so a query like "venture fund" can reach "Partner at
-- Sequoia" by meaning, not just literal keyword overlap.
--
-- We store the embedding, the exact text we embedded (embedding_text) so a nightly
-- backfill can detect staleness and only re-embed what changed, and when it was
-- embedded. Embeddings are OpenAI text-embedding-3-small (1536 dims) - a single
-- consistent model so every vector shares one space.

create extension if not exists vector;

alter table circle_person add column if not exists embedding vector(1536);
alter table circle_person add column if not exists embedding_text text;
alter table circle_person add column if not exists embedded_at timestamptz;

comment on column circle_person.embedding is
  'OpenAI text-embedding-3-small (1536d) of the composed profile blob; null until embedded.';
comment on column circle_person.embedding_text is
  'The exact text last embedded, so backfill re-embeds only when the composed blob changes.';

-- HNSW over cosine distance: high-recall approximate nearest-neighbour that needs
-- no training pass (unlike ivfflat), so it works from the first inserted vector.
create index if not exists idx_circle_person_embedding
  on circle_person using hnsw (embedding vector_cosine_ops);

-- Nearest-neighbour search scoped to the caller. Runs as the invoker so RLS on
-- circle_person applies; the explicit user_id = auth.uid() filter is belt-and-
-- suspenders and lets the planner use the per-user rows. Returns cosine similarity
-- (1 - distance) so higher is closer.
create or replace function match_circle_persons(
  query_embedding vector(1536),
  match_count int default 40
)
returns table (
  id uuid,
  display_name text,
  title text,
  company text,
  tags text[],
  note text,
  dossier jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select p.id, p.display_name, p.title, p.company, p.tags, p.note, p.dossier,
         1 - (p.embedding <=> query_embedding) as similarity
  from circle_person p
  where p.user_id = auth.uid()
    and p.embedding is not null
  order by p.embedding <=> query_embedding
  limit greatest(1, least(match_count, 100));
$$;

grant execute on function match_circle_persons(vector, int) to authenticated;
