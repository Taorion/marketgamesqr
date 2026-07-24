# Staging Qori / MarketGamesQR

Este flujo separa pruebas y produccion:

- `main` sigue siendo la version oficial conectada a `marketgamesqr.com`.
- `staging` queda para probar cambios antes de enviarlos a produccion.
- `market-games-portal-staging` debe ser un segundo servicio Render independiente.

## Configuracion unica en Render

1. Crear un nuevo Blueprint o Web Service en Render desde `https://github.com/Taorion/marketgamesqr.git`.
2. Usar la rama `staging`.
3. Si se usa Blueprint, configurar el archivo `render.staging.yaml` como Blueprint path.
4. Copiar las variables sensibles desde produccion.
5. Recomendado: usar una base de datos staging separada en `DATABASE_URL`.
6. Configurar:
   - `PUBLIC_APP_URL=https://market-games-portal-staging.onrender.com`
   - `PUBLIC_VALIDATOR_URL=https://market-games-portal-staging.onrender.com/empresa/`
   - `CORS_ORIGINS=https://market-games-portal-staging.onrender.com`

No conectar `marketgamesqr.com` ni `www.marketgamesqr.com` a este servicio.

## Flujo de trabajo

```powershell
git switch staging
git pull origin staging

# hacer cambios y probar

git add <archivos>
git commit -m "Cambio para probar en staging"
git push origin staging
```

Despues de cada push, verificar:

```powershell
curl.exe https://market-games-portal-staging.onrender.com/api/version
curl.exe https://market-games-portal-staging.onrender.com/empresa/
```

Cuando el cambio este aprobado:

```powershell
git switch main
git pull origin main
git merge --ff-only staging
git push origin main
```

Luego verificar la version oficial:

```powershell
curl.exe https://www.marketgamesqr.com/api/version
curl.exe https://www.marketgamesqr.com/empresa/
```
