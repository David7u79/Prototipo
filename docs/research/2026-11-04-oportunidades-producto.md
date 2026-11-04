# Oportunidades de producto para GarFit (investigación, 2026-11-04)

Objetivo: decidir qué añadir para que GarFit sea útil a un atleta real que entrena CrossFit o
fuerza por su cuenta. Es un documento de investigación. No aprueba requisitos ni cambia el alcance
del release candidate ([12-trabajo-futuro §12.10](../academic/12-trabajo-futuro.md)).

## 1. Método y calidad de las fuentes

- Búsqueda web sobre SugarWOD, BTWB, Wodify, Hevy, Strong, Whoop y Strava: reseñas en tiendas,
  agregadores (Capterra, G2, Trustpilot), foros y estudios sobre por qué se abandonan las apps de
  fitness.
- **Limitación:** las búsquedas casi no devolvieron hilos de Reddit originales. Lo de Reddit viene
  de espejos o de blogs que lo citan. Muchas fuentes son blogs comparativos con afiliados o
  páginas de otros fabricantes. Se citan como indicio, no como prueba. Los estudios revisados por
  pares van marcados **[estudio]**.
- Contraste con el código mediante lectura dirigida: ADR 0007–0011, `apps/api/prisma/schema.prisma`,
  `packages/domain/src`, `packages/movements/src/benchmark-wods.ts` y las rutas de
  `apps/mobile/src/app`.

## 2. Qué valoran y qué hace abandonar

### 2.1 Por qué se quedan

