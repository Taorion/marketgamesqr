# Vitrina de puntos de Demo Qori

Vitrina: https://gosqori.com/c/demo-qori-puntos

Cuatro productos nuevos vinculados al inventario de **Demo Qori**: taza (100 puntos), libreta (200), bolsa (350) y termo (500). Cada uno parte de 25 unidades ficticias. Los seis productos previos del negocio se conservan. No se crean afiliados ni se cambian puntos o créditos QR.

La descripción pública identifica el contenido como muestra sin entrega real. Se requiere el carné de Demo Qori para canjear. El costo en puntos se toma del producto de inventario vinculado. La vitrina usa `AFFILIATE_POINTS`.

## Carga controlada

`node scripts/seed-demo-points-showcase.cjs` comprueba la identidad exacta del negocio de demostración y ensaya toda la carga en una transacción que revierte. Ejecuta la carga dos veces para comprobar que no duplica registros ni reinicia existencias.

Después de desplegar las imágenes, `node scripts/seed-demo-points-showcase.cjs --apply` verifica que sus bytes estén publicados y confirma la carga. No forma parte del arranque ni de las migraciones automáticas. El campo interno de WhatsApp lleva un valor no enrutable; la vitrina de puntos no ofrece contacto ni pedidos por WhatsApp.

## Imágenes

Generadas con la herramienta integrada ImageGen; guardadas en `smart-catalog/demo-points/{taza,libreta,bolsa,termo}.webp`. Conversión a WebP para publicación, manteniendo encuadre y contenido.

Prompt común: «Use case: product-mockup. Fotografía de producto para una vitrina de puntos de demostración llamada Demo Qori. [Sujeto]. Un único producto centrado, completo y reconocible, composición cuadrada, fondo de estudio color marfil cálido, base mate, luz natural suave, sombra delicada, fotografía comercial realista y elegante. Sin letras, sin marcas, sin logotipos, sin personas, sin otros productos. Es una imagen ilustrativa de un producto ficticio.»

Sujetos: una taza de cerámica azul cobalto de 350 ml; una libreta azul marino de tapa dura con elástico dorado, cerrada; una bolsa tote reutilizable de lona natural cruda con asas azules, de pie; un termo de acero inoxidable azul mate de 500 ml con tapa de rosca.
