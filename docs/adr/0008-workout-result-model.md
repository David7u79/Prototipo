# 0008 Modelo de entrenamientos, resultados y marcas derivadas

Estado: Aceptado (fase 3)

## Contexto

La fase 3 permite al atleta planificar y registrar entrenamientos (fuerza, por tiempo, AMRAP,
EMOM, cardio) y que sus resultados generen marcas personales sin intervención manual. Había que
decidir cómo representar plantillas frente a sesiones, series frente a resultados globales, cuándo
un resultado es una marca, cómo evitar marcas duplicadas y qué ocurre al corregir o borrar un
entrenamiento. GarFit sigue siendo personal: nada de clases, coaches ni gimnasios.

## Decisión

1. **WOD ≠ Workout.** `Wod` es una plantilla (catálogo público de benchmarks o WOD privado del
   atleta). `Workout` es una sesión personal. Crear un Workout desde un WOD **copia** su
   prescripción (`WorkoutExercise`); cambiar el WOD después no altera sesiones pasadas.
2. **Tipos y prescripción estructurada.** `WorkoutType` = `STRENGTH`, `FOR_TIME`, `AMRAP`, `EMOM`,
   `CARDIO`, `CUSTOM`. "Rondas" no es un tipo: es `CUSTOM`/`FOR_TIME` con `rounds`. Parámetros
   globales (`durationSeconds`, `rounds`, `intervalSeconds`, `repScheme`) y objetivos por ejercicio
   (series, reps, carga, distancia, duración, descanso) son columnas; nunca texto libre. Las reglas
   por tipo viven en `validatePrescription` (`@garfit/domain`).
3. **Series frente a score.** `WorkoutResult` guarda cada serie realizada (reps, carga,
   distancia, duración y sus valores canónicos). `WorkoutScore` (1:1) guarda el resultado global
   que no pertenece a una serie: tiempo o reps al límite (FOR_TIME), rondas + reps (AMRAP),
   completado (EMOM). STRENGTH, CARDIO y CUSTOM se resumen desde las series (volumen, distancia ·
   tiempo).
4. **Estados con comportamiento.** `DRAFT` (todo editable) → `IN_PROGRESS` (estructura fija,
   resultados editables) → `COMPLETED` (inmutable). No hay `PLANNED` ni `CANCELLED`: no aportan
   comportamiento todavía; cancelar equivale a borrar.
5. **Marcas derivadas deterministas.** Al completar, `recordCandidates` propone marcas sólo en
   `STRENGTH` (peso por repeticiones, reps, duración) y `CARDIO` (tiempo calificado por distancia,
   distancia, duración): en FOR_TIME/AMRAP/EMOM la carga de cada ronda no es un intento máximo.
   `selectNewRecords` crea `PersonalRecord` (`source = WORKOUT`, `workoutResultId`) sólo si supera
   estrictamente la mejor marca de su serie o si es la primera. Igualar no es marca.
6. **Transacción e idempotencia.** Completar ocurre en una transacción con bloqueo por usuario
   (`pg_advisory_xact_lock`) y transición condicional `status <> COMPLETED`: guardar resultados,
   cambiar estado, calcular y crear marcas es todo o nada. Repetir `complete` devuelve el mismo
   resultado. `@@unique([workoutResultId, recordType])` impide duplicados aunque falle lo anterior.
7. **Política tras completar: inmutable.** Un entrenamiento completado no se edita ni se reabre.
   Para corregirlo, se borra y se registra de nuevo. Las marcas `WORKOUT` no se editan ni se
   borran desde `/records` (`RECORD_MANAGED_BY_WORKOUT`): su valor debe coincidir con su origen.
8. **Borrado lógico en cascada controlada.** Borrar un entrenamiento fija `deletedAt` en él y en
   sus marcas derivadas; nada se elimina físicamente, así ninguna marca apunta a algo inexistente
   y se conserva la trazabilidad. Las series se recalculan siempre sobre las marcas activas.
9. **Calificador de TIME.** Un tiempo sólo es comparable sobre la misma distancia:
   `PersonalRecord.distanceMeters` forma parte de la serie (`TIME@5000m`). Es una regla del tipo
   de marca, no de un movimiento (vale para correr, remar, nadar o pedalear). Actualiza el ADR 0007.

## Alternativas consideradas

- **Guardar el entrenamiento como texto o JSON:** impide volumen, marcas y estadísticas fiables.
- **Un único `WorkoutResult` para series y score:** mezcla filas por serie con un valor global y
  obliga a columnas sin sentido en la mayoría de filas.
- **Permitir editar completados y recalcular marcas:** exige invalidar marcas posteriores que
  compararon contra ellas; demasiado riesgo para un prototipo. Se puede añadir "reabrir" después.
- **Marcas desde cualquier tipo de entrenamiento:** 43 kg de thrusters en Fran no son un 1RM.
- **Idempotencia sólo con la restricción única:** una segunda petición fallaría con error en vez
  de devolver el resultado; el bloqueo y la transición condicional dan una respuesta limpia.
- **Borrado físico:** rompería el origen de las marcas y la trazabilidad académica.

## Consecuencias

- Corregir un error en un entrenamiento completado exige borrarlo y registrarlo de nuevo.
- Los tiempos TIME anteriores a la fase 3 sin distancia quedan en su propia serie `TIME`.
- El score de FOR_TIME/AMRAP no genera marcas todavía; comparar resultados del mismo WOD es
  trabajo futuro.
