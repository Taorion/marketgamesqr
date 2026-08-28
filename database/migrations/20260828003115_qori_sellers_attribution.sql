-- Qori sellers, goals and auditable public-plan attribution.
-- The application uses a trusted server connection; RLS remains enabled as
-- defense in depth for public-schema access through Supabase Data API roles.

do $$
begin
  alter type user_role add value if not exists 'BUSINESS_SELLER';
exception
  when duplicate_object then null;
end $$;

-- Composite keys make tenant ownership part of the relational contract, not
-- only an application convention. Existing UUID primary keys make these safe.
create unique index if not exists app_users_business_id_id_uidx on app_users (business_id, id);
create unique index if not exists branches_business_id_id_uidx on branches (business_id, id);
create unique index if not exists qr_credit_purchase_orders_business_id_id_uidx on qr_credit_purchase_orders (business_id, id);

create table if not exists business_seller_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  seller_code text not null,
  job_title text,
  phone text,
  territory text,
  branch_id uuid references branches(id) on delete set null,
  hired_at date,
  status text not null default 'ACTIVE',
  administrative_notes text,
  commercial_settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_seller_profiles_status_check check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  constraint business_seller_profiles_code_check check (seller_code ~ '^[A-Z0-9][A-Z0-9-]{2,39}$'),
  constraint business_seller_profiles_business_user_uidx unique (business_id, user_id),
  constraint business_seller_profiles_tenant_user_fk foreign key (business_id, user_id) references app_users (business_id, id) on delete cascade,
  constraint business_seller_profiles_tenant_branch_fk foreign key (business_id, branch_id) references branches (business_id, id) on delete set null (branch_id)
);

create unique index if not exists business_seller_profiles_business_code_uidx
  on business_seller_profiles (business_id, lower(seller_code));
create index if not exists business_seller_profiles_user_id_idx on business_seller_profiles (user_id);
create index if not exists business_seller_profiles_branch_id_idx on business_seller_profiles (branch_id);
create index if not exists business_seller_profiles_created_by_user_id_idx on business_seller_profiles (created_by_user_id);
create index if not exists business_seller_profiles_active_business_idx
  on business_seller_profiles (business_id, created_at desc) where status = 'ACTIVE';

create table if not exists business_seller_goals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  seller_user_id uuid not null references app_users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_revenue numeric(16,2) not null default 0,
  target_sales integer not null default 0,
  target_new_customers integer not null default 0,
  product_targets jsonb not null default '[]'::jsonb,
  status text not null default 'ACTIVE',
  notes text,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_seller_goals_period_check check (period_end >= period_start),
  constraint business_seller_goals_targets_check check (target_revenue >= 0 and target_sales >= 0 and target_new_customers >= 0),
  constraint business_seller_goals_status_check check (status in ('ACTIVE', 'CLOSED', 'CANCELLED')),
  constraint business_seller_goals_period_uidx unique (business_id, seller_user_id, period_start, period_end),
  constraint business_seller_goals_tenant_seller_fk foreign key (business_id, seller_user_id) references app_users (business_id, id) on delete cascade
);

create index if not exists business_seller_goals_seller_user_id_idx on business_seller_goals (seller_user_id);
create index if not exists business_seller_goals_created_by_user_id_idx on business_seller_goals (created_by_user_id);
create index if not exists business_seller_goals_business_period_idx
  on business_seller_goals (business_id, period_start, period_end);
create index if not exists business_seller_goals_active_seller_idx
  on business_seller_goals (business_id, seller_user_id, period_start, period_end) where status = 'ACTIVE';

create table if not exists business_seller_activity_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  seller_user_id uuid references app_users(id) on delete set null,
  actor_user_id uuid references app_users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint business_seller_activity_events_type_check check (event_type in ('SELLER_CREATED','SELLER_UPDATED','GOAL_CREATED','GOAL_UPDATED','SALE_RECORDED','ATTRIBUTION_REASSIGNED')),
  constraint business_seller_activity_events_tenant_seller_fk foreign key (business_id, seller_user_id) references app_users (business_id, id) on delete set null (seller_user_id)
);
create index if not exists business_seller_activity_events_business_seller_idx on business_seller_activity_events (business_id, seller_user_id, created_at desc);
create index if not exists business_seller_activity_events_actor_idx on business_seller_activity_events (actor_user_id);

create table if not exists portal_signup_sales_attributions (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null unique references qr_credit_purchase_orders(id) on delete restrict,
  qori_business_id uuid not null references businesses(id) on delete restrict,
  client_business_id uuid not null references businesses(id) on delete restrict,
  seller_user_id uuid references app_users(id) on delete set null,
  attribution_source text not null,
  seller_code_snapshot text,
  seller_name_snapshot text,
  plan_code text not null,
  billing_cycle text not null default 'monthly',
  expected_revenue_cop numeric(16,2) not null default 0,
  approved_revenue_cop numeric(16,2),
  status text not null default 'PENDING',
  mercado_pago_payment_id text,
  approved_at timestamptz,
  assigned_by_user_id uuid references app_users(id) on delete set null,
  assignment_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_signup_sales_attributions_source_check check (attribution_source in ('SELLER', 'SELF', 'ADMIN_ASSIGNED')),
  constraint portal_signup_sales_attributions_status_check check (status in ('PENDING', 'APPROVED', 'FAILED', 'CANCELLED', 'REFUNDED')),
  constraint portal_signup_sales_attributions_cycle_check check (billing_cycle in ('monthly', 'annual')),
  constraint portal_signup_sales_attributions_seller_check check (
    (attribution_source = 'SELF' and seller_user_id is null)
    or (attribution_source in ('SELLER', 'ADMIN_ASSIGNED') and seller_user_id is not null)
  ),
  constraint portal_signup_sales_attributions_order_business_fk foreign key (client_business_id, purchase_order_id) references qr_credit_purchase_orders (business_id, id) on delete restrict,
  constraint portal_signup_sales_attributions_qori_seller_fk foreign key (qori_business_id, seller_user_id) references app_users (business_id, id) on delete set null (seller_user_id)
);

