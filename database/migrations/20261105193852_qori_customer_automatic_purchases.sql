-- Authorization ledger only: money and product lines remain in business_sales.
alter table public.customer_finance_connections add column auto_capture boolean;
alter table public.customer_finance_connections add column book_id uuid;
alter table public.customer_finance_connections add column capture_consented_at timestamptz;
alter table public.customer_finance_connections add foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id);
create table public.customer_sale_captures (
 sale_id uuid primary key references public.business_sales(id),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 book_id uuid not null,
 created_at timestamptz not null default now(),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id)
);
create index customer_sale_captures_owner on public.customer_sale_captures(customer_id,business_id);
create index customer_sale_captures_book on public.customer_sale_captures(customer_id,book_id);
alter table public.customer_sale_captures enable row level security;
revoke all on public.customer_sale_captures from public;

create function public.customer_capture_authorized_sale() returns trigger language plpgsql set search_path='' as $$
declare buyer record; destination uuid; enabled boolean; existing_owner uuid;
begin
 select customer_id into existing_owner from public.customer_sale_captures where sale_id=new.id;
 if existing_owner is not null then
  if tg_op='UPDATE' and (new.business_id<>old.business_id or regexp_replace(lower(coalesce(new.customer_document_id,'')),'[^a-z0-9]','','g')<>regexp_replace(lower(coalesce(old.customer_document_id,'')),'[^a-z0-9]','','g')) then
   raise exception 'Esta compra ya fue entregada a Customer. Su identidad no puede reasignarse.' using errcode='23514';
  end if;
  return new;
 end if;
 if new.sale_status<>'PAID' or coalesce(new.customer_document_id,'')='' then return new; end if;
 select r.customer_id,a.currency into buyer from public.customer_relationships r join public.customer_accounts a on a.id=r.customer_id
 where r.business_id=new.business_id and r.state='ACCEPTED'
 and r.document_key=regexp_replace(lower(new.customer_document_id),'[^a-z0-9]','','g')
 and not a.document_review_required
 and not exists(select 1 from public.customer_business_blocks bl where bl.customer_id=a.id and bl.business_id=new.business_id)
 for share of r;
 if not found then return new; end if;
 select coalesce(c.auto_capture,true),c.book_id into enabled,destination from public.customer_finance_connections c
 where c.customer_id=buyer.customer_id and c.business_id=new.business_id for share;
 -- Legacy accepted identity connections already included purchases by explicit consent.
 if enabled is false then return new; end if;
 if exists(select 1 from public.customer_sale_deliveries d where d.sale_id=new.id and d.customer_id<>buyer.customer_id)
 or exists(select 1 from public.customer_product_gift_orders g where g.sale_id=new.id and g.buyer_id<>buyer.customer_id) then return new; end if;
 insert into public.customer_finance_books(customer_id,name,currency,is_default) values(buyer.customer_id,'Personal',buyer.currency,true) on conflict(customer_id) where is_default do nothing;
 if destination is null then select id into destination from public.customer_finance_books where customer_id=buyer.customer_id and is_default; end if;
 insert into public.customer_sale_captures(sale_id,customer_id,business_id,book_id) values(new.id,buyer.customer_id,new.business_id,destination) on conflict do nothing;
 if found then
  insert into public.customer_finance_allocations(customer_id,kind,source_id,book_id) values(buyer.customer_id,'SALE',new.id,destination) on conflict do nothing;
  insert into public.customer_benefit_notifications(customer_id,business_id,event_key,kind,title,body,resource_id)
  values(buyer.customer_id,new.business_id,'purchase:'||new.id,'SALE','Compra registrada en tus finanzas','El negocio confirmó el pago. Revisa sus productos y tu comprobante.',new.id) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger customer_automatic_purchase after insert or update of sale_status,customer_document_id,business_id on public.business_sales
for each row execute function public.customer_capture_authorized_sale();
revoke all on function public.customer_capture_authorized_sale() from public;
do $$ declare r text; begin foreach r in array array['anon','authenticated'] loop
 if exists(select 1 from pg_roles where rolname=r) then
 execute format('revoke all on public.customer_sale_captures from %I',r);
 execute format('revoke all on function public.customer_capture_authorized_sale() from %I',r);
 end if; end loop; end $$;
