const {test}=require('node:test');
const assert=require('node:assert/strict');
const f=require('../backend/src/services/customerFinance');
test('money is calculated in minor units without decimal addition drift',()=>{
  assert.equal(f.minor('0.10')+f.minor('0.20'),30);assert.equal(f.minor('15000'),1500000);
  assert.throws(()=>f.minor('1.001'));assert.throws(()=>f.minor('NaN'));
});
test('month-to-date uses buyer timezone and an equivalent prior-month interval',()=>{
  const r=f.periodRange({period:'month'},'America/Bogota',new Date('2026-11-01T02:00:00Z'));
  assert.equal(r.from,'2026-10-01');assert.equal(r.to,'2026-10-31');
  const partial=f.periodRange({period:'month'},'America/Bogota',new Date('2026-10-15T17:00:00Z'));
  assert.equal(partial.previous_to,'2026-09-15');assert.equal(partial.partial,true);
});
test('Monday weeks cross years and leap years clamp previous comparison dates',()=>{
  assert.equal(f.periodRange({period:'week',anchor:'2026-01-01'},'UTC').from,'2025-12-29');
  const leap=f.periodRange({period:'year'},'UTC',new Date('2024-02-29T17:00:00Z'));
  assert.equal(leap.previous_to,'2023-02-28');
});
test('a pending sale is not paid spending and a void remains visible',()=>{
  const base={id:'sale',business_id:'b',business_name:'Café',sale_amount:'100.50',currency:'COP',created_at:'2026-10-15T16:00:00Z',metadata:{}};
  assert.equal(f.salesMovement({...base,sale_status:'PENDING'},'UTC').amount_minor,0);
  assert.equal(f.salesMovement({...base,sale_status:'PENDING'},'UTC').pending_minor,10050);
  assert.equal(f.salesMovement({...base,sale_status:'VOIDED'},'UTC').pending_minor,0);
});
test('discounted baskets do not invent per-product net spending',()=>{
  const r=f.salesMovement({id:'1',business_id:'b',business_name:'Café',sale_amount:'90',currency:'COP',created_at:'2026-10-15T16:00:00Z',sale_status:'PAID',metadata:{products:[{inventory_product_id:'p',name:'Café',quantity:2,line_total:100}],benefit_application:{discount_amount:10}}},'UTC');
  assert.equal(r.products[0].quantity,2);assert.equal(r.products[0].amount_minor,null);assert.equal(r.discount_minor,1000);
});
test('summary separates currency, product quantities, purchase occasions, income and unknown coverage',()=>{
  const row={id:'a',source:'MANUAL',kind:'EXPENSE',currency:'COP',status:'PAID',date:'2026-10-15',occurred_at:'2026-10-15T10:00:00Z',merchant:'Café',category:'alimentacion',priority:'UNSET',amount_minor:1000,pending_minor:0,refunded_minor:0,products:[{key:'p',name:'Café',quantity:3,amount_minor:1000}]};
  const range=f.periodRange({period:'month',anchor:'2026-10-15'},'UTC',new Date('2026-10-20T12:00:00Z'));
  const r=f.summarize([row,{...row,id:'b',amount_minor:2000,products:[]},{...row,id:'c',currency:'USD'},{...row,id:'d',kind:'INCOME',amount_minor:5000}],range,'COP');
  assert.equal(r.total_minor,3000);assert.equal(r.purchases,2);assert.equal(r.income_minor,5000);
  assert.equal(r.products[0].occasions,1);assert.equal(r.products[0].quantity,3);assert.equal(r.product_coverage.with_detail,1);
  assert.equal(r.change_percent,null);assert.equal(r.categories[0].share,100);
});
