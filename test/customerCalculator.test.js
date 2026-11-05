const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../customer-web/calculator-math');
test('basic calculator respects precedence, unary signs, decimal comma and rejects code/nonfinite results',()=>{
 for(const [s,n] of [['2+3*4',14],['(2+3)*4',20],['−2^2',-4],['2^3^2',512],['50000*(1-10%)',45000],['0,1+0,2',.3],['2^-2',.25]])assert.equal(M.evaluate(s),n,s);
 for(const s of ['alert(1)','1/0','(2+1','2(3)','2**3','2^9999','1;process.exit()'])assert.throws(()=>M.evaluate(s),s);
});
test('loan zero interest, equivalent rates and rounding conserve principal and explain fees',()=>{
 const zero=M.loan({principal:1200,months:12,rate:0,rate_type:'EA',insurance:2,extras:3,upfront:10});assert.equal(zero.payment,105);assert.equal(zero.interest,0);assert.equal(zero.total,1270);assert.equal(zero.rows.at(-1).balance,0);
 const r=M.loan({principal:1000000,months:24,rate:1,rate_type:'MONTHLY',insurance:1000,extras:2000,upfront:5000});assert.equal(r.rows[0].interest,10000);assert.equal(r.fees,77000);assert.equal(Math.round(r.rows.reduce((n,x)=>n+x.principal,0)*100),100000000);assert.equal(r.rows.at(-1).balance,0);assert.ok(Math.abs(r.total-1000000-r.interest-r.fees)<.01);
 assert.ok(Math.abs(M.monthly((1.01**12-1)*100,'EA')-.01)<1e-12);assert.throws(()=>M.loan({principal:100,months:1.5,rate:0}));
});
test('savings contributions occur at month end, zero rate and impossible goals are explicit',()=>{
 const r=M.savings({initial:100,contribution:50,months:12,rate:0,rate_type:'EA',target:1000});assert.equal(r.projected,700);assert.equal(r.required,75);assert.equal(r.months_to_goal,18);assert.equal(r.yield,0);
 assert.equal(M.savings({initial:0,contribution:0,months:12,rate:0,target:100}).months_to_goal,null);
 assert.equal(M.savings({initial:1000,contribution:0,months:12,rate:0,target:500}).months_to_goal,0);
 assert.ok(Math.abs(M.future(100,10,2,.1)-142)<1e-8);
});
test('rates, discounts and split cents remain mathematically consistent',()=>{
 assert.equal(M.rates({rate:12,rate_type:'NOMINAL'}).monthly,1);
 assert.equal(M.percentages({amount:50000,percent:10,operation:'discount'}).total,45000);
 assert.throws(()=>M.percentages({amount:100,percent:101,operation:'discount'}));
 const r=M.split({amount:100,people:3,tip:0});assert.equal(r.each,33.33);assert.equal(r.extra_people,1);assert.equal(r.extra_amount,33.34);assert.equal(r.total,100);
});
