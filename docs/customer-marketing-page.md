# Página pública Qori Customer

Ruta: `/qori-customer/`. Presenta las finanzas personales como punto de partida; después explica pagos recurrentes, créditos, contabilidades separadas, lista de mercado y beneficios de Qori Empresa.

## Imágenes

Se utilizan las 31 imágenes aportadas por el usuario. `image-sources.json` conserva la correspondencia con los nombres originales; `images.json` registra dimensiones y tamaños de las copias. Los originales no se modifican. Las imágenes con texto incorporado se muestran completas, sin recortes ni texto superpuesto.

Las 62 variantes WebP y la imagen social JPEG suman 2.894.503 bytes frente a 49.673.328 bytes de PNG originales (94 % menos). El hero tiene prioridad alta; las demás imágenes usan carga diferida. Las vistas alternativas se solicitan al seleccionarlas. Las pantallas conceptuales llevan una explicación visible y no se presentan como datos reales.

Para reconstruir las copias, con las dependencias instaladas:

```powershell
node scripts/build-customer-story-images.cjs "directorio con los PNG originales"
```

## Interacción y accesibilidad

Cinco galerías con controles de pestañas: ratón, teclado (flechas, Inicio y Fin), foco visible y estado seleccionado. Menú móvil nativo, preguntas con details, enlace para saltar al contenido, reducción de movimiento y enlaces directos al portal. El contenido inicial y los enlaces siguen disponibles sin JavaScript.

`story.css` incorpora diseños para computador y celular. `customer.js` solo controla las galerías y el cierre del menú; no consulta ni modifica cuentas.

## Verificación

```
node --test tests/customer-marketing-page.test.cjs
node --check qori-web/qori-customer/customer.js
git diff --check
```

Las pruebas verifican las 31 imágenes, archivos y dimensiones declaradas, IDs, anclas, carga diferida, cambio de imágenes y leyendas, estados accesibles, teclado y menú. No equivalen a una revisión visual del diseño: la herramienta de navegador falló con `Cannot read properties of undefined (reading 'timeoutMs')`; queda pendiente comprobar visualmente escritorio y celular.

La publicación se comprueba contra el SHA servido en /api/version, salud y hashes de HTML, CSS, JavaScript y los 63 archivos de imagen.
