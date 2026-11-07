-- Pensé en ti and Gana con Qori. All private records are server-only.
create table public.qori_free_enrollments (
 document_key text primary key, business_id uuid not null unique references public.businesses(id),
 created_at timestamptz not null default now()
);
create table public.qori_seller_applications (
 user_id uuid primary key references public.app_users(id),
 document_key text not null unique, phone text not null, city text not null,
 ciiu text not null check(ciiu ~ '^[0-9]{4}$'),
 status text not null default 'DRAFT' check(status in ('DRAFT','SUBMITTED','CHANGES_REQUESTED','APPROVED','REJECTED','SUSPENDED')),
 terms_version text not null, accepted_at timestamptz not null default now(), accepted_ip text,
 reviewed_by uuid references public.app_users(id), reviewed_at timestamptz, review_note text,
 submitted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.qori_seller_documents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.qori_seller_applications(user_id),
 kind text not null check(kind in ('IDENTITY','RUT','BANK','CONTRACT')),
 filename text not null, mime_type text not null, byte_size integer not null check(byte_size between 1 and 8388608),
 sha256 text not null, encrypted_content bytea not null, created_at timestamptz not null default now(),
 unique(user_id,kind)
);
create table public.qori_seller_payouts (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.app_users(id),
 request_id uuid not null unique, gross_cop numeric(14,2) not null check(gross_cop>0),
 withholding_cop numeric(14,2) not null default 0 check(withholding_cop>=0 and withholding_cop<gross_cop),
 net_cop numeric(14,2) generated always as (gross_cop-withholding_cop) stored,
 transfer_reference text not null unique, paid_on date not null check(extract(isodow from paid_on)=4),
 recorded_by uuid not null references public.app_users(id), created_at timestamptz not null default now()
);
create table public.qori_seller_commissions (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.app_users(id),
 business_id uuid not null references public.businesses(id), order_id uuid not null references public.qr_credit_purchase_orders(id),
 kind text not null check(kind in ('TICKETS','SUBSCRIPTION','REVERSAL')),
 base_cop numeric(14,2) not null, rate numeric(5,4) not null default 0.10 check(rate=0.10),
 amount_cop numeric(14,2) not null, status text not null default 'PENDING' check(status in ('PENDING','PAID','VOID')),
 due_on date not null, payout_id uuid references public.qori_seller_payouts(id),
 created_at timestamptz not null default now(), unique(order_id,kind),
 check((status='PAID')=(payout_id is not null)), check(amount_cop=round(base_cop*rate,2))
);
alter table public.qr_credit_purchase_orders add column commission_seller_id uuid references public.app_users(id);
alter table public.business_qr_credit_accounts add column included_balance integer not null default 0 check(included_balance>=0);
alter table public.business_qr_credit_accounts add column included_period_key text;
-- Recover identifiable historical welcome balances, consuming included credits first.
-- Unknown/manual balances are preserved, never guessed to be expiring allowances.
with welcome as (
 select b.id,(b.settings->'subscription'->>'firstSubscriptionCourtesyTicketsQuantity')::integer quantity,
 (b.settings->'subscription'->>'firstSubscriptionCourtesyTicketsGrantedAt')::timestamptz granted_at
 from public.businesses b
 where b.settings->'subscription'->>'firstSubscriptionCourtesyTicketsQuantity' ~ '^[0-9]{1,8}$'
 and b.settings->'subscription'->>'firstSubscriptionCourtesyTicketsGrantedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
), remaining as (
 select w.id,greatest(0,w.quantity+coalesce(sum(l.delta_qr) filter(where l.delta_qr<0),0))::integer balance
 from welcome w left join public.business_qr_credit_ledger l on l.business_id=w.id and l.created_at>=w.granted_at
 group by w.id,w.quantity
)
update public.business_qr_credit_accounts a set included_balance=least(a.qr_balance,r.balance),included_period_key='LEGACY_WELCOME'
from remaining r where r.id=a.business_id;
-- Independent issuing capacity: five welcome Gift Cards, then purchased capacity.
create table public.qori_giftcard_credit_accounts (
 business_id uuid primary key references public.businesses(id), balance integer not null default 5 check(balance>=0),
 purchased integer not null default 0 check(purchased>=0), used integer not null default 0 check(used>=0)
);
create index qori_seller_applications_queue on public.qori_seller_applications(status,created_at);
create index qori_seller_applications_reviewer on public.qori_seller_applications(reviewed_by);
create index qori_seller_commissions_balance on public.qori_seller_commissions(seller_id,status,due_on);
create index qori_seller_commissions_business on public.qori_seller_commissions(business_id);
create index qori_seller_commissions_payout on public.qori_seller_commissions(payout_id);
create index qori_seller_payouts_seller on public.qori_seller_payouts(seller_id,created_at);
create index qori_seller_payouts_actor on public.qori_seller_payouts(recorded_by);
create index qr_credit_orders_commission_seller on public.qr_credit_purchase_orders(commission_seller_id);

