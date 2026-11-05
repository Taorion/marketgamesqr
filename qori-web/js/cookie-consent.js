/* Consent for Customer and Qori's public pages. No analytics or ad scripts are installed here. */
(()=>{'use strict';
 const KEY='qori-cookie-choice',VERSION='2026-11-05',DAYS=180,TTL=DAYS*86400000;let choice=null,banner=null,dialog=null;
 const valid=c=>c?.version===VERSION&&typeof c.preferences==='boolean'&&Number.isFinite(c.saved_at)&&c.saved_at<=Date.now()+60000&&Date.now()-c.saved_at<TTL;
 function clearPreferences(){try{for(const k of Object.keys(localStorage))if(k.startsWith('qori-book:'))localStorage.removeItem(k);}catch{}}
 function read(){try{const c=JSON.parse(localStorage.getItem(KEY));return valid(c)?c:null;}catch{return null;}}
 choice=read();if(!choice?.preferences)clearPreferences();
 function current(){if(choice&&!valid(choice)){choice=null;clearPreferences();}return choice;}
 function notify(){window.dispatchEvent(new CustomEvent('qori-cookie-choice',{detail:{preferences:!!current()?.preferences}}));}
 function save(preferences){
  choice={version:VERSION,necessary:true,preferences:!!preferences,saved_at:Date.now()};let persisted=true;
  try{localStorage.setItem(KEY,JSON.stringify(choice));}catch{persisted=false;}
  if(!preferences)clearPreferences();banner?.remove();banner=null;dialog?.close();notify();
  const status=document.getElementById('qoriCookieStatus');if(status)status.textContent=persisted?'Preferencias de cookies guardadas. Puedes cambiarlas cuando quieras.':'La elección se aplica a esta pestaña. Tu navegador no permite guardarla para otras visitas.';
 }
 function open(){
  if(dialog?.isConnected){dialog.focus();return;}const focus=document.activeElement;
  dialog=document.createElement('dialog');dialog.className='qori-cookies qori-cookie-dialog';dialog.setAttribute('aria-labelledby','qoriCookieTitle');
  dialog.innerHTML='<div class="qcp-head"><h2 id="qoriCookieTitle">Tus preferencias de cookies</h2><button type="button" data-close aria-label="Cerrar preferencias">×</button></div><div class="qcp-body"><p>Decide qué guardamos en este navegador. Puedes seguir usando tu cuenta si rechazas las opciones adicionales.</p><div class="qcp-category"><label><input type="checkbox" checked disabled><strong>Necesarias · siempre activas</strong></label><p>Acceso seguro, sincronización del cierre de sesión y tu elección de privacidad. No se usan para publicidad.</p></div><div class="qcp-category"><label><input type="checkbox" name="preferences" '+(current()?.preferences?'checked':'')+'><strong>Recordar mi bolsillo de Customer</strong></label><p>Permite recordar en este navegador el bolsillo que elegiste. Desactivarlo no elimina tus cuentas, saldos ni movimientos.</p></div><div class="qcp-category"><strong>Analítica publicitaria y anuncios</strong><p>Estas páginas no instalan cookies de publicidad ni rastreadores externos de analítica. No hay una categoría adicional que autorizar.</p></div><p>Esta elección no acepta contratos, no suscribe publicidad y no autoriza compras automáticas. Esas decisiones tienen sus propios controles.</p><p><a href="/cookies/">Política de cookies</a> · <a href="/privacidad/">Privacidad</a></p><div class="qcp-actions"><button type="button" data-reject>Rechazar opcionales</button><button type="button" data-save>Guardar preferencias</button><button type="button" data-accept>Aceptar opcionales</button></div></div>';
  document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-reject]').onclick=()=>save(false);dialog.querySelector('[data-accept]').onclick=()=>save(true);dialog.querySelector('[data-save]').onclick=()=>save(dialog.querySelector('[name=preferences]').checked);
  dialog.onclose=()=>{dialog.remove();dialog=null;if(focus?.isConnected)focus.focus();};dialog.showModal();
 }
 function showBanner(){
  if(current()||banner?.isConnected)return;banner=document.createElement('section');banner.className='qori-cookies qori-cookie-banner';banner.setAttribute('role','region');banner.setAttribute('aria-label','Aviso de cookies');
  banner.innerHTML='<div><h2>Cookies: tú decides</h2><p>Usamos almacenamiento necesario para el acceso seguro. Con tu permiso, también recordamos el bolsillo que elegiste en Customer. Puedes rechazar lo opcional y continuar.</p><p><a href="/cookies/">Ver política de cookies</a> · <a href="/privacidad/">Privacidad</a></p></div><div class="qcp-actions"><button type="button" data-accept>Aceptar opcionales</button><button type="button" data-reject>Rechazar opcionales</button><button type="button" data-config>Configurar</button></div>';
  document.body.append(banner);banner.querySelector('[data-accept]').onclick=()=>save(true);banner.querySelector('[data-reject]').onclick=()=>save(false);banner.querySelector('[data-config]').onclick=open;
 }
 window.QoriCookies={open,preferencesAllowed:()=>!!current()?.preferences};
 document.addEventListener('click',e=>{if(e.target.closest('[data-cookie-settings]')){e.preventDefault();open();}});
 window.addEventListener('storage',e=>{if(e.key!==KEY&&e.key!==null)return;choice=read();if(!choice?.preferences)clearPreferences();if(choice){banner?.remove();banner=null;}else showBanner();if(dialog?.isConnected)dialog.querySelector('[name=preferences]').checked=!!choice?.preferences;notify();});
 function init(){const status=document.createElement('p');status.id='qoriCookieStatus';status.className='qcp-status';status.setAttribute('role','status');document.body.append(status);showBanner();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
