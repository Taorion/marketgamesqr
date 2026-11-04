const {test,after}=require('node:test'),assert=require('node:assert/strict');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';
const {query,pool}=require('../backend/src/config/db'),rules=require('../backend/src/services/customerPaymentReminderRules');
test('monthly notices fire on the chosen day, clamp short months, and exclude settled or other-month payments',async()=>{
 const cases=[
  ['2027-01-04','2027-01-05',5,'PENDING',false],
  ['2027-01-05','2027-01-05',5,'PENDING',true],
  ['2027-01-06','2027-01-05',5,'PENDING',false],
  ['2027-02-05','2027-02-05',5,'PENDING',true],
  ['2027-02-05','2027-01-05',5,'PENDING',false],
  ['2027-02-05','2027-02-05',5,'PAID',false],
  ['2027-02-05','2027-02-05',5,'SKIPPED',false],
  ['2027-02-28','2027-02-28',31,'PENDING',true],
  ['2028-02-28','2028-02-29',31,'PENDING',false],
  ['2028-02-29','2028-02-29',31,'PENDING',true],
  ['2028-03-28','2028-03-31',31,'PENDING',false],
  ['2028-03-31','2028-03-31',31,'PENDING',true],
  ['2027-01-02','2027-01-05',null,'PENDING',true],
 ];
 for(const [date,due,day,status,expected] of cases){
  const item={due_date:due,reminder_day:day,status,active:true,reminders_enabled:true,remind_days:3};
  assert.equal(rules.due(item,date),expected,JSON.stringify({date,due,day,status}));
  const result=await query('select '+rules.sql('$1')+" as due from (select $2::date due_date,$4::text status) i cross join (select $3::smallint reminder_day,3 remind_days,true active,true reminders_enabled) r",[date,due,day,status]);
  assert.equal(result.rows[0].due,expected);
 }
 assert.equal(rules.due({due_date:'2027-01-05',reminder_day:5,status:'PENDING',active:false,reminders_enabled:true},'2027-01-05'),false);
});
after(()=>pool.end());
