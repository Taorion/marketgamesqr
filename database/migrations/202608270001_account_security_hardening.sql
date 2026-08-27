alter table app_users
  add column if not exists password_version integer not null default 0;

create or replace function bump_app_user_password_version()
returns trigger
language plpgsql
as $$
begin
  if new.password_hash is distinct from old.password_hash then
    new.password_version = coalesce(old.password_version, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_app_users_password_version on app_users;
create trigger trg_app_users_password_version
before update of password_hash on app_users
for each row execute function bump_app_user_password_version();

comment on column app_users.password_version is
  'Incrementa al cambiar la contraseña para invalidar JWT emitidos anteriormente.';
