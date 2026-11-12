"""Prepare reviewed copies; never change supplied originals. Office PDFs are exported separately."""
from pathlib import Path
import json,csv,zipfile,shutil,re,hashlib,sys,html
from xml.dom import minidom
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'Qori_Seller_Coleccion_Revision/Qori_Seller'
OUT=ROOT/'output/seller-collection-1.1'
OUT.mkdir(parents=True,exist_ok=True)
FONTS=Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('QoriText',str(FONTS/'arial.ttf')))
pdfmetrics.registerFont(TTFont('QoriBold',str(FONTS/'arialbd.ttf')))
replacements={
 'Dos capacitaciones y seguimiento':'Primer uso y seguimiento',
 'Dos capacitaciones al cliente':'Acompaña el primer uso',
 'coordinación de dos capacitaciones':'acompañamiento del primer uso',
 'ACTIVATE: ya tiene acceso → c07 → “Empecemos por una acción” → entrenamiento.':'ACTIVATE: ya tiene acceso → c07 → “Empecemos por una acción” → comprobar primer uso.',
 'Calendario y base de liquidación por confirmar.':'Base fija bruta. Corte miércoles; pagos jueves.',
 'Entrenamiento coordina agenda y participantes.':'Comparte la guía de primeros pasos.',
 'Sesión 1: configurar y probar.':'El negocio configura una acción de su plan.',
 'Sesión 2: practicar y resolver dudas.':'Acuerda seguimiento y consulta las dudas a Qori.',
 'Coordina tus dos capacitaciones con el equipo de entrenamiento.':'Consulta la guía de primeros pasos y acuerda el seguimiento.',
 'Coordinación del entrenamiento':'Acordar el siguiente paso',
 'Tickets y datos por confirmar':'Tickets y liquidación',
 'Material interno para revisión.':'Material interno de capacitación.',
 'Tus dos capacitaciones':'Organiza el primer uso',
 'Primera sesión':'Configura y prueba',
 'Segunda sesión':'Practica y revisa',
 'Recomendar Qori con claridad':'Desarrolla tu oportunidad con Qori',
 'Una necesidad concreta. Una opción adecuada. Un siguiente paso comprobable.':'Recomendar. Desarrollar una cartera. Especializarte por sector.',
 'v1.0':'v1.1',
}
def revised(text):
 if text.startswith('00_CONTROL_INTERNO: fuente, registro de revisión'):
  return 'Los controles y fuentes se conservan para administración. 03_DESCUBRE_TU_OPORTUNIDAD reúne b01 Tu oportunidad con Qori, b02 Elige cómo desarrollar tu actividad y b03 Tu recorrido hacia los primeros negocios. Estos tres PDF pueden compartirse con futuros embajadores junto al enlace https://gosqori.com/seller/. Compartir la oportunidad no genera comisión por incorporar embajadores.'
 if text.startswith('El equipo de entrenamiento coordina contigo las dos sesiones.'):
  return 'Define quién utilizará Qori y qué primera necesidad quieren atender. Consulta esta guía, acuerda seguimiento con tu embajador y solicita apoyo por el canal de atención cuando lo necesites. Confirma disponibilidad y alcance antes de contar con una sesión adicional.'
 if text.startswith('Practica tú el recorrido, revisa lo ocurrido y resuelve dudas.'):
  return 'Practica el recorrido, revisa lo ocurrido y anota las dudas. Confirma quién queda responsable y cómo solicitar ayuda. Acuerda el siguiente contacto según la necesidad del negocio.'
 if text.startswith('Esta guía organiza los 18 activos'):
  return 'Esta guía organiza los materiales para embajadores y negocios, y la colección pública para futuros embajadores. Empieza en Mi oportunidad, elige una ruta y usa cada recurso según su destinatario. Versión revisada con las reglas de producto y comisiones del 12 de noviembre de 2026.'
 if text.startswith('Propuesta operativa interna basada en el acompañamiento solicitado:'):
  return 'Comparte c07, acuerda una primera acción incluida en el plan y confirma quién operará la herramienta. Pide al negocio que pruebe el recorrido y anota las dificultades. Consulta las dudas a Qori por el canal de contacto. El acompañamiento se coordina según disponibilidad; este material no ofrece dos sesiones obligatorias ni una agenda automática.'
 if text.startswith('La política suministrada es QORI_2026_VF1, con ventana'):
  return 'VF1 contempla seis meses de cobertura paga por cliente nuevo, con base mensual fija y comisiones brutas. Tickets: 10 % del importe cobrado después de descuentos. Corte: miércoles 23:59, Colombia; pagos los jueves a la cuenta verificada, con soporte y retenciones discriminadas. Reembolsos y contracargos producen ajustes. Consulta los detalles de tu liquidación en Seller.'
 if text.startswith('Tasa de referencia para tickets: 10 %. No se especifica'):
  return 'Tickets: 10 % sobre el importe cobrado después de descuentos, sin descontar unilateralmente costos de pasarela. Base VF1 de suscripción: fija, incluso con descuentos o pago anual; comisión bruta. Corte miércoles 23:59 de Colombia y pago los jueves, sujeto a documentación y cuenta verificadas. El pago anual causa mes a mes; las cuotas futuras no son saldo por pagar. Reembolsos y contracargos generan ajustes. Consulta las condiciones vigentes en Seller.'
 if text.startswith('Entrega el objetivo acordado al equipo de entrenamiento.'):
  return 'Comparte la guía de primeros pasos y verifica que el cliente comprenda cómo iniciar una acción de su plan. Acuerda el siguiente contacto y consulta a Qori las dificultades concretas. No prometas sesiones, horarios o servicios que no hayan sido confirmados.'
 if text.startswith('Tu pago figura confirmado y tu suscripción está activa.'):
  return 'Tu pago figura confirmado y tu suscripción está activa. Te comparto la guía para empezar con [objetivo]. ¿Quién operará Qori y qué primera acción quieren preparar? Podemos acordar un seguimiento para revisar cómo les fue.'
 if text.startswith('Hola, [nombre]. Somos el equipo de entrenamiento de Qori.'):
  return 'Hola, [nombre]. Te acompaño a organizar el siguiente paso con Qori. Para empezar con [objetivo], revisemos quién operará la herramienta y qué duda tienen. Acordemos el próximo contacto; las solicitudes de apoyo a Qori se confirman por su canal de atención.'
 if text.startswith('En la primera capacitación dejamos [tarea].'):
  return 'Habíamos acordado preparar [tarea]. ¿Pudieron avanzar o encontraron una dificultad? Revisemos qué hace falta y acordemos el siguiente paso.'
 if text.startswith('Cuenta y orden correctas; pago confirmado cuando aplica;'):
  return 'Cuenta y orden correctas; pago confirmado cuando aplica; atribución consultada; cierre remitido a revisión; guía de primeros pasos compartida; próxima acción acordada; avance y pendientes registrados.'
 text=text.replace('El equipo de entrenamiento coordina las dos capacitaciones acordadas para el acompañamiento del cliente.','Puedes empezar con la guía del programa y acordar el seguimiento. Cualquier apoyo adicional de Qori se confirma por su canal de atención.')
 text=text.replace('El equipo de entrenamiento coordina las dos capacitaciones y confirma su agenda contigo.','Consulta la guía de primeros pasos y acuerda el seguimiento con tu embajador. Cualquier apoyo adicional se confirma con Qori.')
 text=text.replace('Supone los seis pagos elegibles al precio de referencia, sin ajustes.','Supone seis meses elegibles de cobertura paga y suscripción vigente, sin ajustes. La base VF1 es fija incluso con descuentos o pago anual.')
 text=text.replace('Recomienda Qori a negocios que conoces y recibe comisiones cuando tu recomendación se convierta en una compra elegible.','Desarrolla tu oportunidad acercando soluciones a los negocios. Puedes recomendar, construir una cartera o especializarte por sector. Recibes comisiones por compras elegibles de negocios atribuidos a tu cuenta.')
 text=text.replace('Propuesta operativa basada en el acompañamiento solicitado. Confirmar disponibilidad y alcance, sin prometer automatización de agenda.','Comparte c07, confirma responsable y primera acción. Las solicitudes de apoyo se coordinan con Qori; no ofrecer sesiones ni horarios no confirmados.')
 for old,new in replacements.items():text=text.replace(old,new)
 return text

