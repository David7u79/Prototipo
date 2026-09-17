# 0009 Arquitectura del análisis con IA: interpretación trazable sobre datos calculados

Estado: Aceptado (fase 4)

## Contexto

GarFit ya calcula de forma determinista marcas personales, volumen, estadísticas y una
instantánea de progreso (`AthleteProgressSnapshot`, ADR 0007 y 0008). La fase 4 añade una capa que
interpreta esos datos con un modelo generativo (Google Gemini a través de `@google/genai`) para
explicar el progreso, un entrenamiento, un WOD o un movimiento.

El riesgo de un prototipo académico con IA es conocido: que el modelo invente cifras, que el
trabajo determinista quede oculto tras un texto plausible, que se envíen datos personales
innecesarios a un tercero y que la dependencia del proveedor contamine el resto del código. Este
ADR fija cómo se evita cada cosa. La regla que resume la decisión es: **GarFit calcula, el modelo
interpreta, GarFit verifica, el atleta decide.**

## Decisión

1. **La IA sólo interpreta.** El modelo nunca calcula marcas, volúmenes, porcentajes ni
   estadísticas, no decide resultados y no escribe en la base de datos. Recibe hechos ya
   calculados y devuelve texto que los explica. Esta fase es exclusivamente de lectura: no hay
   creación ni edición de entrenamientos, marcas o perfil por parte del modelo.
2. **Salida estructurada, no texto libre.** El contrato con el proveedor es un JSON Schema
   (derivado de `aiModelOutputSchema` de `@garfit/validation`) aplicado con el soporte nativo de
   salida estructurada del SDK, no con una petición dentro del prompt. La respuesta se vuelve a
   validar con Zod al recibirla: nunca se confía en que el proveedor respete el esquema.
3. **Evidencia con identificadores generados por GarFit.** Cada dato que el modelo puede citar es
   un `AiEvidenceFact` con un identificador estable y determinista que produce `@garfit/domain`
   (por ejemplo `pr:barbell-full-squat:weight-5rm:best` o `volume:barbell-full-squat:last-30-days`).
   El modelo sólo devuelve identificadores en `evidenceIds`; nunca valores.
4. **El backend controla los valores visibles.** Tras validar el esquema se comprueba que todo
   identificador citado exista en el conjunto enviado (`unknownEvidenceIds`). Si aparece uno
   inventado se reintenta **una sola vez** con una corrección explícita y, si vuelve a fallar, se
   rechaza el resultado completo con `502 AI_INVALID_RESPONSE`. Se prefiere rechazar a mostrar una
   observación mutilada: una observación cuya evidencia no existe suele significar que su
   contenido tampoco es fiable. Los valores que ve el atleta se resuelven siempre desde los hechos
   guardados por GarFit, nunca desde la respuesta del modelo.
5. **Existe `AiProvider` como frontera.** `AiService` depende de la clase abstracta `AiProvider`
   (`name`, `model`, `isConfigured`, `generate`) y de `AiProviderError` con un `kind` normalizado.
   Ningún tipo de `@google/genai` sale de `gemini-ai.provider.ts`. Así los tests usan
   `FakeAiProvider` sin red y un proveedor futuro (otro modelo, uno local) no toca la lógica de
   negocio. No se implementan otros proveedores todavía.
6. **Minimización de datos.** Lo único que sale hacia el proveedor son los hechos de evidencia:
   datos deportivos agregados y los textos que el propio atleta escribió sobre sus entrenamientos.
   No se envían correo, nombre, identificador de Google, fecha de nacimiento, peso, altura,
   identificadores internos, tokens ni sesiones. El contexto se construye por operación: el
   análisis de un entrenamiento no envía el historial completo, sólo ese entrenamiento y lo mínimo
   para compararlo.
