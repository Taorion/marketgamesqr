# Simulacion de costos mensuales MarketGamesQR

Fecha base: 2026-06-15

Este modelo separa el costo tecnico de operar la plataforma del costo comercial de cobrar por Mercado Pago. El QR no tiene un costo directo por unidad: no se paga una API externa por generar codigos. El costo por QR sale de repartir infraestructura, base de datos, ancho de banda, soporte tecnico y comisiones sobre el volumen mensual.

## 1. Supuestos editables

| Variable | Valor usado | Nota |
|---|---:|---|
| Referencia de costos externos | COP | Convertir facturas externas a COP para el cierre comercial. |
| Comision pasarela estimada | 3,49% + IVA 19% sobre comision | Equivale a 4,1531% del valor vendido. Confirmar en Mercado Pago Colombia antes de cerrar margen. |
| Dominio / correo / varios | 0 COP | Render incluye dominios custom en el plan; el registrador del dominio se debe cargar aparte si aplica. |
| Costo directo por generacion QR | 0 COP | El costo real es capacidad de servidor, base de datos y transferencia. |
| Moneda de venta | COP | Los precios del portal ya estan en COP. |

## 2. Precios actuales del producto

### Paquetes de tickets

| Paquete | Tickets incluidos | Precio COP | Ingreso COP por ticket | Modo |
|---|---:|---:|---:|---|
| T50 | 50 | 75.000 | 1.500 | Ticket operativo |
| T200 | 200 | 291.000 | 1.455 | Activa Portal Base |
| T600 | 600 | 829.350 | 1.382 | Pospago |
| T2000 | 2.000 | 2.515.695 | 1.258 | Pospago |
| T6000 | 6.000 | 7.169.731 | 1.195 | Pospago |

### Planes mensuales RMS

| Plan | Usuarios incluidos | Tickets incluidos/mes | Precio COP/mes | Ingreso COP por usuario |
|---|---:|---:|---:|---:|
| Started | 2 | 0 | 262.500 | 131.250 |
| Medium | 4 | 0 | 1.312.500 | 328.125 |
| Premium | 10 | 0 | 5.250.000 | 525.000 |

## 3. Costos oficiales base de infraestructura

| Rubro | Escenario minimo | Escenario recomendado | Escenario crecimiento | Nota |
|---|---:|---:|---:|---|
| Render web service | 0 COP | 28.000 COP | 100.000 COP | El repo esta en `plan: free`; convertir la factura real a COP para cierre contable. |
| Supabase plan/organizacion | 0 COP | 100.000 COP | 100.000 COP | Pro se modela como base paga de Supabase. |
| Supabase compute | 0 COP | 40.000 COP | 60.000-240.000 COP | Micro, Small o Medium segun carga. |
| Total COP | 0 | 168.000 | 260.000-440.000 | No incluye excedentes por egress, MAU, storage, logs ni soporte externo. |

Lectura: hoy el `render.yaml` usa Render Free. Para vender de forma estable, el piso recomendado es Render Starter + Supabase Pro/Micro, aproximadamente 168.000 COP/mes antes de comisiones.

## 4. Escenarios de movimiento mensual

### Escenario A: arranque realista

Mix:

- 5 clientes Starter
- 2 clientes Growth
- 0 clientes Pro
- 5 paquetes Portal QR500
- 2 paquetes Portal QR1000
- 4 compras Ticket Access T200
- Infra: Render Starter + Supabase Pro/Micro = 168.000 COP/mes

| Metrica | Valor |
|---|---:|
| Ingreso bruto mensual | 7.375.000 |
| QR disponibles/generados | 5.300 |
| Usuarios asociados | 26 |
| Comision pasarela estimada | 306.291 |
| Infraestructura mensual | 168.000 |
| Costo total estimado | 474.291 |
| Costo tecnico por QR | 31,70 |
| Costo total por QR, con pasarela | 89,49 |
| Costo tecnico por usuario | 6.462 |
| Costo total por usuario, con pasarela | 18.242 |
| Margen despues de infra + pasarela | 6.900.709 |
| Margen porcentual estimado | 93,57% |

### Escenario B: operacion en crecimiento

Mix:

- 10 clientes Starter
- 5 clientes Growth
- 1 cliente Pro
- 10 paquetes Portal QR500
- 5 paquetes Portal QR1000
- 1 paquete Portal QR2000
- 4 compras Ticket Access T200
- Infra: Render Standard + Supabase Pro/Small = 260.000 COP/mes

