alter table if exists affiliates
  add column if not exists seller_user_id uuid references app_users(id) on delete set null;

create index if not exists idx_affiliates_business_seller_created
  on affiliates(business_id, seller_user_id, created_at desc);

update affiliates fa
set seller_user_id = u.id
from app_users u
where fa.seller_user_id is null
  and coalesce(fa.card_metadata->>'commercial_owner_user_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and u.id = (fa.card_metadata->>'commercial_owner_user_id')::uuid
  and u.business_id = fa.business_id
  and u.is_active = true;
