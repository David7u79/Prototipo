# Validación final: intento de promoción a 1.0.0

Fecha: 2026-09-18. Rama `fase-6-release-candidate`, commit `acbaa8e`, etiqueta local `v0.9.0-rc.1`.

Este documento registra el intento de cerrar las tres validaciones externas pendientes y la
decisión que se deriva. No modifica ninguna evidencia anterior: lo que aquí se afirma se comprobó
en esta fecha con los comandos que se citan.

## 1. Disponibilidad de los recursos externos

Las tres validaciones dependen de recursos que no están en el repositorio. Se volvió a comprobar su
disponibilidad antes de intentar nada:

| Recurso | Comprobación | Resultado |
| --- | --- | --- |
| Clave de Gemini | Variable de entorno y `apps/api/.env` | No existe: `GEMINI_API_KEY` vacía en ambos |
| Credenciales de Google | `GOOGLE_WEB_CLIENT_ID` en API, web y móvil | Vacía en los tres |
| Dispositivo Android | `adb devices` | Ninguno conectado |
| Emulador Android | Imágenes de sistema y AVD del SDK | No hay imágenes instaladas ni AVD creado |
| Infraestructura pública | Dominio, servidor o certificado TLS | No disponible |

En consecuencia **no se ejecutó** ninguna de las tres validaciones externas ni el despliegue
público. No se simularon, no se aproximaron y no se marcaron como completadas.

## 2. Lo que sí se verificó hoy

### 2.1 Estado del repositorio

```text
$ git status --short        # sin cambios
$ pnpm release:check
| Arbol de trabajo limpio | OK |
| Versiones sincronizadas | OK |
| Lint | OK |
| Typecheck | OK |
| Tests | OK |
| Build | OK |
| Documentacion | OK |
| OpenAPI | OK |
| Artefactos | OK |
| Secretos | OK |
```

La rama `fase-6-release-candidate` se subió al remoto. La etiqueta `v0.9.0-rc.1` sigue **sólo en
local**: el intento de subirla quedó bloqueado por la política de publicación del entorno de
trabajo y no se forzó.

### 2.2 Regresión de extremo a extremo

Con la API (proveedor simulado), la web y la landing compiladas y sirviendo en local, los ocho
recorridos de Playwright pasaron: `athlete-flow`, `workout-flow`, `ai-flow`, `ai-history`,
`wod-flow`, `wod-performance`, `landing-download` y `presentation-captures`.

```text
8 passed (20.6s)
```

### 2.3 Simulacro del plan B (GarFit sin Gemini)

Se arrancó la API con el proveedor real configurado (`AI_PROVIDER=gemini`) y sin clave, que es
exactamente el escenario de fallo previsto en [`DEMO-FALLBACK.md`](../../demo/DEMO-FALLBACK.md):

```text
GET /ai/status → {"enabled":true,"configured":false,"provider":"GEMINI","model":"gemini-3.8-flash",…}
POST /ai/analyze/progress → 503 AI_NOT_CONFIGURED
```

El resto de la aplicación siguió respondiendo 200: movimientos, marcas, entrenamientos,
estadísticas, rendimiento por WOD y el **historial de análisis ya persistido**. Es decir, la
defensa puede continuar sin Gemini mostrando un análisis guardado, tal y como promete el plan B.

### 2.4 Ensayo técnico de la demostración

`pnpm demo:reset` dejó el estado esperado (`entrenamientos=12; marcas=8; análisis=1; fran=3`) y se
comprobó, contra la API, que cada dato que promete el guion existe de verdad:

| Lo que dice el guion | Comprobado |
| --- | --- |
| Perfil «Atleta demo», nivel intermedio, objetivo fuerza, métrico | `GET /profile` → `Atleta demo INTERMEDIATE STRENGTH METRIC` |
| Marca manual de press de banca 82.5 kg | Mejor marca 82.5 kg con origen `MANUAL` |
| Marca automática de sentadilla 110 kg | Mejor marca 110 kg con origen `WORKOUT` |
| Peso muerto hasta 145 kg | Mejor marca 145 kg con origen `WORKOUT` |
| Fran con 5:30, 5:06 y 4:48 | `GET /wods/fran/performance` → 3 intentos, historial `5:30, 5:06, 4:48`, mejor `4:48` |
| Historial de IA con al menos un análisis | `GET /ai/analyses` → 1 análisis |
| Comparación de periodos con datos en ambas ventanas | 10 entrenamientos frente a 2 del periodo anterior |

