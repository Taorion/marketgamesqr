# UNIVERSAL QR
## Documento maestro de producto, operación, tecnología y modelo comercial

### Propósito del documento

Este documento explica UNIVERSAL QR de punta a punta:

- qué es;
- cómo funciona técnicamente;
- cómo se usa desde cada rol;
- qué problemas resuelve;
- qué posibilidades comerciales abre;
- cómo beneficia a los negocios;
- cómo se puede monetizar;
- qué estrategias distintas permite implementar.

La intención es que sirva como referencia para:

- ventas;
- onboarding de clientes;
- entrenamiento operativo;
- soporte interno;
- definición de planes;
- diseño de nuevas campañas;
- conversación comercial con prospectos.

---

## 1. Qué es UNIVERSAL QR

UNIVERSAL QR es una plataforma de activación comercial basada en códigos QR únicos, diseñada para conectar campañas de marketing con captura de datos, validación, redención y medición de resultados.

La plataforma transforma una promoción simple en un sistema trazable donde cada paso queda registrado:

- participación del usuario;
- captura del lead;
- generación del QR;
- validación del QR;
- redención del beneficio;
- registro de auditoría;
- atribución de ventas cuando aplica.

El valor no está solamente en crear QR. El valor está en convertir la promoción en un sistema medible.

---

## 2. Qué problema resuelve

La mayoría de las activaciones promocionales tradicionales tienen un problema común: generan movimiento, pero no generan control ni trazabilidad.

Los problemas típicos son:

- no se sabe quién participó realmente;
- no se sabe qué lead viene de qué campaña;
- el mismo beneficio puede reclamarse varias veces;
- no existe evidencia clara de validación;
- no hay datos suficientes para medir rendimiento;
- el negocio no puede calcular retorno ni conversión con claridad.

UNIVERSAL QR resuelve esto con:

- tokens únicos;
- estados de QR;
- reglas de expiración;
- validación centralizada;
- redención controlada;
- bitácora de eventos;
- reportes por campaña, negocio, usuario y periodo.

---

## 3. Qué hace el sistema

UNIVERSAL QR permite a un negocio o a una agencia ejecutar campañas donde una persona:

1. participa en una experiencia digital;
2. deja sus datos;
3. recibe un QR único;
4. lo presenta en tienda, evento, call center o punto de canje;
5. un usuario autorizado lo valida;
6. el sistema decide si el beneficio puede redimirse;
7. si corresponde, se registra la redención;
8. luego se mide impacto, uso y resultados.

El sistema puede operar con:

- juegos promocionales;
- formularios;
- landings;
- campañas de producto;
- promociones de recompra;
- activaciones en punto de venta;
- campañas con QR impreso;
- campañas con QR digital;
- campañas mixtas.

---

## 4. Cómo está pensado el modelo de negocio

UNIVERSAL QR no es solo software. Es una plataforma comercial con potencial de monetización en varias capas.

Las más naturales son:

- suscripción mensual;
- cobro por volumen de QR;
- fee por campaña;
- fee por implementación;
- servicio de analítica;
- servicio de branding / white label;
- soporte premium;
- operación para múltiples sedes;
- módulos avanzados para clientes enterprise.

La lógica recomendada no es cobrar solo por "abrir la plataforma", sino por el valor operativo que genera:

- QR creados;
- campañas activas;
- usuarios habilitados;
- validaciones;
- redenciones;
- analítica;
- personalización;
- soporte;
- integración.

---

## 5. Rol de cada parte del sistema

### 5.1 Usuario final / participante

Es la persona que entra a una campaña.

Puede:

- participar en un juego;
- llenar un formulario;
- registrar sus datos;
- recibir un QR;
- redimir un beneficio;
- volver a participar si la campaña lo permite.

### 5.2 Negocio cliente

Es la empresa que quiere captar leads, incentivar visitas, controlar beneficios y medir resultados.

Puede:

- crear campañas;
- definir topes;
- configurar vigencias;
- revisar leads;
- revisar redenciones;
- exportar información;
- ver reportes.

### 5.3 Vendedor / validador

Es quien escanea o ingresa el token para comprobar si el QR es válido.

Puede:

- validar QR;
- ver estado;
- redimir beneficio si corresponde;
- dejar evidencia de la operación.

### 5.4 Admin / operador de plataforma

Es quien administra negocios, campañas y soporte.

Puede:

