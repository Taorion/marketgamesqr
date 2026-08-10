alter table app_users
  add column if not exists deactivated_at timestamptz;

update app_users
set deactivated_at = now()
where is_active = false
  and deactivated_at is null;

create index if not exists idx_app_users_deactivated_cleanup
  on app_users(deactivated_at)
  where is_active = false and deactivated_at is not null;
