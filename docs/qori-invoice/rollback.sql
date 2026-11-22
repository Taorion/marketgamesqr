-- Run ONLY with workers/gateway disabled, verified backup and explicit approval.
-- Refuse to destroy any received documents, jobs, consent or identity evidence.
begin;
do $$ begin
 if exists(select 1 from invoice_documents) or exists(select 1 from invoice_submissions)
 or exists(select 1 from invoice_consents) or exists(select 1 from invoice_identity_attestations)
 or exists(select 1 from invoice_events)
 then raise exception 'Invoice data exists: use disable-only rollback and retain data'; end if;
end $$;
drop trigger invoice_owner_deleting on customer_accounts;
drop function invoice_revoke_orphan_apps();
drop table invoice_events,invoice_reconciliations,invoice_documents,invoice_submissions,invoice_consents,
 invoice_identity_attestations,invoice_authorizations,invoice_merchants,invoice_keys,invoice_members,invoice_apps,invoice_partners;
delete from schema_migrations where id='20261122160317_qori_invoice_sandbox';
commit;

