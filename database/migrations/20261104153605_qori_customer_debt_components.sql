alter table public.customer_debts
 add column credit_type text not null default 'OTHER'
 check(credit_type in ('FREE_INVESTMENT','MORTGAGE','VEHICLE','CREDIT_CARD','PAYROLL','EDUCATION','MICROCREDIT','BUSINESS','PERSONAL','BNPL','DEBT_CONSOLIDATION','OTHER')),
 add column charges jsonb not null default '[]'::jsonb
 check(jsonb_typeof(charges)='array' and jsonb_array_length(charges)<=20);
alter table public.customer_debt_payments
 add column charge_payments jsonb not null default '[]'::jsonb
 check(jsonb_typeof(charge_payments)='array' and jsonb_array_length(charge_payments)<=20);
comment on column public.customer_debts.charges is 'Private remaining charge terms. SPREAD amount is the unpaid premium/cost, FINANCED is already in principal.';
comment on column public.customer_debt_payments.charge_payments is 'Confirmed amounts applied to named charges; included in fees_paid, never added a second time.';
