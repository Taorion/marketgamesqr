const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
(async()=>{
 const expected=process.argv[2];assert.match(expected,/^[a-f0-9]{40}$/);
 const get=p=>fetch('https://gosqori.com'+p,{redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
 const v=await(await get('/api/version?release='+Date.now())).json();console.log(JSON.stringify({expected,served:v.render_git_commit}));if(v.render_git_commit!==expected){process.exitCode=2;return;}
 assert.equal((await(await get('/api/health')).json()).ok,true);
 const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
 const assets=['customer-web/benefit-entry.js','customer-web/public-benefit-invite.js','customer-web/courtesies.js','customer-web/product-gifts.js','customer-web/index.html','claim/index.html','claim/app.js','claim/styles.css','reward-pass-public/index.html','reward-pass-public/app.js','stamp-card-public/index.html','stamp-card-public/app.js','stamp-card-public/inscripcion.html','carnet-afiliado/index.html','activacion/index.html','activacion/activation.js','activacion/customer-context.js','trivia/index.html','empresa/index.html','empresa/js/customer-gifts.js','pense-en-ti/index.html'];
 for(let i=0;i<assets.length;i+=4)await Promise.all(assets.slice(i,i+4).map(async f=>{const url='/'+f.replace(/^customer-web\//,'customer/').replace(/^reward-pass-public\//,'rp/').replace(/^stamp-card-public\//,'sellos/');const r=await get(url+'?release='+expected);assert.equal(r.status,200,url);assert.equal(hash(await r.text()),hash(fs.readFileSync(f,'utf8')),url);}));
 const paths=['/claim/public-release-check','/rp/public-release-check','/sellos/','/carnet-afiliado/public-release-check','/activacion/public-release-check','/trivia/public-release-check'];
 for(const p of paths){const r=await get(p);assert.equal(r.status,200,p);assert.match(await r.text(),/optional-benefits-20261109/);}
 const stamp='/sellos/inscripcion.html?programa=5fade592-627d-459a-83d9-3aab76c2a877';assert.equal((await get(stamp)).status,200);assert.equal((await get('/api/public/stamp-cards/programs/5fade592-627d-459a-83d9-3aab76c2a877')).status,200);
 const legacy=await get('/customer/?continue='+encodeURIComponent(stamp));assert.equal(legacy.status,303);assert.equal(legacy.headers.get('location'),stamp);
 assert.equal((await get('/customer/?benefit='+encodeURIComponent(stamp))).status,200);
 assert.equal((await get('/customer/?continue='+encodeURIComponent('https://example.test/claim/invalid'))).status,200);
 for(const p of ['/api/customer/wallet','/api/seller/dashboard','/api/admin/commercial/bootstrap'])assert.equal((await get(p)).status,401,p);
 console.log(JSON.stringify({sha:expected,health:true,assets_exact:assets.length,public_pages:paths.length+1,alipunto_program_public:true,legacy_link:true,private_routes:3,production_test_writes:0}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