- crear negocios;
- configurar campañas;
- supervisar métricas;
- revisar desempeño;
- auditar actividad;
- intervenir si hay problemas operativos.

### 5.5 Agencia / equipo comercial

Es quien usa UNIVERSAL QR para vender campañas a sus clientes.

Puede:

- diseñar activaciones;
- construir propuestas;
- mostrar resultados;
- renovar clientes;
- escalar con planes.

---

## 6. Arquitectura funcional

La plataforma tiene varias capas:

### 6.1 Capa pública o de experiencia

Incluye:

- juego o experiencia interactiva;
- formularios;
- páginas de captura;
- QR entregado al usuario;
- flujos promocionales visibles.

### 6.2 Backend

Gestiona:

- autenticación;
- validación de acceso;
- creación de QR;
- redención;
- auditoría;
- reportes;
- límites;
- reglas de negocio.

### 6.3 Base de datos

Guarda:

- negocios;
- campañas;
- leads;
- respuestas de formularios;
- QR;
- redenciones;
- ventas atribuidas;
- logs;
- lotes;
- usuarios.

### 6.4 Paneles internos

Incluyen:

- portal empresarial;
- validador;
- panel de administración;
- paneles de analítica;
- vistas de campañas y leads.

---

## 7. Modelo de datos explicado

### 7.1 businesses

Representa al negocio cliente.

Guarda la identidad principal de cada empresa dentro del sistema.

### 7.2 campaigns

Define la campaña y su configuración.

Puede incluir:

- nombre;
- tipo;
- estado;
- fechas;
- presupuesto;
- metas;
- topes;
- canales;
- notas;
- assets entregados.

Campos importantes:

- `max_qr_total`
- `max_redemptions_total`
- `max_qr_per_person`
- `qr_expires_after_hours`
- `budget_total`

### 7.3 players

Guarda leads o participantes.

Puede almacenar:

- nombre;
- email;
- teléfono;
- documento;
- origen;
- metadata;
- relación con campaña.

### 7.4 questionnaires

Guarda respuestas capturadas durante la interacción.

Sirve para:

- preferencias de producto;
- intención de compra;
- perfil de interés;
- segmentación;
- remarketing;
- scoring.

### 7.5 qr_codes

Es la tabla central del sistema.

Cada fila representa un QR emitido.

Guarda:

- token;
- estado;
- campaña;
- negocio;
- lead;
- beneficio;
- fecha de creación;
- vencimiento;
- origen;
- metadata;
- si requiere claim o no;
- timestamps de claim o redención.

Estados típicos:

- `ACTIVE`
- `UNCLAIMED`
- `CLAIMED`
- `REDEEMED`
- `EXPIRED`
- `CANCELLED`

### 7.6 redemptions

Registra el acto de redención.

Guarda:

- QR redimido;
- negocio;
- campaña;
- usuario que redimió;
- sucursal o sede;
- fecha;
- metadatos.

### 7.7 validation_logs

Guarda cada intento de validación.

Sirve para:

- auditoría;
- trazabilidad;
- debugging operativo;
- análisis de fraude;
- métricas de uso.

### 7.8 qr_batches

Guarda lotes de QR emitidos.

Util para:

- producción masiva;
- exportación de archivos;
- seguimiento por lote;
- impresión;
- distribución por campaña.

### 7.9 attributed_sales

Guarda ventas atribuidas a un QR, una redención o una campaña.

Es la base para:

- ROI;
- CAC;
- ticket promedio;
- tasa de conversión;
- análisis financiero.

### 7.10 app_users

Guarda usuarios internos y usuarios del negocio.

Puede incluir:

- rol;
- negocio;
- sucursal;
- permisos;
- estado activo/inactivo.

---

## 8. Flujo técnico completo

### 8.1 Creación de campaña

El negocio define:

- objetivo;
- fechas;
- tope de QR;
- tope de redenciones;
- control por persona;
- vigencia;
- presupuesto;
- reglas de validación.

### 8.2 Captura del lead

El usuario interactúa con la experiencia y deja sus datos.

El sistema puede registrar:

- identidad;
- contacto;
- intereses;
- respuestas;
- origen;
- contexto de campaña.

### 8.3 Generación del QR

El backend genera:

- token seguro;
- registro en base de datos;
- estado inicial;
- relación con lead y campaña;
- URL del validador o claim.

### 8.4 Validación

