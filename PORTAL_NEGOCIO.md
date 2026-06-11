# Portal empresarial de campanas QR

Este documento explica que es el portal, que valor entrega a las empresas y como funciona el modelo de negocio.

## Resumen

El portal empresarial es un panel privado para que cada negocio vea los resultados de sus campanas QR.

La empresa no crea el juego ni el formulario dentro del portal. En esta etapa, la agencia crea la experiencia por fuera:

- juego personalizado
- formulario simple
- encuesta
- landing
- ruleta
- activacion de TikTok/Reels
- evento fisico
- link de influencer

Esa experiencia queda conectada al backend QR. Cuando una persona participa, el sistema guarda los datos, genera un QR unico y lo asocia a la empresa, campana, jugador y premio.

La empresa entra al portal para ver resultados.

## Promesa del producto

```text
Creamos una experiencia digital para captar clientes.
El usuario deja sus datos y recibe un QR unico.
El vendedor valida el QR en tienda.
La empresa ve en el portal quien participo, que respondio y quien redimio.
```

## Que compra realmente la empresa

La empresa no compra solo un juego o un formulario.

Compra un sistema completo para:

- captar leads
- medir preferencias de clientes
- entregar beneficios controlados
- evitar doble uso de cupones
- llevar personas a tienda
- medir redenciones reales
- exportar datos comerciales
- entender que productos interesan mas

## Flujo completo

```text
1. La agencia crea la campana.
2. La agencia crea el juego, formulario o landing.
3. El usuario participa.
4. El usuario deja nombre, cedula, telefono, correo y respuestas.
5. El backend guarda los datos.
6. El backend genera un QR unico.
7. El usuario recibe el QR.
8. El usuario va al negocio.
9. El vendedor escanea el QR.
10. El validador muestra cedula, telefono y beneficio.
11. El vendedor compara datos y redime.
12. El portal registra la redencion.
13. La empresa ve metricas y resultados.
```

## Separacion por empresa

El portal es multiempresa.

Cada empresa tiene su propio `business_id`.

Empresa A solo ve:

- sus campanas
- sus leads
- sus respuestas
- sus QR
- sus redenciones
- sus premios
- sus validadores

Empresa B solo ve los datos de Empresa B.

El validador puede ser el mismo para todos los negocios, pero el backend aplica permisos por empresa.

## Roles

### Agencia / Admin general

Este rol lo usa la agencia.

Puede:

- crear negocios
- crear campanas
- configurar premios
- crear juegos/formularios
- conectar experiencias al backend
- configurar limites
- revisar todos los datos

### Empresa / Business owner

Este rol lo usa el cliente.

Puede:

- ver dashboard
- ver campanas
- ver leads
- ver respuestas
- ver redenciones
- ver premios
- exportar datos
- analizar resultados
- validar QR desde el portal
- registrar ventas atribuidas
- generar QR postventa
- generar paquetes de QR estrategicos
- crear afiliados
- generar carnet de afiliado con logo del negocio y QR
- sumar puntos por compra

No necesita crear juegos ni formularios. Puede operar acciones comerciales posteriores desde el portal.

### Vendedor / Validator

Este rol lo usa el empleado en tienda.

Puede:

- iniciar sesion en el validador
- escanear QR
- ver cedula
- ver telefono
- ver beneficio
- redimir una sola vez

No ve reportes ni configuraciones.

## Modulos del portal

La version actual del portal empresa ya no es solo un visor de campanas. Es un workspace operativo para negocio, ventas, validacion, QR estrategicos y fidelizacion.

### 1. Dashboard general

Muestra una vista ejecutiva de la campana y del negocio.

Metricas:

- leads capturados
- QR generados
- QR activos
- QR redimidos
- QR vencidos
- tasa de conversion/redencion
- rendimiento por campana
- redenciones por dia
- QR generados por hora
- redenciones por hora
- ventas atribuidas
- ROI, CAC y ticket promedio cuando hay datos comerciales
- QR postventa y QR estrategicos generados fuera del flujo publico
- actividad por sucursal cuando hay datos disponibles

