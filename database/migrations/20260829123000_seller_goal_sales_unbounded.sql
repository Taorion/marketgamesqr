-- Remove the legacy 32-bit ceiling from seller sales goals. Validation keeps
-- the value non-negative and integral at the API boundary.
alter table if exists business_seller_goals
  alter column target_sales type numeric using target_sales::numeric;
