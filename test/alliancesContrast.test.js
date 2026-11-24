const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom'),cssom=require('rrweb-cssom');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('legacy high-specificity portal colors exclude Alianzas but retain other views',()=>{
 const dom=new JSDOM('<html><body><div class="portal-shell"><div id="alliancesWorkspace"><div class="qa-hero"><h2>Alianzas</h2><p>Beneficio</p></div></div><section id="other"><h2>Ventas</h2><p>Resumen</p></section></div></body></html>');
 try{
 const rules=[...cssom.parse(read('empresa/css/portal-clean-v39.css')).cssRules].filter(r=>r.selectorText&&/qoriBrandA|qoriV131FinalA|qoriV132A/.test(r.selectorText)&&r.style.getPropertyValue('color'));
 for(const tag of ['h2','p']){
  const hero=dom.window.document.querySelector('.qa-hero '+tag),other=dom.window.document.querySelector('#other '+tag);
  const global=rules.filter(r=>other.matches(r.selectorText));assert.ok(global.length>=2);
  assert.ok(global.every(r=>!hero.matches(r.selectorText)),'legacy typography must not recolor the dark hero');
 }
 const white=cssom.parse(read('empresa/css/alliances.css')).cssRules;
 const rule=[...white].find(r=>r.selectorText==='#alliancesWorkspace .qa-hero :is(h2,p)');
 assert.equal(rule.style.getPropertyValue('color'),'#fff');assert.equal(rule.style.getPropertyPriority('color'),'important');
 assert.equal(rule.style.getPropertyValue('-webkit-text-fill-color'),'#fff');assert.equal(rule.style.getPropertyValue('opacity'),'1');
 const html=read('empresa/index.html');assert.match(html,/alliances-contrast=20261124/);assert.match(html,/alliance-contrast-v4-20261124/);
 }finally{dom.window.close();}
});
test('demo permits only alliance settlement records while real payment routes stay blocked',()=>{
 const {enforceDemoRequest}=require('../backend/src/services/sellerDemoService');
 const id='11111111-1111-4111-8111-111111111111',user={demo_mode:true,business_id:id};
 const check=(url,method='POST')=>enforceDemoRequest({user,originalUrl:url,method});
 assert.doesNotThrow(()=>check('/api/business/alliances/'+id+'/payments'));
 assert.doesNotThrow(()=>check('/api/business/alliances/'+id+'/payments/'+id+'/reverse'));
 for(const url of ['/api/business/payments','/api/payments/checkout','/api/business/alliances/'+id+'/payments/checkout','/api/business/alliances/'+id+'/payments/'+id+'/send'])assert.throws(()=>check(url),/demostración/);
 assert.throws(()=>check('/api/business/alliances/'+id+'/payments','PUT'),/demostración/);
});
