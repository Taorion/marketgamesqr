// An empty, nonexistent identity exercises every dependency of the Finance page.
// No account is created, no customer records are returned, and results are cached.
const svc=require('./customerService');
let cached=null,expires=0,pending=null,lastError=null;
function observe(error){
 const code=/^[A-Z0-9]{5}$/.test(error.code||'')?error.code:['RangeError','TypeError','ReferenceError','URIError'].includes(error.name)?error.name:'UNAVAILABLE';
 const frame=String(error.stack||'').split('\n').find(line=>/customer(?:Auth|Finance|Service|Routes)/.test(line)&&/^\s+at /.test(line));
 const location=frame?.match(/(customer[A-Za-z]+\.js:\d+:\d+)/)?.[1]||null;
 lastError={code,location};
 console.error('Customer finance request failed',lastError);
}
async function status(){
 if(cached&&expires>Date.now())return {...cached,...(lastError?{last_error:lastError}:{})};
 if(pending)return pending.then(r=>({...r,...(lastError?{last_error:lastError}:{})}));
 pending=(async()=>{
  try{
   const account={id:'00000000-0000-0000-0000-000000000000',timezone:'America/Bogota',currency:'COP'};
   await Promise.all([
    svc.dashboard(account,{period:'month'}),
    svc.planning(account),
    require('./customerFinanceDeliveryService').connections(account),
    require('./customerPurchaseService').list(account)
   ]);
   cached={ready:true};
  }catch(e){
   const code=/^[A-Z0-9]{5}$/.test(e.code||'')?e.code:['RangeError','TypeError'].includes(e.name)?e.name:'UNAVAILABLE';
   cached={ready:false,code};
   console.error('Customer finance readiness',{code,name:e.name,frames:String(e.stack||'').split('\n').filter(line=>/^\s+at /.test(line)).slice(0,5)});
  }
  expires=Date.now()+60000;return cached;
 })().finally(()=>pending=null);
 return pending.then(r=>({...r,...(lastError?{last_error:lastError}:{})}));
}
module.exports={status,observe};
