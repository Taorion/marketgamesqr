-- Each new stamp requires an authenticated, explicit confirmation.
-- Retain reversal of historical SALE stamps without issuing new ones.
create or replace function public.stamp_sale_event() returns trigger
language plpgsql set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if new.sale_status is distinct from old.sale_status and new.sale_status <> 'PAID' then
      update stamp_events set voided_at=now(),void_reason='Venta anulada o dejó de estar pagada'
      where sale_id=new.id and voided_at is null;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.stamp_sale_event() from public;
alter table public.stamp_programs alter column allow_manual set default true;
update public.stamp_programs set allow_manual=true,updated_at=now() where allow_manual=false;
comment on column public.stamp_programs.allow_manual is 'Legacy compatibility field. Stamp issuance is always manually confirmed by an authorized business user.';
