alter table attributed_sales
  alter column player_id drop not null,
  add column if not exists purchase_subtotal numeric(14, 2),
  add column if not exists benefit_discount_amount numeric(14, 2) not null default 0,
  add column if not exists benefit_type text,
  add column if not exists benefit_label text,
  add column if not exists benefit_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists application_summary jsonb not null default '{}'::jsonb,
  add column if not exists purchase_required boolean not null default false,
  add column if not exists application_mode text not null default 'PURCHASE',
  add column if not exists updated_at timestamptz not null default now();

update attributed_sales
set purchase_subtotal = sale_amount
where purchase_subtotal is null;

alter table attributed_sales
  alter column purchase_subtotal set default 0,
  alter column purchase_subtotal set not null;

do $$ begin
  alter table attributed_sales
    add constraint attributed_sales_checkout_amounts_check
    check (
      purchase_subtotal >= 0
      and benefit_discount_amount >= 0
      and sale_amount >= 0
      and sale_amount <= purchase_subtotal
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table attributed_sales
    add constraint attributed_sales_application_mode_check
    check (application_mode in ('PURCHASE', 'STANDALONE'));
exception when duplicate_object then null;
end $$;
