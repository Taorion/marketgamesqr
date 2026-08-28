-- Responsabilidad comercial y atribucion historica por vendedor.
-- El contacto conserva su responsable actual; cada participacion conserva
-- el vendedor que tenia la activacion cuando se origino la interaccion.

alter table players
  add column if not exists seller_user_id uuid references app_users(id) on delete set null;

alter table business_manual_leads
  add column if not exists seller_user_id uuid references app_users(id) on delete set null;

alter table interactive_activations
  add column if not exists seller_user_id uuid references app_users(id) on delete set null;

alter table interactive_activation_participants
  add column if not exists seller_user_id uuid references app_users(id) on delete set null;

create index if not exists idx_players_business_seller_created
  on players(business_id, seller_user_id, created_at desc);

create index if not exists idx_manual_leads_business_seller_created
  on business_manual_leads(business_id, seller_user_id, created_at desc);

create index if not exists idx_interactive_activations_company_seller_created
  on interactive_activations(company_id, seller_user_id, created_at desc);

create index if not exists idx_interactive_participants_company_seller_created
  on interactive_activation_participants(company_id, seller_user_id, created_at desc);

-- Convierte la asignacion que ya existia en metadata a una dimension indexada,
-- solamente cuando el usuario sigue perteneciendo al mismo negocio.
update business_manual_leads ml
set seller_user_id = u.id
from app_users u
where ml.seller_user_id is null
  and ml.metadata->>'commercial_owner_user_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and u.id = (ml.metadata->>'commercial_owner_user_id')::uuid
  and u.business_id = ml.business_id;

update players p
set seller_user_id = u.id
from app_users u
where p.seller_user_id is null
  and p.metadata->>'commercial_owner_user_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and u.id = (p.metadata->>'commercial_owner_user_id')::uuid
  and u.business_id = p.business_id;

-- Las participaciones son la fuente historica: nunca se sobrescribe una
-- atribucion ya registrada.
update interactive_activation_participants iap
set seller_user_id = ia.seller_user_id
from interactive_activations ia
where iap.activation_id = ia.id
  and iap.company_id = ia.company_id
  and iap.seller_user_id is null
  and ia.seller_user_id is not null;

-- La activacion entrega el lead al vendedor solo si el contacto no tenia ya
-- un responsable explicito.
update players p
set seller_user_id = iap.seller_user_id
from interactive_activation_participants iap
where p.id = iap.player_id
  and p.business_id = iap.company_id
  and p.seller_user_id is null
  and iap.seller_user_id is not null;

update business_manual_leads ml
set seller_user_id = iap.seller_user_id
from interactive_activation_participants iap
where ml.id = iap.source_id
  and iap.source_type = 'MANUAL'
  and ml.business_id = iap.company_id
  and ml.seller_user_id is null
  and iap.seller_user_id is not null;
