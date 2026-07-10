alter table campaign_manual_contacts
  add column if not exists channel text,
  add column if not exists acquisition_source text;

create index if not exists idx_campaign_manual_contacts_channel
  on campaign_manual_contacts(business_id, campaign_id, status, channel);
