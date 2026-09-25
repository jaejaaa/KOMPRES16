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
  embedding     vector(1024) not null
);
create index if not exists regulation_chunks_emb_idx
  on regulation_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists regulation_chunks_doc_idx on regulation_chunks (doc_slug, pasal);

-- Kontrak untuk AI Engineer: kirim embedding pertanyaan -> dapat chunk + metadata pasal.
create or replace function match_regulation_chunks(
  query_embedding vector(1024),
  match_count int default 5,
  filter_doc text default null,
  include_penjelasan boolean default false
) returns table (
  id text, doc text, pasal text, section text, bab text, status text,
  page_start int, page_end int, content text, similarity float
) language sql stable as $$
  select id, doc, pasal, section, bab, status, page_start, page_end, content,
         1 - (embedding <=> query_embedding) as similarity
  from regulation_chunks
  where (filter_doc is null or doc_slug = filter_doc)
    and (include_penjelasan or section = 'batang_tubuh')
  order by embedding <=> query_embedding
  limit match_count;
$$;
