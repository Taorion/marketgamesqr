create index if not exists idx_qr_codes_rms_risk_idempotency
  on qr_codes(business_id, (metadata->>'rms_risk_resource_idempotency_key'))
  where metadata ? 'rms_risk_resource_idempotency_key';
