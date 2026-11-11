const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('../backend/src/services/sellerCommissionPolicy');
test('VF1 reproduces every monthly amount and six-month total in the supplied PDF',()=>{
 const expected={DESPEGA:[75000,7500,7500,7500,7500,7500],STARTER:[114500,57250,57250,45800,34350,22900],GROWTH:[499500,249750,249750,199800,149850,99900],PRO:[999500,499750,499750,399800,299850,199900]};
 const totals={DESPEGA:112500,STARTER:332050,GROWTH:1448550,PRO:2898550};
 for(const plan of policy.publicPolicy().plans){assert.deepEqual(plan.months.map(m=>m.reference_commission_cop),expected[plan.code]);assert.equal(plan.reference_total_cop,totals[plan.code]);}
});
test('months outside the window, unknown plans and free plans earn no subscription commission',()=>{
 for(const plan of ['DESPEGA','STARTER','GROWTH','PRO','PENSE_EN_TI','TEST','UNKNOWN'])for(const month of [0,-1,7,12,1.5,NaN])assert.equal(policy.rateBps(plan,month),0);
 assert.equal(policy.rateBps('PENSE_EN_TI',1),0);assert.equal(policy.commissionCop('0','DESPEGA',1),0);
});
test('COP rounding uses integer cents and ticket commission remains independent at ten percent',()=>{
 assert.equal(policy.commissionCop('229000.02','STARTER',2),57250.01);
 assert.throws(()=>policy.commissionCop('-1','STARTER',1));assert.throws(()=>policy.commissionCop('1.001','STARTER',1));
 assert.equal(policy.publicPolicy().tickets_rate,0.10);
});
test('sales examples and portfolio accumulation match PDF pages 4 and 5',()=>{
 const mix6={DESPEGA:2,STARTER:2,GROWTH:1,PRO:1},mix10={DESPEGA:3,STARTER:3,GROWTH:2,PRO:2};
 const cohort=(mix,month)=>Object.entries(mix).reduce((sum,[code,count])=>sum+count*policy.commissionCop(policy.plans[code].monthly_price_cop,code,month),0);
 assert.equal(cohort(mix6,1),1878000);assert.equal(cohort(mix10,1),3566500);assert.equal(cohort(mix6,2)+cohort(mix10,1),4445500);
 const monthly=Array.from({length:6},(_,i)=>Array.from({length:i+1},(_,m)=>cohort(mix10,m+1)).reduce((a,b)=>a+b,0));
 assert.equal(monthly[5],10027850);assert.equal(monthly.reduce((a,b)=>a+b,0),43456250);
});
