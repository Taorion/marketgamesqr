create index if not exists idx_ticket_center_qr_business_created
  on qr_codes(business_id, created_at desc);

create index if not exists idx_ticket_center_qr_business_origin_created
  on qr_codes(business_id, origin_type, created_at desc);

create index if not exists idx_ticket_center_qr_business_batch_status
  on qr_codes(business_id, batch_id, status);

create index if not exists idx_ticket_center_activations_company_status_created
  on interactive_activations(company_id, status, created_at desc);

create index if not exists idx_ticket_center_participants_activation
  on interactive_activation_participants(activation_id);

create index if not exists idx_ticket_center_rewards_activation_status
  on interactive_activation_rewards(activation_id, status);
