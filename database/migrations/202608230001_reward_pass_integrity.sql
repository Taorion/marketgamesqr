alter table reward_passes
  add column if not exists authorized_branch_id uuid references branches(id) on delete set null,
  add column if not exists branch_authorization_scope text,
  add column if not exists issuance_key text;

alter table reward_passes
  drop constraint if exists reward_passes_branch_authorization_scope_check;

alter table reward_passes
  add constraint reward_passes_branch_authorization_scope_check check (
    branch_authorization_scope is null
    or branch_authorization_scope = 'ALL_BRANCHES' and authorized_branch_id is null
    or branch_authorization_scope = 'SPECIFIC_BRANCH' and authorized_branch_id is not null
  );

alter table reward_pass_redemptions
  add column if not exists branch_id uuid references branches(id) on delete set null,
  add column if not exists idempotency_key text;

create unique index if not exists reward_passes_company_issuance_key_uidx
  on reward_passes (company_id, issuance_key)
  where issuance_key is not null;

create unique index if not exists reward_pass_redemptions_company_idempotency_uidx
  on reward_pass_redemptions (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists reward_passes_authorized_branch_idx
  on reward_passes (company_id, authorized_branch_id)
  where authorized_branch_id is not null;

create index if not exists reward_pass_redemptions_branch_idx
  on reward_pass_redemptions (company_id, branch_id, redeemed_at desc)
  where branch_id is not null;
