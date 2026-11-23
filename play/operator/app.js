'use strict';
const $=id=>document.getElementById(id);let overview,appId,accountId,metricsQuery='';
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function status(s,error=false){$('status').textContent=s;$('status').classList.toggle('error',error);}
async function api(path,body,method=body?'POST':'GET'){
 const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Qori-Web':'1',...(accountId?{'X-Qori-Account':accountId}:{}),...(appId?{'X-Qori-App':appId}:{})},body:body?JSON.stringify(body):undefined});
 const d=await r.json();if(!r.ok)throw Error(d.error?.code||d.message||'REQUEST_FAILED');return d;
}
const manage=(path,body,method)=>api('/api/play/v1/manage'+path,body,method);
const run=fn=>async e=>{e?.preventDefault();try{await fn(e);status('Cambios guardados');}catch(e){status(e.message,true);}};
function options(node,items,empty){node.replaceChildren();if(empty)node.add(new Option(empty,''));for(const x of items)node.add(new Option(x.name||x.config?.headline||x.id,x.id));}
function button(text,fn,style='secondary'){const b=el('button',text);b.type='button';b.className=style;b.onclick=run(fn);return b;}
async function refresh(){
 overview=await api('/api/developers/play/overview');options($('apps'),overview.apps);if(overview.apps.some(a=>a.id===appId))$('apps').value=appId;appId=$('apps').value;
 $('workspace').hidden=true;$('keys').replaceChildren();if(!appId)return;
 const current=overview.apps.find(a=>a.id===appId);$('enable').disabled=current.play;
 const d=await api('/api/developers/v1/overview');
 for(const k of (d.apps.find(a=>a.id===appId)?.keys||[]).filter(k=>!k.revoked_at)){const row=el('p',k.prefix+'… · '+k.scopes.join(', ')+' ');row.append(button('Revocar',async()=>{await api('/api/developers/v1/apps/'+appId+'/keys/'+k.id,null,'DELETE');await refresh();}));$('keys').append(row);}
 if(!current.play)return;const data=await manage('/dashboard');$('workspace').hidden=false;options($('locations'),data.locations);options($('sponsors'),data.sponsors);options($('metric-screen'),data.screens,'Todas');
 $('screens').replaceChildren();
 for(const s of data.screens){
  const card=el('article','');card.className='card';card.append(el('h3',s.name),el('p',(s.active?'Activa':'Revocada')+' · '+(Date.now()-new Date(s.last_seen_at)<15000?'En línea':'Sin conexión')+(s.paused?' · En pausa':'')),el('p',s.id));
  const pair=document.createElement('form'),code=document.createElement('input');code.placeholder='Código de 12 caracteres del Player';code.setAttribute('aria-label','Código temporal');code.required=true;code.pattern='[A-Fa-f0-9]{12}';const submit=el('button','Emparejar');pair.append(code,submit);pair.onsubmit=run(async()=>{await manage('/screens/'+s.id+'/pairing',{code:code.value.toUpperCase()});code.value='';});card.append(pair);
  const assign=document.createElement('form'),choice=document.createElement('select');choice.setAttribute('aria-label','Campaña de la pantalla');options(choice,data.campaigns.filter(c=>c.active));if(s.campaign_id)choice.value=s.campaign_id;assign.append(choice,el('button','Asignar campaña'));assign.onsubmit=run(async()=>{await manage('/screens/'+s.id+'/campaign',{campaign_id:choice.value},'PUT');await refresh();});card.append(assign);
  const actions=el('div','');actions.className='actions';actions.append(button(s.paused?'Reanudar':'Pausar',async()=>{await manage('/screens/'+s.id+'/state',{paused:!s.paused},'PUT');await refresh();}),button(s.active?'Revocar dispositivo':'Reactivar para emparejar',async()=>{await manage('/screens/'+s.id+'/state',{active:!s.active},'PUT');await refresh();},'danger'));card.append(actions);$('screens').append(card);
 }
 $('campaigns').replaceChildren();for(const c of data.campaigns){const card=el('article','');card.className='card';card.append(el('h3',c.config.headline),el('p',c.id+' · '+c.game_key+' · '+(c.active?'Activa':c.approved?'Pausada':'Pendiente del patrocinador')+' · Cupos: '+c.reward_cap));if(c.approved)card.append(button(c.active?'Pausar':'Reanudar',async()=>{await manage('/campaigns/'+c.id+'/state',{active:!c.active},'PUT');await refresh();}));$('campaigns').append(card);}await metrics();
}
async function metrics(){const d=await manage('/analytics'+metricsQuery);$('metrics').replaceChildren(el('p','Pantallas activas: '+d.active_screens+' · Redenciones comprobadas: '+d.verified_redemptions));const table=document.createElement('table');for(const x of d.events){const row=document.createElement('tr');row.append(el('td',x.event_type),el('td',x.count));table.append(row);}$('metrics').append(table);}
$('apps').onchange=run(async()=>{appId=$('apps').value;await refresh();});$('refresh').onclick=run(refresh);
$('enable').onclick=run(async()=>{await manage('/enable',{});await refresh();});
$('app-form').onsubmit=run(async e=>{let partner=overview.partners[0];if(!partner)partner=(await api('/api/developers/v1/partners',{name:'Organización de pruebas Play'})).partner;appId=(await api('/api/developers/v1/apps',{partner_id:partner.id,name:new FormData(e.target).get('name')})).app.id;await refresh();});
$('key').onclick=run(async()=>{const d=await api('/api/developers/v1/apps/'+appId+'/keys',{scopes:['play:manage','play:analytics']});$('secret').textContent=JSON.stringify(d,null,2);$('secret-panel').hidden=false;await refresh();});
$('hide-secret').onclick=()=>{$('secret').textContent='';$('secret-panel').hidden=true;};
$('location-form').onsubmit=run(async e=>{await manage('/locations',Object.fromEntries(new FormData(e.target)));await refresh();});
$('screen-form').onsubmit=run(async e=>{await manage('/screens',Object.fromEntries(new FormData(e.target)));await refresh();});
$('campaign-form').onsubmit=run(async e=>{const d=Object.fromEntries(new FormData(e.target));await manage('/campaigns',{sponsor_id:d.sponsor_id,game_key:d.game_key,max_sessions:Number(d.max_sessions),config:{layout:d.layout,headline:d.headline,description:d.description,cta_url:d.cta_url||null,start_hour_utc:0,end_hour_utc:24}});await refresh();});
$('metrics-form').onsubmit=run(async e=>{metricsQuery='?'+new URLSearchParams([...new FormData(e.target)].filter(([,v])=>v));await metrics();});
$('csv').onclick=run(async()=>{const r=await fetch('/api/play/v1/manage/analytics.csv'+metricsQuery,{headers:{'X-Qori-App':appId,'X-Qori-Account':accountId},credentials:'same-origin'});if(!r.ok)throw Error('Exportación no disponible');const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download='qori-play-usage.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
api('/api/customer/me').then(d=>{accountId=d.customer?.id||d.account?.id||d.id;return refresh();}).catch(e=>status('Inicia sesión en Qori Customer para administrar tus aplicaciones. '+e.message,true));
const hooksPanel=el('section','');hooksPanel.innerHTML='<h2>Callbacks de integración</h2><p>Solo destinos HTTPS habilitados por Qori. La entrega está desactivada hasta configurar el laboratorio. Las claves se muestran una vez.</p><form id="hook-form"><label>URL autorizada<input name="url" type="url" required maxlength="500"></label><button>Crear callback de resultados</button></form><button id="hook-refresh" class="secondary">Consultar callbacks y entregas</button><div id="hooks"></div><div id="hook-deliveries"></div>';$('workspace').append(hooksPanel);
function showHookSecret(d){$('secret').textContent=JSON.stringify(d,null,2);$('secret-panel').hidden=false;}
async function refreshHooks(){const d=await manage('/webhooks');$('hooks').replaceChildren();for(const h of d.webhooks){const row=el('p',h.url+' · '+(h.active?'Activo':'Revocado')+' ');if(h.active)row.append(button('Rotar secreto',async()=>{showHookSecret(await manage('/webhooks/'+h.id+'/rotate',{}));}),button('Revocar',async()=>{await manage('/webhooks/'+h.id,null,'DELETE');await refreshHooks();},'danger'));$('hooks').append(row);}$('hook-deliveries').replaceChildren(...d.deliveries.map(x=>el('p',x.id+' · '+x.status+' · intentos '+x.attempts+' · '+(x.last_code||'Pendiente'))));}
$('hook-refresh').onclick=run(refreshHooks);$('hook-form').onsubmit=run(async e=>{showHookSecret(await manage('/webhooks',{url:new FormData(e.target).get('url'),events:['game_finished','score_verified','reward_issued']}));await refreshHooks();});
