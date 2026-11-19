(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function artwork(type){
  const shapes={
   QORI_SUMMIT:'<path d="M15 110 68 26 115 110M80 110 119 51 157 110"/><path d="m51 54 17 7 13-11M119 51V18h29l-10 13h-19"/><rect x="83" y="88" width="24" height="19" rx="3"/>',
   SNAKE:'<path d="M24 104h45V77h46V49H69V24h54" stroke-width="17"/><circle cx="125" cy="23" r="2"/><circle cx="145" cy="93" r="9"/>',
   MEMORY_PAIRS:'<rect x="21" y="20" width="55" height="90" rx="9"/><rect x="95" y="20" width="55" height="90" rx="9"/><path d="m48 47 14 20-14 20-14-20Zm74 0 14 20-14 20-14-20Z"/>',
   ROULETTE_SPIN:'<circle cx="85" cy="68" r="48"/><path d="M85 20v96M37 68h96M51 34l68 68M51 102l68-68M73 9h24L85 32Z"/><circle cx="85" cy="68" r="12"/>',
   TRIVIA_QUIZ:'<path d="M23 22h124v75H73l-27 20V97H23Z"/><path d="M72 48c0-20 33-20 33 0 0 13-20 13-20 24M85 82v2"/>',
   SPACE_SHOOTER:'<path d="m39 27 13 13h66l13-13M39 40v13H26v40h26V80h66v13h26V53h-13V40M52 93l-13 14M118 93l13 14"/><path d="M55 56v9M114 56v9" stroke-width="9"/>',
  };
  return '<svg viewBox="0 0 170 130" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+(shapes[type]||'<path d="M49 40h72c22 0 40 59 23 69-13 7-25-18-32-18H58c-7 0-19 25-32 18-17-10 1-69 23-69Z"/><path d="M49 56v30M34 71h30"/><circle cx="112" cy="61" r="5"/><circle cx="128" cy="79" r="5"/>')+'</svg>';
 }
 function benefitList(items){return items.map(b=>`<li><strong>${esc(b.label)}</strong>${b.condition?`<span>${esc(b.condition)}</span>`:''}${b.terms?`<p>${esc(b.terms)}</p>`:''}</li>`).join('');}
 async function init(c){
  document.body.classList.add('qp-storefront','qs-storefront','qa-storefront');
  if(!c.description)document.getElementById('catalogDescription').textContent='Descubre los juegos y experiencias del negocio, revisa sus beneficios y elige en cuál participar.';
  for(const id of ['floatingWhatsappButton','catalogSearchLabel','categoryStrip'])document.getElementById(id).hidden=true;
  document.getElementById('featuredSection').classList.add('hidden');document.getElementById('activationBenefit').classList.add('hidden');
  const old=document.getElementById('catalogContactButton'),button=old.cloneNode(false);button.textContent='Elegir una activación';old.replaceWith(button);button.onclick=()=>document.querySelector('.products-section').scrollIntoView({behavior:'smooth'});
  document.querySelector('.catalog-kicker').textContent='Juega. Participa. Descubre tu beneficio.';
  const section=document.querySelector('.products-section');
  section.innerHTML='<div class="section-head"><span>Activaciones del negocio</span><h2>Elige tu próximo reto</h2><p>Conoce cómo participar y qué beneficio puedes obtener. Cada activación tiene sus propias condiciones.</p></div><label class="qs-search">Buscar juego o beneficio<input type="search" placeholder="Ej. Cumbre, trivia, descuento…" aria-label="Buscar activación"></label><div class="qs-program-grid" aria-live="polite"><p role="status">Cargando activaciones…</p></div>';
  const response=await fetch('/api/public/catalogs/'+encodeURIComponent(c.slug)+'/activations',{credentials:'same-origin'}),data=await response.json();
  if(!response.ok)throw Error(data.error?.message||'No se pudieron cargar las activaciones.');
  const render=()=>{
   const term=section.querySelector('input').value.toLocaleLowerCase('es'),items=data.activations.filter(a=>(a.title+' '+a.type_label+' '+a.benefits.map(b=>b.label).join(' ')).toLocaleLowerCase('es').includes(term));
   section.querySelector('.qs-program-grid').innerHTML=items.map(a=>`<article class="qs-program qa-game-card">
    <div class="qa-game-preview" data-kind="${a.type==='QORI_SUMMIT'?'summit':a.type==='ROULETTE_SPIN'?'wheel':'game'}">${artwork(a.type)}<span>${esc(a.type_label)}</span></div>
    <div class="qa-game-content"><span class="qs-count">${a.is_game?'Juego':'Experiencia'}</span><h3>${esc(a.title)}</h3><p>${esc(a.goal)}</p>
    <div class="qa-benefits"><span>${a.benefits.length>1?'Beneficios disponibles':a.is_game?'Beneficio por ganar':'Beneficio por participar'}</span>${a.benefits.length?'<ul>'+benefitList(a.benefits.slice(0,1))+'</ul>':'<p>Consulta el beneficio y sus condiciones al entrar.</p>'}${a.benefits.length>1?`<details><summary>Ver los ${a.benefits.length} beneficios</summary><ul>${benefitList(a.benefits)}</ul></details>`:''}</div>
    ${a.description||a.terms?`<details><summary>Cómo participar y condiciones</summary>${a.description?`<p class="qs-terms">${esc(a.description)}</p>`:''}${a.terms?`<p class="qs-terms">${esc(a.terms)}</p>`:''}</details>`:''}
    <p class="qs-note">${a.reward_mode==='manual_approval'?'Requiere aprobación del negocio. ':''}Sujeto al resultado, condiciones y disponibilidad del beneficio.${a.ends_at?' Vigente hasta '+esc(new Date(a.ends_at).toLocaleDateString('es-CO'))+'.':''}</p>
    <a class="qs-button" href="${esc(a.play_url)}">${a.is_game?'Jugar ahora':'Participar'}</a></div></article>`).join('')||'<p class="qs-empty">'+(data.activations.length?'No encontramos activaciones con esa búsqueda.':'No hay activaciones disponibles en esta vitrina por ahora. Vuelve pronto.')+'</p>';
  };
  section.querySelector('input').addEventListener('input',render);render();
 }
 window.QoriActivationShowcase={init};
})();
