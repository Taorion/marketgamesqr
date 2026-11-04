// An empty, nonexistent identity exercises the production finance read path.
// No account is created, no customer records are returned, and results are cached.
const svc=require('./customerService');
let cached=null,expires=0,pending=null;
async function status(){
 if(cached&&expires>Date.now())return cached;
 if(pending)return pending;
 pending=(async()=>{
  try{
   await svc.dashboard({id:'00000000-0000-0000-0000-000000000000',timezone:'America/Bogota',currency:'COP'},{period:'month'});
   cached={ready:true};
  }catch(e){
   const code=/^[A-Z0-9]{5}$/.test(e.code||'')?e.code:['RangeError','TypeError'].includes(e.name)?e.name:'UNAVAILABLE';
   cached={ready:false,code};
   console.error('Customer finance readiness',{code,name:e.name,frames:String(e.stack||'').split('\n').filter(line=>/^\s+at /.test(line)).slice(0,5)});
  }
  expires=Date.now()+60000;return cached;
 })().finally(()=>pending=null);
 return pending;
}
module.exports={status};
