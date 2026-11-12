-- Supabase default privileges may grant these roles EXECUTE directly,
-- independently of PUBLIC. Quota triggers are server-only implementation details.
do $$
declare client_role text;
begin
 foreach client_role in array array['anon','authenticated'] loop
  if exists(select 1 from pg_catalog.pg_roles where rolname=client_role) then
   execute format('revoke all on function public.qori_free_product_capacity() from %I',client_role);
   execute format('revoke all on function public.qori_free_activation_capacity() from %I',client_role);
   execute format('revoke all on function public.qori_free_stamp_capacity() from %I',client_role);
  end if;
 end loop;
end $$;
