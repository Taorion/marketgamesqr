function monthlyDate(date,day){
 const [year,month]=date.split('-').map(Number),last=new Date(Date.UTC(year,month,0,12)).getUTCDate();
 return date.slice(0,7)+'-'+String(Math.min(day,last)).padStart(2,'0');
}
function due(item,date){
 if(item.status!=='PENDING'||!item.active||!item.reminders_enabled)return false;
 if(item.reminder_day!=null)return item.due_date.slice(0,7)===date.slice(0,7)&&date===monthlyDate(date,item.reminder_day);
 const until=new Date(Date.parse(date+'T12:00:00Z')+item.remind_days*86400000).toISOString().slice(0,10);
 return item.due_date<=until;
}
// Date expressions and aliases are internal constants; customer values remain query parameters.
function sql(date){
 return `i.status='PENDING' and r.active and r.reminders_enabled and (
  (r.reminder_day is null and i.due_date<=(${date})::date+r.remind_days)
  or (r.reminder_day is not null
   and date_trunc('month',i.due_date)=date_trunc('month',(${date})::date)
   and extract(day from (${date})::date)=least(r.reminder_day,
    extract(day from date_trunc('month',(${date})::date)+interval '1 month - 1 day'))))`;
}
module.exports={monthlyDate,due,sql};
