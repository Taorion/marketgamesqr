alter table public.qori_seller_resources drop constraint qori_seller_resources_audience_check;
alter table public.qori_seller_resources add constraint qori_seller_resources_audience_check check(audience in ('SELLER','PROSPECT','CANDIDATE'));
-- Existing RLS and direct-client revocations remain unchanged. Candidate
-- resources are served only through the explicit published-public endpoint.
