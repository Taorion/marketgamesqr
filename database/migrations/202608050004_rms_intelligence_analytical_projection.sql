-- Intelligence is an analytical projection. It must never become the physical
-- operating phase of a lead. Existing facts remain in RMS, CRM, sales and
-- post-sale tables; this table only records the analytical linkage.

alter table rms_lead_state
  add column if not exists lifecycle_status text not null default 'ACTIVE';

alter table rms_lead_state
  drop constraint if exists rms_lead_state_lifecycle_status_check;
alter table rms_lead_state
  add constraint rms_lead_state_lifecycle_status_check
  check (lifecycle_status in ('ACTIVE', 'RECYCLED', 'LOST_ANALYZED', 'CYCLE_ANALYZED'));

alter table rms_lead_state
  add column if not exists intelligence_updated_at timestamptz;

create index if not exists rms_lead_state_business_lifecycle_idx
  on rms_lead_state (business_id, lifecycle_status, updated_at desc);

create table if not exists rms_intelligence_case_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text not null check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid not null,
  lead_id uuid,
  sale_id uuid references business_sales(id) on delete set null,
  event_type text not null,
  operational_phase text,
  lifecycle_status text not null default 'ACTIVE'
    check (lifecycle_status in ('ACTIVE', 'RECYCLED', 'LOST_ANALYZED', 'CYCLE_ANALYZED')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, idempotency_key)
);

create index if not exists rms_intelligence_case_events_case_idx
  on rms_intelligence_case_events (business_id, source_type, source_id, created_at desc);
create index if not exists rms_intelligence_case_events_sale_idx
  on rms_intelligence_case_events (business_id, sale_id, created_at desc)
  where sale_id is not null;

alter table rms_intelligence_case_events enable row level security;

-- Historical records could have been physically moved to the old Intelligence
-- pseudo-phase. Restore a real operational location once, with an auditable
-- marker. A sale remains in Postventa; a no-sale legacy record remains closed
-- in its former commercial context instead of being silently reactivated.
with legacy as (
  select s.business_id, s.source_type, s.source_id,
         s.rms_phase as legacy_phase,
         coalesce((
           select m.to_phase
             from rms_phase_movements m
            where m.business_id = s.business_id
              and m.source_type = s.source_type
              and m.source_id = s.source_id
              and m.to_phase not in ('inteligencia', 'preprocesamiento', 'revenue_generado')
            order by m.created_at desc
            limit 1
         ), case when exists (
           select 1 from business_sales bs
            where bs.business_id = s.business_id
              and bs.rms_source_type = s.source_type
              and bs.rms_source_id = s.source_id
         ) then 'postventa' else 'accion_correctiva' end) as restored_phase,
         exists (
           select 1 from business_sales bs
            where bs.business_id = s.business_id
              and bs.rms_source_type = s.source_type
              and bs.rms_source_id = s.source_id
         ) as has_sale
    from rms_lead_state s
   where s.rms_phase = 'inteligencia'
     and coalesce(s.metadata->>'intelligence_phase_migration', '') <> '202608050004'
)
update rms_lead_state s
   set rms_phase = legacy.restored_phase,
       lifecycle_status = case when legacy.has_sale then 'CYCLE_ANALYZED' else 'LOST_ANALYZED' end,
       intelligence_updated_at = now(),
       metadata = coalesce(s.metadata, '{}'::jsonb) || jsonb_build_object(
         'intelligence_phase_migration', '202608050004',
         'intelligence_phase_migration_from', legacy.legacy_phase,
         'intelligence_phase_migration_to', legacy.restored_phase,
         'intelligence_phase_migration_at', now()::text
       ),
       updated_at = now()
  from legacy
 where s.business_id = legacy.business_id
   and s.source_type = legacy.source_type
   and s.source_id = legacy.source_id;

insert into rms_phase_movements
  (business_id, source_type, source_id, lead_id, from_phase, to_phase, reason, metadata)
select s.business_id, s.source_type, s.source_id, s.lead_id,
       'inteligencia', s.rms_phase,
       'Migración segura: Inteligencia deja de ser una fase operativa.',
       jsonb_build_object('migration', '202608050004', 'analytical_only', true)
  from rms_lead_state s
 where s.metadata->>'intelligence_phase_migration' = '202608050004'
   and not exists (
     select 1 from rms_phase_movements m
      where m.business_id = s.business_id and m.source_type = s.source_type and m.source_id = s.source_id
        and m.metadata->>'migration' = '202608050004'
   );

insert into rms_machine_events
  (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, metadata)
select s.business_id, s.source_type, s.source_id, s.lead_id,
       'intelligence_phase_migrated', 'Fase analítica normalizada',
       'El caso conserva su estación operativa; Inteligencia queda como expediente de consulta.',
       s.rms_phase, 'intelligence_projection',
       jsonb_build_object('migration', '202608050004', 'lifecycle_status', s.lifecycle_status)
  from rms_lead_state s
 where s.metadata->>'intelligence_phase_migration' = '202608050004'
   and not exists (
     select 1 from rms_machine_events e
      where e.business_id = s.business_id and e.source_type = s.source_type and e.source_id = s.source_id
        and e.event_type = 'intelligence_phase_migrated'
        and e.metadata->>'migration' = '202608050004'
   );
