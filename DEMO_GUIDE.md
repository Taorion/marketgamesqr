# Demo guide - Sistema de campanas QR

Este documento sirve para preparar y ejecutar demostraciones comerciales del sistema.

## URLs de demo

Con el servidor corriendo:

```text
Juego MotoPescuezo
http://localhost:3000/

Demo kit de campanas
http://localhost:3000/demo

Validador universal
http://localhost:3000/validador

Portal empresa
http://localhost:3000/empresa

Landing Dia del Padre
http://localhost:3000/campana-productos
```

## Credenciales demo

```text
Email: validator@example.com
Password: definida en DEMO_VALIDATOR_PASSWORD o SEED_VALIDATOR_PASSWORD
```

## Antes de mostrarlo

1. Confirmar que `.env` esta configurado.
2. Confirmar que Supabase responde.
3. Ejecutar:

```powershell
npm run demo:check
```

4. Arrancar el servidor si no esta corriendo:

```powershell
npm run demo
```

## Demo 1: juego personalizado

Objetivo: mostrar que un juego de marca genera QR automatico al ganar.

Flujo:

1. Abrir `http://localhost:3000/`.
2. Jugar MotoPescuezo.
3. Ganar con potencia entre 60% y 65%.
4. Llenar nombre, cedula, telefono y correo.
5. Generar QR.
6. Abrir el validador.
7. Validar QR.
8. Mostrar cedula y telefono.
9. Redimir.
10. Volver a validar para demostrar bloqueo de doble uso.

Mensaje comercial:

```text
Cada juego puede ser distinto, pero todos usan el mismo backend y el mismo validador.
```

## Demo 2: formulario directo

Objetivo: mostrar que no siempre se necesita juego.

Flujo:

1. Abrir `http://localhost:3000/demo`.
2. Elegir `Formulario directo`.
3. Generar QR.
4. Validarlo en el validador.

Mensaje comercial:

```text
Si el cliente no quiere juego, igual puede captar datos y entregar cupones controlados.
```

## Demo 3: TikTok / Reels

Objetivo: mostrar una campana desde redes sociales.

Flujo:

1. Abrir `http://localhost:3000/demo`.
2. Elegir `TikTok / Reels`.
3. Explicar que el link podria estar en bio, historia, WhatsApp o anuncio.
4. Generar QR.
5. Validar en tienda.

Mensaje comercial:

```text
Un reel puede llevar a una landing que captura datos y entrega QR limitado para visitar la tienda.
```

## Demo 4: premio instantaneo

Objetivo: mostrar que el sistema tambien sirve para rifas o premios.

Flujo:

1. Elegir `Premio instantaneo`.
2. Generar QR.
3. Explicar que en una siguiente fase el backend puede asignar premios con inventario.
4. Validar QR.

Mensaje comercial:

```text
El sistema puede decidir premios, controlar cantidades y registrar quien redimio.
```

## Demo 5: evento fisico

Objetivo: mostrar activaciones en ferias o locales.

Flujo:

1. Elegir `Evento fisico`.
2. Generar QR.
3. Validar.

Mensaje comercial:

```text
En eventos, cada lead queda registrado y cada beneficio queda auditado.
```

## Demo 6: landing de Dia del Padre para almacen de cuero

Objetivo: mostrar que el sistema funciona aunque el cliente no quiera juego.

Flujo:

1. Abrir `http://localhost:3000/campana-productos`.
2. Explicar que el enlace se reparte por Instagram, TikTok y Facebook.
3. Llenar datos y preferencias de compra.
4. Generar QR.
5. Validarlo en el validador.
6. Abrir `http://localhost:3000/empresa`.
7. Iniciar sesion como owner.
8. Mostrar metricas de leads, QR, redenciones, ventas atribuidas, ROI y CAC.
9. Explicar la inversion de 500000 COP y el bono de 30000 COP por compras desde 50000 COP.

Credenciales:

```text
owner@example.com
Password: definida en DEMO_OWNER_PASSWORD o SEED_OWNER_PASSWORD
```

Mensaje comercial:

```text
El negocio puede lanzar una landing desde redes, captar leads, medir redenciones y cruzar ventas para calcular ROI y costo de adquisicion por cliente.
```

## Demo 7: afiliados y carnet con QR permanente

Objetivo: mostrar que el portal tambien sirve para fidelizacion, no solo para campanas puntuales.

Flujo:

1. Abrir `http://localhost:3000/empresa`.
2. Iniciar sesion como owner.
3. Ir a `Afiliados`.
4. Registrar nombre, documento, telefono y email.
5. Subir o confirmar el logo del negocio.
6. Crear afiliado y QR.
7. Mostrar el carnet PNG generado con logo del negocio, datos, puntos y QR permanente.
8. Descargar el PNG.
9. Ingresar un monto de compra y sumar puntos.
10. Mostrar historial de puntos del afiliado.

Mensaje comercial:

```text
Ademas de campañas QR, el negocio puede construir fidelizacion propia: cada afiliado tiene carnet, QR permanente y puntos acumulables por compra.
```

Notas operativas:

- El logo del negocio se normaliza como JPEG antes de guardarse.
- El backend acepta payloads con logo hasta 6 MB.
- El QR del afiliado identifica al cliente; no es un premio redimible por si solo.

## Guion corto de venta

```text
Esto no es solo un juego. Es una plataforma para crear campanas QR.

El cliente puede usar juego, formulario, TikTok, evento o influencer.
El usuario deja datos.
El sistema entrega un QR unico.
El vendedor valida cedula, telefono y beneficio.
El QR solo se puede redimir una vez.
El negocio obtiene datos y medicion real de redenciones.
El portal tambien permite QR postventa, paquetes QR y afiliados con carnet.
```

## Preguntas frecuentes para clientes

### El QR se puede falsificar

No facilmente. El QR contiene un token aleatorio. La cedula y el premio no se aceptan solo por texto. El backend valida contra la base de datos.

### Una persona puede usar el QR dos veces

No. Al redimir, el estado cambia a `REDEEMED`. Si intenta usarlo de nuevo, el validador lo rechaza.

### Se puede limitar la cantidad de QR

Si. La siguiente version debe incluir `campaigns` con limites por campana.

### Se puede vencer un QR

Si. La tabla `qr_codes` ya tiene `expires_at`. El backend ya rechaza QR vencidos.

### Un negocio ve QR de otro negocio

No. Los usuarios estan asociados a `business_id`. El backend bloquea QR de otro negocio.

## Proxima fase recomendada

Para convertirlo en SaaS comercial:

1. Inventario formal de premios.
2. Sucursales y validadores por sucursal.
3. Links por influencer.
4. Reportes PDF automaticos.
5. Planes y creditos.
6. Marca blanca.
7. Segmentacion automatica de leads y afiliados.


