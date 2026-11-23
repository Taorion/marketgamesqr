-- Stage 1-4 extension. Only the isolated sandbox can execute the new routes.
alter table invoice_partners add column profile_box text, add column terms_version text, add column terms_hash text, add column terms_accepted_at timestamptz;
alter table invoice_apps add column hourly_quota integer not null default 300 check(hourly_quota between 1 and 10000);
alter table invoice_apps add column blocked_at timestamptz;
alter table invoice_keys alter column scopes set default array['invoices:write','submissions:read'];
update invoice_keys set scopes=array_replace(scopes,'receipts:read','submissions:read');
create table invoice_access_tokens (
 token_hash text primary key check(length(token_hash)=64), key_id uuid not null references invoice_keys(id) on delete cascade,
 scopes text[] not null, expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index invoice_tokens_key on invoice_access_tokens(key_id);
create index invoice_tokens_expiry on invoice_access_tokens(expires_at);
alter table invoice_identity_attestations add column country text not null default 'CO' check(country ~ '^[A-Z]{2}$'),
 add column document_type text not null default '13';
alter table invoice_consents add column merchant_id uuid references invoice_merchants(id);
create index invoice_consents_merchant on invoice_consents(merchant_id);
alter table invoice_documents drop constraint invoice_documents_merchant_id_document_key_key;
alter table invoice_documents add constraint invoice_documents_fiscal_unique unique(merchant_id,document_type,document_key);
alter table invoice_submissions add column processed_ms integer, add column payload_bytes integer not null default 0,
 add column internal_result text, add column public_ready_at timestamptz not null default (now()+interval '10 seconds');
alter table invoice_documents add column legal_hold boolean not null default false,
 add column retain_until timestamptz not null default (now()+interval '30 days');
alter table invoice_events add column actor_customer_id uuid references customer_accounts(id) on delete set null,
 add column actor_admin_id uuid references app_users(id) on delete set null,
 add column object_id uuid, add column details jsonb not null default '{}';
create index invoice_events_customer on invoice_events(actor_customer_id);
create index invoice_events_admin on invoice_events(actor_admin_id);
create table invoice_overrides (
 customer_id uuid not null, document_id uuid not null, line_id text not null,
 original_value text, normalized_value text, user_override text not null, extraction_method text not null default 'USER',
 confidence text not null default 'USER_CONFIRMED', revision integer not null default 1,
 updated_at timestamptz not null default now(), primary key(document_id,line_id),
 foreign key(customer_id,document_id) references invoice_documents(customer_id,id) on delete cascade
);
create index invoice_overrides_customer on invoice_overrides(customer_id);
create table invoice_notices (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null, document_id uuid not null unique,
 created_at timestamptz not null default now(), read_at timestamptz,
 foreign key(customer_id,document_id) references invoice_documents(customer_id,id) on delete cascade
);
create index invoice_notices_customer on invoice_notices(customer_id,created_at desc);
create table invoice_requests (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references customer_accounts(id) on delete cascade,
 kind text not null check(kind in ('IDENTITY_REVIEW','IDENTITY_CHANGE','CORRECTION','DELETION')),
 document_id uuid, payload_box text not null,
 state text not null default 'PENDING' check(state in ('PENDING','REVIEW','RESOLVED','REJECTED')),
 resolution_code text, created_at timestamptz not null default now(), resolved_at timestamptz,
 foreign key(customer_id,document_id) references invoice_documents(customer_id,id) on delete cascade
);
create index invoice_requests_customer on invoice_requests(customer_id,created_at desc);
create index invoice_requests_document on invoice_requests(document_id);
create index invoice_requests_queue on invoice_requests(state,created_at);
create table invoice_homologations (
 id uuid primary key default gen_random_uuid(), app_id uuid not null references invoice_apps(id),
 requested_by uuid references customer_accounts(id) on delete set null,
 checklist jsonb not null, state text not null default 'PENDING' check(state in ('PENDING','REVIEW_APPROVED','REJECTED')),
 decision_code text, reviewed_by uuid references app_users(id) on delete set null,
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
create unique index invoice_homologations_pending on invoice_homologations(app_id) where state='PENDING';
create index invoice_homologations_reviewer on invoice_homologations(reviewed_by);
create index invoice_homologations_requester on invoice_homologations(requested_by);
create table invoice_member_invites (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references invoice_partners(id),
 token_hash text not null unique, role text not null check(role in ('OWNER','SUPPORT')),
 expires_at timestamptz not null, consumed_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index invoice_invites_partner on invoice_member_invites(partner_id);
alter table invoice_documents add column fiscal_hash text;
update invoice_documents set fiscal_hash=original_hash;
alter table invoice_submissions add column delivery_attempts integer not null default 0,
 add column delivery_at timestamptz not null default now();
create index invoice_submissions_delivery on invoice_submissions(delivery_at,created_at) where state='DONE' and internal_result in ('PENDING','RETRY');

alter table invoice_documents alter column content_box drop not null;
alter table invoice_documents add column redacted_at timestamptz;
alter table invoice_identity_attestations drop constraint invoice_identity_attestations_key_version_check;
alter table invoice_identity_attestations add constraint invoice_identity_key_version check(key_version>0);

-- Small schema, no duplicate invoice-line ledger: the encrypted versioned snapshot remains canonical.
do $$ declare t text; r text; begin
 foreach t in array array['invoice_access_tokens','invoice_overrides','invoice_notices','invoice_requests','invoice_homologations','invoice_member_invites'] loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on %I from %I',t,r); end if;
  end loop;
 end loop;
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on function invoice_revoke_orphan_apps() from %I',r); end if;
 end loop;
end $$;