def edit_office(source,destination):
 changes=0
 with zipfile.ZipFile(str(source)) as zin,zipfile.ZipFile(str(destination),'w',zipfile.ZIP_DEFLATED) as zout:
  for info in zin.infolist():
   data=zin.read(info.filename)
   if re.match(r'word/(document|header\d+|footer\d+)\.xml$',info.filename) or re.match(r'ppt/(slides/slide\d+|notesSlides/notesSlide\d+)\.xml$',info.filename):
    doc=minidom.parseString(data)
    ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main' if info.filename.startswith('word/') else 'http://schemas.openxmlformats.org/drawingml/2006/main'
    for paragraph in doc.getElementsByTagNameNS(ns,'p'):
     nodes=paragraph.getElementsByTagNameNS(ns,'t')
     if not nodes:continue
     text=''.join(''.join(c.data for c in n.childNodes if c.nodeType==c.TEXT_NODE) for n in nodes)
     changed=revised(text)
     if source.stem=='a00_guia_maestra' and re.match(r'^[ac]\d{2}_\S+\.(pdf|docx|pptx|png)$',text.strip(),re.I):
      props=paragraph.getElementsByTagNameNS(ns,'pPr')
      prop=props[0] if props else doc.createElementNS(ns,'w:pPr')
      if not props:paragraph.insertBefore(prop,paragraph.firstChild)
      for old in list(prop.getElementsByTagNameNS(ns,'spacing')):prop.removeChild(old)
      spacing=doc.createElementNS(ns,'w:spacing');spacing.setAttribute('w:after','0');spacing.setAttribute('w:before','0');prop.appendChild(spacing)
     if changed!=text:
      for node in nodes:
       for child in list(node.childNodes):node.removeChild(child)
      nodes[0].appendChild(doc.createTextNode(changed));changes+=1
    data=doc.toxml(encoding='UTF-8')
   zout.writestr(info,data)
 return changes

styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='QT',fontName='QoriBold',fontSize=25,leading=30,textColor=HexColor('#102b46'),spaceAfter=15))
styles.add(ParagraphStyle(name='QH',fontName='QoriBold',fontSize=13,leading=18,textColor=HexColor('#102b46'),spaceBefore=12,spaceAfter=6,keepWithNext=True))
styles.add(ParagraphStyle(name='QB',fontName='QoriText',fontSize=10.5,leading=16,textColor=HexColor('#344d62'),spaceAfter=9))
styles.add(ParagraphStyle(name='QS',fontName='QoriText',fontSize=8.5,leading=12,textColor=HexColor('#536578'),spaceAfter=14))
def pdf(destination,title,key,audience,sections):
 compact=key in ['c02_brochure','c07_primeros_pasos']
 body_style=ParagraphStyle(name='CompactBody',parent=styles['QB'],leading=14,spaceAfter=6) if compact else styles['QB']
 heading_style=ParagraphStyle(name='CompactHeading',parent=styles['QH'],spaceBefore=8,spaceAfter=4) if compact else styles['QH']
 flow=[Paragraph('Qori',styles['QT']),Paragraph(html.escape(title),styles['QT']),Paragraph(('Para futuros embajadores' if audience=='CANDIDATE' else 'Para tu negocio')+' · v1.1 · 12 noviembre 2026',styles['QS'])]
 for heading,body in sections:
  flow.append(Paragraph(html.escape(heading),heading_style))
  for line in body.split('\n'):
   escaped=html.escape(line)
   escaped=re.sub(r'(https://[^ &<]+)',r'<link href="\1" color="#0341B3">\1</link>',escaped)
   flow.append(Paragraph(escaped,body_style))
 def footer(c,d):
  c.setStrokeColor(HexColor('#b7995e'));c.line(44,40,551,40);c.setFont('QoriText',8);c.setFillColor(HexColor('#536578'));c.drawString(44,27,key+' · Qori · v1.1');c.drawRightString(551,27,str(d.page))
 SimpleDocTemplate(str(destination),pagesize=(595.28,841.89),leftMargin=44,rightMargin=44,topMargin=40,bottomMargin=58,title=title,author='Qori').build(flow,onFirstPage=footer,onLaterPages=footer)

