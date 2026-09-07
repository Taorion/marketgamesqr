alter table interactive_activations
  add column if not exists acquisition_channel_id uuid references business_acquisition_channels(id) on delete set null;

create index if not exists idx_interactive_activations_company_acquisition_channel
  on interactive_activations(company_id, acquisition_channel_id)
  where acquisition_channel_id is not null;
