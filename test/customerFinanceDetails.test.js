const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../customer-web/debt-math'),G=require('../customer-web/grocery-math');
const loan={principal:'1000',rate_percent:0,rate_type:'EA',months:4};
const c=(id,mode,amount,extra={})=>({id,name:id,category:'INSURANCE',mode,amount,percent:0,months:3,on_payoff:'DUE',...extra});
test('monthly installment percentages reconcile capital, interest, insurance and other costs',()=>{
 const r=D.compare({...loan,rate_percent:12,rate_type:'NAMV',monthly_fee:'5',charges:[c('life','FIXED','10'),c('balance','BALANCE_PERCENT','0',{percent:1}),c('admin','FIXED','3',{category:'OTHER'})]});
 const row=r.baseline.rows[0];assert.equal(row.insurance_minor,2000);assert.equal(row.other_fee_minor,800);assert.equal(row.payment_minor,row.principal_minor+row.interest_minor+2800);
 assert.equal(Math.round(row.breakdown.reduce((n,x)=>n+x.percent,0)*100),10000);assert.ok(r.baseline.rows[1].insurance_minor<2000);
});
test('spread premiums round the final installment exactly and financed premiums are not charged twice',()=>{
 const r=D.compare({...loan,charges:[c('premium','SPREAD','100'),c('already','FINANCED','300')]});
 assert.deepEqual(r.baseline.rows.map(r=>r.insurance_minor),[3334,3334,3332,0]);assert.equal(r.baseline.total_minor,110000);
 assert.equal(r.payoff.total_minor,110000);assert.equal(r.payoff.net_saved_minor,0);
 const w=D.compare({...loan,charges:[c('premium','SPREAD','100',{on_payoff:'WAIVE'})]});assert.equal(w.payoff.net_saved_minor,10000);
});
test('early payoff includes the uncollected premium balance when still owed',()=>{
 const r=D.compare({...loan,lump_sum:'750',charges:[c('premium','SPREAD','100')]});
 assert.equal(r.shorter.months,1);assert.equal(r.shorter.rows[0].insurance_minor,10000);assert.equal(r.shorter.total_minor,110000);
 assert.throws(()=>D.compare({...loan,charges:[c('x','FIXED','5'),c('x','FIXED','8')]}),/única/);
});
const item=(id,quantity,estimated_price,extra={})=>({id,name:id,unit:'kg',quantity,estimated_price,in_cart:false,actual_quantity:null,actual_price:null,...extra});

test('live shopping separates extras from savings and never calls unbought items savings',()=>{
 const items=[item('arroz',2,'10',{shopping_origin:'PLANNED',in_cart:true,actual_quantity:1,actual_price:'8'}),item('jabon',1,'5',{shopping_origin:'PLANNED'}),item('dulce',1,null,{shopping_origin:'EXTRA',in_cart:true,actual_price:'4'})];
 const s=G.summary(items);assert.equal(s.estimated_minor,2500);assert.equal(s.actual_minor,1200);assert.equal(s.selected_budget_minor,1000);assert.equal(s.difference_minor,-200);assert.equal(s.budget_remaining_minor,1300);assert.equal(s.unplanned_minor,400);assert.equal(s.unplanned_count,1);assert.equal(s.pending_count,2);
 assert.ok(G.remaining(items).every(i=>!i.shopping_origin));
 items[0].actual_quantity=3;const extra=G.summary(items);assert.equal(extra.extra_quantity_minor,800);assert.equal(extra.difference_minor,-800);
 items[2].in_cart=false;assert.equal(G.summary(items).unplanned_minor,0);assert.equal(G.summary(items).actual_minor,2400);
 items[0].actual_price=null;assert.equal(G.summary(items).difference_minor,null);assert.equal(G.summary(items).budget_remaining_minor,null);
});
test('initial plan cannot be replaced or inflated after shopping starts',()=>{
 const original=[item('a',2,'10',{shopping_origin:'PLANNED'}),item('b',1,null,{shopping_origin:'EXTRA'})];
 const incoming=[{...original[0],name:'alterado',quantity:99,estimated_price:'100',shopping_origin:'EXTRA',in_cart:true,actual_price:'9'},{...original[1],shopping_origin:'PLANNED'},item('c',1,'100',{shopping_origin:'PLANNED'})];
 const saved=G.preservePlan(original,incoming);assert.equal(saved[0].quantity,2);assert.equal(saved[0].estimated_price,'10');assert.equal(saved[0].name,'a');assert.equal(saved[0].actual_price,'9');assert.equal(saved[1].shopping_origin,'EXTRA');assert.equal(saved[2].shopping_origin,'EXTRA');assert.equal(saved[2].estimated_price,null);
 assert.throws(()=>G.preservePlan(original,[original[1]]),/Conserva/);
 assert.throws(()=>G.normalize([{...original[0],shopping_origin:'inventado'}]),/origen/);
});
test('market estimates include quantities, distinguish missing prices and compare only bought quantities',()=>{
 const data=[item('arroz',2,'100',{in_cart:true,actual_quantity:1,actual_price:'110'}),item('leche',3,'30'),item('huevos',1,null)];
 const s=G.summary(data);assert.equal(s.estimated_minor,29000);assert.equal(s.unknown_prices,1);assert.equal(s.selected_budget_minor,10000);assert.equal(s.actual_minor,11000);assert.equal(s.difference_minor,-1000);
 assert.deepEqual(G.remaining(data).map(i=>[i.id,i.quantity]),[['arroz',1],['leche',3],['huevos',1]]);
});
test('unknown estimates never become invented savings and fractional quantities use cent totals',()=>{
 const s=G.summary([item('fruta',1.5,'10.10',{in_cart:true,actual_quantity:1.25,actual_price:'12'})]);assert.equal(s.estimated_minor,1515);assert.equal(s.actual_minor,1500);assert.equal(s.selected_budget_minor,1263);
 assert.equal(G.summary([item('nuevo',1,null,{in_cart:true,actual_price:'20'})]).difference_minor,null);
 assert.throws(()=>G.normalize([item('a',0,'1')]),/cantidades/);assert.throws(()=>G.normalize([item('a',1,'-1')]),/precios/);
});