create index if not exists portal_signup_sales_attributions_qori_business_id_idx on portal_signup_sales_attributions (qori_business_id);
create index if not exists portal_signup_sales_attributions_client_business_id_idx on portal_signup_sales_attributions (client_business_id);
create index if not exists portal_signup_sales_attributions_seller_user_id_idx on portal_signup_sales_attributions (seller_user_id);
create index if not exists portal_signup_sales_attributions_assigned_by_user_id_idx on portal_signup_sales_attributions (assigned_by_user_id);
create index if not exists portal_signup_sales_attributions_qori_status_approved_idx
  on portal_signup_sales_attributions (qori_business_id, status, approved_at desc);
create index if not exists portal_signup_sales_attributions_seller_approved_idx
  on portal_signup_sales_attributions (qori_business_id, seller_user_id, approved_at desc) where status = 'APPROVED';

create table if not exists portal_signup_sales_attribution_events (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references portal_signup_sales_attributions(id) on delete cascade,
  qori_business_id uuid not null references businesses(id) on delete restrict,
  event_type text not null,
  previous_seller_user_id uuid references app_users(id) on delete set null,
  next_seller_user_id uuid references app_users(id) on delete set null,
  actor_user_id uuid references app_users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint portal_signup_sales_attribution_events_type_check check (event_type in ('CREATED', 'APPROVED', 'REASSIGNED', 'STATUS_CHANGED')),
  constraint portal_signup_sales_attribution_events_previous_seller_fk foreign key (qori_business_id, previous_seller_user_id) references app_users (business_id, id) on delete set null (previous_seller_user_id),
  constraint portal_signup_sales_attribution_events_next_seller_fk foreign key (qori_business_id, next_seller_user_id) references app_users (business_id, id) on delete set null (next_seller_user_id)
);

create index if not exists portal_signup_sales_attribution_events_attribution_id_idx on portal_signup_sales_attribution_events (attribution_id, created_at desc);
create index if not exists portal_signup_sales_attribution_events_qori_business_id_idx on portal_signup_sales_attribution_events (qori_business_id, created_at desc);
create index if not exists portal_signup_sales_attribution_events_previous_seller_idx on portal_signup_sales_attribution_events (previous_seller_user_id);
create index if not exists portal_signup_sales_attribution_events_next_seller_idx on portal_signup_sales_attribution_events (next_seller_user_id);
create index if not exists portal_signup_sales_attribution_events_actor_idx on portal_signup_sales_attribution_events (actor_user_id);

create or replace function prevent_signup_attribution_event_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'portal signup attribution events are append-only';
end;
$$;
drop trigger if exists trg_portal_signup_sales_attribution_events_append_only on portal_signup_sales_attribution_events;
create trigger trg_portal_signup_sales_attribution_events_append_only
before update or delete on portal_signup_sales_attribution_events
for each row execute function prevent_signup_attribution_event_mutation();
drop trigger if exists trg_business_seller_activity_events_append_only on business_seller_activity_events;
create trigger trg_business_seller_activity_events_append_only
before update or delete on business_seller_activity_events
for each row execute function prevent_signup_attribution_event_mutation();

alter table business_sales add column if not exists created_by_user_id uuid references app_users(id) on delete set null;
create index if not exists business_sales_created_by_user_id_idx on business_sales (created_by_user_id);
create index if not exists business_sales_business_seller_paid_idx
  on business_sales (business_id, seller_user_id, paid_at desc, created_at desc)
  where seller_user_id is not null and sale_status = 'PAID';

drop trigger if exists trg_business_seller_profiles_updated_at on business_seller_profiles;
create trigger trg_business_seller_profiles_updated_at before update on business_seller_profiles for each row execute function set_updated_at();
drop trigger if exists trg_business_seller_goals_updated_at on business_seller_goals;
create trigger trg_business_seller_goals_updated_at before update on business_seller_goals for each row execute function set_updated_at();
drop trigger if exists trg_portal_signup_sales_attributions_updated_at on portal_signup_sales_attributions;
create trigger trg_portal_signup_sales_attributions_updated_at before update on portal_signup_sales_attributions for each row execute function set_updated_at();

alter table business_seller_profiles enable row level security;
alter table business_seller_goals enable row level security;
alter table business_seller_activity_events enable row level security;
alter table portal_signup_sales_attributions enable row level security;
alter table portal_signup_sales_attribution_events enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table business_seller_profiles, business_seller_goals, business_seller_activity_events, portal_signup_sales_attributions, portal_signup_sales_attribution_events from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table business_seller_profiles, business_seller_goals, business_seller_activity_events, portal_signup_sales_attributions, portal_signup_sales_attribution_events from authenticated';
  end if;
end $$;
