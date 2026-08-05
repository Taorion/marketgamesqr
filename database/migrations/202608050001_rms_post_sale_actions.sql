-- Activacion 2 is an operational post-sale action, never a second sale.
-- Every record is tenant-scoped and points to the canonical attributed sale.
create table if not exists rms_post_sale_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_id uuid not null references business_sales(id) on delete restrict,
  source_type text not null check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid not null,
  lead_id uuid,
  action_type text not null check (action_type in (
    'THANK_YOU', 'WARRANTY', 'SURVEY', 'REBUY_TICKET', 'REWARD_PASS',
    'REFERRAL', 'FOLLOW_UP', 'INCIDENT', 'NO_ACTION_NEEDED'
  )),
  status text not null default 'PLANNED' check (status in (
    'PLANNED', 'SCHEDULED', 'ISSUED', 'DELIVERED', 'CLAIMED', 'COMPLETED',
    'REDEEMED', 'EXPIRED', 'CANCELLED', 'NOT_APPLICABLE', 'FAILED'
  )),
  responsible text,
  contact_channel text,
  contact_consent_confirmed boolean not null default false,
  scheduled_for timestamptz,
  completed_at timestamptz,
  content text,
  result_note text,
  evidence text,
  resource_type text,
  resource_id uuid,
  resource_url text,
  campaign_id uuid references campaigns(id) on delete set null,
  product_name text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, idempotency_key)
);

create table if not exists rms_post_sale_action_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  post_sale_action_id uuid not null references rms_post_sale_actions(id) on delete cascade,
  event_type text not null,
  event_description text,
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rms_post_sale_actions_business_status_idx
  on rms_post_sale_actions (business_id, status, updated_at desc);
create index if not exists rms_post_sale_actions_sale_idx
  on rms_post_sale_actions (business_id, sale_id, created_at desc);
create index if not exists rms_post_sale_actions_source_idx
  on rms_post_sale_actions (business_id, source_type, source_id, created_at desc);
create index if not exists rms_post_sale_action_events_action_idx
  on rms_post_sale_action_events (business_id, post_sale_action_id, created_at desc);

alter table reward_passes add column if not exists source_sale_id uuid references business_sales(id) on delete set null;
alter table reward_passes add column if not exists rms_post_sale_action_id uuid references rms_post_sale_actions(id) on delete set null;
create index if not exists reward_passes_source_sale_idx
  on reward_passes (company_id, source_sale_id) where source_sale_id is not null;

drop trigger if exists trg_rms_post_sale_actions_updated_at on rms_post_sale_actions;
create trigger trg_rms_post_sale_actions_updated_at
before update on rms_post_sale_actions
for each row execute function set_updated_at();

alter table rms_post_sale_actions enable row level security;
alter table rms_post_sale_action_events enable row level security;

-- Historical quality screens were persisted as phases. They are now visual-only,
-- so move them once with an auditable movement/event and never leave a case stalled.
with moved as (
  update rms_lead_state s
     set rms_phase = 'postventa', updated_at = now(),
         metadata = s.metadata || jsonb_build_object('quality_control_migration', 'revenue_generado_to_postventa', 'quality_control_2_visual_at', now())
   where s.rms_phase = 'revenue_generado'
     and exists (
       select 1 from business_sales bs
        where bs.business_id = s.business_id and bs.sale_status = 'PAID'
          and ((bs.rms_source_type = s.source_type and bs.rms_source_id = s.source_id)
            or (s.metadata->>'rms_attributed_sale_id' = bs.id::text))
     )
  returning s.business_id, s.source_type, s.source_id, s.lead_id
), movements as (
  insert into rms_phase_movements (business_id, source_type, source_id, lead_id, from_phase, to_phase, reason, metadata)
  select business_id, source_type, source_id, lead_id, 'revenue_generado', 'postventa', 'Migración: Calidad 2 queda solo visual.', jsonb_build_object('migration', '202608050001')
  from moved returning business_id, source_type, source_id, lead_id
)
insert into rms_machine_events (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, metadata)
select business_id, source_type, source_id, lead_id, 'quality_control_visualized', 'Calidad 2 convertida en diagnóstico visual', 'La venta canónica queda operativa en Activación 2.', 'postventa', 'quality_control_2_visual', jsonb_build_object('migration', '202608050001')
from movements;

with moved as (
  update rms_lead_state s
     set rms_phase = 'cierre', updated_at = now(),
         metadata = s.metadata || jsonb_build_object('quality_control_migration', 'revenue_generado_without_sale_to_cierre', 'quality_control_2_visual_at', now())
   where s.rms_phase = 'revenue_generado'
  returning s.business_id, s.source_type, s.source_id, s.lead_id
), movements as (
  insert into rms_phase_movements (business_id, source_type, source_id, lead_id, from_phase, to_phase, reason, metadata)
  select business_id, source_type, source_id, lead_id, 'revenue_generado', 'cierre', 'Migración: no existe venta canónica; volver a Ventas atribuidas.', jsonb_build_object('migration', '202608050001')
  from moved returning business_id, source_type, source_id, lead_id
)
insert into rms_machine_events (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, metadata)
select business_id, source_type, source_id, lead_id, 'quality_control_visualized', 'Calidad 2 sin venta canónica', 'El caso vuelve a Ventas atribuidas para registrar una venta verificable.', 'cierre', 'quality_control_2_visual', jsonb_build_object('migration', '202608050001')
from movements;

with moved as (
  update rms_lead_state s
     set rms_phase = case when coalesce(s.metadata->>'activation_offer_sent_at', s.metadata->>'activation_first_contact_at', '') <> '' then 'procesamiento' else 'clasificacion' end,
         updated_at = now(),
         metadata = s.metadata || jsonb_build_object('quality_control_migration', 'preprocesamiento_to_operational_phase', 'quality_control_1_visual_at', now())
   where s.rms_phase = 'preprocesamiento'
  returning s.business_id, s.source_type, s.source_id, s.lead_id, rms_phase
), movements as (
  insert into rms_phase_movements (business_id, source_type, source_id, lead_id, from_phase, to_phase, reason, metadata)
  select business_id, source_type, source_id, lead_id, 'preprocesamiento', rms_phase, 'Migración: Calidad 1 queda solo visual.', jsonb_build_object('migration', '202608050001')
  from moved returning business_id, source_type, source_id, lead_id, to_phase
)
insert into rms_machine_events (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, metadata)
select business_id, source_type, source_id, lead_id, 'quality_control_visualized', 'Calidad 1 convertida en diagnóstico visual', 'El caso vuelve a su estación operativa según la evidencia de Activación 1.', to_phase, 'quality_control_1_visual', jsonb_build_object('migration', '202608050001')
from movements;
