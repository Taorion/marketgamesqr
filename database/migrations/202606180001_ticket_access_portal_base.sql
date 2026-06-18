alter table businesses add column if not exists plan_type text;
alter table businesses add column if not exists portal_status text;
alter table businesses add column if not exists portal_activated_at timestamptz;
alter table businesses add column if not exists growth_started_at timestamptz;
alter table businesses add column if not exists growth_expires_at timestamptz;
alter table businesses add column if not exists growth_source text;

create index if not exists idx_businesses_plan_type on businesses(plan_type);
create index if not exists idx_businesses_growth_expires_at on businesses(growth_expires_at);