Un usuario autorizado:

- escanea el QR;
- pega el token;
- consulta el sistema;
- revisa si es válido, vigente y no usado;
- confirma si puede redimirse.

### 8.5 Redención

Si el QR cumple reglas:

- se registra la redención;
- se actualiza el estado del QR;
- se deja evidencia en logs;
- se habilita la medición posterior.

### 8.6 Medición

Luego se calculan:

- leads;
- QR creados;
- QR redimidos;
- redenciones por usuario;
- redenciones por sede;
- redenciones por campaña;
- ventas atribuidas;
- ROI;
- CAC;
- costo por lead;
- costo por redención.

---

## 9. Funcionamiento por interfaz

### 9.1 Experiencia pública

Sirve para:

- captar interés;
- pedir datos;
- entregar recompensa;
- hacer la parte visible de la activación.

### 9.2 Validador

Sirve para:

- revisar un QR;
- saber si está vigente;
- redimirlo;
- registrar la operación.

### 9.3 Portal empresarial

Estado actual del portal empresa:

- dashboard ejecutivo de negocio;
- campanas, leads, redenciones y ventas atribuidas;
- metricas de ROI, CAC, ticket promedio e ingresos atribuidos;
- validador QR integrado dentro del portal;
- generacion de QR postventa;
- paquetes de QR estrategicos para etiquetas, empaques, volantes, eventos o mostrador;
- historial y descargas de QR estrategicos;
- sistema de afiliados;
- carga de logo del negocio;
- carnet PNG de afiliado con logo del negocio, datos, puntos y QR permanente;
- acumulacion de puntos por compra;
- historial de puntos por afiliado.

El portal empresa combina analitica y operacion. No solo muestra resultados: tambien permite ejecutar recompra, fidelizacion, validacion, venta atribuida y gestion de afiliados.

El QR del afiliado identifica al cliente para acumular puntos. No redime un premio automatico.

Sirve para:

- ver campañas;
- revisar leads;
- descargar QR;
- revisar redenciones;
- monitorear métricas;
- administrar campañas;
- revisar el desempeño comercial.

### 9.4 Panel administrativo

Sirve para:

- administrar la plataforma;
- supervisar negocios;
- ver campañas de alto nivel;
- resolver incidencias;
- analizar la operación global.

---

## 10. Posibilidades comerciales

UNIVERSAL QR puede usarse en muchas industrias y contextos.

### 10.1 Retail

- cupones;
- descuentos;
- promociones por compra;
- recompra;
- campañas por temporada.

### 10.2 Restaurantes

- beneficios por visita;
- combos promocionales;
- fidelización;
- cupones por registro.

### 10.3 Consumo masivo

- activaciones en empaque;
- sorteos;
- campañas de código único;
- recompensas por compra.

### 10.4 Eventos

- registro;
- acceso;
- dinámicas;
- premios;
- activación post-evento.

### 10.5 Agencias

- campañas white label;
- activaciones para terceros;
- dashboard para clientes;
- servicio recurrente.

### 10.6 Franquicias

- control multi-sede;
- validación por sucursal;
- reportes regionales;
- comparativos entre puntos de venta.

### 10.7 Venta consultiva / B2B

- captación de leads comerciales;
- incentivos por registro;
- seguimiento por campaña;
- medición del funnel comercial.

### 10.8 Postventa

- recompra;
- referidos;
- fidelización;
- renovación;
- cross-sell.

---

## 11. Estrategias diferentes que puede ejecutar un negocio

### 11.1 Estrategia de captación de leads

Objetivo:

- obtener datos de personas interesadas.

Uso:

- formulario;
- juego;
- landing;
- sorteo.

Beneficio:

- base de datos propia;
- segmentación;
- remarketing.

### 11.2 Estrategia de tráfico a tienda

Objetivo:

- llevar personas al punto de venta.

Uso:

- QR con beneficio físico;
- incentivo por visita;
- cupones presenciales.

Beneficio:

- más tráfico;
- más posibilidad de compra;
- medición de visitas.

### 11.3 Estrategia de recompra

Objetivo:

- hacer que el cliente vuelva.

Uso:

- beneficios postventa;
- cupones de retorno;
- activaciones para segunda compra.

Beneficio:

- mayor lifetime value;
- repetición de compra;
- fidelización.

### 11.4 Estrategia de activación en empaque

Objetivo:

- convertir el empaque en canal de interacción.

Uso:

- QR en etiqueta;
- QR en caja;
- QR en bolsa;
- QR en sticker.

Beneficio:

- interacción fuera del punto de venta;
- trazabilidad por lote o producto;
- activación por consumo real.

### 11.5 Estrategia de fidelización

Objetivo:

- premiar comportamiento repetido.

Uso:

- QR por compras acumuladas;
- puntos;
- beneficios por frecuencia.

Beneficio:

- retención;
- recompra;
- más valor por cliente.

### 11.6 Estrategia de postventa

Objetivo:

- mantener relación después de la compra.

Uso:

- QR en factura;
- QR en ticket;
- beneficio por segunda visita.

Beneficio:

- reactivación;
- satisfacción;
- venta cruzada.

### 11.7 Estrategia de campañas con urgencia

Objetivo:

- generar decisión rápida.

Uso:

- expiración limitada;
- cupos limitados;
- ventanas de tiempo.

Beneficio:

- más conversión;
- menos dilación;
- mejor respuesta.

### 11.8 Estrategia de franquicia o multi-sede

Objetivo:

- controlar ejecución en varias ubicaciones.

Uso:

- validadores por sede;
- reportes por sucursal;
- reglas centralizadas.

Beneficio:

- visibilidad;
- control;
- comparación entre sedes.

### 11.9 Estrategia de campañas de producto

Objetivo:

- impulsar un producto específico.

Uso:

- QR ligado a SKU;
- QR por campaña;
- QR por promoción del mes.

Beneficio:

- trazabilidad por producto;
- medición de interés;
- impulso comercial.

### 11.10 Estrategia para agencias

Objetivo:

- vender campañas a clientes como servicio.

Uso:

- portal por cliente;
- reportes;
- branding;
- soporte.

Beneficio:

- mayor ticket;
- servicio recurrente;
- retención de clientes.

---

## 12. Beneficios para los negocios

### 12.1 Beneficios comerciales

- más leads;
- más tráfico;
- más redenciones controladas;
- más oportunidad de venta;
- más repetición de compra.

### 12.2 Beneficios operativos

- control de fraude;
- evidencia de validación;
- trazabilidad de cada QR;
- orden en campañas;
- soporte a varios puntos de venta.

### 12.3 Beneficios financieros

- mejor lectura de ROI;
- mejor medición del CAC;
- posibilidad de comparar campañas;
- visión clara del presupuesto invertido.

### 12.4 Beneficios de datos

- base propia de contactos;
- segmentación;
- análisis de comportamiento;
- mejor toma de decisiones;
- historial de campañas.

### 12.5 Beneficios de marca

- campañas más modernas;
- experiencia interactiva;
- percepción de innovación;
- narrativa digital más sólida.

---

## 13. Qué se puede medir

UNIVERSAL QR permite medir:

- leads totales;
- leads por campaña;
- QR emitidos;
- QR activos;
- QR vencidos;
- QR redimidos;
- tasa de redención;
- redención por sede;
- redención por usuario;
- redención por campaña;
- ventas atribuidas;
- ingresos atribuidos;
- ticket promedio;
- costo por lead;
- costo por redención;
- CAC;
- ROI;
- uplift comercial;
- comportamiento por fecha y hora;
- comparativos entre campañas.

---

## 14. Modelo de costos de la plataforma

### 14.1 Costos directos principales

- infraestructura;
- base de datos;
- compute;
- storage;
- egress;
- logs;
- mantenimiento;
- soporte;
- operación.

### 14.2 Qué genera costo técnico

Los eventos que más impactan la operación son:

- creación de QR;
- captura de lead;
- validación;
- redención;
- exportación masiva;
- generación de archivos;
- consulta de reportes.

### 14.3 Qué no debe confundirse con costo alto

No todo QR cuesta mucho.

En general, el costo marginal de un QR adicional es bajo. Por eso la monetización debe basarse en:

- valor entregado;
- volumen;
- soporte;
- complejidad operativa;
- personalización;
- cantidad de campañas.

---

## 15. Cómo venderlo

### Mensaje corto

> UNIVERSAL QR convierte una promoción en leads, validaciones, redenciones y ventas medibles.

### Mensaje comercial ampliado

> UNIVERSAL QR permite crear campañas promocionales con QR únicos, capturar datos de clientes, validar beneficios en punto de venta y medir resultados reales. Es una plataforma para atraer tráfico, reducir fraude, controlar redenciones y convertir promociones en un activo comercial medible.

