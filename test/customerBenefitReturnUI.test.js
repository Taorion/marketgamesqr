const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(require.resolve('../customer-web/benefit-entry.js'),'utf8'),target='/sellos/inscripcion.html?programa=5fade592-627d-459a-83d9-3aab76c2a877';
function setup({stored={},blocked=false,next=target,pathname='/customer/'}={}){
 const w=new JSDOM('<div id="app"><p>Abriendo tu espacio…</p></div>',{url:'https://gosqori.com/customer/'}).window,navigations=[];
 const storage={getItem:k=>{if(blocked)throw Error('Blocked storage');return stored[k]||null;},setItem:(k,v)=>{if(blocked)throw Error('Blocked storage');stored[k]=v;},removeItem:k=>{if(blocked)throw Error('Blocked storage');delete stored[k];}};
 w.fetch=async()=>({status:200});const location={origin:'https://gosqori.com',search:'?continue='+encodeURIComponent(next),pathname,replace:url=>navigations.push(url)};
 vm.runInNewContext(source,{window:w,document:w.document,sessionStorage:storage,location,URL,URLSearchParams,MutationObserver:w.MutationObserver,Date,Headers,Request});return {w,navigations,stored};
}
test('verified session returns to the exact benefit and replaces the generic boot screen',()=>{
 const h=setup();try{assert.equal(h.w.QoriBenefitReturn(),true);assert.deepEqual(h.navigations,[target]);assert.doesNotMatch(h.w.document.body.textContent,/Abriendo tu espacio/);assert.match(h.w.document.body.textContent,/Abriendo tu beneficio/);assert.equal(h.w.document.querySelector('a.primary').getAttribute('href'),target);assert.equal(h.w.QoriBenefitReturn(),false);}finally{h.w.close();}
});
test('a repeated redirect stops automatically and offers reachable navigation',()=>{
 const h=setup({stored:{'qori-benefit-attempt':JSON.stringify({url:target,at:Date.now()})}});try{assert.equal(h.w.QoriBenefitReturn(),true);assert.deepEqual(h.navigations,[]);assert.match(h.w.document.body.textContent,/No pudimos abrir tu beneficio/);assert.equal(h.w.document.querySelector('a.primary').getAttribute('href'),target);assert.equal(h.w.document.querySelector('a.secondary').getAttribute('href'),'/customer/#home');}finally{h.w.close();}
});
test('restricted browser storage does not break startup or lose the current benefit',()=>{
 const h=setup({blocked:true});try{assert.equal(h.w.QoriBenefitReturn(),true);assert.deepEqual(h.navigations,[target]);}finally{h.w.close();}
});
test('outside destinations and normalized path traversal are never followed',()=>{
 for(const next of ['https://evil.test/','//evil.test/','/sellos/../../admin/','/sellos/\\evil.test','/customer/']){const h=setup({next});try{assert.equal(h.w.QoriBenefitReturn(),false);assert.deepEqual(h.navigations,[]);}finally{h.w.close();}}
});
test('arriving at the protected benefit clears the attempt marker',()=>{
 const h=setup({pathname:'/sellos/inscripcion.html',stored:{'qori-benefit-attempt':'previous'}});try{assert.equal(h.stored['qori-benefit-attempt'],undefined);}finally{h.w.close();}
});
