// LOCAL QA ONLY: independent participant sessions, real controller, DB and WebSocket.
// This server is never mounted by the production app. No prizes or production data.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55447/qori_chase_browser_qa';
process.env.DB_SSL='false';process.env.JWT_SECRET='chase-browser-local-only';
const express=require('express'),path=require('node:path');
const {pool,query}=require('../backend/src/config/db'),fixture=require('../test/helpers/chaseFixture');
async function main(){
  fixture.guard();await fixture.schema(query);const activation=await fixture.activation(query);
  const app=express();app.use(express.json());
  app.post('/qa/participant',async(req,res,next)=>{try{res.json(await fixture.player(query,activation));}catch(e){next(e);}});
  app.post('/api/public/activations/:slug/chase',require('../backend/src/controllers/chaseController').action);
  app.use('/activacion',express.static(path.join(__dirname,'../activacion')));
  app.get('/qa',(req,res)=>res.type('html').send(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Policías y Ladrones · Qori · QA local</title><link rel="stylesheet" href="/activacion/policias.css"><body class="chase-preview-page"><main id="game"></main><script src="/activacion/policias-core.js"></script><script src="/activacion/policias-view.js"></script><script src="/activacion/policias.js"></script><script>
  (async()=>{const key='qa-chase-'+(new URLSearchParams(location.search).get('seat')||'one');let p=JSON.parse(sessionStorage.getItem(key)||'null');if(!p){p=await fetch('/qa/participant',{method:'POST'}).then(r=>r.json());sessionStorage.setItem(key,JSON.stringify(p));}QoriChase.mount(document.querySelector('#game'),{request:async(body,{signal}={})=>{const r=await fetch('/api/public/activations/barrio/chase',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({...body,participant_id:p.participant_id,game_session_token:p.game_session_token})});const data=await r.json();if(!r.ok)throw Error(data.message);return data;},onExit:()=>{sessionStorage.removeItem(key);location.reload();},onResult:()=>{}});})();
  </script></body></html>`));
  app.use((err,req,res,next)=>res.status(err.statusCode||400).json({message:err.message}));
  const server=app.listen(3098,'127.0.0.1',()=>console.log('QA local: http://127.0.0.1:3098/qa'));
  const stop=require('../backend/src/services/chaseLiveService').attach(server);
  process.on('SIGTERM',()=>{stop();server.close(()=>pool.end());});
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
