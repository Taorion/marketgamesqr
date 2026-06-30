create index if not exists idx_portal_players_business_created
  on players(business_id, created_at desc);

create index if not exists idx_portal_players_business_campaign_created
  on players(business_id, campaign_id, created_at desc);

create index if not exists idx_portal_qr_codes_player_created
  on qr_codes(player_id, created_at desc);

create index if not exists idx_portal_questionnaires_player_created
  on questionnaires(player_id, created_at desc);

create index if not exists idx_portal_business_sales_document_created
  on business_sales(business_id, customer_document_id, created_at desc);

create index if not exists idx_portal_business_sales_phone_created
  on business_sales(business_id, customer_phone, created_at desc);

create index if not exists idx_portal_business_sales_email_created
  on business_sales(business_id, customer_email, created_at desc);

create index if not exists idx_portal_redemptions_business_campaign_redeemed
  on redemptions(business_id, campaign_id, redeemed_at desc);

create index if not exists idx_portal_attributed_sales_business_campaign_created
  on attributed_sales(business_id, campaign_id, created_at desc);

create index if not exists idx_portal_campaigns_business_updated
  on campaigns(business_id, updated_at desc);
