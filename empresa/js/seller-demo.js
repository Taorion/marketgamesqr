(()=>{'use strict';
 const enabled=new URLSearchParams(location.search).get('demo')==='1';
 function render(user){
  if(!enabled&&!user?.demo_mode)return;
  let banner=document.getElementById('qoriDemoBanner');
  if(!banner){banner=document.createElement('aside');banner.id='qoriDemoBanner';banner.className='qori-demo-banner';banner.setAttribute('aria-label','Entorno de demostración');document.body.prepend(banner);}
  const content=user&&document.querySelector('#workspace .content-shell');
  if(content&&banner.parentNode!==content)content.prepend(banner);
  if(!user&&banner.parentNode!==document.body)document.body.prepend(banner);
  banner.innerHTML='<div><strong>Demo Qori</strong><span>Empresa compartida de práctica · datos ficticios · sin valor comercial</span></div><a href="/seller/">Volver a Qori Seller</a>';
  if(!user){const form=document.getElementById('loginForm');if(form&&!document.getElementById('qoriDemoLoginNote')){const note=document.createElement('p');note.id='qoriDemoLoginNote';note.textContent='Entra con el mismo correo y contraseña de Qori Seller. Requiere aprobación de tu cuenta de vendedor.';form.prepend(note);}}
 }
 window.QoriSellerDemo={render};render();
})();
