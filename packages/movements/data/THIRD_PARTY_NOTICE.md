# Aviso de terceros — catálogo de movimientos

`catalog.json` se deriva de **hasaneyldrm/exercises-dataset**
(https://github.com/hasaneyldrm/exercises-dataset), commit
`7455efae41b330c265e7cd4b78dfa848e7ce5ebd`, mediante `scripts/import-catalog.mjs` y la
transformación de `src/source-transform.ts`.

## Qué se toma

Nombres, región corporal, equipamiento, músculos objetivo y secundarios, e instrucciones en
español. Estos elementos están cubiertos por la licencia MIT del repositorio de origen.

## Qué NO se toma

Imágenes (`images/`) y videos (`videos/`). Según el `LICENSE` del origen, esa media es
© Gym visual (https://gymvisual.com/), no está cubierta por la MIT y clonar el repositorio no
concede licencia sobre ella. GarFit no la descarga, no la enlaza y no la redistribuye.

## Transformaciones aplicadas

- Se descartan variantes que sólo cambian el ángulo de cámara ("(back pov)", "(side pov)").
- Se reparan errores de codificación ("45в°" → "45°") y se normaliza el formato del nombre.
- Los sinónimos de músculos se unifican en grupos normalizados.
- Los tipos de marca admitidos se derivan con reglas explícitas (`src/record-types.ts`).
- La dificultad no se asigna: la fuente no la clasifica.

## Licencia de origen

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

La excepción de media del `LICENSE` original se respeta íntegramente al no usar dicha media.