Objetivo:

```text
Que el duenio entienda en segundos si la campana esta funcionando.
```

### 2. Graficos analiticos

El portal muestra graficos para analizar comportamiento.

Tipos de graficos:

- linea de leads y redenciones por dia
- barras de QR generados por hora
- barras de redenciones por hora
- dona/torta de estados de QR
- radar/arania de preferencias de comunidad
- barras agrupadas por campana
- distribuciones por pregunta
- comparativos de QR, validaciones, redenciones y ventas
- lectura de salud comercial por campana

Preguntas que responde:

- a que hora se generan mas QR
- a que hora se redime mas
- que producto prefiere la gente
- que canal prefiere la comunidad
- que campana convierte mejor
- cuantos leads no han redimido
- que campana compra clientes a menor CAC
- que QR estrategicos ya fueron reclamados o redimidos
- que sucursal concentra mas revenue atribuido

### 3. Campanas

La empresa ve sus campanas.

Campos visibles:

- nombre
- tipo
- estado
- QR generados
- redenciones
- limites
- fecha de inicio
- fecha de fin

Tipos posibles:

- juego
- formulario
- TikTok/Reels
- evento
- influencer
- premio instantaneo
- encuesta

En esta etapa, la agencia crea y configura las campanas.

### 4. Leads

La empresa ve las personas capturadas.

Datos:

- nombre
- cedula
- telefono
- correo
- campana
- estado del QR
- fecha de registro
- si redimio o no

Valor comercial:

```text
La empresa obtiene una base de clientes accionable.
```

Acciones actuales:

- revisar origen, interes e intencion comercial;
- descargar QR activo de un lead cuando esta disponible;
- usar los datos para seguimiento comercial posterior.

### 5. Respuestas

Muestra respuestas de formularios, encuestas o juegos.

Ejemplo de preguntas:

- producto favorito
- frecuencia de compra
- canal preferido
- criterio de compra
- si quiere muestras
- rango de edad
- ciudad o barrio
- categoria preferida

Valor comercial:

```text
La empresa no solo entrega descuentos. Aprende que quiere su comunidad.
```

### 6. Redenciones

Muestra beneficios entregados.

Datos:

- cliente
- cedula
- telefono
- premio
- vendedor que redimio
- fecha y hora
- campana

Valor comercial:

```text
La empresa sabe cuales leads realmente llegaron a tienda.
```

### 7. Ventas atribuidas

El portal permite registrar y revisar ventas relacionadas con redenciones, campanas y QR.

Datos:

- cliente;
- cedula;
- telefono;
- valor de compra;
- medio de pago;
- producto o servicio;
- sucursal;
- fecha.

Valor comercial:

```text
La empresa conecta promocion, visita y compra real.
```

Esto permite calcular:

- ingresos atribuidos;
- ticket promedio;
- CAC;
- ROI estimado;
- campanas sanas o costosas.

### 8. Motor de QR estrategicos

El portal incluye un modulo para crear QR que no nacen de un juego o formulario publico.

Usos:

- QR postventa para recompra;
- paquetes de QR para etiquetas, empaques, volantes, eventos o mostrador;
- QR de activacion interna;
- beneficios controlados por lote;
- descarga de ZIP, PDF, HTML imprimible, CSV o JSON segun formato disponible.

El lote queda registrado en el portal para medir:

- cantidad creada;
- cantidad reclamada;
- cantidad activa;
- cantidad redimida;
- origen y canal de uso.

### 9. Validador integrado

Ademas del validador publico en `/validador`, el portal empresa tiene una vista de validacion operativa.

Permite:

- escanear QR con camara;
- pegar token o URL;
- consultar estado contra backend;
- redimir si aplica;
- registrar venta atribuida despues de la redencion;
- ver historial reciente del validador.

### 10. Sistema de afiliados y carnet

El portal incluye un modulo de fidelizacion para crear afiliados del negocio.

