const { env } = require('../config/env');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message({name,email,actionUrl,needsActivation,expiresAt}) {
  const title=needsActivation?'Activar mi cuenta y crear contraseña':'Entrar a Qori Seller';
  const url=esc(actionUrl),sellerUrl=new URL('/seller/',env.publicAppUrl).toString(),demoUrl=new URL('/empresa/?demo=1',env.publicAppUrl).toString();
  const expiry=expiresAt?new Date(expiresAt).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'long',timeStyle:'short'}):'';
  const steps=needsActivation?['Abre tu enlace personal de activación.','Crea y confirma una contraseña que solo tú conozcas.','Acepta las condiciones e inicia sesión en Qori Seller.']:['Entra con tu correo y contraseña habituales.','Explora tu espacio comercial y tus herramientas.','Practica tu presentación con Demo Qori.'];
  const subject='Bienvenido a tu espacio en Qori Seller';
  const text=`Hola, ${name}.\n\nTu participación como Embajador Qori está aprobada y tus documentos han sido verificados. Entra a tu cuenta, conoce tu enlace personal y empieza a presentar Qori a negocios. Sus compras confirmadas generan las comisiones que correspondan; consulta los importes y pagos desde Qori Seller.\n\n${title}:\n${actionUrl}\n\nTu correo de acceso: ${email}\n${needsActivation?`El enlace es personal, se utiliza una sola vez y vence el ${expiry} (hora de Colombia). No compartas tu contraseña.`:'Tu contraseña actual se conserva.'}\n\n${steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\nConoce Demo Qori: ${demoUrl}\nPractica con una empresa de ejemplo y datos ficticios antes de presentar Qori.\n\nTu equipo Qori\n¿Necesitas ayuda? contacto@gosqori.com\n${sellerUrl}`;
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title><style>body{margin:0;padding:0}table{border-collapse:collapse}a{color:#275ddd}@media only screen and (max-width:620px){.outer-pad{padding:16px 8px!important}.email-pad{padding:28px 22px!important}.hero-title{font-size:38px!important;line-height:42px!important}.email-button{display:block!important;text-align:center!important}.step-copy{padding-left:14px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#edf2fa;font-family:Arial,Helvetica,sans-serif;color:#112747">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">Tu participación está aprobada. ${needsActivation?'Activa tu cuenta y crea tu contraseña para comenzar.':'Tu espacio en Qori Seller te espera.'}</div>
<table role="presentation" width="100%" bgcolor="#edf2fa"><tr><td align="center" class="outer-pad" style="padding:36px 16px">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden">
<tr><td class="email-pad" bgcolor="#112747" style="padding:32px 40px 40px;background-color:#112747;background-image:linear-gradient(135deg,#112747,#193d80);color:#ffffff">
<table role="presentation" width="100%"><tr><td><span style="display:inline-block;background:#275ddd;color:#fff;border-radius:12px;padding:7px 13px;font-size:29px;font-weight:bold;line-height:36px">Q</span><span style="font-size:25px;font-weight:bold;padding-left:10px;vertical-align:middle"> Qori <span style="font-size:14px;font-weight:normal;color:#c8d8f9">SELLER</span></span></td><td align="right" style="color:#c8d8f9;font-size:11px;letter-spacing:1px">GANA CON QORI</td></tr></table>
<p style="margin:38px 0 18px"><span style="border:1px solid #5578ad;border-radius:20px;padding:8px 12px;color:#c8e1ff;font-size:11px;font-weight:bold;letter-spacing:1.2px">✓ PARTICIPACIÓN APROBADA</span></p>
<h1 class="hero-title" style="margin:0;font-size:48px;line-height:52px;letter-spacing:-1.6px;color:#ffffff;font-weight:bold">Conecta negocios.<br>Gana con Qori.</h1>
<p style="margin:22px 0 0;color:#d1def6;font-size:17px;line-height:26px">Comparte tu enlace personal y consulta tus comisiones por suscripciones y compras de tickets confirmadas.</p>
</td></tr>
<tr><td class="email-pad" style="padding:36px 40px">
<p style="margin:0 0 12px;font-size:20px;line-height:28px;font-weight:bold;color:#112747">Bienvenido, ${esc(name)}.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#4b607b">Tus documentos han sido verificados y <strong style="color:#112747">tu participación como Embajador Qori está aprobada.</strong> Entra a tu cuenta, conoce tu enlace personal y empieza a presentar Qori a negocios. Sus compras confirmadas generan las comisiones que correspondan; consulta los importes y pagos desde Qori Seller.</p>
<table role="presentation" width="100%" bgcolor="#eef4ff" style="border-radius:16px"><tr><td style="padding:20px 22px;border-left:4px solid #275ddd"><p style="margin:0 0 7px;font-size:11px;letter-spacing:1.2px;font-weight:bold;color:#275ddd">TU CUENTA DE EMBAJADOR</p><p style="margin:0;font-size:16px;font-weight:bold;color:#112747;word-break:break-all">${esc(email)}</p><p style="margin:8px 0 0;font-size:14px;line-height:22px;color:#4b607b">${needsActivation?'Solo falta que actives tu acceso y elijas tu contraseña.':'Tu acceso está listo. Usa tu contraseña habitual.'}</p></td></tr></table>
<p style="margin:28px 0 22px;text-align:center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:54px;v-text-anchor:middle;width:360px" arcsize="20%" stroke="f" fillcolor="#275ddd"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${title}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a class="email-button" href="${url}" style="display:inline-block;background-color:#275ddd;border:1px solid #275ddd;border-radius:12px;padding:17px 24px;color:#ffffff;font-size:16px;line-height:22px;font-weight:bold;text-decoration:none;mso-hide:all">${title} &rarr;</a><!--<![endif]-->
</p>
<p style="margin:0;text-align:center;font-size:12px;line-height:20px;color:#61728b">${needsActivation?`Enlace personal de un solo uso.<br>Válido hasta el ${esc(expiry)} · hora de Colombia.`:'Tu contraseña actual se conserva.'}</p>
<h2 style="margin:34px 0 20px;font-size:23px;line-height:30px;color:#112747">Tres pasos para comenzar</h2>
<table role="presentation" width="100%">${steps.map((s,i)=>`<tr><td width="34" valign="top" style="padding:0 0 18px"><span style="display:inline-block;background:#edf3ff;color:#275ddd;border-radius:50%;padding:7px 11px;font-size:14px;font-weight:bold">${i+1}</span></td><td class="step-copy" style="padding:5px 0 18px 16px;font-size:15px;line-height:23px;color:#4b607b">${esc(s)}</td></tr>`).join('')}</table>
<table role="presentation" width="100%" bgcolor="#f6f8fc" style="border:1px solid #dce5f2;border-radius:16px"><tr><td style="padding:24px"><p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#112747">Prepárate con Demo Qori</p><p style="margin:0 0 18px;font-size:14px;line-height:23px;color:#4b607b">Explora una empresa de ejemplo, practica con datos ficticios y prepara tu presentación para los dueños de negocios.${needsActivation?' Primero activa tu cuenta; después usa el mismo correo y contraseña.':''}</p><a class="email-button" href="${esc(demoUrl)}" style="display:inline-block;border:1px solid #275ddd;border-radius:10px;padding:12px 18px;color:#214eb8;font-size:14px;font-weight:bold;text-decoration:none;background:#ffffff">Conocer Demo Qori &rarr;</a></td></tr></table>
<p style="margin:28px 0 0;font-size:16px;line-height:26px;color:#112747">Tu enlace, tus negocios y tus comisiones te esperan en Qori Seller.<br><strong>Tu equipo Qori</strong></p>
<p style="margin:24px 0 0;font-size:12px;line-height:20px;color:#61728b">Si el botón no abre, copia este enlace en tu navegador:<br><a href="${url}" style="color:#275ddd;word-break:break-all">${url}</a></p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
<table role="presentation" width="100%" style="max-width:600px"><tr><td align="center" style="padding:24px 16px;font-size:12px;line-height:20px;color:#61728b"><strong style="color:#112747">Qori · Programa de Embajadores</strong><br>¿Necesitas ayuda? <a href="mailto:contacto@gosqori.com" style="color:#275ddd">Escríbenos</a><br>Este correo corresponde a tu participación en el programa de Embajadores Qori.<br>Nunca te pediremos que compartas tu contraseña por correo.</td></tr></table>
</td></tr></table></body></html>`;
  return {subject,text,html};
}
async function deliver(payload,key){
  if(!env.resendApiKey){const e=new Error('El envío de correos no está configurado. Contacta al administrador de la plataforma.');e.status=503;throw e;}
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.resendApiKey}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  if(!response.ok){const e=new Error('No se confirmó el envío del correo. Puedes reintentar desde esta ventana.');e.status=502;throw e;}
  const result=await response.json();if(!result.id)throw Error('No se confirmó el envío del correo.');return result.id;
}
module.exports={message,deliver};
