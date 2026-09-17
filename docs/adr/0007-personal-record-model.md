# 0007 Modelo de marcas personales, unidades y catálogo de movimientos

Estado: Aceptado (fase 2)

## Contexto

Un atleta registra marcas de naturaleza distinta: carga (sentadilla 105 kg), repeticiones
(18 dominadas), distancia, tiempo sostenido (plancha) y tiempo para completar un esfuerzo. Se
necesita conservar la evolución, comparar marcas de forma determinista, aceptar kg y lb sin
inconsistencias entre web y móvil, y dejar preparada la generación automática de marcas desde
resultados de entrenamiento (fase 3). El catálogo de movimientos debía salir de una fuente
real, no inventarse.

## Decisión

1. **Una fila por registro, nunca sobrescritura.** `PersonalRecord` guarda cada marca. Las
   correcciones usan `PATCH` y el retiro es un borrado lógico (`deletedAt`): la fila se conserva
   para trazabilidad, pero deja de contar en historial y cálculos. `source` (`MANUAL` |
   `WORKOUT`) prepara la fase 3.
2. **Tipo de marca explícito con dirección fija.** `RecordType` = `WEIGHT`, `REPS`,
   `DISTANCE`, `DURATION` (mayor es mejor) y `TIME` (menor es mejor). `DURATION` y `TIME` se
   separan porque una plancha y una carrera cronometrada mejoran en sentidos opuestos.
3. **Series comparables.** Sólo se comparan marcas del mismo movimiento y tipo; en `WEIGHT`,
   además, con las mismas repeticiones (`repetitions`: 1 = 1RM, 5 = 5RM).
4. **Valor introducido + valor canónico.** Se guardan `value` y `unit` tal como los escribió el
   atleta y `normalizedValue` en unidad canónica (kg, repeticiones, metros, segundos), calculado
   en el servidor con factores exactos (1 lb = 0.45359237 kg). Se compara siempre con
   `normalizedValue`; se muestra con `formatRecordValue` en las unidades preferidas del perfil.
5. **Cálculo en código compartido y determinista.** `@garfit/domain` calcula mejor marca, marca
   actual, cambio respecto al anterior, mejora de la mejor marca y progreso total. API, web y
   móvil usan esas funciones; ningún cálculo usa IA.
6. **Catálogo importado y reproducible.** `@garfit/movements` transforma
   `hasaneyldrm/exercises-dataset` (commit fijado, datos MIT, sin su media © Gym visual) con
   reglas explícitas: categoría = región corporal de la fuente, músculos normalizados, dificultad
   nula porque la fuente no la clasifica, y tipos de marca admitidos derivados del equipamiento y
   la categoría. La semilla hace upsert por `slug` y desactiva (no borra) lo que sale del
   catálogo.

## Alternativas consideradas

- **Un único valor numérico sin tipo:** no distingue "mayor es mejor" de "menor es mejor".
- **Columnas separadas por tipo (`weightKg`, `reps`, `seconds`…):** muchas columnas nulas y
  reglas repartidas; el tipo explícito con un solo valor es más simple de validar.
- **Guardar sólo el valor canónico:** 225 lb se mostraría como 224.9 lb tras redondeos.
- **Sobrescribir la marca actual:** pierde la evolución, que es el objetivo del producto.
- **Borrado físico:** rompe la trazabilidad histórica exigida por el proyecto.
- **Catálogo propio escrito a mano o Valkiria completo:** datos inventados o funciones
  administrativas ajenas al atleta.

## Consecuencias

- Añadir un tipo de marca exige tocar el enum en `@garfit/domain`, Prisma y sus unidades; un
  test de la API falla si los enums divergen.
- Las marcas `TIME` de movimientos genéricos (p. ej. "Run") no registran la distancia: el atleta
  debe ser consistente; la fase 3 las contextualizará con entrenamientos de referencia.
- Los nombres del catálogo están en inglés (la fuente no los traduce) y la dificultad no está
  disponible hasta que se clasifique de forma documentada.
