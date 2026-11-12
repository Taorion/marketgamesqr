const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const settle=()=>new Promise(r=>setImmediate(r));
const links=['PENSE_EN_TI','DESPEGA','STARTER','GROWTH','PRO'].map((code,i)=>({code,name:['Pensé en ti','Despega','Crece','Escala','Expande'][i],monthly_price_cop:i?75000*i:0,summary:'Plan <seguro>',url:'https://example.test/'+(i?'paquetes/?advisor=s&plan='+code:'pense-en-ti/?seller=s')+'&prospect_ref=exact-token'}));
test('all five personal plan cards copy and share the exact link; clipboard failure offers manual copy',async()=>{
 const w=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'}).window;let copied='',fail=false,current=true;
 try{Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{if(fail)throw Error('denied');copied=text;}}});w.eval(fs.readFileSync('seller/referral-links.js','utf8'));
  const host=w.document.getElementById('host');w.QoriSellerReferralLinks.render(host,links,{isCurrent:()=>current});assert.equal(host.querySelectorAll('article').length,5);assert.equal(host.querySelector('seguro'),null);
  for(const plan of links){const card=host.querySelector('[data-plan-code='+plan.code+']');assert.equal(card.querySelector('input').value,plan.url);assert.ok(new URL(card.querySelector('[data-whatsapp]').href).searchParams.get('text').endsWith(plan.url));card.querySelector('button').click();await settle();assert.equal(copied,plan.url);}
  fail=true;const card=host.querySelector('article');card.querySelector('button').click();await settle();assert.equal(w.document.activeElement,card.querySelector('input'));assert.match(card.querySelector('[role=status]').textContent,/Selecciona y copia/);
  fail=false;current=false;card.querySelector('[role=status]').textContent='';card.querySelector('button').click();await settle();assert.equal(card.querySelector('[role=status]').textContent,'');
 }finally{w.close();}
});
test('CRM plan selector preserves its prospect token and email when changing between plans',()=>{
 const w=new JSDOM('<dialog><label>Enlace<textarea data-link></textarea></label><a data-whatsapp></a><p data-status></p></dialog>',{runScripts:'outside-only'}).window;
 try{w.eval(fs.readFileSync('seller/referral-links.js','utf8'));const dialog=w.document.querySelector('dialog'),referral={email:'client@example.test',plan_referral_url:'https://example.test/paquetes/?advisor=s&prospect_ref=exact-token',plan_referral_links:links};
  w.QoriSellerReferralLinks.bindProspectPlan(dialog,referral);const select=dialog.querySelector('select');assert.equal(select.options.length,5);
  for(const plan of links.slice(1)){select.value=plan.code;select.dispatchEvent(new w.Event('change'));assert.equal(dialog.querySelector('textarea').value,plan.url);const text=new URL(dialog.querySelector('a').href).searchParams.get('text');assert.ok(text.includes(referral.email));assert.ok(text.endsWith(plan.url));}
  select.value='';select.dispatchEvent(new w.Event('change'));assert.equal(dialog.querySelector('textarea').value,referral.plan_referral_url);
 }finally{w.close();}
});
