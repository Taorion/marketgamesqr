alter table public.customer_purchase_plans
 add column source_publication_id uuid references public.customer_publications(id) on delete set null,
 add column source_snapshot jsonb check(source_snapshot is null or jsonb_typeof(source_snapshot)='object');
-- Existing private-table RLS and revoked public grants remain in force.
