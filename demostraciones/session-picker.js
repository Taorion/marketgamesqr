(()=>{'use strict';
const zone='America/Bogota',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=v=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
const dateLabel=v=>new Intl.DateTimeFormat('es-CO',{timeZone:zone,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(v));
const hour=v=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(new Date(v)));
const time=v=>new Intl.DateTimeFormat('es-CO',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(v));
function mount(select,initialRows){
 let rows=initialRows,period='ALL',syncing=false;
 const label=select.closest('label'),panel=document.createElement('section'),fallback=document.createElement('details');panel.className='demo-picker';panel.setAttribute('aria-label','Selector rápido de sesión');label.before(panel);fallback.className='demo-picker-all';fallback.innerHTML='<summary>Ver lista completa de sesiones</summary>';panel.after(fallback);fallback.append(label);
 const eligible=()=>rows.filter(s=>period==='ALL'||(hour(s.starts_at)<12?'AM':'PM')===period);
 function choose(id){select.value=id;syncing=true;select.dispatchEvent(new Event('change',{bubbles:true}));syncing=false;}
 function draw(){
  const list=eligible();if(!list.some(s=>s.id===select.value))choose(list[0]?.id||'');const selected=list.find(s=>s.id===select.value),dates=[...new Map(list.map(s=>[day(s.starts_at),s.starts_at])).entries()],date=selected?day(selected.starts_at):'';
  panel.innerHTML=`<fieldset class="demo-period"><legend>1. ¿Qué jornada te conviene?</legend>${[['ALL','Cualquier hora'],['AM','Mañana'],['PM','Tarde']].map(([v,t])=>`<button type="button" data-period="${v}" aria-pressed="${period===v}">${t}</button>`).join('')}</fieldset><label>2. Elige el día<select data-quick-date ${dates.length?'':'disabled'}>${dates.map(([d,t])=>`<option value="${d}" ${d===date?'selected':''}>${esc(dateLabel(t))}</option>`).join('')}</select></label><fieldset class="demo-times"><legend>3. Elige la hora · Colombia</legend>${list.filter(s=>day(s.starts_at)===date).map(s=>`<button type="button" data-slot="${esc(s.id)}" aria-pressed="${s.id===select.value}"><strong>${esc(time(s.starts_at))}</strong><span>Hasta ${esc(time(s.ends_at))}</span></button>`).join('')||'<p role="status">No hay horarios disponibles en esta jornada. Prueba otra opción.</p>'}</fieldset>`;
  panel.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;draw();panel.querySelector('[data-period="'+period+'"]').focus({preventScroll:true});});
  panel.querySelector('[data-quick-date]').onchange=e=>{const previous=rows.find(s=>s.id===select.value),list=eligible().filter(s=>day(s.starts_at)===e.target.value);choose((list.find(s=>previous&&hour(s.starts_at)===hour(previous.starts_at))||list[0])?.id||'');draw();panel.querySelector('[data-quick-date]').focus({preventScroll:true});};
  panel.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{const id=b.dataset.slot;choose(id);draw();panel.querySelector('[data-slot="'+id+'"]').focus({preventScroll:true});});
 }
 select.addEventListener('change',()=>{if(syncing)return;period='ALL';draw();});draw();
 return {update(next){rows=next;draw();}};
}
window.QoriDemoSessionPicker={mount};
})();
