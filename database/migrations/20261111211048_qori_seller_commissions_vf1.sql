-- Prospective VF1 policy. Existing businesses and accrued entries retain LEGACY_10.
create table public.qori_seller_commission_policy (
 version text primary key, effective_at timestamptz not null default now(),
 base_mode text not null check(base_mode='FIXED_TABLE'), scope text not null check(scope='NEW_BUSINESSES'),
 ticket_rate numeric(5,4) not null check(ticket_rate=0.10)
);
insert into public.qori_seller_commission_policy(version,base_mode,scope,ticket_rate)
 values('QORI_2026_VF1','FIXED_TABLE','NEW_BUSINESSES',0.10);
create table public.qori_seller_commission_programs (
 business_id uuid primary key references public.businesses(id), policy_version text not null check(policy_version in ('LEGACY_10','QORI_2026_VF1')),
 starts_on date not null, created_at timestamptz not null default now()
);
alter table public.qori_seller_commissions
 add column policy_version text not null default 'LEGACY_10' check(policy_version in ('LEGACY_10','QORI_2026_VF1')),
 add column commission_month smallint not null default 0 check(commission_month between 0 and 6),
 add column plan_code text, add column earned_on date, add column coverage_ends_on date, add column reversed_at timestamptz;
alter table public.qori_seller_commissions drop constraint qori_seller_commissions_rate_check;
alter table public.qori_seller_commissions add constraint qori_seller_commission_rate_range check(rate>0 and rate<=1);
alter table public.qori_seller_commissions drop constraint qori_seller_commissions_status_check;
alter table public.qori_seller_commissions add constraint qori_seller_commission_status check(status in ('SCHEDULED','PENDING','PAID','VOID'));
alter table public.qori_seller_commissions drop constraint qori_seller_commissions_order_id_kind_key;
alter table public.qori_seller_commissions add constraint qori_seller_commission_order_month unique(order_id,kind,commission_month);
alter table public.qori_seller_commissions add constraint qori_seller_commission_vf1_month check(policy_version<>'QORI_2026_VF1' or (commission_month between 1 and 6 and earned_on is not null and coverage_ends_on>earned_on));
create unique index qori_seller_one_subscription_month on public.qori_seller_commissions(business_id,commission_month)
 where policy_version='QORI_2026_VF1' and kind='SUBSCRIPTION' and status<>'VOID' and reversed_at is null;
create index qori_seller_scheduled_commissions on public.qori_seller_commissions(earned_on,business_id) where status='SCHEDULED';

create function public.qori_seller_next_thursday(p_day date) returns date language sql immutable set search_path='' as $$
 select p_day+(case when extract(isodow from p_day)::int<4 then 4-extract(isodow from p_day)::int else 11-extract(isodow from p_day)::int end)
$$;
create function public.qori_seller_commission_boundary(p_start date,p_months integer) returns date language plpgsql immutable set search_path='' as $$
declare boundary date := p_start; i integer;
begin
 for i in 1..p_months loop boundary := (boundary+interval '1 month')::date; end loop;
 return boundary;
end $$;
create function public.qori_seller_commission_month(p_start date,p_day date) returns integer language plpgsql immutable set search_path='' as $$
declare i integer; boundary date := p_start; next_boundary date;
begin
 for i in 1..6 loop
  next_boundary := (boundary+interval '1 month')::date;
  if p_day >= boundary and p_day < next_boundary then return i; end if;
  boundary := next_boundary;
 end loop;
 return 0;
end $$;
create function public.qori_seller_vf1_rate(p_plan text,p_month integer) returns numeric language sql immutable set search_path='' as $$
 select case when p_month not between 1 and 6 then 0
 when p_plan='DESPEGA' then case when p_month=1 then 1.00 else 0.10 end
 when p_plan in ('STARTER','GROWTH','PRO') then (array[0.50,0.25,0.25,0.20,0.15,0.10]::numeric[])[p_month] else 0 end
$$;
create function public.qori_seller_vf1_base(p_plan text) returns numeric language sql immutable set search_path='' as $$
 select case p_plan when 'DESPEGA' then 75000 when 'STARTER' then 229000 when 'GROWTH' then 999000 when 'PRO' then 1999000 else 0 end
$$;

create or replace function public.qori_accrue_commission() returns trigger language plpgsql set search_path='' as $$
declare k text; localday date := (now() at time zone 'America/Bogota')::date; due date;
 cohort text; program public.qori_seller_commission_programs%rowtype; start_day date; earned date; finish date;
 plan text; months integer; i integer; ordinal integer; pct numeric; amount_base numeric;
