create table if not exists smart_catalogs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  brand_name text,
  brand_logo_url text,
  cover_image_url text,
  whatsapp_number text not null,
  default_cta_label text not null default 'Ordenar por WhatsApp',
  theme_color text not null default '#0f7354',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
  linked_campaign_id uuid references campaigns(id) on delete set null,
  linked_activation_id uuid references interactive_activations(id) on delete set null,
  linked_lead_capture_id uuid references lead_capture_activations(id) on delete set null,
  linked_reward_id uuid references rewards(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug),
  unique (slug)
);

create table if not exists smart_catalog_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  catalog_id uuid not null references smart_catalogs(id) on delete cascade,
  inventory_product_id uuid references business_inventory_products(id) on delete set null,
  name text not null,
  slug text not null,
  product_type text not null default 'physical' check (product_type in ('physical', 'service', 'combo', 'advisory', 'plan', 'voucher', 'experience')),
  description text,
  short_description text,
  category text,
  price numeric(14, 2),
  compare_at_price numeric(14, 2),
  currency text not null default 'COP',
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  ingredients_or_details text,
  stock_status text not null default 'AVAILABLE' check (stock_status in ('AVAILABLE', 'LIMITED', 'OUT_OF_STOCK', 'HIDDEN')),
  cta_label text not null default 'Ordenar por WhatsApp',
  whatsapp_message_template text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_id, slug)
);

create table if not exists smart_catalog_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  catalog_id uuid not null references smart_catalogs(id) on delete cascade,
  product_id uuid references smart_catalog_products(id) on delete set null,
  lead_id uuid references business_manual_leads(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  activation_id uuid references interactive_activations(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  event_type text not null check (event_type in (
    'catalog_view',
    'product_view',
    'whatsapp_click',
    'info_click',
    'lead_created_from_catalog',
    'post_sale_ticket_sent',
    'post_sale_ticket_claimed',
    'catalog_order_intent',
    'catalog_return_visit'
  )),
  source text,
  channel text,
  partner_id uuid references affiliates(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  partner_name text,
  referral_source text,
  user_agent text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists smart_catalog_order_intents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  catalog_id uuid not null references smart_catalogs(id) on delete cascade,
  product_id uuid references smart_catalog_products(id) on delete set null,
  lead_id uuid references business_manual_leads(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  activation_id uuid references interactive_activations(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  whatsapp_number_sent_to text,
  message_body text not null,
  status text not null default 'INTENT_CREATED' check (status in ('INTENT_CREATED', 'CONTACTED', 'WON', 'LOST', 'POST_SALE_SENT')),
  rms_stage text not null default 'INTENT_DETECTED',
  partner_id uuid references affiliates(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  partner_name text,
  referral_source text,
  commission_status text,
  commission_amount numeric(14, 2),
  sale_amount numeric(14, 2),
  sale_currency text not null default 'COP',
  sale_notes text,
  post_sale_qr_id uuid references qr_codes(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_smart_catalogs_business_status
  on smart_catalogs(business_id, status, updated_at desc);
create index if not exists idx_smart_catalogs_slug
  on smart_catalogs(slug);
create index if not exists idx_smart_catalog_products_business_catalog
  on smart_catalog_products(business_id, catalog_id, display_order asc, updated_at desc);
create index if not exists idx_smart_catalog_products_catalog_status
  on smart_catalog_products(catalog_id, stock_status, display_order asc);
create index if not exists idx_smart_catalog_events_business_created
  on smart_catalog_events(business_id, created_at desc);
create index if not exists idx_smart_catalog_events_catalog_type
  on smart_catalog_events(catalog_id, event_type, created_at desc);
create index if not exists idx_smart_catalog_events_product
  on smart_catalog_events(product_id, created_at desc);
create index if not exists idx_smart_catalog_events_lead
  on smart_catalog_events(lead_id, created_at desc);
create index if not exists idx_smart_catalog_intents_business_status
  on smart_catalog_order_intents(business_id, status, updated_at desc);
create index if not exists idx_smart_catalog_intents_catalog_created
  on smart_catalog_order_intents(catalog_id, created_at desc);
create index if not exists idx_smart_catalog_intents_product_created
  on smart_catalog_order_intents(product_id, created_at desc);
create index if not exists idx_smart_catalog_intents_lead
  on smart_catalog_order_intents(lead_id, created_at desc);

drop trigger if exists trg_smart_catalogs_updated_at on smart_catalogs;
create trigger trg_smart_catalogs_updated_at
before update on smart_catalogs
for each row execute function set_updated_at();

drop trigger if exists trg_smart_catalog_products_updated_at on smart_catalog_products;
create trigger trg_smart_catalog_products_updated_at
before update on smart_catalog_products
for each row execute function set_updated_at();

drop trigger if exists trg_smart_catalog_order_intents_updated_at on smart_catalog_order_intents;
create trigger trg_smart_catalog_order_intents_updated_at
before update on smart_catalog_order_intents
for each row execute function set_updated_at();
