-- Keep the affiliate role linked to its canonical CRM contact without creating
-- parallel affiliate rows when the same editor action is retried.
create unique index if not exists affiliates_crm_source_unique
  on affiliates (
    business_id,
    (card_metadata->>'crm_source_type'),
    (card_metadata->>'crm_source_id')
  )
  where status <> 'DELETED'
    and coalesce(card_metadata->>'crm_source_type', '') in ('PLAYER', 'MANUAL')
    and coalesce(card_metadata->>'crm_source_id', '') <> '';
