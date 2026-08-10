alter table business_communications
  add column if not exists whatsapp_body text;

alter table business_communications
  drop constraint if exists business_communications_communication_type_check;

alter table business_communications
  add constraint business_communications_communication_type_check
  check (communication_type in ('EMAIL', 'SOCIAL', 'MIXED', 'WHATSAPP'));

alter table business_communication_recipients
  drop constraint if exists business_communication_recipients_status_check;

alter table business_communication_recipients
  add constraint business_communication_recipients_status_check
  check (status in ('QUEUED', 'PREPARED', 'SENT', 'FAILED', 'SKIPPED'));
