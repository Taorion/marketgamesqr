const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../customer-web/session-guard');
const response=(id,changed=false)=>({ok:!changed,headers:new Headers({...id?{'X-Qori-Customer':id}:{},...changed?{'X-Qori-Session-Changed':'1'}:{}})});
test('late responses and retained forms cannot cross account changes, including back to the same account',()=>{
 const guard=create(()=>assert.fail('Not a server mismatch'));guard.adopt('alice');
 const old=guard.snapshot(),ticket=guard.start(old);
 guard.reset();assert.equal(ticket.controller.signal.aborted,true);guard.adopt('bob');
 assert.throws(()=>guard.check(ticket,response('alice')),e=>e.code==='SESSION_CHANGED');
 assert.throws(()=>guard.start(old),e=>e.code==='SESSION_CHANGED');
 guard.adopt('alice');assert.throws(()=>guard.start(old),e=>e.code==='SESSION_CHANGED');
 const fresh=guard.start();guard.check(fresh,response('alice'));guard.finish(fresh);
});
test('a changed cookie clears the account instead of accepting the other account response',()=>{
 let resets=0;const guard=create(()=>resets++);guard.adopt('alice');
 const ticket=guard.start(),pending=guard.start();
 assert.throws(()=>guard.check(ticket,response('bob')),e=>e.code==='SESSION_CHANGED');
 assert.equal(resets,1);assert.equal(guard.snapshot().accountId,null);assert.equal(pending.controller.signal.aborted,true);
});
test('server identity conflict invalidates before exposing any payload; public catalog remains accessible',()=>{
 let resets=0;const guard=create(()=>resets++);guard.adopt('alice');
 guard.check(guard.start(),response(null));
 assert.throws(()=>guard.check(guard.start(),response(null,true)),e=>e.code==='SESSION_CHANGED');
 assert.equal(resets,1);
});
