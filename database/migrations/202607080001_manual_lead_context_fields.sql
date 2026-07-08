alter table business_manual_leads
  add column if not exists job_title text,
  add column if not exists importance_reason text;
