-- Platform permission supplements the existing business role and identity.
alter table public.app_users drop constraint if exists app_users_platform_role_check,
  add constraint app_users_platform_role_check
  check (platform_role in ('QORI_SUPERADMIN', 'QORI_SELLER'));
