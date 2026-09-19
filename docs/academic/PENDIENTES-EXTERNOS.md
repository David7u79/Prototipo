# Pendientes externos del cierre

Este documento excluye deuda interna y capacidades fuera de alcance. Registra únicamente verificaciones que requieren una credencial, servicio o dispositivo no disponible en el worktree.

**Última comprobación: 2026-09-18.** Se volvió a verificar la disponibilidad de los tres recursos
—clave de Gemini, credenciales de Google y dispositivo Android— y ninguno estaba presente, por lo
que las validaciones siguen pendientes y GarFit permanece en `0.9.0-rc.1`. El detalle de esa
comprobación, junto con la regresión, el simulacro del plan B y el ensayo técnico de la
demostración realizados ese día, está en
[`docs/evidence/final/validacion-externa-2026-09-18.md`](../evidence/final/validacion-externa-2026-09-18.md).

## Validación real de Google Gemini

**Qué falta.** Ejecutar una solicitud real al proveedor Gemini y conservar su resultado sin divulgar secretos.

**Qué se necesita.** Una clave válida en `GEMINI_API_KEY` y autorización para usarla en el entorno de prueba.

**Preparación existente.** La API contiene el adaptador `apps/api/src/ai/gemini-ai.provider.ts`, mantiene la clave en backend y valida la salida estructurada antes de persistirla. `AiProvider` permite mantener los cálculos y la evidencia fuera del modelo.

**Evidencia actual.** El proveedor simulado verifica el recorrido automatizado; la evidencia de la llamada real registra `SKIPPED — GEMINI_API_KEY not configured` en [fase 5](../evidence/fase-5/gemini-real.md).

## Google OAuth real

**Qué falta.** Completar el inicio de sesión contra la infraestructura real de Google.

**Qué se necesita.** Credenciales OAuth de Google y su configuración de clientes, orígenes y audiencias para el entorno que se vaya a evaluar.

**Preparación existente.** La API dispone de verificación de ID token en `apps/api/src/auth/google-identity.verifier.ts`; la configuración se declara mediante `GOOGLE_WEB_CLIENT_ID` y el cliente móvil incluye el complemento de Google Sign-In.

**Evidencia actual.** Las pruebas de `apps/api/test/google-auth.spec.ts` verifican el contrato y los casos controlados. No existe evidencia de una credencial real, por lo que no se declara operativo contra Google.

## Instalación en dispositivo Android físico

**Qué falta.** Descargar, instalar y recorrer GarFit en un teléfono Android físico.

**Qué se necesita.** Un teléfono Android o emulador disponible, una APK compilada con URL de API alcanzable por ese dispositivo y autorización del sistema para instalar desde la fuente de descarga.

**Preparación existente.** La aplicación usa el identificador `com.garfit.app`; la versión del release candidate se sincroniza desde el `package.json` raíz mediante `pnpm version:sync`. La landing y la API ofrecen metadatos, descarga y checksum de la release publicada.

**Evidencia actual.** Se comprobaron compilación, metadatos, descarga e integridad en [distribución Android](../evidence/fase-5/distribucion-android.md), pero ese informe deja la instalación física como pendiente por ausencia de teléfono y emulador.
