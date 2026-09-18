# Cumplimiento de lineamientos para prototipo de titulación

La matriz relaciona los tres momentos exigidos con evidencia localizada. El estado no sustituye trámites institucionales ni evaluación con personas usuarias.

| Etapa exigida | Documento y sección | Evidencia verificable | Estado |
| --- | --- | --- | --- |
| 1. Estudio de factibilidad | [4. Estudio de factibilidad](04-estudio-de-factibilidad.md), secciones 4.1 a 4.10 | Requisitos de entorno y dependencias en [manual, 11.1–11.3](11-manual-de-operacion.md); decisiones en [ADR 0001–0010](../adr/README.md). La parte económica declara recursos gratuitos sólo durante el prototipo y no inventa precios. | COMPLETO |
| 2. Construcción y verificación de funcionamiento | [8. Implementación](08-implementacion.md), [9. Pruebas y verificación](09-pruebas-y-verificacion.md), [10. Resultados](10-resultados.md) | 287 pruebas, siete recorridos Playwright, 35 rutas OpenAPI con esquema en cada 2xx; pruebas en `apps/api/test/`, `packages/*/src/*.test.ts` y `apps/web/e2e/`; capturas en `docs/evidence/fase-5/capturas/`. | PENDIENTE: Gemini real, OAuth real e instalación Android física dependen de tercero, credenciales o dispositivo; véase [Pendientes externos](PENDIENTES-EXTERNOS.md). |
| 3. Presentación respaldada por manual de operación | [11. Manual de operación](11-manual-de-operacion.md), secciones 11.1–11.10; [entrega](../delivery/README.md) | Manual de registro, sesión, perfil, movimientos, marcas, WODs, entrenamientos, historial, progreso, IA, evidencia, historial de análisis, descarga e instalación; diagramas y capturas enlazados. | COMPLETO para el material técnico. PENDIENTE para datos administrativos, autorización y asesoría, que corresponden a la persona responsable. |

El hueco real de la etapa 2 no se compensa con pruebas simuladas: éstas acreditan el contrato y el flujo local, no una credencial real ni la ejecución en hardware.
