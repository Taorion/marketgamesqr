-- Stamp membership is a customer relationship, not proof of a sale.
-- Keep existing CRM identities and their history; do not copy private card tokens.
create function public.qori_ensure_stamp_contact(p_member uuid) returns void
language plpgsql set search_path='' as $$
declare m public.stamp_members%rowtype;
begin
 select * into m from public.stamp_members where id=p_member;
 if not found then return; end if;
 perform pg_advisory_xact_lock(hashtext('validator-beneficiary:'||m.business_id::text||':'||m.document_key));
 if exists(select 1 from public.players p where p.business_id=m.business_id
   and regexp_replace(lower(coalesce(p.document_id,'')), '[^a-z0-9]', '', 'g')=m.document_key)
 or exists(select 1 from public.business_manual_leads ml where ml.business_id=m.business_id
   and regexp_replace(lower(coalesce(ml.document_id,'')), '[^a-z0-9]', '', 'g')=m.document_key)
 or exists(select 1 from public.affiliates a where a.business_id=m.business_id
   and regexp_replace(lower(coalesce(a.document_id,'')), '[^a-z0-9]', '', 'g')=m.document_key)
 then return; end if;
 insert into public.players(business_id,name,document_id,email,phone,created_at,metadata)
 values(m.business_id,m.name,m.document_key,nullif(lower(btrim(m.email)),''),m.phone,m.created_at,
  jsonb_build_object('source','Tarjeta de sellos','capture_source','STAMP_CARD','marketing_consent',false));
end $$;

create function public.qori_stamp_contact_sync() returns trigger
language plpgsql set search_path='' as $$
begin
 perform public.qori_ensure_stamp_contact(new.id);
 return new;
end $$;
create trigger qori_stamp_contact_sync after insert on public.stamp_members
for each row execute function public.qori_stamp_contact_sync();

-- Include existing cardholders, including zero-stamp cards. Archived contacts stay archived.
do $$ declare member_id uuid; begin
 for member_id in select id from public.stamp_members order by business_id,document_key,created_at,id loop
  perform public.qori_ensure_stamp_contact(member_id);
 end loop;
end $$;
revoke all on function public.qori_ensure_stamp_contact(uuid),public.qori_stamp_contact_sync() from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   execute format('revoke all on function public.qori_ensure_stamp_contact(uuid),public.qori_stamp_contact_sync() from %I',r);
  end if;
 end loop;
end $$;
