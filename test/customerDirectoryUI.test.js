const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const source=fs.readFileSync(path.join(__dirname,'../customer-web/explore.js'),'utf8');
test('Explore finds a business without offers, opens its profile and follows it',async()=>{
 const w=new JSDOM('<main id="page"></main>',{url:'http://localhost/customer/#explore',runScripts:'outside-only'}).window;
 const business={id:'business-1',name:'Rey del sabor <QA>',slug:'rey-del-sabor'},calls=[],errors=[];
 const ctx={account:{},showError:e=>errors.push(e),request:async(url,body,method)=>{
  calls.push({url,body,method});
  if(url.startsWith('/explore/directory'))return {businesses:new URL(url,'http://localhost').searchParams.get('search')==='El Rey del Sabor'?[business]:[],next_offset:null};
  if(url.startsWith('/explore/businesses/'))return {business,publications:[]};
  if(url==='/favorites')return {places:[]};
  return {publications:[],next_offset:null,ok:true};
 }};
 try{
  w.eval(source);const page=w.document.querySelector('#page');
  await w.QoriExplore.render(page,ctx,'explore');
  const form=page.querySelector('#exploreSearch');form.elements.search.value='El Rey del Sabor';
  await form.onsubmit({preventDefault(){},stopPropagation(){}});
  for(let i=0;i<20&&!page.querySelector('#businessMatches a');i++)await new Promise(r=>setImmediate(r));
  const link=page.querySelector('#businessMatches a');assert.equal(link.getAttribute('href'),'#business/rey-del-sabor');
  assert.match(page.querySelector('#businessMatches').textContent,/Rey del sabor <QA>/);assert.equal(page.querySelector('qa'),null);
  assert.equal(page.querySelector('#businessResults').hidden,false);assert.match(page.querySelector('#feedStatus').textContent,/No hay beneficios publicados/);
  await w.QoriExplore.render(page,ctx,'business/rey-del-sabor');
  assert.match(page.textContent,/No hay publicaciones disponibles/);
  await page.querySelector('#followBusiness').onclick({target:page.querySelector('#followBusiness')});
  assert.equal(calls.at(-1).url,'/favorites/business-1');assert.equal(calls.at(-1).method,'POST');
  assert.match(page.querySelector('#followBusiness').textContent,/Siguiendo/);assert.deepEqual(errors,[]);
 }finally{w.close();}
});
