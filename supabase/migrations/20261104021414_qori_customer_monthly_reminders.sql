alter table public.customer_recurring
 add column reminder_day smallint check(reminder_day between 1 and 31),
 add constraint customer_recurring_monthly_reminder check(reminder_day is null or frequency='month');
comment on column public.customer_recurring.reminder_day is
 'Optional monthly notification day. NULL preserves the daily reminder window. Short months use their last day.';
