(()=>{'use strict';let scope='',loading=false;
const programs={UN_REGALO_PERSONAL:{name:'Un regalo personal',view:'reward-passes',summary:'5 emisiones iniciales de Gift Cards, de entrega única. Después compra 10, 25, 50 o 100 a $2.500 COP cada una. El valor del regalo lo define tu negocio.'},PENSE_EN_TI:{name:'Pensé en ti',view:'courtesies',summary:'20 tickets iniciales de entrega única para regalar productos. Sin recarga automática.'},SELLOS_GRATIS:{name:'Una razón para volver',view:'stamp-cards',summary:'Un programa de sellos. Los QR de premios consumen tickets comprados.'},ACTIVACIONES_GRATIS:{name:'Crea activaciones',view:'strategic-qr',summary:'Hasta 2 activaciones activas a la vez. Pausa una para activar otra. Los QR de premios consumen tickets comprados.'}};
async function mount(){if(loading)return;loading=true;try{
 if(typeof authHeaders!=='function')return;const headers=authHeaders(),key=JSON.stringify(headers);
 if(!headers.Authorization){scope='';document.getElementById('penseEnTiWelcome')?.remove();return;}if(scope===key)return;
 const response=await fetch('/api/pense-en-ti/balances',{headers});if(!response.ok)return;const {balances:b}=await response.json();if(key!==JSON.stringify(authHeaders()))return;
 scope=key;document.getElementById('penseEnTiWelcome')?.remove();const program=programs[b?.plan_code];if(!program)return;
 const box=document.createElement('section');box.id='penseEnTiWelcome';box.className='qco';
 const cards=b.plan_code==='UN_REGALO_PERSONAL';
 box.innerHTML='<article><h2>'+program.name+'</h2><p><strong>'+(cards?Number(b.giftcards||0)+' emisiones de Gift Cards':Number(b.tickets||0)+' tickets')+' disponibles</strong> · '+Number(b.products||0)+' de 5 productos registrados · Validador gratis.</p><p>'+program.summary+'</p><nav><button data-step="'+program.view+'">Mi programa</button><button data-step="inventory">Mis productos</button><button data-step="validator">Validar entrega</button>'+(cards?'<button data-giftcard-store>Comprar Gift Cards</button>':'')+'<button data-step="account">Comprar tickets y ver planes</button></nav></article>';
 (document.querySelector('main')||document.body).prepend(box);
 box.querySelectorAll('[data-step]').forEach(btn=>btn.onclick=()=>{if(typeof setView==='function')setView(btn.dataset.step);else document.querySelector('button[data-view="'+btn.dataset.step+'"]')?.click();});
}catch{}finally{loading=false;}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scope='';});document.addEventListener('qori:giftcard-balance',()=>{scope='';mount();});setInterval(()=>{scope='';mount();},30000);mount();
})();
