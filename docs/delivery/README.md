# Entrega de GarFit

Este índice reúne los artefactos de entrega sin duplicar binarios ni evidencia pesada.

| Artefacto | Ubicación |
| --- | --- |
| Documentación académica | [docs/academic](../academic/00-indice.md) |
| Manual de operación | [capítulo 11](../academic/11-manual-de-operacion.md) |
| Diagramas de arquitectura | [arquitectura final](../architecture/final-architecture.md) y [arquitectura existente](../architecture/) |
| Evidencia de pruebas y capturas | [docs/evidence](../evidence/) |
| APK publicado | Almacenamiento de releases servido por la API; la landing consulta sus metadatos y descarga. No se duplica el binario en Git. |
| Código fuente | Raíz del repositorio y workspaces `apps/` y `packages/` |
| Manifiesto de release | [package.json](../../package.json), fuente única de `0.9.0-rc.1` y `versionCode` 6; `pnpm version:sync` lo propaga. |

La instalación física de la APK sigue pendiente de un dispositivo Android; consúltese [Pendientes externos](../academic/PENDIENTES-EXTERNOS.md).
