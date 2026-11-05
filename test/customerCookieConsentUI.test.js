const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom');
const code=fs.readFileSync('qori-web/js/cookie-consent.js','utf8');
function setup(choice){
 const w=new JSDOM('<button data-cookie-settings>Configurar cookies</button>',{url:'https://example.test/customer/',runScripts:'outside-only'}).window;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.localStorage.setItem('qori-book:account','private-book');w.localStorage.setItem('qori-session-change','session-marker');w.document.cookie='unrelated-session=test';if(choice)w.localStorage.setItem('qori-cookie-choice',JSON.stringify(choice));w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));return w;
}
test('optional persistence is off initially; reject clears only pocket preferences and keeps the session',()=>{
 const w=setup();try{assert.equal(w.QoriCookies.preferencesAllowed(),false);assert.equal(w.localStorage.getItem('qori-book:account'),null);assert.ok(w.document.querySelector('.qori-cookie-banner'));
  w.document.querySelector('.qori-cookie-banner [data-reject]').click();assert.equal(w.document.querySelector('.qori-cookie-banner'),null);assert.equal(JSON.parse(w.localStorage.getItem('qori-cookie-choice')).preferences,false);
  assert.equal(w.localStorage.getItem('qori-session-change'),'session-marker');assert.match(w.document.cookie,/unrelated-session=test/);
 }finally{w.close();}
});
test('accept, configure and withdraw persist a dated decision without account or financial data',()=>{
 const w=setup();try{w.document.querySelector('.qori-cookie-banner [data-accept]').click();assert.equal(w.QoriCookies.preferencesAllowed(),true);w.localStorage.setItem('qori-book:account','home');
  w.document.querySelector('[data-cookie-settings]').click();assert.equal(w.document.querySelector('dialog [name=preferences]').checked,true);w.document.querySelector('[name=preferences]').checked=false;w.document.querySelector('[data-save]').click();
  assert.equal(w.QoriCookies.preferencesAllowed(),false);assert.equal(w.localStorage.getItem('qori-book:account'),null);const c=JSON.parse(w.localStorage.getItem('qori-cookie-choice'));assert.deepEqual(Object.keys(c).sort(),['necessary','preferences','saved_at','version']);assert.ok(c.saved_at);
 }finally{w.close();}
});
test('choice survives a new visit, expires after 180 days and syncs revocation across tabs',()=>{
 const accepted={version:'2026-11-05',necessary:true,preferences:true,saved_at:Date.now()},w=setup(accepted);try{
  assert.equal(w.document.querySelector('.qori-cookie-banner'),null);assert.equal(w.localStorage.getItem('qori-book:account'),'private-book');
  w.localStorage.setItem('qori-cookie-choice',JSON.stringify({...accepted,preferences:false}));w.dispatchEvent(new w.StorageEvent('storage',{key:'qori-cookie-choice'}));assert.equal(w.QoriCookies.preferencesAllowed(),false);assert.equal(w.localStorage.getItem('qori-book:account'),null);
 }finally{w.close();}
 const expired=setup({...accepted,saved_at:Date.now()-181*86400000});try{assert.equal(expired.QoriCookies.preferencesAllowed(),false);assert.ok(expired.document.querySelector('.qori-cookie-banner'));}finally{expired.close();}
});
test('blocked storage still allows a choice and truthfully explains that it is temporary',()=>{
 const w=setup();try{w.Storage.prototype.setItem=()=>{throw Error('blocked');};w.document.querySelector('.qori-cookie-banner [data-accept]').click();assert.equal(w.QoriCookies.preferencesAllowed(),true);assert.match(w.document.querySelector('#qoriCookieStatus').textContent,/esta pestaña/);}finally{w.close();}
});