7. **Consentimiento explícito y revocable.** `User.aiConsentAt` guarda cuándo el atleta aceptó que
   sus datos deportivos se envíen al proveedor. Sin consentimiento, los endpoints responden
   `403 AI_CONSENT_REQUIRED`. Se puede revocar desde el perfil; revocarlo impide nuevos envíos y
   los análisis ya generados siguen siendo datos locales del atleta, que se borran con su cuenta.
   Se eligió el `User` y no `AthleteProfile` porque explicar un movimiento o un WOD no requiere
   perfil deportivo.
8. **Datos insuficientes sin llamada.** Cuando GarFit sabe de antemano que no hay material (sin
   marcas y sin entrenamientos en el periodo, un WOD sin ejercicios, un movimiento sin
   instrucciones ni músculos), responde `INSUFFICIENT_DATA` sin llamar al proveedor ni persistir
   nada: no se gasta cuota en algo cuyo resultado ya conocemos.
9. **Caché por hash del contexto.** Se guarda `contextHash` = SHA-256 de la serialización estable
   (`stableStringify`) de tipo, objetivo, periodo, versión de prompt y hechos. Si existe un
   análisis del mismo usuario con ese hash, la misma versión de prompt y el mismo modelo, se
   devuelve con `cached: true` y su fecha original. Cambiar los datos, el prompt o el modelo
   invalida la caché de forma natural, y no hace falta un botón de "regenerar" que gaste cuota
   para producir el mismo texto.
10. **Prompts versionados y datos delimitados.** Cada operación tiene su instrucción de sistema en
    `apps/api/src/ai/prompts` con su `PROMPT_VERSION`. Los datos viajan como JSON dentro de un
    bloque delimitado, con los `<` escapados, y la instrucción declara que todo lo que hay dentro
    es dato y nunca una orden: una nota del atleta que diga «ignora las instrucciones anteriores»
    es texto a interpretar, no un comando.
11. **Límite de uso propio.** El límite de peticiones de IA es por atleta y por instancia
    (`AI_RATE_LIMIT_PER_MINUTE`, `AI_RATE_LIMIT_PER_DAY`), no el `ThrottlerGuard` general, que
    cuenta por IP y está desactivado en los tests. Sólo cuenta cuando se va a llamar al proveedor:
    una respuesta de caché no consume cuota. Con varias instancias haría falta un almacén
    compartido.
12. **Configuración, no constantes.** `GEMINI_ENABLED`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
    `AI_PROVIDER`, `AI_TIMEOUT_MS` y los límites viven en el entorno. El nombre del modelo no
    aparece en el dominio. Sin clave, `/ai/*` responde `503 AI_NOT_CONFIGURED` y el resto de GarFit
    funciona igual.
13. **Qué se persiste.** `AiAnalysis` guarda tipo, objetivo, periodo, proveedor, modelo, versión de
    prompt, hash, estado, la salida validada junto con los hechos enviados y el resumen de datos
    usados, la duración y, si el proveedor los informa, los tokens. No se guarda la clave ni el
    prompt completo: con la versión del prompt y los hechos, el análisis es reproducible
    conceptualmente y auditable.

## Consecuencias

- Toda afirmación con un número puede rastrearse hasta el dato que la sustenta, lo que permite
  demostrar en la defensa que una frase no la inventó el modelo.
- Una respuesta del proveedor que no encaje en el esquema o cite evidencia inexistente no llega
  nunca al atleta, a cambio de que algunos análisis fallen con `AI_INVALID_RESPONSE`.
- La caché reduce latencia y consumo de cuota, pero un análisis puede mostrarse como "análisis
  anterior" hasta que cambien los datos del atleta.
- Los tests y el e2e se ejecutan sin red y sin clave gracias a `FakeAiProvider`; a cambio, la
  integración real sólo se comprueba con el smoke test opcional (`pnpm test:gemini`).
- El nivel gratuito del proveedor no ofrece garantías de producción: límites, precios y modelos
  disponibles pueden cambiar, y el prototipo lo asume explícitamente.
