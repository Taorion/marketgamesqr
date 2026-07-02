create table if not exists public_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  message text not null,
  source_url text,
  ip_address text,
  user_agent text,
  mail_delivery_status text not null default 'PENDING' check (mail_delivery_status in ('PENDING', 'SENT', 'ERROR')),
  mail_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_contact_messages_created on public_contact_messages(created_at desc);
create index if not exists idx_public_contact_messages_mail_status on public_contact_messages(mail_delivery_status, created_at desc);
