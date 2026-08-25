-- La sede es una dimensión comercial propia, igual que campaña y canal.
-- Los registros históricos conservan NULL como "Sin sede atribuida".

alter table interactive_activations
  add column if not exists branch_id uuid references branches(id) on delete set null;

alter table business_communications
  add column if not exists branch_id uuid references branches(id) on delete set null;

alter table business_acquisition_channel_efforts
  add column if not exists branch_id uuid references branches(id) on delete set null;

alter table business_manual_leads
  add column if not exists branch_id uuid references branches(id) on delete set null;

alter table players
  add column if not exists branch_id uuid references branches(id) on delete set null;

create index if not exists idx_interactive_activations_company_branch_created
  on interactive_activations(company_id, branch_id, created_at desc);
create index if not exists idx_business_communications_business_branch_updated
  on business_communications(business_id, branch_id, updated_at desc);
create index if not exists idx_business_channel_efforts_business_branch_created
  on business_acquisition_channel_efforts(business_id, branch_id, created_at desc);
create index if not exists idx_business_manual_leads_business_branch_created
  on business_manual_leads(business_id, branch_id, created_at desc);
create index if not exists idx_players_business_branch_created
  on players(business_id, branch_id, created_at desc);

-- La sede de una activación se convierte en la sede de sus contactos cuando
-- todavía no existe una asignación explícita del contacto.
update players p
set branch_id = ia.branch_id
from interactive_activation_participants iap
join interactive_activations ia on ia.id = iap.activation_id
where p.id = iap.player_id
  and p.branch_id is null
  and ia.branch_id is not null;
