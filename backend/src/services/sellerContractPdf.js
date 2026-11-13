const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');

async function renderSellerContract({user,application,terms,operator}){
 const pdf=await PDFDocument.create(),normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.08,.15,.27),blue=rgb(.15,.34,.74),muted=rgb(.34,.40,.49);
 const clean=value=>Array.from(String(value??'').replace(/\s+/g,' ')).map(c=>{try{normal.encodeText(c);return c;}catch{return '?';}}).join('');
 const wrap=(value,width,size,font)=>{const out=[];let line='';for(const char of clean(value)){if(font.widthOfTextAtSize(line+char,size)>width){const space=line.lastIndexOf(' ');if(space>0){out.push(line.slice(0,space));line=line.slice(space+1)+char;}else{out.push(line);line=char;}}else line+=char;}if(line)out.push(line);return out;};
 let page,y;
 function newPage(){page=pdf.addPage([595.28,841.89]);page.drawRectangle({x:0,y:830,width:595.28,height:12,color:blue});page.drawText('QORI SELLER  /  EXPEDIENTE DEL EMBAJADOR',{x:48,y:794,size:9,font:bold,color:blue});y=765;}
 function ensure(height){if(y-height<72)newPage();}
 function text(value,{size=10.3,font=normal,color=ink,gap=8}={}){for(const line of wrap(value,499,size,font)){ensure(size*1.45);page.drawText(line,{x:48,y,size,font,color});y-=size*1.45;}y-=gap;}
 newPage();text('Acuerdo de colaboración comercial',{size:23,font:bold,gap:12});text('Versión '+terms.version+' | Colombia',{size:9,color:muted});
 text('PARTES DEL ACUERDO',{size:10,font:bold,color:blue});
 text('Operadora: '+operator.name+' | NIT: '+operator.nit);
 text('Domicilio: '+operator.city+' | Representante: '+operator.representative);
 text('Embajador: '+user.full_name+' | Cédula: '+(application.document_key||'Pendiente'));
 text('Correo: '+user.email+' | Ciudad: '+(application.city||'Pendiente'));
 text('CIIU requerido: '+terms.ciiu_requirement.code+' - '+terms.ciiu_requirement.name);
 text('ANTES DE FIRMAR',{size:10,font:bold,color:blue});
 text('Verifica los datos de ambas partes. Imprime el PDF completo, fírmalo de puño y letra, autentica tu firma ante notaría y adjunta el documento completo con la constancia en Mi documentación. La descarga no representa firma, autenticación ni aprobación. Conserva una copia.');
 for(const [i,clause] of terms.clauses.entries()){ensure(75);text((i+1)+'. '+clause.title,{size:12,font:bold,gap:5});text(clause.text,{gap:13});}
 ensure(205);text('FIRMAS Y AUTENTICACIÓN',{size:12,font:bold,color:blue,gap:15});
 for(const line of ['Ciudad y fecha: __________________________________________________','Firma del Embajador: ______________________________________________','Nombre y cédula: __________________________________________________','Firma de la operadora / representante: _________________________________','Nombre, identificación y calidad: ______________________________________'])text(line,{gap:16});
 text('Adjunta la constancia de autenticación notarial junto con todas las páginas del contrato.',{size:9,color:muted});
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:48,y:51},end:{x:547,y:51},thickness:.5,color:muted});p.drawText('Qori | contacto@gosqori.com | Página '+(i+1)+' de '+pages.length,{x:48,y:36,size:8,font:normal,color:muted});p.drawText(clean('Expediente: '+user.id),{x:48,y:24,size:7,font:normal,color:muted});});
 pdf.setTitle('Contrato Qori Seller');pdf.setAuthor(operator.name);pdf.setSubject('Contrato para firma y autenticación del embajador');
 return Buffer.from(await pdf.save());
}
module.exports={renderSellerContract};
