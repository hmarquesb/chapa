-- Schema inicial do Chapa (spec S03).
-- Sessões, mensagens, trechos da base com embedding e rate limit.
-- RLS ligado em todas as tabelas, sem nenhuma policy: só o servidor (dono das
-- tabelas, pelo driver postgres) acessa os dados.

-- Extensões (no Supabase ficam no schema "extensions")
create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Configuração de busca textual: português, sem diferenciar acentos
create text search configuration public.pt_unaccent (copy = pg_catalog.portuguese);
alter text search configuration public.pt_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;

create table public.sessions (
  id uuid primary key,
  channel text not null check (channel in ('web', 'cli', 'eval')),
  profile jsonb not null default '{}'::jsonb,
  summary text,
  summary_until_id bigint,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index sessions_last_activity_idx on public.sessions (last_activity_at);

create table public.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  status text check (status in ('answered', 'fallback', 'blocked_input', 'blocked_output')),
  sources text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index messages_session_id_idx on public.messages (session_id, id);

-- Sem índice vetorial: com menos de 500 trechos, a busca exata basta.
create table public.document_chunks (
  id bigint generated always as identity primary key,
  source text not null,
  section text not null default '',
  content text not null,
  embedding_model text not null,
  chunk_config text not null,
  embedding extensions.vector(768) not null,
  tsv tsvector generated always as (to_tsvector('public.pt_unaccent', content)) stored,
  created_at timestamptz not null default now()
);
create index document_chunks_set_idx on public.document_chunks (embedding_model, chunk_config);

create table public.rate_limits (
  ip_hash text not null,
  bucket text not null check (bucket in ('minute', 'day')),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (ip_hash, bucket, window_start)
);

alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.document_chunks enable row level security;
alter table public.rate_limits enable row level security;

-- Busca híbrida: devolve os dois sinais por trecho, sem combiná-los.
-- semantic: similaridade de cosseno (1 - distância).
-- keyword: fração dos termos distintos da consulta (normalizados) presentes no trecho.
-- A combinação com alpha, o minScore e o topK ficam em TS (S04).
create or replace function public.match_chunks(
  query_embedding extensions.vector(768),
  query_text text,
  p_embedding_model text,
  p_chunk_config text,
  p_limit integer
) returns table (
  id bigint, source text, section text, content text,
  semantic double precision, keyword double precision
)
language sql stable security invoker
set search_path = public, extensions
as $$
  with q as (
    select tsvector_to_array(to_tsvector('public.pt_unaccent', query_text)) as terms
  ),
  scored as (
    select c.id, c.source, c.section, c.content,
           1 - (c.embedding <=> query_embedding) as semantic,
           case when cardinality(q.terms) = 0 then 0
                else cardinality(array(
                       select unnest(q.terms)
                       intersect
                       select unnest(tsvector_to_array(c.tsv))
                     ))::double precision / cardinality(q.terms)
           end as keyword
    from public.document_chunks c, q
    where c.embedding_model = p_embedding_model
      and c.chunk_config = p_chunk_config
  )
  select * from scored
  order by greatest(semantic, keyword) desc, id
  limit p_limit
$$;

revoke execute on function public.match_chunks from public, anon, authenticated;
