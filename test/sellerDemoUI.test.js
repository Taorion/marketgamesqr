const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
test('Demo login clearly uses Seller credentials and keeps an explicit return to Seller',()=>{
 const w=new JSDOM('<body><form id="loginForm"></form><section id="workspace"><div class="content-shell"></div></section></body>',{url:'https://example.test/empresa/?demo=1',runScripts:'outside-only'}).window;
 try{w.eval(fs.readFileSync('empresa/js/seller-demo.js','utf8'));assert.match(w.document.body.textContent,/mismo correo y contraseña de Qori Seller/);assert.match(w.document.body.textContent,/datos ficticios/);assert.equal(w.document.querySelector('#qoriDemoBanner a').getAttribute('href'),'/seller/');w.QoriSellerDemo.render({demo_mode:true});assert.equal(w.document.querySelectorAll('#qoriDemoBanner').length,1);assert.ok(w.document.querySelector('#workspace .content-shell > #qoriDemoBanner'));w.QoriSellerDemo.render();assert.equal(w.document.querySelector('#qoriDemoBanner').parentNode,w.document.body);}finally{w.close();}
});
test('normal business login gets no demo banner and demo storage cleanup preserves normal business credentials',()=>{
 const w=new JSDOM('<form id="loginForm"></form>',{url:'https://example.test/empresa/',runScripts:'outside-only'}).window;
 try{w.eval(fs.readFileSync('empresa/js/seller-demo.js','utf8'));assert.equal(w.document.querySelector('#qoriDemoBanner'),null);}finally{w.close();}
 const app=fs.readFileSync('empresa/js/app.js','utf8'),start=app.indexOf('function isPortalStorageKey('),end=app.indexOf('function isPortalCacheKey(',start);
 const c={SELLER_DEMO_MODE:true,SESSION_KEY:'qori_demo_portal_session_v1',VALIDATOR_SESSION_KEY:'qori_demo_validator_session_v1'};vm.createContext(c);vm.runInContext(app.slice(start,end),c);
 assert.equal(c.isPortalStorageKey('qr_business_portal_session_v1'),false);assert.equal(c.isPortalStorageKey('qori_demo_portal_session_v1'),true);assert.equal(c.isPortalStorageKey('market_games_admin_session_v1'),false);
});
