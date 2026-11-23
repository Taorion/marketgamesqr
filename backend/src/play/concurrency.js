// Bound DB pressure independently of participant count. Await every worker even on failure.
async function each(items,fn,width=4){
 let next=0;
 const results=await Promise.allSettled(Array.from({length:Math.min(width,items.length)},async()=>{
  while(next<items.length){const i=next++;await fn(items[i]);}
 }));
 const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
}
module.exports={each};
