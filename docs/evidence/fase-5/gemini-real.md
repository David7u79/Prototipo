# Validación con el proveedor real de Gemini — fase 5

Fecha de la comprobación: 2026-09-17. Rama `fase-5-validacion-distribucion`.

## Resultado: PENDIENTE

No hay credencial disponible. `GEMINI_API_KEY` está vacía en `apps/api/.env` y no existe como variable
de entorno en el equipo, de modo que la integración con el proveedor real **no se ha ejecutado**. El
comando previsto para hacerlo responde exactamente esto:

```text
$ pnpm test:gemini
SKIPPED — GEMINI_API_KEY not configured
```

El resto de GarFit funciona igual sin clave: los endpoints `/ai/*` responden
`503 AI_NOT_CONFIGURED` y las demás funciones (perfil, movimientos, marcas, entrenamientos, WODs,
historial y comparaciones) no se ven afectadas.

## Qué comprobará el smoke cuando exista clave

`apps/api/src/cli/gemini-smoke.ts` está escrito y verificado con el proveedor simulado. Con una clave
configurada realiza **una** llamada real de tipo `PROGRESS_ANALYSIS` con hechos de ejemplo —nunca con
datos de un atleta real— y comprueba, en este orden:

1. autenticación con el proveedor;
2. que el modelo configurado en `GEMINI_MODEL` responde;
3. que la salida llega como JSON estructurado según el JSON Schema enviado;
4. que esa salida supera la validación de `aiModelOutputSchema` (Zod);
5. que todos los `evidenceIds` citados existen en el catálogo de hechos (`unknownEvidenceIds`);
6. la duración de la llamada y, si el proveedor los informa, los tokens de entrada y salida.

Imprime modelo, duración, tokens y si la evidencia citada era válida. Nunca imprime la clave.

## Cómo completarlo

1. Escribir `GEMINI_API_KEY=<clave>` en `apps/api/.env` (ese fichero está ignorado por Git).
2. Ejecutar `pnpm test:gemini`.
3. Sustituir esta sección de resultado por la salida obtenida: fecha, modelo, tipo de análisis,
   duración, tokens de entrada y salida, resultado de la validación de esquema y de evidencia, y si
   la respuesta se sirvió de caché. Nunca copiar aquí la clave, el prompt completo ni datos
   personales.
4. Si el modelo configurado no estuviera disponible para esa cuenta, probar otro nombre en
   `GEMINI_MODEL` (la configuración es la única fuente del nombre del modelo) y documentar cuál
   funcionó.
