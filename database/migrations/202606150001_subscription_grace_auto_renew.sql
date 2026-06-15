alter table businesses add column if not exists subscription_auto_renew_enabled boolean not null default false;
alter table businesses add column if not exists subscription_auto_renew_status text not null default 'DISABLED';
alter table businesses add column if not exists mercado_pago_preapproval_id text;
alter table businesses add column if not exists subscription_auto_renew_checkout_url text;
alter table businesses add column if not exists subscription_auto_renew_authorized_at timestamptz;
alter table businesses add column if not exists subscription_auto_renew_cancelled_at timestamptz;

create index if not exists idx_businesses_subscription_due
  on businesses(subscription_current_period_ends_at);

create index if not exists idx_businesses_mp_preapproval
  on businesses(mercado_pago_preapproval_id);
