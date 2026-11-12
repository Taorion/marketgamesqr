(() => {
  const form=document.getElementById('signupRecoveryForm');if(!form)return;
  const details=document.getElementById('signupRecovery'),status=form.querySelector('[data-recovery-status]'),result=form.querySelector('[data-recovery-result]');
  const returned=new URLSearchParams(location.search).get('signup');
  if(['success','pending','failure'].includes(returned)){
    details.open=true;
    document.getElementById('signupReturnNotice').textContent='Regresaste del proceso de pago. El regreso a esta página no confirma el cobro: consulta aquí el estado de tu cuenta.';
    details.scrollIntoView({block:'start'});
  }
  let revision=0;
  form.addEventListener('input',()=>{revision++;result.replaceChildren();status.textContent='';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const button=form.querySelector('[type=submit]');if(button.disabled)return;
    button.disabled=true;result.replaceChildren();status.textContent='Consultando tu inscripción…';
    const mine=revision,payload={email:form.elements.email.value.trim(),password:form.elements.password.value};
    try{
      const response=await fetch('/api/public/signup/portal/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
      const data=await response.json();if(mine!==revision)return;if(!response.ok)throw Error(data.error?.message||'No pudimos consultar la inscripción.');
      status.textContent=data.message;
      const a=document.createElement('a');a.className='primary-button';
      if(data.state==='ACTIVE'){a.href='/empresa/';a.textContent='Entrar a Qori Empresa';}
      else if(data.state==='PENDING_PAYMENT'&&data.order?.checkout_url){
        const url=new URL(data.order.checkout_url);if(url.protocol!=='https:')throw Error('El enlace de pago no es válido. Solicita revisión a Qori.');
        const info=document.createElement('p');info.textContent=data.order.package_title+' · '+new Intl.NumberFormat('es-CO',{style:'currency',currency:data.order.currency||'COP'}).format(data.order.price_cop);result.append(info);
        a.href=url.href;a.rel='noreferrer';a.textContent='Continuar mi pago pendiente';
      }else throw Error('La cuenta requiere revisión de Qori.');
      result.append(a);
    }catch(error){if(mine===revision){status.textContent=error.message;result.replaceChildren();}}
    finally{form.elements.password.value='';button.disabled=false;}
  });
})();
