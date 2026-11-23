'use strict';
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
async function api(path,method='GET',body){
 let session;try{session=JSON.parse(localStorage.getItem('market_games_admin_session_v1'));}catch{}
 if(!session?.token)throw new Error('Inicia sesión en Qori Admin.');
 const r=await fetch('/api/admin/invoices'+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json();if(!r.ok)throw new Error(d.error?.code||'Acceso restringido.');return d;
}
async function run(fn){try{await fn();document.getElementById('status').textContent='Sandbox actualizado. Producción bloqueada.';}catch(e){document.getElementById('status').textContent=e.message;}}
const button=(label,fn)=>{const b=node('button',label);b.onclick=()=>run(async()=>{b.disabled=true;try{await fn();await refresh();}finally{b.disabled=false;}});return b;};
async function refresh(){
 const data=await api('/overview');
 for(const key of ['apps','reviews','requests','incidents']){const target=document.getElementById(key);target.replaceChildren();for(const item of data[key]){
 const card=node('article','');card.className='card';card.append(node('pre',JSON.stringify(item,null,2)));
 if(key==='apps')card.append(button(item.blocked_at?'Retirar bloqueo (permanece inactiva)':'Bloquear aplicación',()=>api('/apps/'+item.id+'/block','PUT',{blocked:!item.blocked_at})));
 if(key==='reviews'&&item.state==='PENDING')for(const [label,state,code]of [['Aprobar revisión sandbox','REVIEW_APPROVED','SANDBOX_REVIEWED'],['Rechazar por evidencia faltante','REJECTED','MISSING_EVIDENCE']])card.append(button(label,()=>api('/reviews/'+item.id+'/decision','POST',{state,code})));
 if(key==='requests'&&['PENDING','REVIEW'].includes(item.state))for(const [label,state,code]of [['Marcar en revisión','REVIEW','UNDER_REVIEW'],['Resolver solicitud','RESOLVED','REQUEST_COMPLETED'],['Rechazar por conservación','REJECTED','RETENTION_REQUIRED']])card.append(button(label,()=>api('/requests/'+item.id+'/decision','POST',{state,code})));
 target.append(card);
 }}
}
document.getElementById('refresh').onclick=()=>run(refresh);run(refresh);
