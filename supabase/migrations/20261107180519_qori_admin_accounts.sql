-- Account access only. No financial data or identity links are changed.
alter table public.customer_accounts add column is_active boolean not null default true;
alter table public.customer_accounts add column admin_revision integer not null default 0;
create index customer_accounts_admin_created on public.customer_accounts(created_at desc,id);
create index qori_commercial_audit_entity_history on public.qori_commercial_audit(entity_type,entity_id,created_at desc);
