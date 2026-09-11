-- Fast, tenant-scoped identity resolution for in-person QR redemption.
-- Non-unique by design: legacy conflicts must be surfaced to the operator, never merged silently.
create index if not exists idx_players_business_document_identity
  on players (business_id, (regexp_replace(lower(coalesce(document_id, '')), '[^a-z0-9]', '', 'g')))
  where nullif(regexp_replace(lower(coalesce(document_id, '')), '[^a-z0-9]', '', 'g'), '') is not null;

create index if not exists idx_players_business_email_identity
  on players (business_id, (lower(email)))
  where nullif(email, '') is not null;

create index if not exists idx_players_business_phone_identity
  on players (business_id, (regexp_replace(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '^57([0-9]{10})$', '\1')))
  where nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null;
