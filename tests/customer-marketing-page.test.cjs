const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'qori-web/qori-customer'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),script=fs.readFileSync(path.join(dir,'customer.js'),'utf8');
function page(){const dom=new JSDOM(html,{url:'https://gosqori.com/qori-customer/',runScripts:'outside-only'});dom.window.eval(script);return dom;}
test('All supplied images have real optimized variants and are reachable from the page',()=>{
 const dom=page(),doc=dom.window.document,manifest=JSON.parse(fs.readFileSync(path.join(dir,'images.json'),'utf8'));
 assert.equal(Object.keys(manifest).length,31);
 for(const item of Object.values(manifest))for(const v of item.variants){assert.equal(fs.statSync(path.join(dir,'assets',v.file)).size,v.bytes);assert.ok(html.includes('assets/'+v.file),v.file);}
 const ids=[...doc.querySelectorAll('[id]')].map(e=>e.id);assert.equal(ids.length,new Set(ids).size);
 for(const a of doc.querySelectorAll('a[href^="#"]'))assert.ok(doc.getElementById(a.hash.slice(1)),a.hash);
 for(const el of doc.querySelectorAll('img[src^="assets/"]')){assert.ok(el.alt);assert.ok(el.width>0&&el.height>0);assert.ok(el.srcset);assert.ok(el.sizes);if(el.getAttribute('fetchpriority')!=='high')assert.equal(el.getAttribute('loading'),'lazy');}
 assert.equal(doc.querySelectorAll('[fetchpriority=high]').length,1);
 assert.ok(!/assets\/[^"]+\.png/.test(html));assert.ok(!html.includes('\uFFFD'));
 JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
 dom.window.close();
});
test('All gallery controls update their image, caption and accessible selected state',()=>{
 const dom=page(),doc=dom.window.document;assert.equal(doc.querySelectorAll('[data-explorer]').length,5);
 for(const gallery of doc.querySelectorAll('[data-explorer]')){
  const tabs=[...gallery.querySelectorAll('[role=tab]')],panel=gallery.querySelector('[role=tabpanel]');
  const verify=tab=>{assert.equal(gallery.querySelectorAll('[aria-selected=true]').length,1);assert.equal(tab.tabIndex,0);assert.equal(panel.getAttribute('aria-labelledby'),tab.id);assert.equal(panel.querySelector('img').getAttribute('src'),tab.dataset.image);assert.equal(panel.querySelector('img').getAttribute('srcset'),tab.dataset.srcset);assert.equal(panel.querySelector('img').alt,'Ilustración de '+tab.dataset.title);assert.equal(panel.querySelector('[data-preview-description]').textContent,tab.dataset.description);};
  for(const tab of tabs){tab.click();verify(tab);}
  function key(tab,name,expected){tab.focus();tab.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));verify(expected);assert.equal(doc.activeElement,expected);}
  key(tabs.at(-1),'ArrowRight',tabs[0]);key(tabs[0],'ArrowLeft',tabs.at(-1));key(tabs.at(-1),'Home',tabs[0]);key(tabs[0],'End',tabs.at(-1));
 }
 dom.window.close();
});
test('Mobile navigation closes after selection or Escape; copy remains usable without JS',()=>{
 const dom=page(),doc=dom.window.document,menu=doc.querySelector('.qc-mobile-menu');
 menu.open=true;menu.querySelector('a').addEventListener('click',e=>e.preventDefault());menu.querySelector('a').click();assert.equal(menu.open,false);
 menu.open=true;menu.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.open,false);assert.equal(doc.activeElement,menu.querySelector('summary'));
 const plain=new JSDOM(html);assert.equal(plain.window.document.querySelectorAll('[role=tabpanel] img').length,5);assert.ok(plain.window.document.querySelector('a[href="/customer/#home"]'));assert.ok(plain.window.document.querySelector('noscript'));
 plain.window.close();dom.window.close();
});