| Metrica | Valor |
|---|---:|
| Ingreso bruto mensual | 19.710.000 |
| QR disponibles/generados | 12.800 |
| Usuarios asociados | 74 |
| Comision pasarela estimada | 818.576 |
| Infraestructura mensual | 260.000 |
| Costo total estimado | 1.078.576 |
| Costo tecnico por QR | 20,31 |
| Costo total por QR, con pasarela | 84,26 |
| Costo tecnico por usuario | 3.514 |
| Costo total por usuario, con pasarela | 14.575 |
| Margen despues de infra + pasarela | 18.631.424 |
| Margen porcentual estimado | 94,53% |

### Escenario C: escala comercial

Mix:

- 20 clientes Starter
- 10 clientes Growth
- 3 clientes Pro
- 20 paquetes Portal QR500
- 10 paquetes Portal QR1000
- 3 paquetes Portal QR4000
- 8 compras Ticket Access T200
- Infra: Render Standard + Supabase Pro/Medium = 440.000 COP/mes

| Metrica | Valor |
|---|---:|
| Ingreso bruto mensual | 46.300.000 |
| QR disponibles/generados | 33.600 |
| Usuarios asociados | 168 |
| Comision pasarela estimada | 1.922.895 |
| Infraestructura mensual | 440.000 |
| Costo total estimado | 2.362.895 |
| Costo tecnico por QR | 13,10 |
| Costo total por QR, con pasarela | 70,32 |
| Costo tecnico por usuario | 2.619 |
| Costo total por usuario, con pasarela | 14.065 |
| Margen despues de infra + pasarela | 43.937.105 |
| Margen porcentual estimado | 94,90% |

## 5. Costo por ticket si se reparte infraestructura por volumen

Usando el escenario recomendado minimo de 168.000 COP/mes:

| Volumen mensual total de QR | Costo tecnico por QR |
|---:|---:|
| 300 QR | 560,00 |
| 1.000 QR | 168,00 |
| 2.000 QR | 84,00 |
| 5.000 QR | 33,60 |
| 10.000 QR | 16,80 |
| 31.000 QR | 5,42 |
| 90.000 QR | 1,87 |

Interpretacion: como los planes ya no incluyen tickets, el costo fijo se reparte entre los tickets vendidos por recarga. El modelo mejora cuando cada cliente de portal inicia con un paquete y recompra tickets por campana.

## 6. Punto de equilibrio rapido

Con infraestructura recomendada minima de 168.000 COP/mes y pasarela estimada de 4,1531%:

| Producto | Ingreso neto despues de pasarela | Clientes/compras para cubrir infraestructura |
|---|---:|---:|
| Starter RMS | 306.710 | 1 |
| Growth RMS | 920.130 | 1 |
| Pro RMS | 2.760.391 | 1 |
| Ticket Access T200 | 162.940 | 2 |
| QR500 portal | 359.426 | 1 |
| QR8000 portal | 3.833.876 | 1 |

## 7. Formula de uso

Para recalcular cualquier mes:

```text
Usuarios asociados =
  Starter * 2 + Growth * 6 + Pro * 20 + clientes Portal Base * 2

QR mensuales =
  paquetes de tickets vendidos para Portal Base + paquetes de tickets vendidos a suscriptores

Ingreso bruto =
  suma de planes mensuales + suma de paquetes de tickets

Pasarela =
  ingreso bruto * 4,1531%

Costo tecnico por QR =
  infraestructura mensual / QR mensuales

Costo total por QR =
  (infraestructura mensual + pasarela) / QR mensuales

Costo tecnico por usuario =
  infraestructura mensual / usuarios asociados

Costo total por usuario =
  (infraestructura mensual + pasarela) / usuarios asociados

Margen =
  ingreso bruto - infraestructura mensual - pasarela
```

## 8. Decision recomendada

1. Mientras haya pocos clientes, mantener Render Free solo sirve para validar, pero no para prometer estabilidad comercial.
2. El primer piso serio es Render Starter + Supabase Pro/Micro: aproximadamente 172.200 COP/mes.
3. Con ese piso, el negocio se vuelve sano desde 1 Starter, 1 paquete Portal QR500 o 2 compras Ticket Access T200.
4. Para cotizar QR, no mirar solo el costo tecnico por QR. El valor real debe cubrir soporte, diseno de campana, riesgo de operacion, pasarela, impuestos y margen comercial.
5. Como regla conservadora: no vender QR masivos por debajo de 100 COP/QR mientras no haya volumen mensual estable y automatizacion completa.
