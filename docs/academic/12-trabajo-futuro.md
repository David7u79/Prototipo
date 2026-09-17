# 12. Trabajo futuro

## 12.1 Dominio de entrenamientos estructurados (Fase 3)

Una vez consolidado el dominio de movimientos y marcas personales en la fase 2, la siguiente etapa de desarrollo (fase 3) tiene como objetivo prioritario modelar y persistir la planificación y ejecución de sesiones de entrenamiento deportivo:

1. **Catálogo de rutinas y entrenamientos (`Workout` y `WorkoutExercise`):**
   - Modelar la entidad `Workout` para representar plantillas de sesiones estructuradas (fuerza, hipertrofia, resistencia, acondicionamiento metabólico).
   - Diseñar la relación intermedia `WorkoutExercise` para vincular un entrenamiento con los ejercicios del catálogo oficial (`Movement`), especificando parámetros de prescripción: cantidad de series, repeticiones objetivo, porcentajes de carga respecto a la mejor marca del atleta (% 1RM), intervalos de descanso y notas técnicas de ejecución.
   - Proveer soporte específico para rutinas de acondicionamiento de alta intensidad o de tipo CrossFit (WODs: *Workout of the Day*), estructurando modalidades clásicas como *For Time* (completar una tarea fija en el menor tiempo posible), *AMRAP* (*As Many Rounds/Reps As Possible* en una ventana de tiempo delimitada) y *EMOM* (*Every Minute on the Minute*).
2. **Registro de sesiones ejecutadas (`WorkoutResult`):**
   - Implementar la entidad `WorkoutResult` para capturar la ejecución real de un entrenamiento por parte del atleta: fecha y hora de la sesión, duración total, rondas completadas, cargas levantadas en cada serie y percepciones subjetivas del esfuerzo (escala RPE: *Rate of Perceived Exertion*).
   - Mantener una estricta separación entre la prescripción (el entrenamiento planeado) y la ejecución real (el resultado obtenido), permitiendo registrar desviaciones o ajustes de carga sin alterar la plantilla original.
3. **Historial de entrenamientos y calendario deportivo:**
   - Proveer vistas interactivas en la aplicación web y móvil para explorar el historial cronológico de sesiones completadas, visualizar la frecuencia semanal de entrenamiento y consultar los volúmenes totales de carga movilizados.

## 12.2 Extracción automática de marcas personales (`source: WORKOUT`)

Una de las principales ventajas de la arquitectura de marcas implementada en la fase 2 es que el modelo `PersonalRecord` y la base de datos ya incluyen el atributo enumerado `RecordSource` (`MANUAL` y `WORKOUT`), tal como se justificó en el [ADR 0007](../adr/0007-personal-record-model.md):

- En la fase 3 se desarrollará un servicio interceptor que, al confirmarse la persistencia de un `WorkoutResult`, analizará cada serie realizada.
- Si una serie supera el valor canónico normalizado (`normalizedValue`) de la mejor marca previa del atleta para dicho movimiento y repeticiones, el sistema insertará automáticamente una nueva fila en `PersonalRecord` con el atributo `source: WORKOUT`.
- Esta automatización respetará el principio de no sobrescritura de marcas: la evolución histórica se mantendrá inmutable, permitiendo al atleta distinguir si un récord fue establecido de forma aislada en un intento manual o durante la ejecución de una rutina estructurada.

## 12.3 Asistente deportivo inteligente con Google Gemini

La fase 2 sentó las bases para una integración ética y técnicamente sólida de la inteligencia artificial al crear el servicio `ProgressSnapshotService`:

