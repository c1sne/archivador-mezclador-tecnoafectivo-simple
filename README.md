# Mezclador Tecnoafectivo

Herramienta local y abierta para archivar materiales visuales, mezclar collages y sintetizar imagen en vivo desde el navegador.

El proyecto cruza tres gestos simples:

- archivar archivos por palabras clave;
- convertir imagenes, texto, video y sonido en materiales de collage;
- manipular esos materiales con ruido, mezcla, superficies y codigo vivo.

Todo corre localmente. No sube archivos a ningun servidor.

## Referencias

La documentacion toma como referencia la claridad comunitaria de [ComfyUI](https://github.com/Comfy-Org/ComfyUI) y su [documentacion oficial](https://docs.comfy.org/): empezar rapido, explicar conceptos base, mostrar la interfaz, abrir ejemplos y cuidar la extensibilidad. Mezclador Tecnoafectivo no esta afiliado a ComfyUI; lo reconoce como una inspiracion fuerte para pensar herramientas visuales modulares, locales y compartibles.

## Estado

Esta es una version temprana, usable y deliberadamente simple. Busca ser una base compartible para comunidades de performance, archivo, mediacion, visuales en vivo, talleres y software experimental.

## Mapa de Documentacion

- [Empezar](#ejecutar)
- [Conceptos](#conceptos)
- [Interfaz](#interfaz)
- [Codigo vivo](#codigo-vivo)
- [Reconocimiento abierto](#reconocimiento-abierto)
- [Comunidad](#comunidad)
- [Escritorio nativo](#escritorio-nativo)

## Funciones

- Importacion de archivos o carpetas.
- Clasificacion por reglas de palabras clave.
- Analisis local basico de imagenes desde pixeles.
- Lienzo de collage con posicion, escala, rotacion, opacidad, mezcla y superficies.
- Motor de ruido por material: ruido, escala, distorsion, glitch, pixelado, lineas y semilla.
- Pincel en vivo sobre el lienzo.
- Sintetizador de codigo visual inspirado en Hydra.
- Captura del sintetizador como material editable.
- Exportacion de indice JSON y PNG del collage.
- PWA instalable en navegadores compatibles.

## Ejecutar

Requiere Node.js. Funciona en macOS, Windows y Linux.

```bash
npm run dev
```

Luego abre:

```text
http://localhost:5177
```

Tambien puedes abrir `index.html` directamente, aunque el modo instalable/offline funciona mejor con el servidor local.

## Conceptos

### Archivo

La biblioteca recibe archivos o carpetas y los agrupa con reglas editables de palabras clave. El analisis local de imagenes agrega etiquetas simples como color dominante, luminosidad, saturacion y textura.

### Material

Un material es cualquier elemento que entra al lienzo: imagen, video, texto, audio representado visualmente o captura del sintetizador. Cada material tiene posicion, escala, rotacion, superficie, mezcla y ruido propios.

### Lienzo

El lienzo mezcla tres capas: sintetizador de fondo, materiales manipulables y pintura en vivo. La exportacion PNG aplana esas capas en una imagen final.

### Codigo Vivo

El sintetizador usa un lenguaje pequeno de funciones encadenadas. La idea no es reemplazar Hydra, sino ofrecer una puerta local y sencilla para generar texturas, ritmos visuales y fondos capturables.

## Interfaz

- `Palabras clave`: reglas para organizar la biblioteca.
- `Archivo`: materiales importados, etiquetas y acciones de organizacion.
- `Collage`: lienzo central para arrastrar, pintar, mezclar y exportar.
- `Codigo vivo`: panel plegable para escribir patrones generativos.
- `Material`: inspector del elemento seleccionado.
- `Motor de ruido`: controles por material para distorsion, glitch, pixelado y lineas.

## Codigo Vivo

El panel `Codigo vivo` usa un mini lenguaje inspirado en Hydra, implementado sin `eval` y sin dependencias externas.

```js
osc(11, 0.14, 0.4)
  .kaleid(6)
  .rotate(0.25, 0.06)
  .color(1.0, 0.18, 0.72)
  .contrast(1.25)
  .out()
```

Fuentes:

- `osc(frecuencia, velocidad, fase)`
- `noise(escala, velocidad)`
- `gradient(velocidad)`
- `shape(lados, radio, suavidad)`
- `solid(r, g, b, a)`
- `checker(celdas)`

Transformaciones:

- `rotate(angulo, velocidad)`
- `scale(valor)`
- `scrollX(valor, velocidad)` / `scrollY(valor, velocidad)`
- `repeat(x, y)`
- `pixelate(x, y)`
- `kaleid(lados)`
- `modulate(fuente, cantidad)`
- `color(r, g, b)`
- `brightness(valor)`
- `contrast(valor)`
- `invert(cantidad)`
- `posterize(niveles)`
- `thresh(valor)` / `luma(valor)`
- `blend(fuente, cantidad)`
- `add(fuente, cantidad)`
- `diff(fuente, cantidad)`
- `mult(fuente, cantidad)`

## Reconocimiento Abierto

La version actual incluye analisis local simple:

- color dominante;
- luminosidad;
- saturacion;
- textura;
- etiquetas visuales basicas.

Rutas abiertas para siguientes capas:

- `transformers.js` para modelos locales en navegador;
- CLIP compatible con ONNX para busqueda semantica;
- `onnxruntime-web` como motor local/WebGPU;
- `opencv.js` para bordes, mascaras y superficies;
- `tesseract.js` para OCR.

## Comunidad

Este proyecto invita contribuciones pequenas y claras:

- presets de codigo vivo;
- mejoras de accesibilidad;
- nuevas superficies y modos de mezcla;
- optimizacion del motor visual;
- empaquetado con Tauri;
- documentacion para talleres.

Antes de proponer cambios grandes, abre un issue con la idea y el contexto de uso.

## Escritorio Nativo

La ruta recomendada es Tauri porque es open source y liviana:

```bash
npm create tauri-app@latest
```

Electron tambien es posible si se necesita compatibilidad Chromium completa, aunque el paquete final pesa mas.

## Licencia

MIT.