Funciones:

- registrar nombre, documento, telefono, email e intereses;
- subir o cambiar el logo del negocio;
- normalizar el logo a JPEG optimizado antes de guardarlo;
- generar QR permanente de afiliado;
- generar carnet PNG horizontal con logo del negocio, datos, puntos y QR;
- descargar el carnet como PNG;
- sumar puntos por compra: 1 punto por cada 1000 pesos;
- ver historial de puntos del afiliado;
- ver metricas de afiliados, puntos, compras y ultima compra.

El QR del afiliado no es un premio redimible. Identifica al afiliado para acumular puntos y mantener trazabilidad.

El carnet se genera desde el portal y usa:

- logo del negocio;
- nombre del negocio;
- datos de contacto;
- puntos acumulados;
- QR permanente;
- token de afiliado.

### 11. Admin interno desde portal

Usuarios con rol admin pueden operar parte del panel interno desde el portal empresa.

Funciones:

- ver campanas globales;
- crear o editar campanas;
- preparar assets y enlaces;
- revisar estados de entrega;
- operar junto con `/admin` cuando se necesita control global.

### 12. Premios

Muestra beneficios disponibles.

Ejemplos:

- 10% descuento
- 15% descuento
- producto gratis
- muestra gratis
- 2x1
- premio mayor

En futuras versiones puede incluir inventario:

- total disponible
- asignados
- redimidos
- vencidos
- agotados

### 13. Exportaciones

La empresa puede exportar:

- leads
- respuestas
- redenciones
- campanas
- ventas
- reportes de campana
- paquetes QR

Formato actual:

- CSV
- descargas PNG/ZIP/PDF/HTML/JSON para QR cuando aplica

Futuro:

- Excel
- PDF ejecutivo
- reporte mensual automatico

## Validador universal

El validador es la app que usa el vendedor.

URL:

```text
/validador
```

Funciones:

- login de vendedor
- escaneo por camara
- ingreso manual de token
- validacion contra la base de datos
- muestra negocio
- muestra beneficio
- muestra nombre
- muestra cedula
- muestra telefono
- permite redimir
- bloquea doble redencion
- alerta si el QR no existe
- alerta si el QR esta vencido
- alerta si pertenece a otro negocio

Esto evita fraude y errores en tienda.

## Seguridad

El QR no depende de texto visible facil de copiar.

El QR contiene un token seguro:

```text
https://dominio.com/validadortoken=TOKEN_SEGURO
```

El backend valida siempre contra la base de datos.

Reglas:

- QR activo se puede redimir una sola vez
- QR redimido no se puede volver a usar
- QR vencido se rechaza
- QR inventado se rechaza
- vendedor de empresa A no puede redimir QR de empresa B
- toda validacion queda registrada
- toda redencion queda registrada

## Limites de campana

Cada campana puede tener limites.

Ejemplos:

- maximo de QR generados
- maximo de redenciones
- un QR por cedula
- vencimiento del QR en horas
- fecha de inicio
- fecha de fin

Esto protege a la empresa y tambien protege a la agencia de costos excesivos.

## Modelo operativo actual

El cliente no configura todo por su cuenta.

La agencia hace:

- diseno de campana
- juego o formulario
- configuracion del negocio
- configuracion de premio
- conexion al backend
- pruebas
- entrega del portal

La empresa hace:

- revisa resultados
- valida QR en tienda
- exporta datos
- toma decisiones comerciales

## Modelo de negocio recomendado

### 1. Setup de campana

Cobro inicial por crear la experiencia.

Ejemplos:

```text
Formulario simple + QR:
COP 600.000 - 1.200.000

Juego personalizado:
COP 1.500.000 - 5.000.000+

Campana con influencer / evento:
COP 800.000 - 2.500.000
```

### 2. Mensualidad de portal y validador

Cobro recurrente por mantener:

- hosting
- base de datos
- validador
- portal
- reportes
- soporte
- seguridad

Ejemplo:

```text
Starter:
COP 199.000/mes
1 campana activa
500 QR/mes
2 validadores

Growth:
COP 399.000/mes
3 campanas activas
3.000 QR/mes
10 validadores

Pro:
COP 899.000/mes
10 campanas activas
15.000 QR/mes
multi-sucursal
reportes avanzados
```

### 3. Cobro por exceso

Para no perder dinero si una campana se vuelve viral.

Ejemplo:

```text
QR extra generado: COP 50 - 100
Redencion extra: COP 50 - 150
Campana extra activa: COP 100.000 - 250.000/mes
Validador extra: COP 20.000 - 50.000/mes
```

### 4. Creditos

Modelo alternativo simple:

```text
1 QR generado = 1 credito
1 redencion = 1 credito adicional
```

Paquetes:

```text
1.000 creditos extra
5.000 creditos extra
10.000 creditos extra
50.000 creditos extra
```

## Por que es valioso para una empresa

Porque convierte promociones en datos medibles.

Antes:

```text
Hacemos descuentos y no sabemos que paso.
```

Despues:

```text
Sabemos quien participo, que quiere, si fue a tienda, que redimio y cuando.
```

## Frase comercial

```text
Nosotros te construimos la experiencia.
Tu cliente participa y recibe un QR unico.
Tu vendedor valida el QR en tienda.
Tu empresa ve todos los resultados en el portal.
```

## Casos de uso

### Restaurantes

- juego para ganar descuento
- encuesta de plato favorito
- QR para redimir en caja
- medicion de horarios de visita

### Tiendas de ropa

- formulario de preferencias
- tallas/categorias favoritas
- QR de descuento
- segmentacion para futuras campanas

### Gimnasios

- encuesta de objetivos fitness
- QR para clase gratis
- medicion de leads que visitan sede

### Discotecas / bares

- QR para cover, coctel o promo
- campana de evento
- redenciones por hora
- control en puerta/barra

### Marcas con influencers

- link por influencer
- leads por influencer
- redenciones reales por influencer
- calculo de conversion

## Diferencia contra un cupon normal

Un cupon normal:

- se copia
- se reenvia
- no se sabe quien lo uso
- no se sabe si llego a tienda
- no mide preguntas

Este sistema:

- genera QR unico
- pide cedula y telefono
- valida contra base de datos
- bloquea doble uso
- mide respuestas
- registra redencion
- muestra resultados por empresa

## Version actual

La version actual ya tiene:

- backend multiempresa
- portal empresa
- validador universal
- validador integrado dentro del portal empresa
- juego MotoPescuezo conectado
- campana simple de preferencias conectada
- QR asociado a cedula y telefono
- redencion unica
- dashboard con graficos
- reportes de ROI, CAC, ticket promedio e ingresos atribuidos
- registro y consulta de ventas atribuidas
- motor de QR postventa
- paquetes de QR estrategicos para etiquetas, empaques, volantes, eventos o punto de venta
- historial de QR estrategicos
- sistema de afiliados
- carnet PNG de afiliado con logo del negocio, datos, puntos y QR permanente
- acumulacion de puntos por compra
- exportacion CSV
- descarga de QR y paquetes cuando aplica
- separacion por empresa mediante `business_id`

## Proximas mejoras recomendadas

1. Inventario formal de premios.
2. Sucursales con reglas y reportes propios.
3. Validadores por sucursal.
4. Links por influencer.
5. Reporte PDF mensual automatico.
6. Segmentos automaticos de clientes y afiliados.
7. Recomendaciones inteligentes.
8. Planes y creditos.
9. Marca blanca.
10. Editor visual de campanas y beneficios para cliente final.

## Conclusion

El portal es el lugar donde la empresa ve el impacto real de sus campanas.

La agencia conserva el control creativo y tecnico de las experiencias.

La empresa obtiene claridad:

- cuantos participaron
- que respondieron
- quienes redimieron
- que productos prefieren
- que horarios funcionan
- que campana convierte mejor

Ese es el valor central del sistema.


