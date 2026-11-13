-- Logical deletion preserves canonical sales, payments, documents and attribution.
alter table public.businesses add column if not exists archived_at timestamptz;

-- Late payment callbacks may settle balances, but must never reopen a deleted tenant.
create or replace function public.keep_archived_business_inactive()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.archived_at is not null then
    new.is_active := false;
  end if;
  return new;
end;
$$;
revoke all on function public.keep_archived_business_inactive() from public;
create trigger keep_archived_business_inactive
before insert or update on public.businesses
for each row execute function public.keep_archived_business_inactive();
