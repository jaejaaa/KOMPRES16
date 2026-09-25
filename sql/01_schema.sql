-- Jalankan di Supabase SQL Editor. Dimensi 1024 = BAAI/bge-m3.
create extension if not exists vector;

create table if not exists regulation_chunks (
  id            text primary key,          -- mis. uupa-1960:bata:ps16
  doc_slug      text not null,
  doc           text not null,             -- 'UU 5/1960'
  doc_title     text not null,
  section       text not null,             -- 'batang_tubuh' | 'penjelasan'
  bab           text,
  pasal         text not null,
  pasal_inferred boolean default false,    -- nomor Pasal ditebak karena OCR
  status        text not null default 'berlaku',  -- 'berlaku' | 'dicabut (...)' | 'diubah sebagian (...)'
  page_start    int, page_end int,
  content       text not null,
  embedding     vector(1024) not null,
  fts           tsvector generated always as (to_tsvector('simple', content)) stored
);
create index if not exists regulation_chunks_emb_idx
  on regulation_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists regulation_chunks_fts_idx on regulation_chunks using gin (fts);
create index if not exists regulation_chunks_doc_idx on regulation_chunks (doc_slug, pasal);

-- Kontrak untuk AI Engineer: kirim embedding pertanyaan -> dapat chunk + metadata pasal.
create or replace function match_regulation_chunks(
  query_embedding vector(1024),
  match_count int default 5,
  filter_doc text default null,
  include_penjelasan boolean default false,
  include_dicabut boolean default false
) returns table (
  id text, doc text, pasal text, section text, bab text, status text,
  page_start int, page_end int, content text, similarity float
) language sql stable as $$
  select id, doc, pasal, section, bab, status, page_start, page_end, content,
         1 - (embedding <=> query_embedding) as similarity
  from regulation_chunks
  where (filter_doc is null or doc_slug = filter_doc)
    and (include_penjelasan or section = 'batang_tubuh')
    and (include_dicabut or status not like 'dicabut%')
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Hybrid search: gabungkan peringkat vektor + kata kunci dengan Reciprocal Rank Fusion.
-- query_tsquery: string tsquery berformat OR, mis. 'peralihan | hak | tanah' (dibuat oleh scripts/search.py).
create or replace function match_regulation_hybrid(
  query_embedding vector(1024),
  query_tsquery text,
  match_count int default 5,
  filter_doc text default null,
  include_penjelasan boolean default false,
  include_dicabut boolean default false,
  pool int default 40
) returns table (
  id text, doc text, pasal text, section text, bab text, status text,
  page_start int, page_end int, content text, score float
) language sql stable as $$
  with base as (
    select * from regulation_chunks
    where (filter_doc is null or doc_slug = filter_doc)
      and (include_penjelasan or section = 'batang_tubuh')
      and (include_dicabut or status not like 'dicabut%')
  ),
  v as (select id, row_number() over (order by embedding <=> query_embedding) rk from base
        order by embedding <=> query_embedding limit pool),
  t as (select id, row_number() over (order by ts_rank_cd(fts, to_tsquery('simple', query_tsquery)) desc) rk
        from base where fts @@ to_tsquery('simple', query_tsquery)
        order by ts_rank_cd(fts, to_tsquery('simple', query_tsquery)) desc limit pool),
  f as (select coalesce(v.id, t.id) id,
               coalesce(1.0/(60+v.rk),0) + coalesce(1.0/(60+t.rk),0) score
        from v full join t on v.id = t.id)
  select b.id, b.doc, b.pasal, b.section, b.bab, b.status, b.page_start, b.page_end, b.content, f.score::float
  from f join base b on b.id = f.id order by f.score desc limit match_count;
$$;
