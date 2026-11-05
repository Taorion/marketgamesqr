const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../customer-web/dream-math');
test('trip budget includes rooms, nights, people, meals, tours, free money and contingency',()=>{
 const b=M.budget('TRIP',{people:4,nights:3,rooms:2,food_days:4,lodging_price:'100',food_daily:'10',free_total:'50',contingency_percent:10,items:[{id:'tour',name:'Tour',price:'20',quantity:1,basis:'PERSON'},{id:'transport',name:'Taxi',price:'15',quantity:2,basis:'TOTAL'}]});
 assert.equal(b.subtotal_minor,92000);assert.equal(b.total_minor,101200);assert.equal(b.per_person_minor,25300);
 assert.equal(M.budget('TRIP',{people:4,nights:3,lodging_basis:'PERSON_NIGHT',lodging_price:'100'}).total_minor,120000);
 assert.equal(M.budget('TRIP',{people:4,nights:3,lodging_basis:'TOTAL',lodging_price:'100'}).total_minor,10000);
});
test('projection rounds contributions upward and clamps month ends without date drift',()=>{
 assert.equal(M.addMonths('2028-01-31',1),'2028-02-29');assert.equal(M.addMonths('2028-01-31',2),'2028-03-31');
 const p=M.projection(10001,0,2000,'2026-11-04','2027-02-04');assert.equal(p.installments,3);assert.equal(p.monthly_required_minor,3334);assert.equal(p.months_needed,6);assert.equal(p.projected_date,'2027-05-04');
 const near=M.projection(10000,2000,1000,'2026-11-04','2026-11-30');assert.equal(near.monthly_required_minor,null);assert.equal(near.upfront_required_minor,8000);
 assert.equal(M.projection(10000,20000,0,'2026-11-04',null).projected_date,'2026-11-04');assert.equal(M.projection(10000,0,0,'2026-11-04',null).projected_date,null);
});
test('shared savings are spent once in priority order with leftover in the same month',()=>{
 const a={id:'a',target:'150',recorded_amount:'0',target_date:'2026-12-04'},b={id:'b',target:'50',recorded_amount:'0'},c={id:'c',target:'100',recorded_amount:'0',paused:true};
 const schedule=M.portfolio([a,b,c],10000,'2026-11-04');assert.equal(schedule[0].projected_date,'2027-01-04');assert.equal(schedule[0].late,true);assert.equal(schedule[1].projected_date,'2027-01-04');assert.equal(schedule[2].projected_date,null);
 assert.equal(M.portfolio([b,a],10000,'2026-11-04')[0].projected_date,'2026-12-04');
});
test('invalid dates, duplicate items, negative values and overflow are rejected',()=>{
 for(const d of ['2026-02-30','2026-13-01','oops'])assert.throws(()=>M.date(d),{code:'DREAM_INPUT'});
 assert.throws(()=>M.minor('-1'));assert.throws(()=>M.budget('TRIP',{people:100,nights:3650,lodging_basis:'PERSON_NIGHT',lodging_price:'999999999999'}));
 assert.throws(()=>M.budget('OTHER',{items:[{id:'a',name:'A',price:'1',basis:'TOTAL'},{id:'a',name:'B',price:'1',basis:'TOTAL'}]}));
 assert.equal(M.budget('HOME',{base_amount:'120000000',contingency_percent:5}).total_minor,12600000000);
});
