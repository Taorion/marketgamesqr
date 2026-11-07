alter table public.customer_product_gift_orders alter column recipient_id drop not null;
alter table public.customer_product_gift_orders drop constraint customer_product_gift_orders_check;
alter table public.customer_product_gift_orders add constraint customer_product_gift_orders_issued_delivery check (
 (state='ISSUED')=(sale_id is not null and qr_code_id is not null)
 and (state<>'ISSUED' or (recipient_id is not null or coalesce(length(snapshot->>'recipient_email'),0)>3))
);
alter table public.customer_product_gift_orders add column receipt_token text not null default encode(gen_random_bytes(32),'hex') unique;
create index customer_product_gifts_pending_email on public.customer_product_gift_orders((snapshot->>'recipient_email')) where state='ISSUED' and invitation_id is null;
create table public.qori_gift_mail_outbox (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.customer_product_gift_orders(id),
 kind text not null check(kind in ('BUYER','RECIPIENT')),recipient text not null,subject text not null,body text not null,
 attempts integer not null default 0,locked_until timestamptz,next_attempt_at timestamptz not null default now(),
 sent_at timestamptz,last_error text,created_at timestamptz not null default now(),unique(order_id,kind)
);
create index qori_gift_mail_queue on public.qori_gift_mail_outbox(next_attempt_at) where sent_at is null and attempts<8;
alter table public.qori_gift_mail_outbox enable row level security;
revoke all on public.qori_gift_mail_outbox from public;
do $$ declare r text; begin foreach r in array array['anon','authenticated'] loop
 if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.qori_gift_mail_outbox from %I',r);end if;
end loop;end $$;
