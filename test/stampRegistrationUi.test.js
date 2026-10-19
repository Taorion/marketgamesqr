const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../stamp-card-public/inscripcion.js'),'utf8');
const program='5422f7b5-09c1-4f60-bf64-a61d13280d50',token='a'.repeat(64);
const fixture={business:{name:'Café QA'},program:{name:'Mi programa',benefit_value:{label:'Un café'},stamps_required:8,card_valid_days:365,ticket_valid_days:30}};
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(fetch,{search='?programa='+program,stored={},blockedStorage=false}={}){
  class Element{
    constructor(){this.children={};this.listeners={};this.textContent='';this.disabled=false;}
    set innerHTML(value){this.html=value;this.children={};}get innerHTML(){return this.html||'';}
    querySelector(selector){return this.children[selector]??=new Element();}
    addEventListener(name,fn){this.listeners[name]=fn;}
    insertAdjacentHTML(_,html){this.inserted=html;}
  }
  const root=new Element(),timers=new Map(),calls=[],navigations=[];let clock=0;
  class FormData{
    constructor(form){this.values=form.values||{name:'Cliente QA',document_id:'123456',email:'  qa@example.test  ',consent:'on'};}
    has(k){return Object.hasOwn(this.values,k);}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]();}
  }
  const ctx={document:{getElementById:()=>root},window:{addEventListener(){}},location:{search,origin:'https://qori.test',assign:path=>navigations.push(path),reload(){}},
    fetch:async(url,options)=>{calls.push({url,options});return fetch(url,options);},URL,URLSearchParams,Intl,FormData,AbortController,
    crypto:require('node:crypto').webcrypto,Uint8Array,
    localStorage:{getItem:k=>{if(blockedStorage)throw Error('blocked');return stored[k]||null;},setItem:(k,v)=>{if(blockedStorage)throw Error('blocked');stored[k]=v;}},
    setTimeout:fn=>{timers.set(++clock,fn);return clock;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(source,ctx);
  return {root,calls,timers,navigations,submit:()=>{const form=root.querySelector('form');return form.listeners.submit({preventDefault(){},target:form});}};
}
test('incomplete program link is explained without issuing a request',async()=>{
  const h=harness(()=>{throw Error('must not fetch');},{search:'?programa=broken'});await settle();
  assert.equal(h.calls.length,0);assert.match(h.root.innerHTML,/Enlace de inscripción incompleto/);assert.doesNotMatch(h.root.innerHTML,/UUID|Invalid/);
});
test('network or non-JSON startup failure can retry without reloading',async()=>{
  for(const failure of [()=>Promise.reject(Error('Failed to fetch')),()=>({ok:false,json:async()=>{throw Error('Unexpected token <');}})]){
    let attempts=0;const h=harness(()=>++attempts===1?failure():response(fixture));await settle();
    assert.match(h.root.innerHTML,/Volver a intentar/);assert.doesNotMatch(h.root.innerHTML,/Failed to fetch|Unexpected token/);
    await h.root.querySelector('#retryRegistration').onclick();assert.match(h.root.innerHTML,/Crear mi tarjeta/);assert.equal(attempts,2);assert.equal(h.timers.size,0);
  }
});
test('saved personal card remains reachable when new registrations are paused',async()=>{
  const h=harness(()=>response({error:{message:'Programa no disponible'}},404),{stored:{[`qori:stamp-registration:${program}:card`]:'/sellos/#'+token}});
  await settle();assert.match(h.root.innerHTML,/Abrir mi tarjeta guardada/);assert.ok(h.root.innerHTML.includes('/sellos/#'+token));assert.doesNotMatch(h.root.innerHTML,/id="registrationForm"/);
});
test('corrupt saved card never becomes an executable link',async()=>{
  const h=harness(()=>response({error:{message:'Programa no disponible'}},404),{stored:{[`qori:stamp-registration:${program}:card`]:'javascript:alert(1)'}});
  await settle();assert.doesNotMatch(h.root.innerHTML,/javascript:|Abrir mi tarjeta guardada/);
});
test('a lost enrollment response retries with the same key, trimmed email and retained form',async()=>{
  for(const blockedStorage of [false,true]){
    let posts=0;const bodies=[];
    const h=harness((_,o)=>{if(o.method==='GET')return response(fixture);bodies.push(JSON.parse(o.body));return ++posts===1?{ok:true,json:async()=>{throw Error('network interrupted');}}:response({url:'https://qori.test/sellos/#'+token});},{blockedStorage});
    await settle();const form=h.root.querySelector('form');await h.submit();assert.equal(form.querySelector('button').disabled,false);
    assert.match(h.root.querySelector('#registrationMessage').textContent,/Vuelve a intentarlo/);await h.submit();
    assert.equal(bodies[0].access_key,bodies[1].access_key);assert.match(bodies[0].access_key,/^[a-f0-9]{64}$/);assert.equal(bodies[0].email,'qa@example.test');
    assert.deepEqual(h.navigations,['/sellos/#'+token]);assert.equal(h.timers.size,0);
  }
});
test('a stalled submission times out, prevents duplicates and re-enables retry',async()=>{
  const h=harness((_,o)=>o.method==='GET'?response(fixture):new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted')))));
  await settle();const pending=h.submit();await h.submit();assert.equal(h.calls.filter(c=>c.options.method==='POST').length,1);
  for(const timer of [...h.timers.values()])timer();await pending;
  assert.equal(h.root.querySelector('form').querySelector('button').disabled,false);assert.match(h.root.querySelector('#registrationMessage').textContent,/Revisa tu conexión/);assert.equal(h.timers.size,0);
});
const portal=fs.readFileSync(require.resolve('../empresa/js/stamp-cards.js'),'utf8');
test('paused QR warns the manager; failed native sharing falls back to copying except cancellation',async()=>{
  for(const name of ['NotAllowedError','AbortError']){
    const elements={};let copied=0;
    const dialog={isConnected:true,open:true,querySelector:selector=>elements[selector]??={textContent:'',insertAdjacentHTML(_,value){this.inserted=value;}}};
    const ctx={dialog:()=>dialog,businessScopeKey:()=>1,isCurrentBusinessScope:()=>true,ctx:{business:{name:'QA'}},esc:String,
      apiCall:async()=>({program_status:'PAUSED',program_name:'QA',qr_image:'data:image/png;base64,AA',url:'https://qori.test/sellos/inscripcion.html?programa='+program}),
      navigator:{share:async()=>{const e=Error('unavailable');e.name=name;throw e;},clipboard:{writeText:async()=>{copied++;}}}};
    vm.runInNewContext(portal.slice(portal.indexOf('  async function registrationQr('),portal.indexOf('  function enrollForm(')),ctx);
    await ctx.registrationQr(program);assert.match(elements['.sc-registration-qr'].inserted,/Programa pausado/);
    await elements['#scShareRegistration'].onclick();assert.equal(copied,name==='AbortError'?0:1);
  }
});
