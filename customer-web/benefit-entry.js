(()=>{'use strict';const valid=v=>{if(typeof v!=='string'||!/^\/(claim|rp|sellos|carnet-afiliado|activacion|trivia)(\/|\?)/.test(v)||/[\\\r\n]/.test(v))return false;try{const u=new URL(v,location.origin);return u.origin===location.origin&&/^\/(claim|rp|sellos|carnet-afiliado|activacion|trivia)(\/|$)/.test(u.pathname);}catch{return false;}};
const read=k=>{try{return sessionStorage.getItem(k);}catch{return null;}},write=(k,v)=>{try{sessionStorage.setItem(k,v);}catch{}},remove=k=>{try{sessionStorage.removeItem(k);}catch{}};
const params=new URLSearchParams(location.search),target=params.get('continue');
let pending=valid(target)?target:read('qori-benefit-return');
if(valid(target))write('qori-benefit-return',target);
if(params.has('gift'))write('qori-benefit-invitation','1');
window.QoriBenefitReturn=()=>{
 const next=pending;if(!valid(next))return false;pending=null;remove('qori-benefit-return');
 let attempt;try{attempt=JSON.parse(read('qori-benefit-attempt'));}catch{}
 const repeated=attempt?.url===next&&Date.now()-attempt.at>=0&&Date.now()-attempt.at<60000;
 const host=document.getElementById('app');if(host){
  const main=document.createElement('main');main.id='main';main.className='auth-side boot';
  const heading=document.createElement('h1');heading.textContent=repeated?'No pudimos abrir tu beneficio':'Abriendo tu beneficio…';
  const note=document.createElement('p');note.setAttribute('role','status');note.textContent=repeated?'Tu sesión está abierta, pero no pudimos continuar al beneficio. Intenta abrirlo de nuevo o vuelve a Customer.':'Tu sesión está lista. Te llevamos al beneficio que recibiste.';
  const retry=document.createElement('a');retry.className='primary';retry.href=next;retry.textContent='Continuar a mi beneficio';
  const home=document.createElement('a');home.className='secondary';home.href='/customer/#home';home.textContent='Volver a Customer';main.append(heading,note,retry,home);host.replaceChildren(main);
 }
 if(!repeated){write('qori-benefit-attempt',JSON.stringify({url:next,at:Date.now()}));location.replace(next);}return true;
};
if(location.pathname.startsWith('/customer')){
 const render=()=>{if(!pending&&!read('qori-benefit-invitation'))return;if(document.getElementById('benefitWelcome'))return;const host=document.querySelector('.auth-form-wrap,.auth-side');if(!host)return;const note=document.createElement('p');note.id='benefitWelcome';note.style.cssText='padding:16px;border-radius:12px;background:#edf4ff;color:#214a89';note.textContent='Alguien pensó en ti. Entra o crea tu Customer gratis para descubrir y disfrutar tu beneficio. También te ayuda a organizar tus ingresos, gastos y finanzas personales.';host.prepend(note);};new MutationObserver(render).observe(document.documentElement,{childList:true,subtree:true});render();return;
}
remove('qori-benefit-attempt');
const nativeFetch=window.fetch.bind(window);window.fetch=(input,init={})=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin===location.origin&&url.pathname.startsWith('/api/public/')){const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));headers.set('X-Qori-Web','1');init={...init,headers};}return nativeFetch(input,init).then(r=>{if(r.status===401&&url.origin===location.origin&&url.pathname.startsWith('/api/public/'))location.replace('/customer/?continue='+encodeURIComponent(location.pathname+location.search)+'#invitations');return r;});};
document.addEventListener('DOMContentLoaded',()=>{const note=document.createElement('aside');note.style.cssText='padding:12px 20px;text-align:center;background:#eef4ff;color:#214a89;font:14px/1.5 system-ui';note.append('Tu beneficio está contigo. ');const a=document.createElement('a');a.href='/customer/#wallet';a.textContent='Abrir mi Customer gratis · Beneficios y finanzas personales →';note.append(a);document.body.prepend(note);});
})();
