# 10. Resultados

## 10.1 Evidencia disponible

La evidencia automatizada de esta fase se registra por comando, fecha, commit y conteo en [pruebas de fase 1](../evidence/fase-1/pruebas-2026-09-16.md). La matriz [TRACEABILITY](../TRACEABILITY.md) enlaza requerimientos con implementación y casos específicos. El resumen regenerable de cobertura está en [SUMMARY.md](../generated/coverage/SUMMARY.md); su contenido no sustituye una evidencia histórica porque se vuelve a generar.

Los resultados disponibles permiten afirmar que los conjuntos ejecutados pasaron en el worktree documentado. No permiten afirmar cobertura total, rendimiento, seguridad certificada, usabilidad ni aceptación de atletas. La ausencia de cifras se conserva explícita para evitar que un documento académico convierta una expectativa en resultado.

## 10.2 Estructura para evaluación

| Criterio | Evidencia actual | Resultado |
| --- | --- | --- |
| Identidad local y sesión | pruebas API y trazabilidad | Pasa, ver evidencia |
| Perfil aislado | prueba de integración profile | Pasa, ver evidencia |
| Releases Android | pruebas API y almacenamiento | Pasa, ver evidencia |
| Contratos de cliente | pruebas de validation y api-client | Pasa, ver evidencia |
| Navegador y móvil e2e | capturas/recorrido | PENDIENTE |
| Cobertura cuantitativa | reporte archivado | PENDIENTE |

> **PENDIENTE:** capturas fechadas, evaluación contra criterios de usuario, métricas de cobertura archivadas y análisis de resultados; responsable: tesista.

## 10.3 Interpretación responsable

La ejecución de pruebas permite reproducir una afirmación delimitada: para el commit anotado, los escenarios automatizados incluidos terminaron sin fallos. No permite transformar los conteos en una tasa de calidad general. El número de pruebas no mide riesgo residual, calidad de interfaz ni la ausencia de defectos fuera de los casos escritos.

La generación de OpenAPI y ERD añade otra forma de evidencia: los artefactos se obtienen de configuración y esquema en vez de ser ilustraciones independientes. Si cambian rutas o entidades, docs:check detecta diferencias en los archivos versionados. Sin embargo, TypeDoc y resumen de cobertura son artefactos regenerables; por esa razón la evidencia de fase conserva fecha, comando y commit separados del resultado actual de SUMMARY.md.

Cuando existan pruebas manuales, cada una deberá declarar entorno, URL, ruta, cuenta de prueba no personal, resultado esperado y captura. Cuando existan mediciones de rendimiento, deberán indicar carga, hardware, configuración y método. Sin esos elementos, una cifra no será atribuible ni comparable y deberá permanecer como PENDIENTE.
