-- Cash boxes partition a book's existing balance; they do not create expenses.
create table public.customer_cash_boxes (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null, book_id uuid not null,
 request_id uuid not null, name text not null check(length(trim(name)) between 2 and 80),
 opening_amount numeric(14,2) not null default 0, revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(customer_id,request_id), unique(customer_id,book_id,id),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id) on delete cascade
);
create unique index customer_cash_boxes_names on public.customer_cash_boxes(customer_id,book_id,lower(trim(name)));
create table public.customer_cash_allocations (
 customer_id uuid not null, book_id uuid not null, kind text not null check(kind in ('ENTRY','SALE','GIFT')),
 source_id uuid not null, cash_box_id uuid not null, revision integer not null default 1,
 updated_at timestamptz not null default now(), primary key(customer_id,kind,source_id),
 foreign key(customer_id,book_id,cash_box_id) references public.customer_cash_boxes(customer_id,book_id,id) on delete cascade
);
create index customer_cash_allocations_box on public.customer_cash_allocations(customer_id,book_id,cash_box_id);
create table public.customer_cash_transfers (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null,book_id uuid not null,request_id uuid not null,
 from_box_id uuid,to_box_id uuid,amount numeric(14,2) not null check(amount>0),occurred_on date not null,
 note text not null default '' check(length(note)<=500),voided_at timestamptz,created_at timestamptz not null default now(),
 unique(customer_id,request_id),check(from_box_id is distinct from to_box_id),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id) on delete cascade,
 foreign key(customer_id,book_id,from_box_id) references public.customer_cash_boxes(customer_id,book_id,id),
 foreign key(customer_id,book_id,to_box_id) references public.customer_cash_boxes(customer_id,book_id,id)
);
create index customer_cash_transfers_book on public.customer_cash_transfers(customer_id,book_id,occurred_on,id);
create index customer_cash_transfers_from on public.customer_cash_transfers(customer_id,book_id,from_box_id);
create index customer_cash_transfers_to on public.customer_cash_transfers(customer_id,book_id,to_box_id);
create table public.customer_cash_events (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null,book_id uuid not null,
 action text not null,detail jsonb not null,created_at timestamptz not null default now(),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id) on delete cascade
);
create index customer_cash_events_book on public.customer_cash_events(customer_id,book_id,created_at desc);
alter table public.customer_cash_boxes enable row level security;
alter table public.customer_cash_allocations enable row level security;
alter table public.customer_cash_transfers enable row level security;
alter table public.customer_cash_events enable row level security;
revoke all on public.customer_cash_boxes,public.customer_cash_allocations,public.customer_cash_transfers,public.customer_cash_events from public;
do $$ begin
 if exists(select 1 from pg_roles where rolname='anon') then execute 'revoke all on public.customer_cash_boxes,public.customer_cash_allocations,public.customer_cash_transfers,public.customer_cash_events from anon'; end if;
 if exists(select 1 from pg_roles where rolname='authenticated') then execute 'revoke all on public.customer_cash_boxes,public.customer_cash_allocations,public.customer_cash_transfers,public.customer_cash_events from authenticated'; end if;
end $$;
