alter table public.customer_goals
 add column goal_type text not null default 'OTHER' check(goal_type in ('TRIP','CAR','HOME','OTHER')),
 add column budget_json jsonb,
 add column target_date date,
 add column monthly_amount numeric(14,2) not null default 0 check(monthly_amount>=0),
 add column priority integer not null default 0,
 add column paused boolean not null default false,
 add column archived boolean not null default false,
 add column revision integer not null default 1,
 add column request_id uuid,
 add column updated_at timestamptz not null default now(),
 add constraint customer_goals_customer_identity unique(customer_id,id),
 add constraint customer_goals_request unique(customer_id,request_id);
create index customer_goals_book_priority on public.customer_goals(customer_id,book_id,priority,created_at) where not archived;
create table public.customer_dream_plans (
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 book_id uuid not null, monthly_amount numeric(14,2) not null default 0 check(monthly_amount>=0),
 revision integer not null default 1, updated_at timestamptz not null default now(),
 primary key(customer_id,book_id),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id) on delete cascade
);
create table public.customer_goal_events (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 goal_id uuid not null,request_id uuid not null,
 previous_amount numeric(14,2) not null check(previous_amount>=0),
 recorded_amount numeric(14,2) not null check(recorded_amount>=0),
 occurred_on date not null,note text not null default '',created_at timestamptz not null default now(),
 unique(customer_id,request_id),
 foreign key(customer_id,goal_id) references public.customer_goals(customer_id,id) on delete cascade
);
create index customer_goal_events_owner on public.customer_goal_events(customer_id,goal_id,created_at);
do $$ declare t text; r text; begin
 foreach t in array array['customer_goals','customer_dream_plans','customer_goal_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;