original=list(csv.DictReader((SOURCE/'MANIFIESTO_ACTIVOS.csv').open(encoding='utf-8-sig')))
assert len(original)==45
content=json.loads((SOURCE/'00_CONTROL_INTERNO/ORIGINALES_PRODUCCION/content.json').read_text(encoding='utf-8'))['content']
rows=[];audit=[]
for row in original:
 rel=Path(row['nombre_archivo']);src=(SOURCE/rel).resolve();assert SOURCE.resolve() in src.parents
 dst=OUT/rel;dst.parent.mkdir(parents=True,exist_ok=True)
 digest=hashlib.sha256(src.read_bytes()).hexdigest();fmt=row['formato'];key=row['codigo'];version='1.0'
 if fmt in ['DOCX','PPTX']:
  edits=edit_office(src,dst);version='1.1';audit.append({'file':str(rel),'paragraphs_changed':edits,'source_sha256':digest})
 elif fmt=='PDF' and (src.with_suffix('.docx').exists() or src.with_suffix('.pptx').exists()):
  version='1.1' # Exported from the matching revised Office file, never copied as if current.
 elif fmt=='PDF' and key in ['c02_brochure','c06_registro_pago','c07_primeros_pasos','c09_escenarios','c10_preguntas']:
  sections=[(revised(t),revised(b)) for t,b in content[key]]
  pdf(dst,row['titulo'],key,row['audiencia'],sections);version='1.1'
 else:shutil.copyfile(str(src),str(dst))
 row.update(version=version,estado_revision='REVISADO_PENDIENTE_VALIDACION_VISUAL');rows.append(row)