- **Activación del proveedor `GeminiAiProvider`:** En la fase 3 se completará la implementación del proveedor de inteligencia artificial dentro de `apps/api/src/ai`, consumiendo el SDK oficial de Google Gemini en el backend y validando la presencia de la variable segura `GEMINI_API_KEY`.
- **Inyección de contexto determinista:** El asistente de IA no consultará directamente la base de datos ni calculará números o porcentajes deportivos. En su lugar, el sistema serializará la estructura `AthleteProgressSnapshot` generada de forma purista por `@garfit/domain`.
- **Interpretación cualitativa y recomendaciones:** Con el historial matemático ya resuelto (mejores marcas, desmejoras, cambios porcentuales y tiempo transcurrido), el modelo de lenguaje se concentrará exclusivamente en labores donde destaca: redactar explicaciones motivacionales en lenguaje natural, sugerir variaciones de ejercicios para grupos musculares rezagados y advertir sobre estancamientos o sobrecargas potenciales.

## 12.4 Deuda técnica y resolución de limitaciones de la fase 2

Para garantizar que el crecimiento del sistema no degrade la calidad del software, la fase 3 debe subsanar de manera formal la deuda técnica identificada durante la fase 2:

1. **Cobertura unitaria en paquetes compartidos:**
   - Escribir pruebas unitarias específicas en `packages/validation/src/index.test.ts` para cubrir los nuevos esquemas de Zod incorporados en la fase 2 (`createRecordSchema`, `updateRecordSchema`, `movementQuerySchema`, etc.), elevando su cobertura del 34.88 % actual hacia el 100 %.
   - Ampliar las pruebas unitarias del cliente API sobre sus métodos de recursos, conservando las pruebas existentes de rutas de movimientos, marcas, WODs y entrenamientos.
2. **Pruebas en dispositivos móviles físicos y automatización E2E:**
   - Implementar una suite de pruebas automatizadas de extremo a extremo para la aplicación móvil (`apps/mobile`) utilizando herramientas modernas como Maestro o Detox, superando la dependencia exclusiva de pruebas estáticas y de exportación.
   - Ejecutar pruebas de usabilidad y verificación en dispositivos móviles físicos reales sobre diversas versiones de Android e iOS, evaluando tiempos de respuesta táctil, comportamiento sin conexión y consumo de batería.
3. **Evaluación de usabilidad con atletas reales:**
   - Diseñar y ejecutar un protocolo formal de evaluación de usabilidad con estudiantes y deportistas de la comunidad universitaria de la Universidad Autónoma de Tlaxcala (UATx).
   - Aplicar instrumentos estandarizados de medición de experiencia de usuario, tales como el cuestionario SUS (*System Usability Scale*), para obtener retroalimentación empírica sobre la claridad del catálogo y la visualización de progresos.
4. **Pruebas de rendimiento y estrés bajo concurrencia:**
   - Ejecutar pruebas de carga sintética mediante herramientas como K6 para evaluar la latencia y estabilidad de los endpoints de la API NestJS y la base de datos PostgreSQL ante ráfagas concurrentes de peticiones.

## 12.5 Criterios de transición metodológica

## 12.6 Agenda posterior a la fase 3

La fase 4 puede utilizar `AthleteProgressSnapshot` como entrada estructurada de IA, sin alterar los cálculos deterministas que lo forman; aún no existe endpoint de snapshot para ese fin. También se propone reabrir entrenamientos con recálculo seguro de marcas posteriores, comparar scores entre ejecuciones del mismo WOD y construir un editor avanzado de WODs.

Debe completarse la verificación en dispositivo Android. Permanecen como deuda el aviso de PostgreSQL ante consultas concurrentes de la semilla demo, la cobertura unitaria baja de web, posibles tipos de rutas Expo obsoletos localmente, la creación de WOD personal ausente de web, la serie propia para `TIME` sin distancia heredado, Google OAuth sin credenciales y el snapshot sin endpoint.

La transición hacia la fase 3 requerirá mantener la disciplina arquitectónica observada hasta el momento:

- Ninguna funcionalidad de entrenamientos o inteligencia artificial se declarará implementada sin contar previamente con sus migraciones de Prisma correspondientes, sus contratos compartidos en `packages/types`, sus pruebas automatizadas en `apps/api/test/` y su respectiva evidencia en la matriz de trazabilidad.
- Los requerimientos de la fase 3 continuarán clasificados como `Planeado` hasta que la suite de verificación completa concluya satisfactoriamente con código 0 y se archiven las evidencias correspondientes.
