-- Keep historical monthly/annual attribution intact; new Despega sales are prepaid.
alter table public.portal_signup_sales_attributions
  drop constraint portal_signup_sales_attributions_cycle_check;
alter table public.portal_signup_sales_attributions
  add constraint portal_signup_sales_attributions_cycle_check
  check (billing_cycle in ('monthly', 'annual', 'prepaid'));
