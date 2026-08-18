-- Adjuntos compartidos durante Negociacion. Cada token es publico solo para
-- descargar un archivo concreto; el archivo sigue perteneciendo al negocio.
create table if not exists rms_negotiation_attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text not null check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid not null,
  lead_id uuid,
  negotiation_note_id uuid not null references lead_notes(id) on delete cascade,
  asset_id uuid not null references digital_assets(id) on delete restrict,
  public_token text not null unique,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  open_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (business_id, source_type, source_id, negotiation_note_id, asset_id)
);

create index if not exists idx_rms_negotiation_attachments_source
  on rms_negotiation_attachments (business_id, source_type, source_id, created_at desc);

create index if not exists idx_rms_negotiation_attachments_token
  on rms_negotiation_attachments (public_token);

alter table rms_negotiation_attachments enable row level security;