candidate=[
 ('b01_oportunidad','Tu oportunidad con Qori',[
 ('Una estructura para empezar','Acerca soluciones a los negocios y desarrolla tu actividad comercial con Qori. Tienes una plataforma, un producto que presentar y herramientas para organizar tus oportunidades. Participar es gratis; el acceso comercial requiere aprobación de Qori.'),
 ('Tres formas de participar','Recomendar: identifica una necesidad y comparte una solución. Desarrollar una cartera: organiza conversaciones y acompaña las decisiones. Especializarte: aprende los casos de uso de un sector y prepara mejores demostraciones. Puedes cambiar tu enfoque; las rutas mantienen las mismas condiciones económicas.'),
 ('Qué aporta Qori','Qori Empresa presta las herramientas al negocio. Qori Customer reúne experiencias y beneficios para sus clientes. Qori Seller permite consultar enlaces, materiales, seguimiento y resultados. Qori gestiona la contratación y el cobro del producto.'),
 ('Cómo se generan comisiones','Por compras elegibles de negocios atribuidos a tu cuenta y con pago confirmado. El alta gratuita no genera comisión. Compartir la oportunidad con otros embajadores tampoco genera comisión. Consulta siempre la política vigente.'),
 ('Da el primer paso','Conoce las rutas y calcula un escenario en https://gosqori.com/seller/. Solicita tu acceso, completa los requisitos y practica antes de tu primera recomendación. Los ingresos dependen de compras reales; no hay un nivel de ingresos garantizado.')]),
 ('b02_rutas','Elige cómo desarrollar tu actividad',[
 ('Una recomendación ocasional','Si ya conversas con negocios, pregunta qué necesitan mejorar y muestra una sola aplicación de Qori. Comparte la presentación y permite que el propietario decida. Acuerda si desea seguimiento.'),
 ('Una cartera organizada','Si deseas dedicar más tiempo, elige un segmento, comprende sus necesidades y registra contactos autorizados en Mi CRM. Revisa las próximas acciones, las cuentas atribuidas y los pagos confirmados. Dedicar más tiempo no asegura más ingresos.'),
 ('Conocimiento de un sector','Si conoces cafeterías, comercios o servicios, prepara ejemplos concretos y conoce los límites del plan. La especialización mejora la pertinencia de tu recomendación; no concede certificaciones, territorios o servicios adicionales.'),
 ('La parte que te corresponde','Identificar necesidades, presentar información fiel y acompañar decisiones. El cliente crea su contraseña y paga directamente a Qori. No recibas dinero ni datos bancarios en su nombre.'),
 ('La parte que aporta Qori','Producto, plataforma, Demo, biblioteca comercial, seguimiento y gestión de comisiones según las condiciones. Consulta dudas por el canal de atención y confirma cualquier apoyo especial antes de ofrecerlo.'),
 ('Explora sin promesas','La calculadora de Seller muestra escenarios brutos para seis meses de cobertura paga por cliente nuevo VF1. Desde el séptimo mes ese cliente deja de generar comisión de suscripción bajo ese esquema. Revisa https://gosqori.com/seller/ y las condiciones antes de empezar.')]),
 ('b03_primeros_negocios','Tu recorrido hacia los primeros negocios',[
 ('Prepara tu espacio','Solicita acceso y completa los requisitos. Tras la aprobación, abre Mi oportunidad, consulta la bienvenida y practica un recorrido en Demo con datos ficticios.'),
 ('Primer negocio comprender','Escucha una necesidad y verifica si alguna opción de Qori encaja. El objetivo es hacer una buena recomendación; una conversación puede terminar sin compra. Registra únicamente contactos que autoricen el seguimiento.'),
 ('Segundo negocio repetir','Usa lo aprendido para mejorar tu explicación. Elige un material, aclara los límites y comparte el enlace del contacto desde Mi CRM. El titular debe usar el correo registrado y controlar su cuenta.'),
 ('Tercer negocio comprobar el método','Comprueba atribución, registro y pago cuando corresponda. Comparte los primeros pasos del programa y acuerda seguimiento. Anota qué entendió el cliente, qué dudas tuvo y qué mejorarás.'),
 ('Mide señales reales','Conversaciones autorizadas, demostraciones realizadas, registros, compras confirmadas y primer uso. Distingue comisiones de referencia, por pagar y efectivamente pagadas. Esta ruta es orientativa: no fija plazo, cuota ni ingresos.'),
 ('Continúa con información vigente','Explora materiales y la calculadora en https://gosqori.com/seller/. Cada compra se rige por las condiciones y el plan vigente; no prometas funciones o beneficios que no estén incluidos.')])
]
for key,title,sections in candidate:
 rel=Path('03_DESCUBRE_TU_OPORTUNIDAD')/(key+'.pdf');(OUT/rel).parent.mkdir(exist_ok=True);pdf(OUT/rel,title,key,'CANDIDATE',sections)
 rows.append(dict(codigo=key,titulo=title,audiencia='CANDIDATE',etapa='START',formato='PDF',nombre_archivo=str(rel).replace('\\','/'),version='1.1',fecha='2026-11-12',descripcion=sections[0][1],instrucciones_uso='Compartir para conocer la oportunidad Qori Seller. No sustituye las condiciones del programa.',enlace_o_cta='https://gosqori.com/seller/',estado_revision='REVISADO_PENDIENTE_VALIDACION_VISUAL'))
(OUT/'REVISION_EDITORIAL.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'manifest-draft.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',len(rows),'assets. Export the 11 Office files to matching PDFs before validation.')
