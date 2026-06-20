# Arquitectura de autenticacion y portal multiempresa

## Objetivo

El portal opera como un SaaS multiempresa. Cada usuario pertenece a un `business_id` y todas las lecturas, metricas, tickets, campanas, afiliados, redenciones, ventas y usuarios del equipo se filtran por ese negocio.

La regla base es:

```text
usuario autenticado -> app_users.business_id -> datos visibles del negocio
```

Un negocio nunca debe recibir, crear o modificar datos de otro negocio desde el portal empresa.

## Modelo de identidad

Tabla principal:

```text
app_users
- id
- business_id
- email
- password_hash
- full_name
- role
- branch_id
- is_active
- can_redeem_cross_business
```

Roles operativos:

```text
BUSINESS_OWNER
VALIDATOR
ADMIN_MARKET_GAMES
ADMIN
```

Reglas:

- `BUSINESS_OWNER`: administra su empresa, ve dashboard, metricas y usuarios del mismo `business_id`.
- `VALIDATOR`: opera validacion, redenciones y ventas permitidas para su negocio.
- `ADMIN_MARKET_GAMES` / `ADMIN`: operacion interna. Puede operar globalmente desde `/admin`.

## Login y sesion

Endpoint:

```text
POST /api/auth/login
```

Respuesta:

```json
{
  "token": "jwt",
  "session": {
    "token_type": "Bearer",
    "issued_at": "ISO",
    "expires_at": "ISO"
  },
  "user": {
    "id": "uuid",
    "business_id": "uuid",
    "email": "owner@empresa.com",
    "full_name": "Owner",
    "role": "BUSINESS_OWNER",
    "subscription": {}
  }
}
```

El portal guarda la sesion en `localStorage` con version interna de app. Si cambia la version del portal o el JWT vence, se limpia la sesion y se exige nuevo login.

## Validacion de sesion vigente

Endpoint:

```text
GET /api/auth/me
Authorization: Bearer <token>
```

Uso:

- El frontend lo llama antes de cargar el workspace.
- Si el usuario fue desactivado, el negocio se desactivo o el token vencio, el backend responde error y el portal cierra sesion.
- Esto evita usar datos viejos guardados en `localStorage`.

## Aislamiento por negocio

En el backend, las rutas del portal empresa deben resolver siempre el negocio desde la sesion:

```js
const businessId = req.user.business_id;
```

No se debe aceptar `business_id` desde el body para operaciones del portal empresa. Las rutas existentes de `/api/business/...` quedan scoped al negocio autenticado.

Ejemplos:

```text
GET /api/business/profile
GET /api/business/campaigns
GET /api/business/users
GET /api/business/analytics/command-center
```

Todas consultan con `where business_id = req.user.business_id`.

## Usuarios por negocio

Endpoints del portal empresa:

```text
GET /api/business/users
POST /api/business/users
PATCH /api/business/users/:userId
```

Reglas:

- Solo `BUSINESS_OWNER`, `ADMIN` o `ADMIN_MARKET_GAMES` pueden administrar usuarios.
- Un owner solo crea usuarios dentro de su propio `business_id`.
- Roles permitidos desde portal empresa: `BUSINESS_OWNER`, `VALIDATOR`.
- No se puede crear `ADMIN_MARKET_GAMES` desde el portal empresa.
- No se puede desactivar el usuario de la sesion actual.
- La creacion y reactivacion respetan los limites del plan (`users`, `validators`).

## Frontend empresa

Archivo principal:

```text
empresa/js/app.js
```

Responsabilidades:

- Decodificar `exp` del JWT.
- Cerrar sesion si el token ya vencio.
- Validar `/api/auth/me` antes de cargar dashboards.
- Enviar `Authorization: Bearer <token>` solo si la sesion esta activa.
- Cargar usuarios del negocio desde `/api/business/users`.
- Renderizar panel de equipo en `Cuenta`.

## Reglas para nuevas funcionalidades

Toda nueva ruta privada del portal empresa debe cumplir:

```text
1. authRequired
2. obtener business_id desde req.user
3. filtrar lecturas por business_id
4. insertar business_id desde req.user, no desde body
5. validar permisos por role o feature del plan
```

Para nuevas pantallas frontend:

```text
1. no guardar business_id editable en UI
2. no confiar en localStorage como fuente de verdad
3. refrescar datos con APIs scoped al usuario autenticado
4. al recibir 401, cerrar sesion
```

