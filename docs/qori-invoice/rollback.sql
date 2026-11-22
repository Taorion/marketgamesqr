-- Run ONLY with workers/gateway disabled, verified backup and explicit approval.
-- Refuse to destroy any received documents, jobs, consent or identity evidence.
begin;
do $$ declare t text; populated boolean; begin
 foreach t in array array['invoice_partners','invoice_members','invoice_apps','invoice_keys','invoice_access_tokens',
 'invoice_merchants','invoice_authorizations','invoice_identity_attestations','invoice_consents','invoice_submissions',
 'invoice_documents','invoice_reconciliations','invoice_events','invoice_overrides','invoice_notices','invoice_requests',
 'invoice_homologations','invoice_member_invites'] loop
 execute format('select exists(select 1 from %I)',t) into populated;
 if populated then raise exception 'Invoice data exists: use disable-only rollback and retain data'; end if;
 end loop;
end $$;
drop trigger invoice_owner_deleting on customer_accounts;
drop function invoice_revoke_orphan_apps();
drop table invoice_access_tokens,invoice_overrides,invoice_notices,invoice_requests,invoice_homologations,invoice_member_invites,
 invoice_events,invoice_reconciliations,invoice_documents,invoice_submissions,invoice_consents,
 invoice_identity_attestations,invoice_authorizations,invoice_merchants,invoice_keys,invoice_members,invoice_apps,invoice_partners;
delete from schema_migrations where id in ('20261122160317_qori_invoice_sandbox','20261122163509_qori_invoice_customer_developers');
commit;

