const test=require("node:test"), assert=require("node:assert/strict"), fs=require("node:fs"), vm=require("node:vm");
const backend=fs.readFileSync("backend/src/services/leadCrmService.js","utf8"), front=fs.readFileSync("empresa/js/app.js","utf8");
const listSource=backend.slice(backend.indexOf("function agendaLimit("),backend.indexOf("async function updateLeadAgendaItem("));
function service(rows) {
 const calls=[]; const ctx={query:async(sql,params)=>{calls.push({sql,params});return {rows};},agendaDateRange:()=>({from:"2026-09-01",to:"2026-10-01"})};
 vm.createContext(ctx);vm.runInContext(listSource,ctx);return {ctx,calls};
}
test("historial fuerza DONE, consulta todas las fechas y pagina por empresa",async()=>{
 const h=service([{id:"1"},{id:"2"},{id:"3"}]);const r=await h.ctx.listLeadAgenda("tenant-a",{view:"history",status:"ALL",from:"2026-09-01",limit:2,offset:4});
 assert.deepEqual(Array.from(h.calls[0].params),["tenant-a",null,null,"DONE",3,4]);
 assert.ok(h.calls[0].sql.includes("where ln.business_id = $1"));
 assert.match(h.calls[0].sql,/completed_at desc nulls last/);
 assert.equal(r.agenda.length,2);assert.equal(r.pagination.has_more,true);
});
test("última página no anuncia más resultados y limita tamaños abusivos",async()=>{
 const h=service([]);const r=await h.ctx.listLeadAgenda("tenant-b",{view:"history",limit:99999,offset:-2});
 assert.equal(r.pagination.has_more,false);assert.equal(r.pagination.limit,200);assert.equal(r.pagination.offset,0);
});
test("agenda normal conserva fechas, estado y orden programado",async()=>{
 const h=service([]);const r=await h.ctx.listLeadAgenda("tenant-a",{status:"OPEN",limit:1000});
 assert.deepEqual(Array.from(h.calls[0].params),["tenant-a","2026-09-01","2026-10-01","OPEN",1000,0]);
 assert.match(h.calls[0].sql,/order by ln.reminder_at asc/);assert.equal(r.pagination,undefined);
});
const loaderSource=front.slice(front.indexOf("async function loadLeadAgendaData("),front.indexOf("function leadCrmQueryString("));
function loader() {
 const pending=[]; const state={leadAgendaView:"history",leadAgendaStatus:"OPEN",leadAgenda:[],leadAgendaLoaded:false};
 const ctx={state,session:{user:{business_id:"a"}},URLSearchParams,agendaRangeForView:()=>({from:new Date("2026-09-01"),to:new Date("2026-10-01")}),businessScopeKey:()=>"a",isCurrentBusinessScope:k=>k==="a",authHeaders:()=>({}),showFeedback(){},hideFeedback(){},api:(url)=>new Promise((resolve,reject)=>pending.push({url,resolve,reject})),apiSafe:(url)=>new Promise(resolve=>pending.push({url,resolve}))};
 vm.createContext(ctx);vm.runInContext(loaderSource,ctx);return {ctx,state,pending};
}
test("carga completa sin fechas y agrega páginas sin perder filas",async()=>{
 const h=loader();const p=h.ctx.loadLeadAgendaData({quiet:true});const url=new URL(h.pending[0].url,"https://test");
 assert.equal(url.searchParams.get("view"),"history");assert.equal(url.searchParams.has("from"),false);assert.equal(url.searchParams.get("status"),"DONE");
 h.pending[0].resolve({agenda:[{id:"a"}],pagination:{has_more:true}});await p;
 const next=h.ctx.loadLeadAgendaData({quiet:true,force:true,append:true});assert.match(h.pending[1].url,/offset=1/);
 h.pending[1].resolve({agenda:[{id:"b"}],pagination:{has_more:false}});await next;assert.equal(h.state.leadAgenda.length,2);
});
test("respuesta antigua no sustituye una vista nueva",async()=>{
 const h=loader();const old=h.ctx.loadLeadAgendaData({quiet:true});h.state.leadAgendaView="list";
 const next=h.ctx.loadLeadAgendaData({quiet:true,force:true});h.pending[1].resolve({agenda:[{id:"current"}]});await next;
 h.pending[0].resolve({agenda:[{id:"stale"}]});await old;assert.equal(h.state.leadAgenda[0].id,"current");
});
test("fallo al paginar conserva tareas y ofrece un error",async()=>{
 const h=loader();h.state.leadAgenda=[{id:"saved"}];const p=h.ctx.loadLeadAgendaData({quiet:true,force:true,append:true});
 h.pending[0].reject(Error("Sin conexión"));await p;assert.equal(h.state.leadAgenda[0].id,"saved");assert.equal(h.state.leadAgendaError,"Sin conexión");
});
