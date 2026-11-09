-- Keep commercial authorization distinct from documentary verification.
alter table public.qori_seller_applications add column approval_mode text not null default 'DOCUMENTS' check(approval_mode in ('DOCUMENTS','ADMIN_OVERRIDE'));
