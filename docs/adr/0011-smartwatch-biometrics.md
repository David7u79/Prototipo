# 0011 Datos del reloj inteligente (Health Connect y Wear OS)

Estado: Aceptado

## Contexto

El atleta entrena con un reloj (el de referencia es un Samsung Galaxy Watch Ultra, Wear OS 5) y
quiere ver en GarFit la frecuencia cardíaca y el gasto de cada entrenamiento, y a medio plazo
registrar series desde la muñeca. La frecuencia cardíaca es un dato de salud: dato personal
sensible, que exige consentimiento expreso y minimización. GarFit se distribuye como APK directo
(ADR 0010), se prueba a diario en Android e iOS sólo se compila para release.

## Decisión

1. **Dos fases.** Fase A: el móvil lee Health Connect, donde Samsung Health ya sincroniza lo que
   mide el reloj. Fase B: app Wear OS propia para registrar series con frecuencia cardíaca en vivo.
   La fase B reutiliza el modelo y el endpoint de la fase A; no inventa otro camino de datos.
2. **Sólo agregados en el servidor.** Se guarda frecuencia cardíaca media y máxima, calorías
   activas, ventana temporal y origen. Las muestras crudas no salen del dispositivo. Los agregados
   se calculan en el móvil.
3. **Modelo `WorkoutBiometrics` 1:1 con `Workout`**, como `WorkoutScore`: opcional, no ensucia
   `Workout` y se borra en cascada con él. Campos: `avgHeartRateBpm`, `maxHeartRateBpm`,
   `activeCaloriesKcal` (todos opcionales), `startedAt`, `endedAt`, `source`
   (`HEALTH_CONNECT` | `WEAR_OS`), `externalId` opcional (id de la sesión de origen, para no
   importar dos veces la misma).
4. **API:** `PUT /workouts/:id/biometrics` (crea o reemplaza, idempotente) y
   `DELETE /workouts/:id/biometrics`; el `GET` del entrenamiento lo incluye. Sólo el dueño.
   Validación de rango en `@garfit/validation`: FC 30–250 lpm, `max ≥ avg`, calorías 0–5000,
   `endedAt > startedAt`.
5. **Emparejado (fase A):** al abrir un entrenamiento completado, el móvil busca en Health Connect
   la `ExerciseSession` que más se solapa con `startedAt`–`completedAt` (margen ±15 min); si no
   hay sesión usa esa ventana. Lee `HeartRate` y `ActiveCaloriesBurned` en ella. El atleta
   confirma antes de enviar; nunca se sincroniza en segundo plano.
6. **Consentimiento:** pantalla propia que explica qué se lee y para qué, y luego el diálogo de
   permisos de Health Connect, pidiendo sólo lectura de esos tres tipos. Revocable; borrar los
   datos de un entrenamiento es una acción visible.
7. **Fase B (Wear OS):** módulo Kotlin/Compose `apps/wear` fuera del pipeline de Expo. Usa Health
   Services (`ExerciseClient`) y envía al móvil por Wearable Data Layer; el móvil recibe con un
   módulo nativo Expo y llama al mismo endpoint con `source = WEAR_OS`. El reloj no se autentica
   contra la API. Requisito: mismo `applicationId` (`com.garfit.app`) y misma firma que el APK móvil.

## Alternativas consideradas

- **Samsung Health Data SDK:** datos más finos, pero distribuir exige aprobación de Samsung como
  partner y ata la app a una marca. Health Connect cubre cualquier reloj Wear OS y otras marcas
  que sincronizan con él.
- **Guardar la serie completa de FC:** permitiría gráficas por intervalo, pero multiplica el dato
  sensible almacenado sin una necesidad actual. Se añade si una funcionalidad concreta lo pide.
- **Columnas en `Workout`:** menos tablas, pero mezcla datos opcionales de salud con la sesión y
  complica su borrado independiente.
- **Reloj llamando a la API directamente:** obliga a autenticar el reloj y gestionar tokens en él;
  el Data Layer reutiliza la sesión del móvil.

## Consecuencias

- Health Connect es sólo Android; iOS (HealthKit) queda pendiente con el mismo endpoint.
- La fase A no se puede probar en el emulador (no tiene Samsung Health): se valida con el móvil y
  el reloj reales.
- La fase B añade una toolchain Gradle/Kotlin al monorepo y un segundo APK que firmar con la misma
  clave.
