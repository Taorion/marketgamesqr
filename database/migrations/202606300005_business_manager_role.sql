do $$ begin
  alter type user_role add value if not exists 'BUSINESS_MANAGER';
exception when duplicate_object then null;
end $$;
