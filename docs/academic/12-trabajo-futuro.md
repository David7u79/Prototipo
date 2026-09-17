# 12. Trabajo futuro

## 12.1 Dominio deportivo

Una siguiente fase debe modelar movimientos, rutinas, sesiones, resultados y marcas personales con migraciones y criterios de propiedad por usuario. Sobre esos datos podrán añadirse historial, estadísticas y visualización de evolución. Los cálculos de rendimiento deberán ser deterministas, auditables y probados antes de cualquier explicación automatizada.

## 12.2 IA y plataforma

El proveedor Gemini deberá implementarse detrás de AiProvider, con límites, trazabilidad de contexto y sin claves en clientes. ReleaseStorage puede recibir una implementación S3 o R2 tras definir retención, acceso y costos. También se requieren verificación de correo, recuperación de contraseña, políticas de expiración y una estrategia de respaldo.

## 12.3 Calidad

Las fases posteriores deben agregar pruebas e2e de web y móvil, pruebas de migración, observabilidad y evaluación de accesibilidad. La priorización depende de requisitos y evidencia futura, por lo que no se asignan fechas ni se presenta este listado como compromiso de implementación.

> **PENDIENTE:** priorización, responsables, criterios de éxito y plan de fases; responsable: tesista y asesoría.

## 12.4 Criterios para continuar

El dominio de movimientos debe comenzar con un vocabulario y una política de propiedad. Un movimiento podría ser global, creado por usuario o ambas cosas; cada alternativa afecta autorización, duplicados y búsqueda. Las rutinas y sesiones deberán diferenciar planeación de ejecución, conservar unidades y permitir correcciones sin perder trazabilidad. Los resultados y PRs necesitan reglas explícitas para decidir qué marca es válida; no basta con calcular el máximo de un número sin contexto de movimiento, fecha y unidad.

Las estadísticas y evolución deberán indicar periodo, conjunto de datos, fórmula y tratamiento de datos incompletos. Las gráficas no deben ocultar que faltan registros ni convertir una interpolación en una observación. Una vez existan cálculos deterministas, la IA podrá explicar resultados en lenguaje natural; no deberá ser la fuente de una marca, porcentaje o recomendación numérica. Esta separación permite probar el cálculo sin depender de respuesta probabilística.

Para correo y recuperación de contraseña se requerirán tokens de un solo uso, expiración, limitación de intentos, plantillas y pruebas de no enumeración de cuentas. Para S3/R2 se deberá decidir cifrado, credenciales, URLs de descarga, retención, costo y migración desde local. Para pruebas móviles e2e se necesitarán dispositivos o emuladores definidos, datos semilla, limpieza y evidencia reproducible. Cada tarea debe pasar de propuesta a requisito antes de declararse parte de una fase.
