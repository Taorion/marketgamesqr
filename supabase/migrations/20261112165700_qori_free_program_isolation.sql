-- Server-only quotas apply to every writer, including imports and concurrent API calls.
-- Existing records are retained. No benefits, balances or customer history are deleted.
create or replace function public.qori_free_product_capacity() returns trigger
language plpgsql set search_path='' as $$
declare plan text; demo boolean;
begin
 if tg_op='UPDATE' and new.business_id=old.business_id and (old.status<>'DELETED' or new.status='DELETED') then return new; end if;
 select plan_code,is_seller_demo into plan,demo from public.businesses where id=new.business_id for update;
 if not coalesce(demo,false) and plan in ('PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS') and new.status<>'DELETED'
 and (select count(*) from public.business_inventory_products where business_id=new.business_id and status<>'DELETED' and id<>new.id)>=5 then
  raise exception using errcode='P0001',message='Programa gratuito: máximo 5 productos registrados. Elimina un producto sin movimientos o elige una suscripción para ampliar el inventario.';
 end if;
 return new;
end $$;

create or replace function public.qori_free_activation_capacity() returns trigger
language plpgsql set search_path='' as $$
declare plan text; demo boolean;
begin
 if tg_op='UPDATE' and new.company_id=old.company_id and (new.status<>'active' or old.status='active') then return new; end if;
 select plan_code,is_seller_demo into plan,demo from public.businesses where id=new.company_id for update;
 if coalesce(demo,false) or plan not in ('PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS') then return new; end if;
 if plan<>'ACTIVACIONES_GRATIS' then
  raise exception using errcode='P0001',message='Programa gratuito: el creador de activaciones no está incluido en este programa.';
 end if;
 if new.status='active' and (select count(*) from public.interactive_activations where company_id=new.company_id and status='active' and id<>new.id)>=2 then
  raise exception using errcode='P0001',message='Programa gratuito: máximo 2 activaciones activas a la vez. Pausa una para activar otra.';
 end if;
 return new;
end $$;
create trigger qori_free_activation_capacity before insert or update of company_id,status
on public.interactive_activations for each row execute function public.qori_free_activation_capacity();

create or replace function public.qori_free_stamp_capacity() returns trigger
language plpgsql set search_path='' as $$
declare plan text; demo boolean;
begin
 if tg_op='UPDATE' and new.business_id=old.business_id and old.deleted_at is null and (new.status<>'ACTIVE' or old.status='ACTIVE') then return new; end if;
 if new.deleted_at is not null then return new; end if;
 select plan_code,is_seller_demo into plan,demo from public.businesses where id=new.business_id for update;
 if coalesce(demo,false) or plan not in ('PENSE_EN_TI','SELLOS_GRATIS','ACTIVACIONES_GRATIS') then return new; end if;
 if plan<>'SELLOS_GRATIS' then
  raise exception using errcode='P0001',message='Programa gratuito: los programas de sellos no están incluidos en este programa.';
 end if;
 if (select count(*) from public.stamp_programs where business_id=new.business_id and deleted_at is null and id<>new.id)>=1 then
  raise exception using errcode='P0001',message='Programa gratuito: máximo 1 programa de sellos. Elige una suscripción para ampliar el cupo.';
 end if;
 return new;
end $$;
create trigger qori_free_stamp_capacity before insert or update of business_id,deleted_at,status
on public.stamp_programs for each row execute function public.qori_free_stamp_capacity();

revoke all on function public.qori_free_product_capacity() from public;
revoke all on function public.qori_free_activation_capacity() from public;
revoke all on function public.qori_free_stamp_capacity() from public;
