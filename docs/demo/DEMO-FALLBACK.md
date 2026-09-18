# Plan B para la demostración

## Si falla Internet

1. Mantenga PostgreSQL local levantado con `pnpm db:up`.
2. Ejecute `demo:reset` con las variables de la cuenta demo.
3. Arranque la API con `AI_PROVIDER=fake` y abra web y landing locales.
4. Explique que catálogo, entrenamientos, comparaciones y análisis fake se resuelven con datos locales.

## Si falla Gemini

1. No intente introducir ni buscar una clave durante la defensa.
2. Inicie la API con `AI_PROVIDER=fake` si se necesita generar de nuevo el análisis.
3. Abra Historial de análisis y muestre el análisis ya persistido por `demo:reset`.
4. Señale sus evidencias: provienen de hechos calculados en GarFit, no de una afirmación del modelo.

## Si falla el móvil

1. Abra la landing local o publicada y muestre el APK Android publicado.
2. Muestre su versión y checksum SHA-256 antes de cualquier descarga.
3. Abra la evidencia previa de distribución Android en `docs/evidence/fase-5/`.
4. Continúe el recorrido desde la web y aclare que la API y el contrato son compartidos por clientes.

## Si falla todo

1. Abra `docs/evidence/` desde el repositorio.
2. Muestre las capturas y los reportes de las fases 1 a 5 en orden cronológico.
3. Use el README para cerrar con arquitectura, comandos reproducibles y alcance del prototipo.
4. Indique qué componente externo falló y que los artefactos son evidencia previa, no una simulación en vivo.
