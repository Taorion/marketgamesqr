-- Product names and IDs are snapshotted, so historical cards survive catalog edits.
alter table public.stamp_programs add column purchase_product jsonb;
alter table public.stamp_programs add constraint stamp_program_purchase_product_check
  check (purchase_product is null or (
    jsonb_typeof(purchase_product)='object'
    and coalesce(purchase_product->>'inventory_product_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and length(coalesce(purchase_product->>'product_name',''))>0));

create or replace function public.stamp_sale_event() returns trigger language plpgsql set search_path=public as $$
declare m stamp_members%rowtype; c stamp_cycles%rowtype; d text; at_time timestamptz;
  target_product text; product_details_only boolean := false;
begin
  if tg_op='UPDATE' then
    if new.sale_status is distinct from old.sale_status and new.sale_status <> 'PAID' then
      update stamp_events set voided_at=now(),void_reason='Venta anulada o dejó de estar pagada'
      where sale_id=new.id and voided_at is null;
    end if;
    if new.sale_status <> 'PAID' then return new; end if;
    if new.sale_status is not distinct from old.sale_status then
      -- Imports resolve canonical catalog IDs after inserting the paid sale.
      if new.inventory_product_id is not distinct from old.inventory_product_id
        and new.metadata->'products' is not distinct from old.metadata->'products'
        and new.metadata->'line_items' is not distinct from old.metadata->'line_items' then return new; end if;
      product_details_only := true;
    end if;
  end if;
  if new.sale_status <> 'PAID' or new.sale_amount <= 0 then return new; end if;
  d=lower(regexp_replace(coalesce(new.customer_document_id,''),'[^a-zA-Z0-9]','','g'));
  if length(d)<3 then return new; end if;
  at_time=coalesce(new.paid_at,new.created_at);
  for m in select sm.* from stamp_members sm join stamp_programs p on p.id=sm.program_id
    where sm.business_id=new.business_id and sm.document_key=d and p.status='ACTIVE'
    order by sm.id for update of sm
  loop
    select * into c from stamp_cycles where member_id=m.id order by cycle_number desc limit 1 for update;
    if c.id is null or c.claimed_at is not null or c.expires_at<=now() or c.expires_at<=at_time
      or at_time<c.created_at or c.stamps >= (c.rules->>'stamps_required')::integer
      or new.sale_amount < (c.rules->>'minimum_purchase')::numeric then continue; end if;
    target_product=c.rules->'purchase_product'->>'inventory_product_id';
    if product_details_only and target_product is null then continue; end if;
    if target_product is not null then
      if not exists(select 1 from business_inventory_products where id=target_product::uuid and business_id=new.business_id)
        then continue; end if;
      if not (coalesce(new.inventory_product_id::text=target_product and new.quantity>0,false)
        or exists (
          select 1 from jsonb_array_elements(
            case when jsonb_typeof(new.metadata->'products')='array' then new.metadata->'products' else '[]'::jsonb end
            || case when jsonb_typeof(new.metadata->'line_items')='array' then new.metadata->'line_items' else '[]'::jsonb end
          ) item
          where item->>'inventory_product_id'=target_product
            and case when jsonb_typeof(item->'quantity')='number' then (item->>'quantity')::numeric>0 else false end
            and case when jsonb_typeof(item->'unit_price')='number' then (item->>'unit_price')::numeric>0 else false end
        )) then continue; end if;
    end if;
    insert into stamp_events (business_id,member_id,cycle_id,source,source_key,sale_id,sale_amount,daily_guard_date,occurred_at,note,actor_id)
    values (m.business_id,m.id,c.id,'SALE','sale:'||new.id,new.id,new.sale_amount,
      case when (c.rules->>'one_per_day')::boolean then (at_time at time zone 'America/Bogota')::date end,
      at_time,case when target_product is null then 'Compra pagada' else 'Compra de '||(c.rules->'purchase_product'->>'product_name') end,
      new.seller_user_id) on conflict do nothing;
  end loop;
  return new;
end $$;
drop trigger stamp_sale_event_trigger on public.business_sales;
create trigger stamp_sale_event_trigger after insert or update of sale_status,inventory_product_id,metadata on public.business_sales
for each row execute function public.stamp_sale_event();
revoke all on function public.stamp_sale_event() from public;
