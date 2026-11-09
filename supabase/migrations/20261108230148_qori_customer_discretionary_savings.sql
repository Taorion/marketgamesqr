alter table public.customer_entries add column is_ant_expense boolean not null default false;
alter table public.customer_sale_notes add column is_ant_expense boolean not null default false;
