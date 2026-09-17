# Trazabilidad

La evidencia de ejecución es [pruebas de fase 1](evidence/fase-1/pruebas-2026-09-16.md).

| Requerimiento | Implementación concreta | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-01 | auth.service.ts; auth.controller.ts | auth.spec.ts › autenticación local › registra el usuario normalizado y devuelve tokens seguros | Pasa (ver evidencia) | pruebas fase 1 |
| RF-02 | google-identity.verifier.ts; auth.service.ts | google-auth.spec.ts › POST /auth/google › crea y reutiliza la cuenta Google del mismo sub | Pasa (ver evidencia) | pruebas fase 1 |
| RF-03 | profile.controller.ts | profile.spec.ts › GET y PUT /profile › crea, consulta y actualiza el mismo perfil | Pasa (ver evidencia) | pruebas fase 1 |
| RF-04 | releases.controller.ts; local-release-storage.ts | releases.spec.ts › releases Android › descarga el APK publicado con cabeceras y bytes correctos | Pasa (ver evidencia) | pruebas fase 1 |
| RNF-01 | web/lib/auth.ts; mobile/lib/auth.tsx | auth-utils.test.ts › safeNext › only accepts local app routes | Pasa (ver evidencia) | pruebas fase 1 |
| RNF-02 | auth.service.ts | auth.spec.ts › autenticación local › rota refresh, rechaza el anterior y revoca sesiones al reutilizarlo | Pasa (ver evidencia) | pruebas fase 1 |
| RNF-03 | types, validation, api-client | validation/index.test.ts › esquemas de validación › acepta registro y normaliza el correo | Pasa (ver evidencia) | pruebas fase 1 |
| RNF-05 | ai/gemini-ai.provider.ts | Sin prueba automatizada específica | PENDIENTE de evidencia específica | revisión de código |

RF-05, RF-06 y RF-07 están planeados y no tienen implementación ni pruebas.
