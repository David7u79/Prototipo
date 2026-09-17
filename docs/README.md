# Documentación de GarFit

Este directorio aplica documentación como código. La documentación manual vive en
`academic/`, `architecture/`, `adr/`, `TRACEABILITY.md` y `evidence/`. Se revisa junto
con el código y debe reflejar únicamente comportamientos verificables.

## Artefactos generados

`generated/openapi/` contiene el contrato OpenAPI; `generated/database/` el ERD;
`generated/typedoc/` la API de paquetes; `generated/coverage/` el resumen de cobertura;
y `generated/BUILD_INFO.md` la información de la ejecución. Se versionan OpenAPI y ERD.
TypeDoc y `coverage/html/` no se versionan (están en `.gitignore`). BUILD_INFO y el
resumen de cobertura se regeneran y no sirven como evidencia histórica por sí solos.

Ejecute `pnpm docs:generate` para regenerar todo. `pnpm docs:check` regenera OpenAPI,
ERD y TypeDoc, y falla si los artefactos versionados quedan desactualizados.

## Evidencias de verificación

La documentación de pruebas distingue dos categorías de evidencia:

- **Evidencia efímera (`evidence/generated/`):** directorio de salida local para capturas de pantalla y artefactos producidos en tiempo de ejecución por herramientas automatizadas como Playwright (`pnpm evidence:web`). Este directorio está ignorado por el sistema de control de versiones (`.gitignore`) para no ensuciar el repositorio con ejecuciones temporales.
- **Evidencias históricas versionadas (`evidence/fase-N/`):** carpetas consolidadas por hito del proyecto (p. ej., `evidence/fase-1/` y `evidence/fase-2/`) que contienen los informes de ejecución fechados (`pruebas-AAAA-MM-DD.md`) y las capturas permanentes asociadas a los recorridos de usuario (`capturas/`). Estos ficheros se versionan formalmente en Git para garantizar trazabilidad y auditabilidad académica.

