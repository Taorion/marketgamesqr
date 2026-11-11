alter table public.businesses add column is_seller_demo boolean not null default false;
create unique index qori_one_seller_demo on public.businesses(is_seller_demo) where is_seller_demo;
create table public.qori_seller_demo (
 singleton boolean primary key default true check(singleton),
 business_id uuid not null unique references public.businesses(id)
);
create table public.qori_seller_demo_members (
 seller_id uuid primary key references public.app_users(id),
 demo_user_id uuid not null unique references public.app_users(id),
 created_at timestamptz not null default now()
);
alter table public.qori_seller_demo enable row level security;
alter table public.qori_seller_demo_members enable row level security;
revoke all on public.qori_seller_demo,public.qori_seller_demo_members from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   execute format('revoke all on public.qori_seller_demo,public.qori_seller_demo_members from %I',r);
  end if;
 end loop;
end $$;

-- One shared training tenant. No real invoices, paid subscription, or seller attribution.
do $$ declare b uuid; actor uuid; credits uuid; campaign uuid; member uuid; program uuid; i integer; person text; doc text;
begin
 insert into public.businesses(name,slug,plan_code,plan_type,portal_status,subscription_status,is_active,is_seller_demo,settings)
 values('Demo Qori','demo-qori-seller','GLOBAL','premium_monthly','ACTIVE','ACTIVE',true,true,
  '{"internal_account":true,"subscription":{"lifetime_access":true,"monthly_payment_required":false},"demo":{"label":"Demo Qori","shared":true},"city":"Bogotá","description":"Empresa ficticia para aprender y presentar Qori. Sin valor comercial."}'::jsonb) returning id into b;
 insert into public.qori_seller_demo(business_id) values(b);
 insert into public.branches(business_id,name,slug,address,metadata)
 values(b,'Sede principal · Demo','demo-qori-principal','Sede ficticia para práctica','{"demo":true}');
 insert into public.app_users(business_id,email,password_hash,full_name,role,is_active)
 values(b,'seed@demo-qori.invalid','!disabled-demo-seed','Guía Demo Qori','BUSINESS_OWNER',false) returning id into actor;
 insert into public.business_qr_credit_accounts(business_id,qr_balance,public_label,included_balance)
 values(b,10000,'10.000 tickets de demostración',10000) returning id into credits;
 insert into public.business_qr_credit_ledger(business_id,account_id,entry_type,delta_qr,balance_after,public_label,notes,created_by_user_id)
 values(b,credits,'MANUAL_ADJUSTMENT',10000,10000,'Tickets de demostración','Carga inicial ficticia; no es una compra.',actor);
 insert into public.qori_giftcard_credit_accounts(business_id,balance,welcome_granted,purchased,used) values(b,1000,1000,0,0);
 insert into public.campaigns(business_id,name,type,status,public_slug,objective,budget_total,metadata)
 values(b,'Tu primera visita · Demo','FORM','ACTIVE','demo-qori-primera-visita','Aprender a captar, fidelizar y medir clientes.',250000,'{"demo":true}') returning id into campaign;
 insert into public.campaigns(business_id,name,type,status,public_slug,objective,metadata)
 values(b,'Vuelve por tu café · Demo','FORM','ACTIVE','demo-qori-regresa','Practicar una campaña de recompra.','{"demo":true}');
 for i in 1..6 loop
  insert into public.business_inventory_products(business_id,internal_id,name,description,category,unit_price,cost_price,stock_quantity,status,metadata)
  values(b,'DEMO-'||i,(array['Café de origen','Capuchino','Torta de chocolate','Almuerzo del día','Desayuno de la casa','Bono de experiencia'])[i],
   'Producto ficticio para demostraciones.','Cafetería demo',5000+i*3000,2000+i*1000,100,'ACTIVE','{"demo":true}');
 end loop;
 insert into public.stamp_programs(business_id,name,stamps_required,benefit_type,benefit_value,allow_manual,terms,created_by)
 values(b,'Seis visitas, un café · Demo',6,'FREE_GIFT','{"label":"Café de demostración"}',true,'Ejemplo sin valor comercial.',actor) returning id into program;
 for i in 1..30 loop
  person := (array['Ana','Carlos','Lucía','Mateo','Valentina','Daniel','Sofía','Andrés','Camila','Julián'])[((i-1)%10)+1]||' Cliente Demo '||i;
  doc := 'demoqori'||lpad(i::text,4,'0');
  insert into public.players(business_id,campaign_id,name,email,document_id,created_at,metadata)
  values(b,campaign,person,'cliente'||i||'@demo-qori.invalid',doc,now()-make_interval(days=>i),
   jsonb_build_object('source','Demo Qori','demo',true,'customer_import_declared',true,'marketing_consent',false));
  if i<=20 then
   insert into public.business_sales(business_id,campaign_id,customer_name,customer_document_id,customer_email,product_name,sale_amount,currency,created_by_user_id,created_at,notes,metadata)
   values(b,campaign,person,doc,'cliente'||i||'@demo-qori.invalid','Consumo de ejemplo',12000+i*1500,'COP',actor,now()-make_interval(days=>i),
    'Venta ficticia de formación, sin cobro real.','{"demo":true}');
  end if;
  if i<=8 then
   insert into public.stamp_members(business_id,program_id,name,document_key,email,public_token,created_by)
   values(b,program,person,doc,'cliente'||i||'@demo-qori.invalid',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),actor) returning id into member;
   insert into public.stamp_cycles(business_id,member_id,cycle_number,rules,expires_at)
   values(b,member,1,'{"name":"Seis visitas, un café · Demo","stamps_required":6,"benefit_type":"FREE_GIFT","benefit_value":{"label":"Café de demostración"},"minimum_purchase":0,"one_per_day":false,"allow_manual":true,"card_valid_days":365,"ticket_valid_days":30,"reward_cost":0,"ticket_cost":0,"terms":"Ejemplo sin valor comercial."}',now()+interval '1 year');
  end if;
 end loop;
end $$;
