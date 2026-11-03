(() => {
 const params=new URLSearchParams(location.search),invitation=params.get('customer_invitation'),id=invitation||params.get('customer_publication');
 if(!id||!/^[a-f0-9-]{36}$/i.test(id))return;
 const banner=document.createElement('aside');banner.className='customer-context';
 banner.style.cssText='padding:15px 20px;border-bottom:1px solid #d9e4dc;background:#edf3e8;color:#164d43;font:14px system-ui;display:flex;gap:14px;justify-content:space-between;flex-wrap:wrap';
 banner.innerHTML='<span>Tu participación y los beneficios obtenidos se guardan en Qori Customer.</span><a href="/customer/#earned" style="color:inherit;font-weight:700">Mis actividades →</a>';
 document.querySelector('.activation-card')?.prepend(banner);
 fetch('/api/customer/me',{credentials:'same-origin',cache:'no-store'}).then(async response=>{
  if(!response.ok)throw Error();const {account}=await response.json(),email=document.getElementById('participantEmail');
  if(email){email.value=account.email;email.readOnly=true;}
 }).catch(()=>{banner.innerHTML='<span>Entra a tu cuenta gratuita para guardar esta participación.</span><a href="/customer/#'+(invitation?'invitations':'publication/'+id)+'" style="color:inherit;font-weight:700">Entrar a Qori →</a>';});
})();
