/* Bind every view and response to the account that opened it, never to a mutable cookie. */
(function(root){
 'use strict';
 function create(onMismatch){
  let epoch=0,accountId=null;
  const pending=new Set();
  const stale=()=>Object.assign(new Error('La sesión cambió. Abre de nuevo tu cuenta para continuar.'),{code:'SESSION_CHANGED'});
  const snapshot=()=>({epoch,accountId});
  function reset(){epoch++;accountId=null;for(const ticket of pending)ticket.controller.abort();pending.clear();}
  function adopt(id){if(id!==accountId){reset();accountId=id;}}
  function start(context=snapshot()){
   if(context.epoch!==epoch||context.accountId!==accountId)throw stale();
   const ticket={...context,controller:new AbortController()};pending.add(ticket);return ticket;
  }
  function check(ticket,response){
   if(ticket.epoch!==epoch||ticket.accountId!==accountId)throw stale();
   const served=response.headers.get('X-Qori-Customer');
   if(response.headers.get('X-Qori-Session-Changed')==='1'||ticket.accountId&&served&&served!==ticket.accountId){
    reset();onMismatch();throw stale();
   }
  }
  return {snapshot,reset,adopt,start,check,finish:ticket=>pending.delete(ticket)};
 }
 if(typeof module==='object'&&module.exports)module.exports={create};else root.QoriSessionGuard={create};
})(typeof window==='object'?window:globalThis);
