-- Extend the existing encrypted, server-only seller dossier. No historical status is changed.
alter table public.qori_seller_documents drop constraint if exists qori_seller_documents_kind_check;
alter table public.qori_seller_documents add constraint qori_seller_documents_kind_check
  check (kind in ('IDENTITY','RUT','BANK','POLICE','PROCURADURIA','PHOTO','CONTRACT'));
