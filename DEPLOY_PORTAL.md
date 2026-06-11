# Despliegue del portal Market Games

Este proyecto se despliega como una sola aplicacion Node/Express:

- Landing comercial: `/paquetes/`
- Portal empresa: `/empresa/`
- Admin: `/admin/`
- Validador: `/validador/`
- API: `/api/...`

## 1. Base de datos

Crea o usa un proyecto Supabase/Postgres y copia el connection string tipo URI/pooler.

Ejemplo de formato:

```env
DATABASE_URL=postgresql://postgres.TU_PROJECT_REF:TU_PASSWORD@aws-1-us-west-2.pooler.supabase.com:6543/postgres
DB_SSL=true
```

No sirve usar `PROJECT_REF`; debe ser el reference ID real del proyecto.

## 2. Variables de produccion

En el hosting configura:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres.TU_PROJECT_REF:TU_PASSWORD@aws-1-us-west-2.pooler.supabase.com:6543/postgres
DB_SSL=true
JWT_SECRET=un-secreto-largo-y-unico
JWT_EXPIRES_IN=12h
PUBLIC_APP_URL=https://TU-DOMINIO
PUBLIC_VALIDATOR_URL=https://TU-DOMINIO/validador
CORS_ORIGINS=https://TU-DOMINIO
ENABLE_DEMO_TOOLS=false
MERCADO_PAGO_ACCESS_TOKEN=APP_USR_xxx
MERCADO_PAGO_WEBHOOK_SECRET=secreto-webhook
MERCADO_PAGO_WEBHOOK_URL=https://TU-DOMINIO/api/payments/mercadopago/webhook
```

## 3. Render

Este repo incluye `render.yaml`.

En Render:

1. New > Blueprint.
2. Conecta el repositorio.
3. Render detecta `render.yaml`.
4. Completa las variables marcadas como secret.
5. Deploy.

Comando de build:

```bash
npm install
```

Comando de start:

```bash
npm start
```

Health check:

```text
/api/health
```

## 4. Migrar y sembrar demo

Cuando el servicio tenga `DATABASE_URL` real, ejecuta en shell del hosting o local apuntando a esa misma base:

```bash
npm run db:migrate
npm run db:reset-demo
```

El reset demo deja:

- `Bodega QR Express` en `PREPAID_QR`
- `Cafe Barrio Norte` en `STARTER`
- `Atelier de Coleccion` en `GROWTH`
- `Market Pro Retail` en `PRO`

Acceso demo:

```text
owner.prepago@demo.local
owner.starter@demo.local
owner.growth@demo.local
owner.pro@demo.local
```

Password:

```text
MarketGames2026!
```

## 5. URLs finales

```text
https://TU-DOMINIO/paquetes/
https://TU-DOMINIO/empresa/
https://TU-DOMINIO/admin/
https://TU-DOMINIO/validador/
```

## 6. Mercado Pago

Configura el webhook en Mercado Pago:

```text
https://TU-DOMINIO/api/payments/mercadopago/webhook
```

El registro de empresas queda activo solo cuando el pago se aprueba y llega la confirmacion.
