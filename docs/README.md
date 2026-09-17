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
