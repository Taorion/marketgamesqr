const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('activacion/activation.js','utf8');
const resume=source.slice(source.indexOf('async function resumeSummitSession()'),source.indexOf('async function startGameSession('));
function setup(room){
 let removed=false,rendered=false;
 const context=vm.createContext({location:{pathname:'/activacion/family',search:''},currentActivation:{public_slug:'family'},
  sessionStorage:{getItem:()=>JSON.stringify({participant_id:'player',game_session_token:'session'}),removeItem(){removed=true;}},
  api:async()=>({room}),participantForm:{classList:{add(){}}},renderMinigame(){rendered=true;}});
 return {context,removed:()=>removed,rendered:()=>rendered,run:()=>vm.runInContext(resume+'\nresumeSummitSession()',context)};
}
test('an expired room allows a fresh participation after a physics update',async()=>{
 const env=setup({status:'expired',own:{result:null}});
 assert.equal(await env.run(),false);assert.equal(env.removed(),true);assert.equal(env.rendered(),false);
});
test('a confirmed prize remains recoverable and an active room resumes',async()=>{
 for(const status of ['finished','racing']){
  const env=setup({status,own:{result:status==='finished'?{rewarded:true}:null}});
  assert.equal(await env.run(),true);assert.equal(env.removed(),false);assert.equal(env.rendered(),true);
 }
});
