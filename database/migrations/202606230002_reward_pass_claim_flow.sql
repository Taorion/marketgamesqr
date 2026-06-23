do $$ begin
  alter type reward_pass_status add value if not exists 'pending_claim';
exception when duplicate_object then null;
end $$;

alter table reward_passes alter column beneficiary_name drop not null;
alter table reward_passes alter column beneficiary_document drop not null;
alter table reward_passes add column if not exists claimed_at timestamptz;

create index if not exists idx_reward_passes_company_claimed on reward_passes(company_id, claimed_at desc);
