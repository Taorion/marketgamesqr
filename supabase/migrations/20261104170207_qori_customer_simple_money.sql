-- Recurrence and necessity are independent. Unknown classifications remain unknown.
alter table public.customer_recurring drop constraint customer_recurring_frequency_check;
alter table public.customer_recurring add constraint customer_recurring_frequency_check check(frequency in ('once','week','month','year'));
alter table public.customer_entries add column expense_pattern text not null default 'UNSET' check(expense_pattern in ('UNSET','RECURRING','EVENTUAL'));
alter table public.customer_sale_notes add column expense_pattern text not null default 'UNSET' check(expense_pattern in ('UNSET','RECURRING','EVENTUAL'));
update public.customer_entries e set expense_pattern=case when r.frequency='once' then 'EVENTUAL' else 'RECURRING' end
from public.customer_payment_items i join public.customer_recurring r on r.id=i.recurring_id
where e.id=i.entry_id and e.customer_id=i.customer_id;
-- Existing RLS and revoked grants remain in force; no new public access.
