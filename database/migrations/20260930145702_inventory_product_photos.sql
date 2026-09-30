create table if not exists public.business_inventory_product_photos (
  product_id uuid primary key references public.business_inventory_products(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  image_data bytea not null check (octet_length(image_data) between 1 and 500000),
  updated_at timestamptz not null default now()
);
create index if not exists idx_inventory_product_photos_business on public.business_inventory_product_photos(business_id);
alter table public.business_inventory_product_photos enable row level security;
revoke all on public.business_inventory_product_photos from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.business_inventory_product_photos from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.business_inventory_product_photos from authenticated;
  end if;
end $$;
-- Only the authenticated, tenant-scoped backend serves this private photo store.
