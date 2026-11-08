alter table public.customer_cash_boxes add column is_wallet boolean not null default false;
create unique index customer_cash_wallet_per_book on public.customer_cash_boxes(customer_id,book_id) where is_wallet;
create unique index customer_cash_wallet_request on public.customer_cash_events(customer_id,(detail->>'request_id')) where action='WALLET_PREPARE';
