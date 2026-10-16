-- Null preserves the standard seller permissions of existing accounts.
-- Permissions remain private, behind the existing app_users RLS and grants.
alter table public.app_users add column if not exists admin_permissions text[];
