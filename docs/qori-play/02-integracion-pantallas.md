# Integración y laboratorio

## Preparar

Requisitos: Node 22, dependencias del package-lock, PostgreSQL local en 127.0.0.1:55489 y base vacía qori_play_qa. El preparador rechaza otra base. No cargar variables de producción. En este workspace Node está en .local-tools/node-v22.23.5-win-x64/node.exe del checkout principal.

```powershell
node scripts/prepare-qori-play-qa.js
node scripts/preview-qori-play.js
```

El preparador reutiliza el esquema real y el migrador local de Invoice. No elimina datos. La demo imprime http://127.0.0.1:3198/__play-demo. Sus atajos de sesión son exclusivos del lanzador, limitados a loopback; no forman parte de server.js. Cada arranque crea un conjunto sintético nuevo, revoca la credencial inicial y conserva las claves de cifrado locales en .qa-play/ ignorado por Git.

1. Abrir el atajo Operador y /play/screen/ en ventanas separadas.
2. Introducir el código del Player en la pantalla preconfigurada.
3. Escanear el QR o abrir su URL en un perfil de navegador separado. No copiar credenciales de integrador al Player.
4. Aceptar el aviso y declaración de mayoría de edad. Comenzar Secuencia; observar la pantalla y repetir los símbolos en el control.
5. Abrir un segundo controlador: quedará en cola. Cada QR de unión se consume una vez y se renueva.
6. Completar; si hay reserva, iniciar Customer demo en el mismo navegador del control y aceptar el reclamo. Abrir /play/rewards/ para su QR privado.
7. Cambiar a la campaña Órbita desde el operador cuando no haya sesiones activas. Mover con botones; inclinación es opcional y requiere permiso.
8. Pausar, cortar red, reconectar y revocar. Verificar que no aparezcan controles cruzados ni premios adicionales.

## Computador y celular físico

Loopback no es accesible desde un teléfono. Para laboratorio físico se admite un certificado TLS confiado por ambos equipos:

- QORI_PLAY_PUBLIC_ORIGIN: origen HTTPS del laboratorio, con puerto si aplica.
- QORI_PLAY_TLS_KEY y QORI_PLAY_TLS_CERT: rutas locales a llave/certificado; nunca versionarlos.
- QORI_PLAY_BIND_HOST: interfaz del laboratorio; por defecto 127.0.0.1.

Ambos equipos deben abrir exactamente ese origen. Configurar red/certificados manualmente en un entorno autorizado. Los atajos de Customer/operador siguen limitados a loopback. No se abrió un túnel ni se alteró el firewall; HTTPS, escaneo físico y giroscopio quedan pendientes de ensayo.

## URL e iframe

URL del Player: /play/screen/. Sin token maestro en query. El operador confirma el código y el Player conserva una capacidad de dispositivo de 24 horas en localStorage. Rotación por SDK o nuevo emparejamiento invalida la anterior. Si se borra el perfil del reproductor, hay que emparejar otra vez.

Demo: /play/examples/signage.html. Para un contenedor de otro origen, registrar el origen HTTPS exacto en QORI_PLAY_EMBED_ORIGINS y usar parent_origin en la URL del iframe. postMessage comprueba origen y ventana padre; solo publica estado técnico/campaña y acepta pausa/reanudación. No permite emitir premios ni consultar participantes. El SDK se ejecuta dentro del origen Qori; una web externa usa iframe, no claves API ni fetch privilegiado desde el navegador.

Plantillas: ad70 (30/70), balanced y full (juego con banda de QR). Orientación portrait/landscape. Las creatividades del MVP son texto y diseño propios, no carga de vídeos/imágenes arbitrarias. Audio desactivado; fullscreen requiere gesto y soporte del navegador.

## Matriz de capacidades y evidencia

| Capacidad | MVP | Evidencia / límite |
| --- | --- | --- |
| HTTP loopback + JS | Sí | HTTP real y DOM automatizado |
| HTTPS/WSS | Implementado por lanzador | Certificados y móvil físico pendientes |
| WS + Origin + heartbeat | Sí | Conexiones reales en pruebas locales |
| Canvas 2D | Sí | Lógica probada; dibujo/fluidez visual pendientes |
| WebGL | No requerido | No se usa |
| Almacenamiento persistente | localStorage limitado | Reemparejar si el player lo borra |
| Vertical/horizontal | CSS y configuración | Prueba visual/hardware pendiente |
| Fullscreen/giroscopio | Mejora optativa | Permiso del sistema y hardware pendientes |
| Audio/autoplay | Sin audio | No depende de autoplay |
| Red caída | Conserva anuncio cargado; oculta QR; reconecta | WS/estado probados, corte físico pendiente |
| Reinicio del proceso | Estado DB + token persistido | Requiere prueba prolongada de recuperación y reinicio de máquina |
| Yodeck/Tizen/webOS | No certificado | Probar modelo, firmware, navegador, RAM y CPU específicos |

El operador conserva su playlist externa. No se toma control de otros activos. Una página que carga HTML no demuestra capacidad de ejecutar el juego con latencia aceptable.
