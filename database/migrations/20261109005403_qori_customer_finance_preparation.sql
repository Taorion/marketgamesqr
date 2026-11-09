-- First financial preparation is mandatory only for new/incomplete registrations.
alter table customer_accounts add column finance_setup_state text not null default 'PENDING'
  check (finance_setup_state in ('PENDING','COMPLETE','LEGACY'));
alter table customer_accounts add column finance_setup_completed_at timestamptz;
alter table customer_accounts add column finance_setup_details jsonb;
update customer_accounts set finance_setup_state='LEGACY'
where nullif(btrim(full_name),'') is not null and declared_document_key is not null;
alter table customer_accounts add constraint customer_finance_setup_completion
  check ((finance_setup_state='COMPLETE')=(finance_setup_completed_at is not null));