-- Freeze ownership when checkout is created, never from a client-supplied seller.
create function public.qori_snapshot_commission_seller() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.commission_seller_id := (select a.seller_id from public.qori_sales_accounts a join public.app_users u on u.id=a.seller_id
    left join public.qori_seller_applications s on s.user_id=u.id
    where a.business_id=new.business_id and u.is_active and (s.user_id is null or s.status='APPROVED'));
 elsif new.commission_seller_id is distinct from old.commission_seller_id then
  raise exception 'La atribución de una orden no puede modificarse.';
 end if;
 return new;
end $$;
create trigger qori_order_seller_snapshot before insert or update of commission_seller_id on public.qr_credit_purchase_orders
 for each row execute function public.qori_snapshot_commission_seller();

-- Payment rows are updated only after the payment provider has been verified.
create function public.qori_accrue_commission() returns trigger language plpgsql set search_path='' as $$
declare commission_kind text; localday date := (now() at time zone 'America/Bogota')::date; due date;
begin
 if new.commission_seller_id is null then return new; end if;
 due := localday + (case when extract(isodow from localday)::integer < 4 then 4-extract(isodow from localday)::integer else 11-extract(isodow from localday)::integer end);
 commission_kind := case when new.metadata->'signup'->>'type' in ('portal_monthly_subscription','portal_annual_subscription','portal_monthly_subscription_auto_renewal') then 'SUBSCRIPTION' when new.package_code like 'QR%' then 'TICKETS' else null end;
 if new.status='APPROVED' and new.credited_at is not null and old.credited_at is null and new.price_cop>0 and commission_kind is not null then
  insert into public.qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,amount_cop,due_on)
   values(new.commission_seller_id,new.business_id,new.id,commission_kind,new.price_cop,round(new.price_cop*0.10,2),due) on conflict do nothing;
 end if;
 if new.status in ('CANCELLED','REJECTED') and old.credited_at is not null then
  update public.qori_seller_commissions set status='VOID' where order_id=new.id and status='PENDING' and kind<>'REVERSAL';
  insert into public.qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,amount_cop,due_on)
    select seller_id,business_id,order_id,'REVERSAL',-base_cop,-amount_cop,due from public.qori_seller_commissions
    where order_id=new.id and status='PAID' and kind<>'REVERSAL' on conflict do nothing;
 end if;
 return new;
end $$;
create trigger qori_payment_commission after update of status,credited_at on public.qr_credit_purchase_orders
 for each row execute function public.qori_accrue_commission();

-- Enforce the free-plan inventory cap across every writer, including imports.
create function public.qori_free_product_capacity() returns trigger language plpgsql set search_path='' as $$
declare plan text;
begin
 if tg_op='UPDATE' and new.business_id=old.business_id and (old.status<>'DELETED' or new.status='DELETED') then return new; end if;
 select plan_code into plan from public.businesses where id=new.business_id for update;
 if plan='PENSE_EN_TI' and new.status<>'DELETED' and (select count(*) from public.business_inventory_products where business_id=new.business_id and status<>'DELETED' and id<>new.id)>=5 then
  raise exception using errcode='P0001',message='Pensé en ti permite hasta 5 productos. Mejora tu plan para ampliar el inventario.';
 end if;
 return new;
end $$;
create trigger qori_free_product_capacity before insert or update of business_id,status on public.business_inventory_products
 for each row execute function public.qori_free_product_capacity();

do $$ declare t text; r text; begin
 foreach t in array array['qori_free_enrollments','qori_seller_applications','qori_seller_documents','qori_seller_commissions','qori_seller_payouts','qori_giftcard_credit_accounts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;
revoke all on function public.qori_snapshot_commission_seller(),public.qori_accrue_commission(),public.qori_free_product_capacity() from public;
