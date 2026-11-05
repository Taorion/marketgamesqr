alter table public.customer_accounts
 add column document_locked_at timestamptz,
 add column document_review_required boolean not null default false,
 add column benefit_recovery_completed_at timestamptz;

-- Preserve existing identity evidence. Conflicting legacy documents require review;
-- this migration neither removes benefits nor guesses which document is correct.
with evidence as (
 select id customer_id,declared_document_key document_key from public.customer_accounts where declared_document_key is not null
 union select customer_id,document_key from public.customer_recovered_benefits
 union select customer_id,document_key from public.customer_benefit_recovery_runs
 union select customer_id,document_key from public.customer_relationships where state='ACCEPTED'
), grouped as (
 select customer_id,count(distinct document_key) n,min(document_key) document_key from evidence group by customer_id
)
update public.customer_accounts a set
 declared_document_key=coalesce(a.declared_document_key,case when g.n=1 then g.document_key end),
 document_locked_at=now(),document_review_required=g.n>1
from grouped g where g.customer_id=a.id;
with completed as (
 select customer_id,min(created_at) at from (
  select customer_id,created_at from public.customer_recovered_benefits
  union all select customer_id,created_at from public.customer_benefit_recovery_runs where coalesce((result->>'recovered_count')::integer,0)>0
 ) r group by customer_id
)
update public.customer_accounts a set benefit_recovery_completed_at=c.at from completed c where c.customer_id=a.id;
update public.customer_benefit_recovery_challenges set consumed_at=now() where consumed_at is null;

create function public.customer_master_document_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.declared_document_key is not null and new.declared_document_key is distinct from old.declared_document_key then
  raise exception 'Customer master document cannot be changed' using errcode='23514';
 end if;
 if old.benefit_recovery_completed_at is not null and new.benefit_recovery_completed_at is distinct from old.benefit_recovery_completed_at then
  raise exception 'Customer benefit recovery is already complete' using errcode='23514';
 end if;
 if new.declared_document_key is not null then new.document_locked_at=coalesce(old.document_locked_at,new.document_locked_at,now()); end if;
 return new;
end $$;
create trigger customer_master_document_guard before update on public.customer_accounts
 for each row execute function public.customer_master_document_guard();

create function public.customer_recovery_document_guard() returns trigger
language plpgsql set search_path='' as $$
declare master text; review boolean; completed timestamptz;
begin
 select declared_document_key,document_review_required,benefit_recovery_completed_at into master,review,completed
 from public.customer_accounts where id=new.customer_id for update;
 if master is null or master<>new.document_key or review then
  raise exception 'Benefit recovery must use the Customer master document' using errcode='23514';
 end if;
 if tg_table_name='customer_recovered_benefits' and completed is not null then
  raise exception 'Customer benefit recovery is already complete' using errcode='23514';
 end if;
 return new;
end $$;
create trigger customer_recovered_benefits_master before insert or update on public.customer_recovered_benefits
 for each row execute function public.customer_recovery_document_guard();
create trigger customer_recovery_challenges_master before insert on public.customer_benefit_recovery_challenges
 for each row execute function public.customer_recovery_document_guard();
revoke all on function public.customer_master_document_guard() from public;
revoke all on function public.customer_recovery_document_guard() from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   execute format('revoke all on function public.customer_master_document_guard() from %I',r);
   execute format('revoke all on function public.customer_recovery_document_guard() from %I',r);
  end if;
 end loop;
end $$;