| Señal | Evidencia |
| --- | --- |
| **Registrar rápido en el box y ver el resultado anterior.** Hevy muestra lo que hiciste la última vez en ese ejercicio mientras registras, y lo vende como la base de la sobrecarga progresiva. | [Hevy, ajustes de entrenamiento](https://www.hevyapp.com/features/workout-settings/) |
| **Benchmarks y comparación con uno mismo.** BTWB puntúa cada resultado (p. ej. Fran 4:22 ≈ nivel 75) y ordena las mejores marcas por 6 meses, 1 año o histórico. | [BTWB: Fitness Level](https://support.btwb.com/en/support/solutions/articles/35000172933-what-is-fitness-level-how-does-it-work-), [BTWB: Workout Levels](https://support.btwb.com/en/support/solutions/articles/35000172952-workout-levels-fitness-levels-how-do-they-work-), [BTWB: lifetime bests](https://support.btwb.com/en/support/solutions/articles/35000172955-i-m-looking-for-lifetime-bests-where-can-i-find-them-) |
| **Todo en una sola app: timer, calculadora de discos y de %, Girls/Heroes/Open precargados.** Las apps pequeñas de WOD compiten justo con esto. | [WOD Log](https://apps.apple.com/app/id1071899114), [Burpee](https://apps.apple.com/app/id1466193507), [My Wodbook](https://mwm.ai/apps/my-wodbook/1597594605), [WODStalk](https://apps.apple.com/us/app/id1475926202) |
| **Comunidad, gratis para el atleta y sencilla** (SugarWOD). | [SugarWOD App Store](https://apps.apple.com/ca/app/sugarwod/id665516348), [Garage Gym Reviews](https://www.garagegymreviews.com/equipment/sugarwod) |
| **Registro de entrenamiento y datos propios** (Strava: el registro y el mapa de calor justifican pagar). Whoop: el diario que cruza hábitos con la recuperación se valora más que la propia puntuación. | [Wareable: Strava premium](https://www.wareable.com/sport/is-strava-premium-worth-it), [RepReturn: Whoop](https://repreturn.com/is-whoop-worth-it/) |
| **Poder sacar tus datos.** Hevy y Strong exportan CSV, y Hevy importa el CSV de Strong, lo que facilita cambiarse a Hevy. | [Guía para migrar de app](https://lastlift.pages.dev/articles/how-to-switch-workout-tracker-apps/), [setgraph: alternativas a Strong](https://setgraph.app/articles/best-strong-app-alternatives-(2025)) |

### 2.2 Por qué abandonan

| Señal | Evidencia |
| --- | --- |
| **Perder datos o que la app se cierre a mitad de sesión.** Hay usuarios que se fueron de Strong a Hevy porque Strong les borraba entrenamientos. Wodify y SugarWOD reciben quejas de cierres tras cada actualización. | [TrainerRoad forum](https://www.trainerroad.com/forum/t/app-for-strength-training/101664), [G2 Wodify](https://www.g2.com/products/wodify/reviews?page=2), [justuseapp SugarWOD](https://justuseapp.com/en/app/665516348/sugarwod/reviews) |
| **Sin cobertura en el box.** Un atleta sólo podía registrar si empezaba y terminaba junto al Wi-Fi del gimnasio. | [Trainerize ideas](https://ideas.abcfitness.com/forums/167887-coach-trainer-abc-trainerize/suggestions/6623779-offline-option-for-the-app) |
| **Registrar algo que no es un WOD resulta torpe** (SugarWOD) y la interfaz confunde al principio. | [Garage Gym Reviews](https://www.garagegymreviews.com/equipment/sugarwod) |
| **Perder funciones al rediseñar.** El app nueva de Wodify quitó el gráfico de historial que se veía de un vistazo. | [Capterra Wodify](https://www.capterra.com/p/159663/Wodify/reviews/?page=3) |
| **Datos que no se creen.** En Whoop, CrossFit y carrera dan cargas muy distintas. Strava tiene segmentos imprecisos. **[estudio]** La desconfianza en los datos y la pérdida de motivación explican el abandono definitivo. | [Whoop reddit (espejo)](https://reddit.sentinel-team.org/subreddits/whoop/snapshots/2026-05-21T21%3A02%3A46.289321Z), [Kimola Strava](https://kimola.com/reports/unlock-insights-strava-app-user-feedback-report-app-store-us-151062), [JMIR 2024 scoping review](https://www.jmir.org/2024//e56897) |
| **Registrar a mano cansa, y la gente pierde interés o prueba otra app.** La mitad de los exusuarios de Fitbit dice que quiere volver a registrar. | [JMIR 2024](https://www.jmir.org/2024//e56897), [Star Tribune / UW](https://m.startribune.com/why-people-quit-their-fitbits/393122361/), [the5krunner](https://the5krunner.com/2022/10/13/sport-tracker-watches-reasons-abandonment/) |
| **Suscripciones y muros de pago** (Strava, Whoop). | [the5krunner: Strava paywall](https://the5krunner.com/2020/05/18/strava-turn-off-key-features-welcome-to-the-paywall), [Trustpilot Strava](https://www.trustpilot.com/review/strava.com?page=10) |

**Conclusión.** Un atleta se queda si registrar cuesta poco, si el dato que guarda es fiable y si
ve enseguida su progreso respecto a sí mismo. Se va si la app pierde datos, si tiene que salir de
ella para usar el timer o la calculadora, o si los números no le cuadran. Para una app personal
como GarFit, lo social y la gamificación pesan menos.

## 3. Qué tiene GarFit hoy (lo relevante)

- Marcas con `source MANUAL/WORKOUT`, series comparables por reps o distancia, y cálculo
  determinista en `@garfit/domain` (`packages/domain/src/records.ts`).
- Entrenamientos con estados `DRAFT → IN_PROGRESS → COMPLETED`: `POST /workouts/:id/start`,
  `PUT /workouts/:id/results` y `POST /workouts/:id/complete`. Al completar se derivan las marcas
  (`packages/domain/src/workouts.ts`, `apps/api/src/workouts`).
- WODs: 6 benchmarks "Girls" (Fran, Grace, Helen, Diane, Karen y Cindy) en
  `packages/movements/src/benchmark-wods.ts`. **Ya existe la comparación entre intentos del mismo
  WOD** (`compareWodPerformance` en `packages/domain/src/comparisons.ts`, servida por
  `apps/api/src/wods/wods.service.ts` y mostrada en `apps/mobile/src/app/(app)/wods/[slug].tsx`).
- Al terminar se muestran las marcas conseguidas frente a la mejor anterior
  (`apps/mobile/src/app/(app)/workouts/[id].tsx`). **No se muestra al registrar cada serie.**
- IA: análisis de progreso o de un entrenamiento y explicación de un WOD o un movimiento
  (`apps/api/src/ai/ai.controller.ts`), con evidencia verificada (ADR 0009) e historial `AiAnalysis`.
- Biométricos: FC media y máxima, calorías y ventana por entrenamiento (`WorkoutBiometrics`).
  Las muestras crudas no salen del dispositivo (ADR 0011).
- **No existe:** timer, calculadora de % o discos, 1RM estimado, RPE, Rx/Scaled, recordatorios,
  modo sin conexión, exportación ni repetir un entrenamiento. El esquema no tiene campos de RPE
  ni de escalado (`schema.prisma`, modelos `Workout` y `WorkoutScore`). El perfil tiene
  `birthDate` y `weightKg`, pero no FC máxima ni FC en reposo.

## 4. Propuestas evaluadas

Esfuerzo: **S** ≤ 1 día · **M** 2–4 días · **L** más de una semana (contando tests y docs del proyecto).

### P1. Timer integrado (For Time, AMRAP, EMOM, Tabata) conectado al score — **SÍ**
- **Valor:** muy alto. Es lo que el atleta usa en cada metcon. Hoy necesita otra app para el timer
  y luego copia el resultado a mano, que es justo el registro manual que hace abandonar. Además,
  `startedAt` y `completedAt` pasarían a ser reales, y eso mejora el emparejado con Health Connect
  (regla de ±15 min, ADR 0011).
- **Toca:** una función pura nueva en `packages/domain/src/timer.ts` que calcule el plan de
  intervalos a partir de `workoutType`, `durationSeconds`, `intervalSeconds` y `rounds` (con
  tests). Una pantalla nueva `apps/mobile/src/app/(app)/workouts/[id]/timer.tsx`, o un modal
  equivalente lanzado desde `workouts/[id].tsx`. Al terminar se abre el formulario de score ya
  relleno (tiempo en FOR_TIME; rondas y reps las teclea el atleta en AMRAP). El backend no cambia:
  usa `start` y `complete`.
- **Dependencias:** `expo-keep-awake`, `expo-haptics` y `expo-audio` (pitidos de 3-2-1). Tabata no
  es un `WorkoutType`; se resuelve como un preset del timer (20/10 × 8) sobre `CUSTOM`, sin migración.
- **Riesgos:** si el timer cuenta ticks de `setInterval`, se desvía al bloquear la pantalla o
  pasar a segundo plano. Debe calcular siempre `now - startTimestamp`. Las notificaciones con la
  app en segundo plano quedan fuera del primer corte. Hay que verificarlo en un Android físico.
- **Esfuerzo:** M.

### P2. Calculadora de % de 1RM, discos y 1RM estimado — **SÍ**
- **Valor:** alto y barato. En CrossFit se programa en porcentajes ("5×3 al 75 %"). Es la
  utilidad que repiten WOD Log, Burpee, WODStalk y xfit, y SugarWOD también la tuvo. GarFit ya
  tiene la 1RM real de cada movimiento, así que puede rellenarla sola.
- **1RM estimado:** Epley, `w·(1 + r/30)`, y Brzycki, `w·36/(37 − r)`. Sólo se calcula con
  **r ≤ 10** y se etiqueta siempre como estimación. **[estudio]** Ambas fórmulas tienden a
  infraestimar y pierden precisión por encima de unas 10 reps; la mejor predicción sale de 5RM
  ([arXiv 2026](https://arxiv.org/pdf/2603.17495v1.pdf),
  [Barry Univ.](https://budc.barry.edu/AA00001225/00001/citation)). **Nunca se guarda como
  `PersonalRecord`**: rompería la regla de que una marca es un dato medido (ADR 0007).
- **Toca:** funciones nuevas en `packages/domain/src/units.ts` o en un `strength.ts` nuevo:
  `estimateOneRepMax`, `percentOf` y `platesFor(targetKg, barKg, discosDisponibles)`, con
  redondeo al disco más pequeño. Una hoja inferior en `apps/mobile/src/app/(app)/records/[movementSlug].tsx`
  y en el registro de series de `workouts/[id].tsx`. Se respetan kg y lb según `preferredUnits`.
- **Dependencias:** ninguna. **Riesgos:** confundir la estimación con una marca. Se evita con una
  etiqueta y con un tipo distinto en el dominio.
- **Esfuerzo:** S.

### P3. "La última vez" en línea al registrar series — **SÍ**
- **Valor:** alto. Es la función central de Hevy y Strong. Mientras registras ves las series
  anteriores del mismo movimiento y la mejor marca de esa serie, y eso acelera el registro y guía
  la carga.
- **Toca:** un endpoint `GET /movements/:slug/last-performance` en `apps/api/src/movements`, o un
  campo `lastPerformance` por ejercicio en el `GET /workouts/:id` (`workouts.service.ts`,
  `workouts.mapper.ts`). Sus tipos van en `packages/types` y su método en
  `packages/api-client/src/index.ts`. En la UI se muestra como pista en las series de
  `workouts/[id].tsx`. La web puede llegar después.
- **Riesgos:** una consulta N+1 por ejercicio. Se evita con una sola consulta agrupada por
  `movementId` sobre los entrenamientos `COMPLETED` no borrados.
- **Esfuerzo:** S–M.

### P4. Más benchmarks y Rx/Scaled en el score — **SÍ**
- **Valor:** alto para CrossFit. La comparación entre intentos ya existe, pero con 6 Girls se
  queda corta. Faltan clásicos como Murph, DT, Isabel, Annie, Nancy, Jackie, Elizabeth y los
  Open. Además, **comparar un Fran escalado con uno Rx falsea el progreso**, que es justo el
  "dato que no me cuadra" que hace abandonar.
- **Toca:** el contenido en `packages/movements/src/benchmark-wods.ts`. La semilla ya hace upsert
  por slug. Cada WOD usa movimientos del catálogo existente: hay que comprobarlo con un test, como
  en `movements.test.ts`. Para el escalado, un enum `Scaling { RX, SCALED }` en `WorkoutScore`
  (migración en `apps/api/prisma/schema.prisma`, regla en `validateScore`) y que
  `compareWodPerformance` compare sólo intentos con el mismo `scaling`.
- **Riesgos:** **la licencia o el origen de las descripciones** de los WODs. Conviene usar la
  prescripción factual (movimientos, reps, cargas), no textos copiados. Murph lleva chaleco y
  tiene 4 tramos: hay que verificar que `validatePrescription` lo admite.
- **Esfuerzo:** M (los datos son trabajo mecánico y van a Codex; la regla de escalado la decide
  el orquestador).

### P5. RPE por sesión y carga de entrenamiento (sRPE) — **SÍ, versión mínima**
- **Valor:** medio-alto. Ya estaba en el plan original (§12.1, "escala RPE") y no se implementó.
  La carga como `sRPE × minutos` (Foster) no necesita reloj y funciona igual en fuerza que en
  metcon. **[estudio]** En deportes intermitentes, sRPE es igual o más útil que TRIMP por FC, y
  TRIMP por zonas sólo mide bien el esfuerzo aeróbico
  ([karate, Biology of Sport](https://doaj.org/article/ebd397ce07c646f9bdc52ce1d7dfc052),
  [corredores, IJES](https://digitalcommons.wku.edu/ijesab/vol8/iss11/65)). Da a la IA un hecho
  nuevo y fiable: si la carga semanal sube o baja.
- **Toca:** `Workout.sessionRpe Int?` (1–10) con su migración, la validación en
  `packages/validation`, `sessionLoad()` y `weeklyLoad()` en `packages/domain/src/workouts.ts`
  (junto a `countPerWeek`), un selector al completar en `workouts/[id].tsx`, un gráfico semanal en
  `(tabs)/progress.tsx`, y un hecho `load:weekly:*` en `packages/domain/src/progress-snapshot.ts`
  o `ai.ts` para la IA.
- **Riesgos:** **no** calcular ACWR ("riesgo de lesión"): su validez está discutida y sería un
  consejo médico implícito. Sólo se muestra la tendencia.
- **Esfuerzo:** S–M.

### P6. Robustez sin conexión ("offline-lite") — **SÍ, pero condicionado**
- **Valor:** potencialmente crítico. Perder una sesión es la queja que más hace abandonar, y
  muchos boxes están en naves o sótanos sin cobertura. Hay que **medirlo antes**: no se ha
  verificado cómo se comporta hoy `workouts/[id].tsx` si falla `PUT /results`.
- **Versión mínima:** guardar en el dispositivo el borrador de series del entrenamiento en curso
  (en `apps/mobile/src/lib/workouts.ts`) y reintentar `PUT /results` y `complete`, que ya son
  idempotentes (ADR 0008 §6). Un aviso visible de "pendiente de sincronizar".
- **NO hacer:** la app entera sin conexión con sincronización bidireccional. Es L, aparecen
  conflictos y el catálogo y la IA dependen del servidor.
- **Dependencias:** `@react-native-async-storage/async-storage` o `expo-sqlite`.
- **Esfuerzo:** M. **Sube al puesto 2 si una prueba en el box muestra pérdida de datos.**

### P7. Repetir un entrenamiento o plantilla personal — **SÍ (rápido)**
- **Valor:** medio. Cubre el 80 % de la "programación semanal" sin construir un planificador:
  "repetir el entrenamiento del lunes" o "guardar como WOD privado" (los WODs privados ya existen,
  ADR 0008 §1).
- **Toca:** un `POST /workouts/:id/duplicate` en `workouts.service.ts`, o crear el WOD desde un
  entrenamiento, y un botón en `workouts/[id].tsx`. **Esfuerzo:** S.

### P8. Exportar a CSV — **SÍ (rápido)**
- **Valor:** medio. Da confianza: "mis datos son míos". Hevy y Strong lo ofrecen y facilita la
  migración, aunque nadie lo usa a diario.
- **Toca:** `GET /workouts/export.csv` y `GET /records/export.csv` en `apps/api/src/workouts` y
  `apps/api/src/records`, con streaming y filtrado por `userId`. En el móvil, compartir el fichero
  con `expo-sharing`. **Riesgo:** fugas entre usuarios, que se cubren con un test e2e de
  propiedad. **Esfuerzo:** S.

### P9. Un uso más concreto de la IA — **SÍ, acotado**
Lo útil es lo que el atleta no puede deducir mirando una tabla y que se apoya en evidencia de
GarFit:
1. **Estrategia antes del WOD.** "¿Cómo parto Fran?", basado en la mejor marca de thrusters y
   dominadas y en el historial de Fran. Amplía `explain/wod/:slug` añadiendo esos hechos al
   contexto (`apps/api/src/ai/prompts/wod-explanation.ts`).
2. **Por qué no mejoro en X.** Usa hechos que ya existen: fecha de la última marca, frecuencia y
   volumen de ese movimiento. Puede ir dentro de `explain/movement` con un hecho nuevo:
   `stall:<slug>:days-since-best`.
3. **Equilibrio semanal.** Categorías o músculos sin trabajar en 4 semanas, más la carga de P5.
   El snapshot ya tiene volumen por movimiento; falta agregarlo por `category`.
- **NO:** el chat libre (fuera de alcance, §12.10), generar programas completos ni calcular
  porcentajes, que son deterministas (P2). La regla del ADR 0009 sigue igual: GarFit calcula y el
  modelo interpreta.
- **Esfuerzo:** S cada pregunta, una vez existan los hechos que necesita.

### P10. Zonas de FC y carga por FC — **NO por ahora**
- Para calcular el tiempo en cada zona hacen falta las muestras crudas, que por decisión no salen
  del dispositivo (ADR 0011 §2), y la FC máxima y en reposo, que el perfil no tiene. Estimar con
  `220 − edad` daría justo el "dato que no me cuadra". El Edwards TRIMP sólo mide bien el
  esfuerzo aeróbico.
- **Si se retoma:** calcular el tiempo por zona en el móvil (`packages/domain/src/biometrics.ts`)
  y guardar sólo los 5 minutos agregados en `WorkoutBiometrics`, con la FC máxima indicada por el
  atleta. Va después de P5, que da la carga sin reloj. **Esfuerzo:** M.

### Marcadas como NO (YAGNI)

| Idea | Por qué no |
| --- | --- |
| Rachas o streaks | No hay evidencia controlada de que retengan en fitness. Romper una racha reduce el uso posterior ([Yu-kai Chou](https://yukaichou.com/gamification-analysis/streak-design-gamification-motivation-burnout/), citando a Silverman y Barasch 2023, sin verificar). Además, el descanso forma parte del entrenamiento. Basta la frecuencia semanal, que ya existe (`countPerWeek`). |
| Feed social, ranking o leaderboard | GarFit es personal: sin box, sin coaches (ADR 0008). Necesita masa crítica y moderación. |
| Nivel de forma tipo BTWB (percentiles) | Necesita una población grande para calcular percentiles. Con pocos usuarios, el número engaña. |
| Planificador de programas semanales o mesociclos | Es L y fuera de alcance (§12.10). P7 cubre lo esencial. |
| Notificaciones push o recordatorios | Fuera de alcance (§12.10). Requieren FCM y más permisos. Su valor es bajo frente al de quienes ya entrenan por hábito. Como mucho, un recordatorio local opcional más adelante. |
| Compartir una PR como imagen | Bonito, pero no retiene a un usuario personal. Sólo vale si sobra tiempo (S, `react-native-view-shot`). |
| Sincronización completa sin conexión | Ver P6. Es L y trae conflictos; la versión mínima da casi todo el valor. |
| Guardar el 1RM estimado como marca | Rompe ADR 0007: una marca es un dato medido. |
| ACWR o riesgo de lesión | Su validez está discutida y sería un consejo médico implícito. |

## 5. Roadmap recomendado (top 5)

1. **Timer integrado conectado al score (P1, M).** Es lo que más se usa en CrossFit, acaba con el
   cambio de app y el tecleo a mano, y mejora los biométricos que ya existen. Sólo toca dominio y
   móvil; el backend no cambia.
2. **Calculadora de %, discos y 1RM estimado (P2, S).** Es lo más útil por día de trabajo:
   aprovecha marcas que ya existen y no cambia el esquema.
3. **"La última vez" en línea (P3, S–M).** Es lo que hace que la gente se quede en Hevy y Strong:
   registrar rápido y ver la sobrecarga progresiva mientras entrena.
4. **Más benchmarks y Rx/Scaled (P4, M).** Saca partido a `compareWodPerformance`, que ya existe,
   y hace que la comparación entre intentos sea honesta.
5. **sRPE y carga semanal (P5, S–M).** Cumple lo que el plan original prometía, da la carga sin
   reloj y alimenta la IA con un hecho nuevo y verificable (P9.3).

**Rápidas para intercalar:** P7 (repetir un entrenamiento) y P8 (exportar a CSV), ambas S.
**Vigilar:** P6 (sin conexión). Si la prueba en el box muestra pérdida de datos, pasa por delante
de todo. **Después:** P9 (preguntas de IA concretas, una vez existan los hechos de P4 y P5) y P10
(zonas de FC).

Antes de empezar cualquiera, §12.10 exige definir requisitos, datos, pruebas y evidencia. Las
migraciones (P4, P5) van a `schema.prisma` con su ADR o con una actualización de los ADR 0007 y 0008.
