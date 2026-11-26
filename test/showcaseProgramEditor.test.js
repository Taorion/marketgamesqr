const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<form id="smartCatalogForm"><label><select name="redemption_mode"><option>STAMP_PROGRAMS</option><option>ACTIVATIONS</option><option>COMMERCE</option></select></label><label><input name="whatsapp_number"></label><label><input name="default_cta_label"></label></form>',{runScripts:'outside-only'});
 const w=dom.window;w.authHeaders=()=>({});w.api=async(path,o)=>{assert.equal(o.noClientCache,true);return {programs:[{id:'a',name:'Café',stamps_required:5,status:'ACTIVE'},{id:'b',name:'Almuerzo',stamps_required:8,status:'ACTIVE'}],activations:[{id:'game',title:'Juego',status:'ACTIVE'}]};};
 w.eval(fs.readFileSync('empresa/js/catalog-showcases.js','utf8'));return w;
}
const saved={metadata:{stamp_program_ids:['a']}};
test('editing distinguishes saved and available programs, adds and removes only on save, and reopens saved selections',async()=>{
 const w=setup();try{
 await w.QoriCatalogShowcases.setupForm(saved);
 const groups=w.document.querySelectorAll('.qs-picker-group');assert.match(groups[0].textContent,/Ya incluidos.*Café/s);assert.match(groups[1].textContent,/Disponibles.*Almuerzo/s);
 assert.equal(w.document.querySelector('input[value=a]').checked,true);const b=w.document.querySelector('input[value=b]');b.checked=true;b.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.match(w.document.querySelector('[data-program-message]').textContent,/1 para añadir/);
 assert.deepEqual(Array.from(w.QoriCatalogShowcases.formMetadata().stamp_program_ids),['a','b']);assert.deepEqual(saved.metadata.stamp_program_ids,['a']);
 await w.QoriCatalogShowcases.setupForm({metadata:{stamp_program_ids:['a','b']}});assert.equal(w.document.querySelectorAll('.qs-picker-group')[0].querySelectorAll('input:checked').length,2);
 w.document.querySelector('input[value=a]').checked=false;assert.deepEqual(Array.from(w.QoriCatalogShowcases.formMetadata().stamp_program_ids),['b']);
 }finally{w.close();}
});
test('refresh keeps edits and fetches new programs, unavailable saved programs require explicit removal',async()=>{
 const w=setup();try{
 await w.QoriCatalogShowcases.setupForm(saved);w.document.querySelector('input[value=b]').checked=true;
 w.api=async()=>({programs:[{id:'a',name:'Café',stamps_required:5,status:'PAUSED'},{id:'b',name:'Almuerzo',status:'ACTIVE'},{id:'c',name:'Nuevo',status:'ACTIVE'}]});
 w.document.querySelector('button').click();await new Promise(r=>setTimeout(r,0));assert.equal(w.document.querySelector('input[value=b]').checked,true);assert.ok(w.document.querySelector('input[value=c]'));assert.match(w.document.body.textContent,/Pausado/);
 await w.QoriCatalogShowcases.setupForm({metadata:{stamp_program_ids:['deleted']}});assert.throws(()=>w.QoriCatalogShowcases.formMetadata(),/Desmarca/);w.document.querySelector('input[value=deleted]').checked=false;assert.equal(w.QoriCatalogShowcases.formMetadata().stamp_program_ids.length,0);
 }finally{w.close();}
});
test('load failures cannot clear the saved selection and activation editing remains compatible',async()=>{
 const w=setup();try{
 w.api=async()=>{throw Error('Sin conexión');};await w.QoriCatalogShowcases.setupForm(saved);assert.throws(()=>w.QoriCatalogShowcases.formMetadata(),/Espera/);assert.match(w.document.body.textContent,/Sin conexión/);
 w.api=async()=>({activations:[{id:'game',title:'Juego',status:'ACTIVE'}]});w.document.querySelector('select').value='ACTIVATIONS';await w.QoriCatalogShowcases.setupForm({metadata:{activation_ids:['game']}});assert.deepEqual(Array.from(w.QoriCatalogShowcases.formMetadata().activation_ids),['game']);
 }finally{w.close();}
});
