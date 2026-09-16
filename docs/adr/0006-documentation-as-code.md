# 0006 Documentación como código

Estado: Aceptado

## Contexto

Contratos, esquema y cobertura pueden divergir de documentación manual.

## Decisión

Versionar Markdown, OpenAPI y ERD; regenerar TypeDoc, cobertura y metadatos con scripts.

## Alternativas consideradas

Wiki externa; diagramas manuales; documentación sin verificación CI.

## Consecuencias

CI detecta OpenAPI/ERD desactualizados. Evidencia de resultados conserva fecha y commit.
