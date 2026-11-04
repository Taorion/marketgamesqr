const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../customer-web/debt-math');
const base={principal:'1000',rate_percent:12,rate_type:'NAMV',months:12,monthly_fee:'0',lump_sum:'0',extra_monthly:'0'};
test('independent annuity benchmark and cent-accurate amortization',()=>{
 const r=M.compare(base);assert.equal(r.baseline.principal_payment_minor,8885);
 assert.equal(r.baseline.months,12);assert.equal(r.baseline.rows.at(-1).balance_minor,0);
 assert.equal(r.baseline.interest_minor,6619);assert.equal(r.baseline.total_minor,106619);
 assert.equal(r.baseline.rows.reduce((n,x)=>n+x.principal_minor,0),100000);
 for(const x of r.baseline.rows)assert.equal(x.payment_minor,x.principal_minor+x.interest_minor+x.fee_minor);
});
test('effective annual/monthly and nominal monthly conversions agree',()=>{
 assert.ok(Math.abs(M.rate(12,'NAMV')-.01)<1e-12);
 assert.ok(Math.abs(M.rate((1.01**12-1)*100,'EA')-.01)<1e-12);
 assert.ok(Math.abs(M.rate(1,'EM')-.01)<1e-12);
 const r=M.compare({...base,rate_percent:(1.01**12-1)*100,rate_type:'EA'});assert.equal(r.baseline.total_minor,M.compare(base).baseline.total_minor);
});
test('zero rate, tiny balances, final adjusted payment and no invented savings',()=>{
 const r=M.compare({...base,principal:'100',rate_percent:0,months:3,lump_sum:'50'});
 assert.equal(r.baseline.rows[2].payment_minor,3332);assert.equal(r.baseline.total_minor,10000);
 assert.equal(r.shorter.months,2);assert.equal(r.lower.months,3);assert.equal(r.payoff.net_saved_minor,0);
 assert.equal(M.compare({...base,principal:'0.01',rate_percent:0,months:600}).baseline.months,1);
});
test('partial payment shortens term or reduces monthly installment; extra accelerates payoff',()=>{
 const r=M.compare({...base,lump_sum:'500'}),x=M.compare({...base,lump_sum:'500',extra_monthly:'50'});
 assert.ok(r.shorter.months<r.baseline.months);assert.equal(r.lower.months,r.baseline.months);
 assert.ok(r.lower.payment_minor<r.baseline.payment_minor);
 assert.ok(r.shorter.interest_minor<r.lower.interest_minor);
 assert.ok(x.shorter.months<r.shorter.months);assert.ok(x.shorter.net_saved_minor>r.shorter.net_saved_minor);
 assert.equal(r.shorter.rows.reduce((n,x)=>n+x.principal_minor,0),50000);
});
test('all principal paid now equals payoff; accrued interest, monthly costs and upfront costs reconciled',()=>{
 const r=M.compare({...base,lump_sum:'1000',monthly_fee:'10',accrued_interest:'7',prepayment_fee:'20'});
 assert.equal(r.payoff.upfront_minor,102700);assert.equal(r.shorter.total_minor,r.payoff.total_minor);
 assert.equal(r.shorter.months,0);assert.equal(r.lower.rows.length,0);
 assert.equal(r.payoff.net_saved_minor,r.baseline.interest_minor+12000-2000);
 assert.equal(r.baseline.upfront_minor,700);
 const loss=M.compare({...base,rate_percent:0,prepayment_fee:'100'});assert.equal(loss.payoff.net_saved_minor,-10000);
});
test('custom monthly payment derives actual term and rejects non-amortizing loans',()=>{
 assert.equal(M.compare({...base,installment:'100'}).baseline.months,11);
 assert.throws(()=>M.compare({...base,installment:'10'}),/cuota no cubre/);
 assert.throws(()=>M.compare({...base,installment:'10.01'}),/600 meses/);
});
test('invalid inputs cannot produce reassuring but stale estimates',()=>{
 for(const v of [{principal:'0'},{principal:'-1'},{principal:'1.234'},{months:601},{months:1.5},{rate_percent:-1},{rate_percent:Infinity},{rate_type:'APR'},{lump_sum:'1000.01'}])assert.throws(()=>M.compare({...base,...v}),e=>e.code==='DEBT_INPUT');
});
test('amortization invariants across rates, balances and terms',()=>{
 for(const principal of ['0.99','1000','10000000','9999999999.99'])for(const rate of [0,.5,12,36])for(const months of [1,12,60,360]){
  const r=M.compare({...base,principal,rate_percent:rate,months,lump_sum:'0'});
  assert.equal(r.baseline.rows.reduce((n,x)=>n+x.principal_minor,0),M.minor(principal));
  assert.equal(r.baseline.rows.at(-1).balance_minor,0);
  assert.equal(r.baseline.total_minor,M.minor(principal)+r.baseline.interest_minor);
  assert.equal(r.shorter.net_saved_minor,0);
  assert.ok(r.baseline.rows.every(x=>['month','interest_minor','principal_minor','fee_minor','payment_minor','balance_minor'].every(k=>Number.isSafeInteger(x[k]))));
 }
});
