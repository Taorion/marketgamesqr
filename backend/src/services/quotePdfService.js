const {PDFDocument,StandardFonts,rgb,PDFName,PDFString}=require('pdf-lib');
const QRCode=require('qrcode');
const {env}=require('../config/env');
const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:2}).format(v);
const date=v=>new Date(v).toLocaleDateString('es-CO',{timeZone:'America/Bogota',year:'numeric',month:'short',day:'numeric'});
async function renderQuotePdf(q){
  const pdf=await PDFDocument.create(),normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const s=q.snapshot,color=s.business.color||'#173e39',brand=rgb(...[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255));
  const compact=s.items.length===1 && [s.terms,s.payment_terms,s.delivery_terms,s.benefit?.description,s.benefit?.terms].join('').length<1000;
  const ink=rgb(.10,.16,.19),muted=rgb(.36,.42,.44),pale=rgb(.95,.97,.96),white=rgb(1,1,1);
  const clean=v=>Array.from(String(v??'').replace(/\s+/g,' ')).map(c=>{try{normal.encodeText(c);return c;}catch{return '';}}).join('');
  const lines=(value,width,size=10,font=normal)=>{
    const out=[];let current='';
    for(const char of clean(value)){
      if(font.widthOfTextAtSize(current+char,size)>width){const space=current.lastIndexOf(' ');if(space>0){out.push(current.slice(0,space));current=current.slice(space+1)+char;}else{out.push(current);current=char;}}
      else current+=char;
    }
    if(current)out.push(current);return out;
  };
  let page,y;
  function pageStart(){page=pdf.addPage([595.28,841.89]);y=compact?800:784;page.drawRectangle({x:0,y:829,width:596,height:13,color:brand});
    if(pdf.getPageCount()>1){page.drawText(clean(`${s.business.name} / COT-${q.number}`),{x:42,y:795,size:10,font:bold,color:brand});y=766;}}
  function ensure(height){if(y-height<62)pageStart();}
  function text(value,{x=42,width=511,size=10,font=normal,color=ink,leading=size*1.4}={}){
    for(const line of lines(value,width,size,font)){ensure(leading);page.drawText(line,{x,y,size,font,color});y-=leading;}
  }
  async function image(src,x,top,w,h){if(!src)return;const img=await pdf.embedPng(Buffer.from(src.split(',')[1],'base64'));const fit=img.scaleToFit(w,h);page.drawImage(img,{x:x+(w-fit.width)/2,y:top-fit.height,width:fit.width,height:fit.height});}
  function linkRect(url,x,bottom,w,h){const annotation=pdf.context.register(pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,bottom,x+w,bottom+h],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url)}}));const annotations=page.node.lookup(PDFName.of('Annots'));if(annotations)annotations.push(annotation);else page.node.set(PDFName.of('Annots'),pdf.context.obj([annotation]));}
  pageStart();
  const top=y;await image(s.business.logo,42,top,100,65);
  const bx=s.business.logo?160:42;
  text(s.business.name,{x:bx,width:553-bx,size:20,font:bold,color:brand});
  if(s.business.slogan)text(s.business.slogan,{x:bx,width:553-bx,size:10,color:muted});
  text([s.business.nit&&`NIT ${s.business.nit}`,s.business.phone,s.business.email].filter(Boolean).join(' | '),{x:bx,width:553-bx,size:9,color:muted});
  text([s.business.address,s.business.city].filter(Boolean).join(', '),{x:bx,width:553-bx,size:9,color:muted});
  y=Math.min(y,top-(compact?66:82));text('COTIZACIÓN',{size:10,font:bold,color:brand});y-=10;text(s.title,{size:compact?21:23,font:bold});y-=3;
  text(`COT-${String(q.number).padStart(6,'0')}  |  Emisión: ${date(q.issued_at||q.created_at)}  |  Válida hasta: ${date(q.valid_until)}`,{size:9,color:muted});
  if(q.status==='DRAFT')text('BORRADOR - Pendiente de emisión',{size:10,font:bold,color:brand});
  else if(['CANCELLED','EXPIRED','DECLINED'].includes(q.status))text({CANCELLED:'ANULADA',EXPIRED:'VENCIDA',DECLINED:'NO ACEPTADA'}[q.status],{size:11,font:bold,color:brand});
  y-=10;ensure(70);text('PREPARADA PARA',{size:9,font:bold,color:brand});y-=5;text(s.customer.name,{size:15,font:bold});
  text([s.customer.organization,s.customer.document_id].filter(Boolean).join(' | '),{size:10,color:muted});
  text([s.customer.phone,s.customer.email].filter(Boolean).join(' | '),{size:10,color:muted});y-=compact?10:18;
  for(const item of s.items){
    const nameLines=lines(item.name,228,12,bold),descLines=lines(item.description,228,9);
    const height=Math.max(compact?100:112,44+nameLines.length*16+descLines.length*12);
    ensure(height+12);const rowTop=y;
    page.drawRectangle({x:42,y:rowTop-height,width:511,height,color:pale});
    await image(item.photo,52,rowTop-12,86,86);
    if(!item.photo)page.drawText('Sin foto',{x:73,y:rowTop-52,size:9,font:normal,color:muted});
    y=rowTop-22;text(item.name,{x:152,width:228,size:12,font:bold,leading:16});
    if(item.sku)text(item.sku,{x:152,width:228,size:8,color:muted});
    text(item.description,{x:152,width:228,size:9,color:muted,leading:12});
    y=rowTop-22;text(money(item.line_total),{x:398,width:144,size:12,font:bold,color:brand});
    text(`${item.quantity} × ${money(item.unit_price)}`,{x:398,width:144,size:9,color:muted});
    if(item.discount_percent)text(`Descuento ${item.discount_percent}%`,{x:398,width:144,size:9,color:muted});
    if(item.tax_percent)text(`Impuesto adicional ${item.tax_percent}%`,{x:398,width:144,size:9,color:muted});
    y=rowTop-height-(compact?8:12);
  }
  ensure(112);y-=8;
  for(const [label,amount] of [['Subtotal',s.subtotal],['Descuentos',-s.discount],['Impuestos adicionales',s.taxes]]){
    page.drawText(label,{x:300,y,size:10,font:normal,color:muted});const amountText=money(amount);page.drawText(amountText,{x:553-normal.widthOfTextAtSize(amountText,10),y,size:10,font:normal,color:ink});y-=19;
  }
  y-=14;page.drawRectangle({x:294,y:y-13,width:259,height:34,color:brand});page.drawText('TOTAL COP',{x:306,y:y-1,size:11,font:bold,color:white});
  const total=money(s.total);page.drawText(total,{x:541-bold.widthOfTextAtSize(total,15),y:y-2,size:15,font:bold,color:white});y-=40;
  if(s.benefit){
    const benefitHeight=Math.max(175,85+lines(s.benefit.title,350,17,bold).length*24+lines(s.benefit.description,350,10).length*14);
    ensure(benefitHeight);y-=10;const benefitTop=y;
    text('UN BENEFICIO PARA TI',{size:10,font:bold,color:brand});y-=10;text(s.benefit.title,{width:350,size:17,font:bold});
    text(s.benefit.description,{width:350,size:10});
    text(s.benefit.timing==='AFTER_PAYMENT'?'Disponible cuando el negocio registre el pago.':'Disponible al recibir esta cotización.',{width:350,size:10,font:bold});
    if(q.public_url){const token=new URL(q.public_url).hash.slice(1),url=new URL(`/api/public/quotes/${token}/benefit`,env.publicAppUrl).href;
      const qr=await QRCode.toDataURL(url,{width:260,margin:2,errorCorrectionLevel:'M'});
      const qrSize=compact?100:122;await image(qr,553-qrSize,benefitTop+8,qrSize,qrSize);linkRect(url,553-qrSize,benefitTop+8-qrSize,qrSize,qrSize);
      ensure(25);text('ABRIR MI BENEFICIO',{width:350,size:11,font:bold,color:brand});linkRect(url,42,y,240,18);
    }else text('El QR se incorpora al emitir la cotización.',{width:350,size:10,color:muted});
    y=Math.min(y,benefitTop-(compact?114:136));
    if(s.benefit.expires_at)text(`Vigencia de la activación: ${date(s.benefit.expires_at)}`,{size:9,color:muted});
    text(s.benefit.terms,{size:9,color:muted});y-=compact?8:16;
  }
  for(const [heading,body] of [['Forma de pago',s.payment_terms],['Entrega',s.delivery_terms],['Condiciones comerciales',s.terms]]){
    if(!body)continue;ensure(compact?42:55);text(heading.toUpperCase(),{size:9,font:bold,color:brand});text(body,{size:compact?9:10});y-=compact?7:13;
  }
  ensure(34);text('Esta cotización no es una factura ni un comprobante de pago.',{size:9,color:muted});
  if(q.public_url){text('Consultar propuesta y responder en línea',{size:10,font:bold,color:brand});linkRect(q.public_url,42,y,320,18);}
  for(const [i,p] of pdf.getPages().entries()){p.drawLine({start:{x:42,y:44},end:{x:553,y:44},thickness:.5,color:rgb(.82,.87,.85)});
    p.drawText(clean(`COT-${q.number} | ${s.business.name}`).slice(0,90),{x:42,y:28,size:8,font:normal,color:muted});p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:523,y:28,size:8,font:normal,color:muted});}
  pdf.setTitle(`${s.business.name} - Cotización COT-${q.number}`);pdf.setAuthor(s.business.name);return pdf.save();
}
module.exports={renderQuotePdf};
