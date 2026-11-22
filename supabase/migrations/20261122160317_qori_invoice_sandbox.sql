-- Additive, server-only sandbox. No enterprise subscription dependency.
create table invoice_partners (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120),
 verification_state text not null default 'PENDING' check(verification_state in ('PENDING','VERIFIED','REVOKED')),
 created_at timestamptz not null default now()
);
create table invoice_members (
 partner_id uuid not null references invoice_partners(id) on delete cascade,
 customer_id uuid not null references customer_accounts(id) on delete cascade,
 role text not null check(role in ('OWNER','SUPPORT')), primary key(partner_id,customer_id)
);
create index invoice_members_account on invoice_members(customer_id);
create table invoice_apps (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references invoice_partners(id) on delete cascade,
 name text not null check(length(name) between 2 and 120), environment text not null default 'sandbox' check(environment='sandbox'),
 active boolean not null default true, listed boolean not null default false, created_at timestamptz not null default now(), unique(partner_id,id)
);
create table invoice_keys (
 id uuid primary key default gen_random_uuid(), app_id uuid not null references invoice_apps(id) on delete cascade,
 secret_hash text not null unique check(length(secret_hash)=64), prefix text not null,
 scopes text[] not null default array['invoices:write','receipts:read'],
 expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now()
);
create index invoice_keys_app on invoice_keys(app_id);
create table invoice_merchants (
 id uuid primary key default gen_random_uuid(), country text not null default 'CO' check(country='CO'),
 tax_id text not null unique, name text not null, verification_state text not null check(verification_state='SANDBOX_FIXTURE')
);
create table invoice_authorizations (
 app_id uuid not null references invoice_apps(id) on delete cascade,
 merchant_id uuid not null references invoice_merchants(id),
 evidence_reference text not null, granted_at timestamptz not null default now(), expires_at timestamptz not null,
 revoked_at timestamptz, primary key(app_id,merchant_id)
);
create index invoice_authorizations_merchant on invoice_authorizations(merchant_id);
create table invoice_identity_attestations (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references customer_accounts(id) on delete cascade,
 identity_hmac text not null check(length(identity_hmac)=64), key_version integer not null default 1 check(key_version=1),
 method text not null check(method='SANDBOX_FIXTURE'), evidence_reference text not null,
 verified_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz,
 unique(customer_id,id)
);
create unique index invoice_identity_active on invoice_identity_attestations(identity_hmac) where revoked_at is null;
create index invoice_identity_customer on invoice_identity_attestations(customer_id);
create table invoice_consents (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references customer_accounts(id) on delete cascade,
 app_id uuid not null references invoice_apps(id), identity_id uuid not null,
 book_id uuid not null, text_version text not null, text_hash text not null,
 purposes text[] not null check(purposes=array['RECEIVE','STORE','ANALYZE']),
 channel text not null check(channel='INVOICE_API_SANDBOX'),
 granted_at timestamptz not null default now(), revoked_at timestamptz,
 foreign key(customer_id,identity_id) references invoice_identity_attestations(customer_id,id) on delete cascade,
 foreign key(customer_id,book_id) references customer_finance_books(customer_id,id),
 unique(customer_id,id)
);
create unique index invoice_consent_active on invoice_consents(customer_id,app_id) where revoked_at is null;
create index invoice_consents_app on invoice_consents(app_id);
create table invoice_submissions (
 id uuid primary key default gen_random_uuid(), app_id uuid not null references invoice_apps(id),
 merchant_id uuid not null references invoice_merchants(id), idempotency_key text not null,
 payload_hash text not null, payload_box text, state text not null default 'QUEUED' check(state in ('QUEUED','RETRY','DONE','DEAD')),
 attempts integer not null default 0, available_at timestamptz not null default now(),
 technical_code text, created_at timestamptz not null default now(), finished_at timestamptz,
 unique(app_id,idempotency_key), unique(app_id,id),
 foreign key(app_id,merchant_id) references invoice_authorizations(app_id,merchant_id)
);
create index invoice_submissions_queue on invoice_submissions(available_at,created_at) where state in ('QUEUED','RETRY');
create table invoice_documents (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null unique references invoice_submissions(id),
 merchant_id uuid not null references invoice_merchants(id), document_key text not null,
 customer_id uuid not null references customer_accounts(id) on delete cascade,
 consent_id uuid not null, book_id uuid not null, document_type text not null check(document_type in ('Invoice','CreditNote','DebitNote')),
 currency text not null check(currency in ('COP','USD','EUR')), issued_on date not null,
 payable_minor bigint not null check(payable_minor>=0), original_hash text not null, content_box text not null,
 parser_version text not null, dian_state text not null default 'DIAN_NOT_VERIFIED' check(dian_state='DIAN_NOT_VERIFIED'),
 related_key text, related_document_id uuid references invoice_documents(id), created_at timestamptz not null default now(),
 unique(merchant_id,document_key), unique(customer_id,id),
 foreign key(customer_id,consent_id) references invoice_consents(customer_id,id),
 foreign key(customer_id,book_id) references customer_finance_books(customer_id,id)
);
create index invoice_documents_customer on invoice_documents(customer_id,created_at desc,id);
create index invoice_documents_book on invoice_documents(book_id);
create index invoice_documents_consent on invoice_documents(consent_id);
create index invoice_documents_related on invoice_documents(related_document_id);
-- Links are provenance only; receiving a document NEVER inserts customer_entries or business_sales.
create table invoice_reconciliations (
 document_id uuid primary key, customer_id uuid not null references customer_accounts(id) on delete cascade,
 entry_id uuid not null unique references customer_entries(id) on delete cascade, created_at timestamptz not null default now(),
 foreign key(customer_id,document_id) references invoice_documents(customer_id,id) on delete cascade
);
create index invoice_reconciliations_customer on invoice_reconciliations(customer_id);
create table invoice_events (
 id bigint generated always as identity primary key,
 app_id uuid references invoice_apps(id), submission_id uuid references invoice_submissions(id),
 event_type text not null, created_at timestamptz not null default now()
);
create index invoice_events_app on invoice_events(app_id,created_at desc);
create index invoice_events_submission on invoice_events(submission_id);
-- No policies: backend connection authorizes requests; Data API roles get zero access.
do $$
declare t text; r text;
begin
 foreach t in array array['invoice_partners','invoice_members','invoice_apps','invoice_keys','invoice_merchants','invoice_authorizations','invoice_identity_attestations','invoice_consents','invoice_submissions','invoice_documents','invoice_reconciliations','invoice_events'] loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on %I from %I',t,r); end if;
  end loop;
 end loop;
 revoke all on sequence invoice_events_id_seq from public;
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on sequence invoice_events_id_seq from %I',r); end if;
 end loop;
end $$;
-- Deleting the last owner must not leave orphan machine credentials active.
create function invoice_revoke_orphan_apps() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 update invoice_apps set active=false where partner_id in (
  select m.partner_id from invoice_members m where m.customer_id=old.id and m.role='OWNER'
  and not exists(select 1 from invoice_members other where other.partner_id=m.partner_id and other.role='OWNER' and other.customer_id<>old.id)
 );
 update invoice_keys k set revoked_at=coalesce(k.revoked_at,now()) from invoice_apps a
 where k.app_id=a.id and not a.active;
 return old;
end $$;
revoke all on function invoice_revoke_orphan_apps() from public;
create trigger invoice_owner_deleting before delete on customer_accounts for each row execute function invoice_revoke_orphan_apps();


