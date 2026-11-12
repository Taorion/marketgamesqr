(()=>{'use strict';let scope='',loading=false;
const programs={PENSE_EN_TI:{name:'Pensé en ti',view:'courtesies',summary:'20 tickets iniciales de entrega única para regalar productos. Sin recarga automática.'},SELLOS_GRATIS:{name:'Una razón para volver',view:'stamp-cards',summary:'Un programa de sellos. Los QR de premios consumen tickets comprados.'},ACTIVACIONES_GRATIS:{name:'Crea activaciones',view:'strategic-qr',summary:'Hasta 2 activaciones activas a la vez. Pausa una para activar otra. Los QR de premios consumen tickets comprados.'}};
async function mount(){if(loading)return;loading=true;try{
 if(typeof authHeaders!=='function')return;const headers=authHeaders(),key=JSON.stringify(headers);
 if(!headers.Authorization){scope='';document.getElementById('penseEnTiWelcome')?.remove();return;}if(scope===key)return;
 const response=await fetch('/api/pense-en-ti/balances',{headers});if(!response.ok)return;const {balances:b}=await response.json();if(key!==JSON.stringify(authHeaders()))return;
 scope=key;document.getElementById('penseEnTiWelcome')?.remove();const program=programs[b?.plan_code];if(!program)return;
 const box=document.createElement('section');box.id='penseEnTiWelcome';box.className='qco';
 box.innerHTML='<article><h2>'+program.name+'</h2><p><strong>'+Number(b.tickets)+' tickets disponibles</strong> · '+Number(b.products)+' de 5 productos registrados · Validador gratis.</p><p>'+program.summary+'</p><nav><button data-step="'+program.view+'">Mi programa</button><button data-step="inventory">Mis productos</button><button data-step="validator">Validar entrega</button><button data-step="account">Comprar tickets y ver planes</button></nav></article>';
 (document.querySelector('main')||document.body).prepend(box);
 box.querySelectorAll('[data-step]').forEach(btn=>btn.onclick=()=>document.querySelector('button[data-view="'+btn.dataset.step+'"]')?.click());
}catch{}finally{loading=false;}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scope='';});setInterval(()=>{scope='';mount();},30000);mount();
})();
