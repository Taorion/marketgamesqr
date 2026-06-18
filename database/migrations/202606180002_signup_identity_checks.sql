create index if not exists idx_businesses_settings_nit_normalized
on businesses ((regexp_replace(lower(coalesce(settings->>'nit', '')), '[^a-z0-9]', '', 'g')));

create index if not exists idx_app_users_email_lower on app_users(lower(email));
