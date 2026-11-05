const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('a delayed push cannot show personal details after logout and existing notifications close',async()=>{
 const handlers={},shown=[];let resolveJson,closed=0,pushDone,clearDone;
 const self={addEventListener:(name,fn)=>handlers[name]=fn,registration:{getNotifications:async()=>[{close:()=>closed++}],showNotification:async(...args)=>shown.push(args)}};
 vm.runInNewContext(fs.readFileSync('customer-web/sw.js','utf8'),{self,fetch:async()=>({ok:true,json:()=>new Promise(r=>resolveJson=r)})});
 handlers.push({data:{json:()=>({type:'BENEFIT',public_id:'alice',notification_id:'notice'})},waitUntil:p=>pushDone=p});
 await new Promise(r=>setImmediate(r));
 handlers.message({data:{type:'QORI_SESSION_CHANGED'},waitUntil:p=>clearDone=p});
 resolveJson({public_id:'alice',items:[{id:'notice',title:'Private gift',body:'Private',business_name:'Private business'}]});
 await Promise.all([pushDone,clearDone]);assert.equal(closed,1);assert.deepEqual(shown,[]);
});
test('push addressed to another account never displays in the current account',async()=>{
 const handlers={},shown=[];let done;
 const self={addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(...args)=>shown.push(args)}};
 vm.runInNewContext(fs.readFileSync('customer-web/sw.js','utf8'),{self,fetch:async()=>({ok:true,json:async()=>({public_id:'bob',count:1,items:[{id:'notice',name:'Private bill'}]})})});
 handlers.push({data:{json:()=>({public_id:'alice'})},waitUntil:p=>done=p});await done;assert.deepEqual(shown,[]);
});
