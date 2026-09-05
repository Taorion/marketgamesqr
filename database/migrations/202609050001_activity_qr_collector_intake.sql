with ranked_activity_qr as (
  select
    iar.company_id as business_id,
    case
      when upper(coalesce(iap.source_type, '')) in ('PLAYER', 'MANUAL', 'AFFILIATE')
        then upper(iap.source_type)
      when iap.player_id is not null then 'PLAYER'
      else null
    end as source_type,
    coalesce(iap.source_id, iap.player_id) as source_id,
    iap.player_id as lead_id,
    iar.qr_code_id,
    iar.activation_id,
    ia.activation_type,
    ia.title as activation_name,
    ia.campaign_id,
    iap.id as participant_id,
    row_number() over (
      partition by iar.company_id,
        case
          when upper(coalesce(iap.source_type, '')) in ('PLAYER', 'MANUAL', 'AFFILIATE')
            then upper(iap.source_type)
          when iap.player_id is not null then 'PLAYER'
          else null
        end,
        coalesce(iap.source_id, iap.player_id)
      order by iar.created_at desc, iar.id desc
    ) as position
  from interactive_activation_rewards iar
  join interactive_activation_participants iap
    on iap.id = iar.participant_id
   and iap.company_id = iar.company_id
  join interactive_activations ia
    on ia.id = iar.activation_id
   and ia.company_id = iar.company_id
  where iar.qr_code_id is not null
),
inserted_states as (
  insert into rms_lead_state
    (business_id, source_type, source_id, lead_id, rms_phase, priority,
     recommended_action, last_operation, metadata)
  select
    business_id,
    source_type,
    source_id,
    case when source_type = 'PLAYER' then source_id else lead_id end,
    'recoleccion',
    'MEDIUM',
    'Revisar datos capturados por la actividad y decidir si entra al embudo.',
    'activity_qr_backfill',
    jsonb_build_object(
      'source', 'activity_qr_backfill',
      'qr_code_id', qr_code_id,
      'activation_id', activation_id,
      'activation_type', activation_type,
      'activation_name', activation_name,
      'campaign_id', campaign_id,
      'participant_id', participant_id
    )
  from ranked_activity_qr
  where position = 1
    and source_type is not null
    and source_id is not null
  on conflict (business_id, source_type, source_id) do nothing
  returning business_id, source_type, source_id, lead_id, metadata
)
insert into rms_phase_movements
  (business_id, source_type, source_id, lead_id, from_phase, to_phase, reason, metadata)
select
  business_id,
  source_type,
  source_id,
  lead_id,
  null,
  'recoleccion',
  'Backfill de QR generado por actividad publica.',
  metadata
from inserted_states;