### Qué promete

- control;
- trazabilidad;
- medición;
- activación;
- retorno.

### Qué no promete

- no promete magia;
- no promete ventas automáticas;
- no promete resultados sin operación;
- no promete que una campaña funcione sin estrategia comercial.

---

## 16. Portafolio de servicios que se puede construir

Con UNIVERSAL QR se puede vender:

- diseño de campaña;
- implementación técnica;
- configuración de QR;
- portal para el cliente;
- validación en tienda;
- dashboard de métricas;
- soporte en activaciones;
- mantenimiento mensual;
- analítica ejecutiva;
- branding de plataforma;
- entrenamiento de usuarios;
- servicio de operación completa.

---

## 17. Planes de producto sugeridos

### Básico

Pensado para:

- pilotos;
- negocios pequeños;
- campañas simples.

Incluye:

- volumen bajo de QR;
- campaña limitada;
- validación y redención;
- reportes básicos;
- soporte estándar.

### Premium

Pensado para:

- negocios activos;
- campañas recurrentes;
- equipos comerciales.

Incluye:

- más QR;
- más campañas;
- analítica avanzada;
- más usuarios;
- exportaciones;
- mejor soporte.

### Enterprise

Pensado para:

- cadenas;
- franquicias;
- grandes volúmenes;
- necesidades de marca y operación compleja.

Incluye:

- volumen custom;
- multi-sede;
- branding avanzado;
- integraciones;
- SLA;
- soporte dedicado;
- acuerdos a medida.

---

## 18. Qué le conviene a cada tipo de cliente

### Negocio pequeño

- probar campañas;
- validar que la dinámica funciona;
- obtener primeros leads.

### Negocio mediano

- lanzar campañas recurrentes;
- medir conversiones;
- comparar resultados;
- profesionalizar la operación.

### Negocio grande

- operar múltiples sedes;
- tener control central;
- automatizar procesos;
- auditar redenciones;
- integrar datos a su operación.

### Agencia

- vender una solución con más valor;
- aumentar ticket;
- retener clientes;
- demostrar resultados;
- escalar campañas.

---

## 19. Recomendaciones estratégicas

### Si el objetivo es captar más leads

Usar:

- juego;
- registro simple;
- incentivo claro;
- QR posterior.

### Si el objetivo es aumentar visitas a tienda

Usar:

- beneficio físico;
- urgencia;
- expiración;
- validación en tienda.

### Si el objetivo es fidelizar

Usar:

- recompensas por repetición;
- beneficios escalonados;
- postventa;
- QR recurrentes.

### Si el objetivo es vender más producto

Usar:

- campañas por SKU;
- empaque con QR;
- promociones por producto;
- medición por canal.

### Si el objetivo es trabajar con agencias

Usar:

- dashboard claro;
- reportes fáciles de presentar;
- branding profesional;
- estructura de planes;
- soporte operativo.

---

## 20. Limitaciones y consideraciones

### 20.1 El sistema necesita operación

UNIVERSAL QR funciona mejor cuando hay:

- campaña bien diseñada;
- incentivo claro;
- validadores capacitados;
- reglas simples;
- seguimiento comercial.

### 20.2 La calidad del dato depende del formulario

Si el formulario pide poco, el dato será pobre.

Si pide demasiado, puede bajar la conversión.

### 20.3 La redención depende del punto de venta

Si el equipo no entiende el flujo, la experiencia se rompe.

### 20.4 El pricing debe evolucionar

El precio no debería ser fijo para siempre.

Debe ajustarse según:

- volumen;
- soporte;
- complejidad;
- branding;
- integraciones;
- rentabilidad.

---

## 21. Conclusión

UNIVERSAL QR es una plataforma para convertir promociones en un sistema comercial medible.

Su valor real no está solo en el QR, sino en la combinación de:

- captura de leads;
- validación;
- redención;
- trazabilidad;
- analítica;
- operación multi-negocio;
- monetización por volumen y servicio.

Si se comunica bien, puede venderse como:

- producto SaaS;
- solución para agencias;
- plataforma promocional;
- sistema de activación comercial;
- infraestructura de conversión y medición.

El camino correcto es empaquetarlo como una oferta clara, con planes por volumen, beneficios concretos y lenguaje comercial simple.

