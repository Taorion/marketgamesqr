alter table public.customer_recurring
 add column anchor_date date,
 add column generated_until date,
 add column active boolean not null default true,
 add column remind_days integer not null default 3 check(remind_days between 0 and 30),
 add column reminders_enabled boolean not null default true;
update public.customer_recurring r set anchor_date=least(r.next_date,
 (select min(p.due_date) from public.customer_recurring_posts p where p.recurring_id=r.id));
-- Nullable during rolling deploys: the previous server does not send this new column.

create table public.customer_payment_items (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 recurring_id uuid not null references public.customer_recurring(id),
 scheduled_date date not null,
 due_date date not null,
 name text not null,
 currency text not null check(currency in ('COP','USD','EUR')),
 kind text not null check(kind in ('EXPENSE','INCOME')),
 category text not null,
 estimated_amount numeric(14,2) not null check(estimated_amount>0),
 billed_amount numeric(14,2) check(billed_amount>0),
 status text not null default 'PENDING' check(status in ('PENDING','PAID','SKIPPED')),
 entry_id uuid unique references public.customer_entries(id),
 note text not null default '',
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(recurring_id,scheduled_date),
 check((status='PAID')=(entry_id is not null))
);
create index customer_payment_items_owner_due on public.customer_payment_items(customer_id,due_date,id);
create index customer_payment_items_pending on public.customer_payment_items(due_date,customer_id) where status='PENDING';
insert into public.customer_payment_items(customer_id,recurring_id,scheduled_date,due_date,name,currency,kind,category,estimated_amount,status,entry_id)
 select r.customer_id,r.id,p.due_date,p.due_date,r.name,e.currency,e.kind,e.category,e.amount,
 case when e.deleted_at is null then 'PAID' else 'SKIPPED' end,
 case when e.deleted_at is null then e.id end
 from public.customer_recurring_posts p join public.customer_recurring r on r.id=p.recurring_id
 join public.customer_entries e on e.id=p.entry_id;

create table public.customer_payment_changes (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.customer_payment_items(id) on delete cascade,
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 action text not null,
 before_value jsonb not null,
 after_value jsonb not null,
 created_at timestamptz not null default now()
);
create index customer_payment_changes_item on public.customer_payment_changes(item_id,created_at);
create index customer_payment_changes_owner on public.customer_payment_changes(customer_id);
create table public.customer_payment_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 session_id uuid not null references public.customer_sessions(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create index customer_payment_push_owner on public.customer_payment_push_subscriptions(customer_id) where active;
create index customer_payment_push_session on public.customer_payment_push_subscriptions(session_id);
-- Backend-only VAPID identity. Never returned by Customer APIs; survives deploys.
create table public.customer_payment_push_config (
 singleton boolean primary key default true check(singleton),
 public_key text not null,
 private_key text not null,
 created_at timestamptz not null default now()
);
create table public.customer_payment_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.customer_payment_push_subscriptions(id) on delete cascade,
 notice_date date not null,
 sent_at timestamptz,
 attempts integer not null default 0,
 retry_at timestamptz not null default now(),
 lease_until timestamptz,
 lease_token uuid,
 unique(subscription_id,notice_date)
);
create index customer_payment_push_pending on public.customer_payment_push_deliveries(retry_at) where sent_at is null;
do $$ declare t text; r text; begin
 foreach t in array array['customer_payment_items','customer_payment_changes','customer_payment_push_subscriptions','customer_payment_push_deliveries','customer_payment_push_config'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;
