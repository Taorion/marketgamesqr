alter table business_manual_leads
  add column if not exists document_type text;

alter table business_manual_leads
  add column if not exists document_id text;

create index if not exists idx_business_manual_leads_business_document
  on business_manual_leads(business_id, document_id)
  where nullif(document_id, '') is not null;
