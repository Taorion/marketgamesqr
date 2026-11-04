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
  const searches=calls.filter(c=>c.url.startsWith('/explore/directory')).length;
  page.querySelector('[data-kind="STAMP"]').click();
  await new Promise(r=>setImmediate(r));
  assert.equal(calls.filter(c=>c.url.startsWith('/explore/directory')).length,searches+1);
  assert.equal(page.querySelector('#businessResults').hidden,false);
  assert.ok(page.querySelector('#businessMatches a[href="#business/rey-del-sabor"]'));
  await w.QoriExplore.render(page,ctx,'business/rey-del-sabor');
  assert.match(page.textContent,/No hay publicaciones disponibles/);
  await page.querySelector('#followBusiness').onclick({target:page.querySelector('#followBusiness')});
  assert.equal(calls.at(-1).url,'/favorites/business-1');assert.equal(calls.at(-1).method,'POST');
  assert.match(page.querySelector('#followBusiness').textContent,/Siguiendo/);assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('a named business with unpublished location is shown separately from the city filter',async()=>{
 const w=new JSDOM('<main id="page"></main>',{url:'http://localhost/customer/#explore',runScripts:'outside-only'}).window,calls=[];
 const ctx={account:null,showError:e=>{throw Error(e);},request:async url=>{
  calls.push(url);
  if(url.startsWith('/explore/directory')){
   const params=new URL(url,'http://localhost').searchParams;
   return {businesses:params.get('search')&&!params.get('city')?[{id:'rey',name:'Rey del sabor',slug:'rey-del-sabor',city:null}]:[],next_offset:null};
  }
  return {publications:[],next_offset:null};
 }};
 try{
  w.eval(source);const page=w.document.querySelector('#page');await w.QoriExplore.render(page,ctx,'explore');
  const form=page.querySelector('#exploreSearch');form.elements.search.value='El Rey del Sabor';form.elements.city.value='Bogotá';
  form.onsubmit({preventDefault(){},stopPropagation(){}});
  for(let i=0;i<20&&!page.querySelector('#businessMatches a');i++)await new Promise(r=>setImmediate(r));
  assert.ok(page.querySelector('#businessMatches a[href="#business/rey-del-sabor"]'));
  const notice=page.querySelector('#businessMatchNotice');assert.equal(notice.hidden,false);assert.match(notice.textContent,/no publicaron su ubicación/);
  assert.ok(calls.some(u=>u.startsWith('/explore/directory?')&&u.includes('city=Bogot%C3%A1')));
  assert.ok(calls.some(u=>u.startsWith('/explore/directory?')&&u.includes('search=El+Rey+del+Sabor')&&!u.includes('city=')));
  assert.equal(page.querySelector('#businessMatches').textContent.includes('Bogotá'),false);
 }finally{w.close();}
});