begin
 due := public.qori_seller_next_thursday(localday);
 k := case when new.metadata->'signup'->>'type' in ('portal_monthly_subscription','portal_annual_subscription','portal_monthly_subscription_auto_renewal') then 'SUBSCRIPTION' when new.package_code like 'QR%' then 'TICKETS' else null end;
 if new.status='APPROVED' and new.credited_at is not null and old.credited_at is null and new.price_cop>0 and k is not null then
  if k='TICKETS' then
   if new.commission_seller_id is null then return new; end if;
   insert into public.qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,rate,amount_cop,due_on)
    values(new.commission_seller_id,new.business_id,new.id,k,new.price_cop,0.10,round(new.price_cop*0.10,2),due) on conflict do nothing;
  else
   -- Serialize all subscription payments for one business; its six-month clock never resets on reassignment or upgrade.
   perform pg_advisory_xact_lock(hashtext('seller-program:'||new.business_id::text));
   select case when b.created_at>=p.effective_at then 'QORI_2026_VF1' else 'LEGACY_10' end into cohort
    from public.businesses b cross join public.qori_seller_commission_policy p where b.id=new.business_id and p.version='QORI_2026_VF1';
   plan := coalesce(new.metadata->'signup'->>'plan_code',new.package_code);
   amount_base := public.qori_seller_vf1_base(plan);
   if cohort='QORI_2026_VF1' and amount_base=0 then return new; end if;
   start_day := coalesce((new.metadata->'commission_period'->>'starts_at')::timestamptz,new.credited_at) at time zone 'America/Bogota';
   insert into public.qori_seller_commission_programs(business_id,policy_version,starts_on) values(new.business_id,cohort,start_day) on conflict do nothing;
   select * into program from public.qori_seller_commission_programs where business_id=new.business_id;
   -- Record the client's first paid period even without an assigned seller.
   if new.commission_seller_id is null then return new; end if;
   if program.policy_version='LEGACY_10' then
    insert into public.qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,rate,amount_cop,due_on)
     values(new.commission_seller_id,new.business_id,new.id,k,new.price_cop,0.10,round(new.price_cop*0.10,2),due) on conflict do nothing;
   else
    months := case when new.metadata->'signup'->>'type'='portal_annual_subscription' or new.metadata->'signup'->>'billing_cycle'='annual' then 12 else 1 end;
    if amount_base>0 then
     for i in 0..least(months-1,5) loop
      earned := public.qori_seller_commission_boundary(start_day,i);
      finish := public.qori_seller_commission_boundary(start_day,i+1);
      ordinal := public.qori_seller_commission_month(program.starts_on,earned);
      pct := public.qori_seller_vf1_rate(plan,ordinal);
      if pct>0 then
       insert into public.qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,rate,amount_cop,due_on,status,policy_version,commission_month,plan_code,earned_on,coverage_ends_on)
        values(new.commission_seller_id,new.business_id,new.id,'SUBSCRIPTION',amount_base,pct,round(amount_base*pct,2),public.qori_seller_next_thursday(greatest(earned,localday)),'SCHEDULED','QORI_2026_VF1',ordinal,plan,earned,finish)
        on conflict do nothing;
      end if;
     end loop;
    end if;
   end if;
  end if;
 end if;
 if new.status in ('CANCELLED','REJECTED') and old.credited_at is not null then
  update public.qori_seller_commissions set status='VOID',reversed_at=now() where order_id=new.id and status in ('PENDING','SCHEDULED') and kind<>'REVERSAL';
  update public.qori_seller_commissions set reversed_at=coalesce(reversed_at,now()) where order_id=new.id and status='PAID' and kind<>'REVERSAL';
  insert into public.qori_seller_commissions(seller_id,business_id,order_id,kind,base_cop,rate,amount_cop,due_on,policy_version,commission_month,plan_code,earned_on,coverage_ends_on)
   select seller_id,business_id,order_id,'REVERSAL',-base_cop,rate,-amount_cop,due,policy_version,commission_month,plan_code,earned_on,coverage_ends_on
    from public.qori_seller_commissions where order_id=new.id and status='PAID' and kind<>'REVERSAL' on conflict do nothing;
 end if;
 return new;
end $$;

create function public.qori_release_seller_commissions(p_business uuid default null,p_at timestamptz default now()) returns integer language plpgsql set search_path='' as $$
declare affected integer; day date := (p_at at time zone 'America/Bogota')::date;
begin
 -- A future annual installment is not an earned balance. Release only against an active, paid subscription.
 with eligible as (
  select c.id from public.qori_seller_commissions c join public.businesses b on b.id=c.business_id join public.qr_credit_purchase_orders o on o.id=c.order_id
   where c.status='SCHEDULED' and c.earned_on<=day and (p_business is null or c.business_id=p_business)
    and c.coverage_ends_on>day and b.is_active and b.subscription_status='ACTIVE' and b.subscription_current_period_ends_at>p_at
    and o.status='APPROVED' and o.credited_at is not null and o.price_cop>0
   for update of c skip locked
 ) update public.qori_seller_commissions c set status='PENDING',due_on=public.qori_seller_next_thursday(day) from eligible e where c.id=e.id;
 get diagnostics affected=row_count;
 update public.qori_seller_commissions set status='VOID' where status='SCHEDULED' and coverage_ends_on<=day and (p_business is null or business_id=p_business);
 return affected;
end $$;

do $$ declare t text; r text; begin
 foreach t in array array['qori_seller_commission_policy','qori_seller_commission_programs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;
revoke all on function public.qori_seller_next_thursday(date),public.qori_seller_commission_boundary(date,integer),public.qori_seller_commission_month(date,date),public.qori_seller_vf1_rate(text,integer),public.qori_seller_vf1_base(text),public.qori_release_seller_commissions(uuid,timestamptz) from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   execute format('revoke all on function public.qori_seller_next_thursday(date),public.qori_seller_commission_boundary(date,integer),public.qori_seller_commission_month(date,date),public.qori_seller_vf1_rate(text,integer),public.qori_seller_vf1_base(text),public.qori_release_seller_commissions(uuid,timestamptz) from %I',r);
  end if;
 end loop;
end $$;