El recorrido de pantallas del guion está cubierto por `presentation-captures.spec.ts`, que abre
landing, inicio de sesión, panel, catálogo, marca, entrenamiento, WOD, progreso, asistente,
evidencia, historial y descarga, y pasa. Esto acredita que **todas las pantallas del guion
funcionan con los datos preparados**; el ensayo cronometrado ante público sigue siendo una tarea
de la persona que defiende.

## 3. Criterios para promover a 1.0.0

| Criterio | Estado |
| --- | --- |
| `release:check` pasa | Sí |
| E2E pasa | Sí (8/8) |
| Gemini real probado | **No**: sin clave |
| APK probado en Android físico | **No**: sin dispositivo ni emulador |
| Google OAuth web probado | **No**: sin credenciales |
| Google OAuth Android probado | **No**: sin credenciales ni dispositivo |
| API pública funciona | **No**: sin infraestructura |
| Landing pública funciona | **No**: sin infraestructura |
| APK final apunta a API pública | **No**: el RC apunta a la dirección del emulador |
| Descarga y SHA-256 coinciden | Sí, en local |
| Demostración completa ensayada | Parcial: verificada técnicamente, sin ensayo cronometrado ante público |
| Documentación refleja el estado real | Sí |

## 4. Decisión

**GarFit permanece en `0.9.0-rc.1`.** Siete de los doce criterios no se cumplen, y los cinco que
faltan por completo dependen de recursos externos que hoy no existen: una clave de Gemini, unas
credenciales de Google, un teléfono Android y un servidor con dominio y TLS. Promover a `1.0.0`
sin ellos significaría afirmar que se verificó algo que no se verificó.

No se cambió la versión, no se reconstruyó el APK y no se creó la etiqueta `v1.0.0`.

## 5. Qué hará falta cuando los recursos existan

Todo está preparado; cada validación es ejecutar lo que ya está escrito y registrar su salida:

1. **Gemini**: escribir `GEMINI_API_KEY` en `apps/api/.env` y ejecutar `pnpm test:gemini`, que
   comprueba autenticación, modelo, salida estructurada, validación con Zod, evidencia citada,
   tokens y latencia. Registrar el resultado en
   [`fase-5/gemini-real.md`](../fase-5/gemini-real.md) o en una evidencia nueva con su fecha. Si el
   modelo configurado no estuviera disponible para la cuenta, cambiar sólo `GEMINI_MODEL` y anotar
   cuál funcionó.
2. **Android físico**: disponer de una API accesible desde el teléfono, recompilar con
   `EXPO_PUBLIC_API_URL` apuntando a ella, firmar con el mismo keystore de GarFit, instalar con
   `adb install -r`, recorrer los dieciocho pasos previstos anotando PASS/FAIL/BLOCKED y guardar
   capturas del dispositivo en `docs/evidence/final/android/`. Si el binario cambia, publicarlo como
   `0.9.0-rc.2`: no se reemplazan bytes distintos bajo la misma versión.
3. **Google OAuth**: configurar las credenciales, probar web y después móvil, incluido el caso de
   una cuenta local y un acceso con Google del mismo correo, y registrar el resultado en
   `docs/evidence/final/google-oauth.md`.
4. **Despliegue**: levantar la composición de la fase 6 tras un proxy con TLS, comprobar salud,
   landing, descarga pública y el código QR desde un teléfono, y después repetir `release:check` y
   los E2E, porque cambiar variables también puede romper algo.

Sólo cuando esos cuatro bloques dejen evidencia con fecha, la matriz de criterios quedará completa y
tendrá sentido promover la versión.
