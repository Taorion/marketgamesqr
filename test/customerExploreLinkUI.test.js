const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(require.resolve('../customer-web/explore.js'),'utf8'),program='5fade592-627d-459a-83d9-3aab76c2a877',path='/sellos/inscripcion.html?programa='+program;
const settle=()=>new Promise(r=>setImmediate(r));
function harness(request){
 const dom=new JSDOM('<main id="page"></main>',{url:'https://gosqori.com/customer/#scan'}),w=dom.window,navigations=[],errors=[],location={hash:'#scan',assign:url=>navigations.push(url)};
 w.HTMLCanvasElement.prototype.getContext=()=>{throw Error('Canvas unavailable');};
 vm.runInNewContext(source,{window:w,document:w.document,navigator:w.navigator,location,FormData:w.FormData,URL,Intl,setTimeout,clearTimeout,cancelAnimationFrame(){},requestAnimationFrame(){return 1;}});
 const page=w.document.querySelector('#page'),ctx={request,account:{id:'account'},showError:message=>errors.push(message)};
 return {dom,w,page,ctx,navigations,location,render:route=>w.QoriExplore.render(page,ctx,route),submit:value=>{page.querySelector('[name=url]').value=value;page.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));},button:()=>page.querySelector('#scanLink button')};
}
test('paste works without camera/canvas; duplicate submits wait and valid enrollment navigates',async()=>{
 let done,calls=0,body;const h=harness((_,b)=>{calls++;body=b;return new Promise(r=>done=r);});await h.render('scan');h.submit('  https://gosqori.com'+path+'  ');h.submit('https://gosqori.com'+path);
 assert.equal(calls,1);assert.equal(body.url,'https://gosqori.com'+path);assert.equal(h.button().disabled,true);assert.match(h.page.textContent,/comprobando el enlace/);assert.ok(h.page.querySelector('#scanLink #scanStatus'));
 done({url:path});await settle();assert.deepEqual(h.navigations,[path]);h.dom.window.close();
});
test('request failure leaves the pasted link and enables retry with a visible message',async()=>{
 let count=0;const h=harness(async()=>{if(!count++)throw Error('La conexión está tardando. Inténtalo de nuevo.');return {url:path};});await h.render('scan');h.submit('https://gosqori.com'+path);await settle();
 assert.equal(h.button().disabled,false);assert.equal(h.page.querySelector('[name=url]').value,'https://gosqori.com'+path);assert.match(h.page.querySelector('#scanLink').textContent,/La conexión está tardando/);assert.equal(h.page.querySelector('form').hasAttribute('aria-busy'),false);
 h.submit('https://gosqori.com'+path);await settle();assert.deepEqual(h.navigations,[path]);h.dom.window.close();
});
test('a late response after leaving the scanner cannot redirect the user',async()=>{
 let done;const h=harness(()=>new Promise(r=>done=r));await h.render('scan');h.submit('https://gosqori.com'+path);h.w.QoriExplore.stop();done({url:path});await settle();assert.deepEqual(h.navigations,[]);h.dom.window.close();
});
test('unexpected or external resolver destinations never navigate or leave loading active',async()=>{
 for(const response of [{url:'https://evil.test/'},{url:'//evil.test'},{hash:'#home'},{}]){
  const h=harness(async()=>response);await h.render('scan');h.submit('https://gosqori.com'+path);await settle();assert.deepEqual(h.navigations,[]);assert.equal(h.location.hash,'#scan');assert.match(h.page.textContent,/reconocer el destino/);assert.equal(h.button().disabled,false);h.dom.window.close();
 }
});
test('published-benefit links retain in-Customer navigation',async()=>{
 const h=harness(async()=>({hash:'#publication/'+program}));await h.render('scan');h.submit('https://gosqori.com/customer/#publication/'+program);await settle();assert.equal(h.location.hash,'#publication/'+program);h.dom.window.close();
});
test('publication load errors replace the waiting message and can retry safely',async()=>{
 let failed=true;const h=harness(async url=>{if(failed)throw Error('<img src=x onerror=alert(1)> Programa no disponible');if(url==='/discovery/me')return {saved:[],requests:[]};return {publication:{id:program,kind:'STAMP',title:'ALIPUNTOS',business_name:'Rey del sabor',business_slug:'rey',url:'https://gosqori.com/customer/#publication/'+program}};});
 await h.render('publication/'+program);assert.doesNotMatch(h.page.textContent,/Buscando lo bueno/);assert.match(h.page.querySelector('[role=alert]').textContent,/Programa no disponible/);assert.equal(h.page.querySelector('img'),null);
 failed=false;await h.page.querySelector('#retryExplore').onclick();assert.match(h.page.textContent,/ALIPUNTOS/);assert.ok(h.page.querySelector('#offerAction'));h.dom.window.close();
});
