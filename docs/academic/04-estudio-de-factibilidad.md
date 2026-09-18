# 4. Estudio de factibilidad

## 4.1 Técnica

La implementación es reproducible localmente con Node.js, pnpm, PostgreSQL y un monorepo TypeScript. NestJS, Prisma y PostgreSQL proporcionan la capa API; Next.js sirve la web, Astro la landing y Expo/React Native el móvil. PostgreSQL de desarrollo escucha en 5442 y los casos de integración usan `garfit_test`. Las versiones declaradas se registran en el capítulo 8.

`ReleaseStorage` desacopla metadatos de releases de archivos. Los paquetes compartidos disminuyen repetición. OpenAPI, ERD y TypeDoc se derivan desde código. No hay proveedor Gemini funcional, almacenamiento de objetos configurado ni pruebas e2e móviles; Google OAuth depende de configuración y Development Build.

## 4.2 Operativa

El equipo técnico instala dependencias, inicia PostgreSQL, aplica migraciones y levanta las aplicaciones con comandos reproducibles. Debe definir variables sin versionar secretos y publicar una APK desde un equipo con acceso al archivo y a la base. Para el atleta, el uso de fase 1 se reduce a registro, sesión y perfil.

No se demuestra operación productiva: faltan roles administrativos, respaldo, observabilidad, recuperación de contraseña, verificación de correo, avisos de privacidad y soporte. El manual es de desarrollo, no de operación institucional.

## 4.3 Económica

No se calculan montos sin cotizaciones ni horizonte de despliegue. La disponibilidad de recursos gratuitos durante el prototipo describe únicamente el coste observado en esa etapa; no es una garantía de precios, cuotas ni costo futuro de despliegue.

| Rubro | Dato necesario | Costo | Fuente | Estado |
| --- | --- | ---: | --- | --- |
| Cómputo y PostgreSQL | capacidad, región y disponibilidad | PENDIENTE | PENDIENTE | Sin evaluación |
| Almacenamiento APK | volumen y transferencia | PENDIENTE | PENDIENTE | Sin evaluación |
| Dominio y certificados | proveedor y vigencia | PENDIENTE | PENDIENTE | Sin evaluación |
| Distribución Android | canal y cuenta | PENDIENTE | PENDIENTE | Sin evaluación |
| Operación | horas y responsables | PENDIENTE | PENDIENTE | Sin evaluación |

> **PENDIENTE:** cotizaciones, horizonte y consolidación de costos; responsable: tesista.

## 4.4 Legal y ética

Se persisten correo, nombre opcional, avatar, sesión y preferencias deportivas. Aunque no hay datos clínicos, esos elementos identifican o perfilan a una persona. El esquema prueba qué se guarda, pero no sustituye aviso de privacidad, consentimiento ni fundamento jurídico. Deben revisarse licencias, términos de Google y condiciones de distribución Android.

> **PENDIENTE:** aviso de privacidad, consentimiento, licencias y revisión institucional; responsable: tesista y asesoría jurídica/institucional.

## 4.5 Recursos y dependencias verificables

La factibilidad no depende únicamente de elegir herramientas conocidas. El repositorio declara un administrador de paquetes único, workspaces y tareas que hacen visible qué aplicación consume cada paquete. Esa estructura permite instalar una sola vez, ejecutar verificaciones de tipo y mantener contratos internos sin publicar paquetes en un registro. A cambio, obliga a que los consumidores sean compatibles con las reglas de TypeScript del monorepo y a que el equipo mantenga la instalación coordinada.

La API depende de un servicio PostgreSQL accesible y de migraciones Prisma. La salud del proceso no basta si la URL apunta a una base equivocada; por ello el entorno separa desarrollo y prueba. La configuración de pruebas usa una base de datos real, lo cual hace más representativas las validaciones de persistencia, pero requiere que el puerto, usuario y bases estén disponibles antes de iniciar Vitest. La indisponibilidad de ese recurso es un fallo de entorno, no una evidencia contra los requisitos funcionales.

La web y landing necesitan una URL de API acorde con su ubicación. Móvil presenta una condición adicional: localhost del emulador y localhost del equipo no representan siempre el mismo host. El archivo de ejemplo indica 10.0.2.2 para emulador; un teléfono físico necesita una dirección LAN alcanzable. Estas condiciones deben confirmarse durante la instalación y no deben ocultarse detrás de una configuración implícita.

Google OAuth es una dependencia operativa externa. La API puede arrancar sin client ID y comunica que Google está desactivado; esto permite probar el flujo local sin simular una autorización disponible. Para habilitarlo hay que crear la configuración en Google Cloud, autorizar orígenes y coordinar audiencias. El diseño no usa client secret en aplicaciones cliente, pero ese hecho no elimina requisitos de configuración, términos y revisión del proveedor.

## 4.6 Riesgos de adopción técnica

Prisma ofrece un modelo y migraciones centralizadas, pero toda modificación de entidad requiere revisar la migración resultante, compatibilidad con datos y efecto sobre ERD. Los tipos compartidos disminuyen discrepancias, pero no impiden que un consumidor HTTP ajeno envíe datos inválidos; por eso la API mantiene validación independiente. La abstracción de almacenamiento facilita una migración futura, aunque no implementa por sí misma replicación, cifrado de objetos ni políticas de retención.

Next.js y Expo resuelven necesidades de interfaz distintas. La decisión de separar aplicaciones reduce compromisos de UX, pero duplica superficies que deben probarse: manejo de sesión, presentación de errores y formularios. La web reduce exposición de token con cookies httpOnly; la app usa SecureStore por las capacidades del dispositivo. Ninguna de las dos estrategias debe interpretarse como garantía total frente a un dispositivo comprometido.

La factibilidad técnica se considera suficiente para una fase de prototipo porque los comandos y pruebas pueden ejecutarse en el entorno definido. Antes de crecer en dominio o desplegar, se deberá convertir cada riesgo anterior en una decisión con responsable, criterios y evidencia. La disponibilidad local no equivale a disponibilidad de producción.
 
## 4.7 Factibilidad técnica de la fase 4

La fase 4 es técnicamente factible porque la API integra el SDK `@google/genai` en una única frontera de servidor. El modelo se selecciona mediante configuración y el valor predeterminado es `gemini-3.8-flash`; esta elección evita acoplar el dominio a un nombre de modelo. La API para desarrolladores admite salida estructurada mediante JSON Schema, que GarFit solicita y valida nuevamente en el backend antes de persistir una respuesta.

La centralización es una condición de seguridad y mantenibilidad: la clave no llega a web ni a móvil, y la sustitución del proveedor no modifica los cálculos deterministas. El proveedor simulado permitió verificar el flujo sin Internet. La prueba con una clave real de Gemini permanece PENDIENTE, por lo que la factibilidad demostrada corresponde al contrato, la integración aislada y el recorrido simulado, no a una afirmación de disponibilidad externa.

## 4.8 Factibilidad técnica, operativa y económica de la fase 4

La integración utiliza el SDK oficial `@google/genai` porque concentra el contrato del proveedor, la autenticación mediante clave y la solicitud de generación en una dependencia mantenida para esa API. Sin embargo, el SDK no se propaga al dominio ni a los clientes: sólo `gemini-ai.provider.ts` lo conoce. La frontera abstracta `AiProvider` expresa las operaciones necesarias, normaliza sus fallos y permite sustituir la implementación sin modificar los constructores de contexto, las reglas de evidencia ni las rutas HTTP. Esta separación también acota la dependencia de un proveedor externo: una indisponibilidad, cambio contractual o migración queda localizada en el adaptador y no convierte a Gemini en fuente de verdad deportiva.

Se solicita salida estructurada mediante JSON Schema para que el proveedor produzca el contrato de resumen, observaciones, sugerencias, limitaciones e identificadores de evidencia que GarFit puede validar. El backend vuelve a validar el JSON con Zod y rechaza identificadores que no pertenezcan al contexto; por ello, la generación no tiene permiso para introducir números como si fueran cálculos propios. La decisión favorece trazabilidad, tratamiento predecible en web y móvil y almacenamiento seguro de la respuesta, aunque no convierte el texto interpretativo en diagnóstico.

Para este prototipo se descartaron RAG, agentes, búsqueda web y ajuste fino. RAG no era necesario porque el contexto relevante ya procede de registros, entrenamientos y catálogo estructurados en la base de datos; un agente no añade valor a cuatro operaciones delimitadas y dificultaría predecir herramientas y costo; la búsqueda web introduciría fuentes cambiantes, sin validación académica ni relación directa con los datos del atleta; y el ajuste fino requeriría un corpus anotado, evaluación y gobernanza que el alcance no posee. El diseño actual envía sólo hechos mínimos, deterministas y acotados para cada operación.

Operativamente, GarFit puede funcionar sin clave de Gemini: el estado comunica «Servicio de análisis no configurado.» y el resto de las funciones no depende del asistente. Para desarrollo y pruebas sin red, `FakeAiProvider` satisface la misma abstracción, devuelve respuestas controlables y permite verificar consentimiento, caché, límites, presentación y manejo de errores. La disponibilidad demostrada es, por tanto, la del flujo local y de su contrato; una prueba con una clave real y un dispositivo físico sigue siendo evidencia PENDIENTE.

En el prototipo se considera el nivel gratuito disponible del proveedor, sin afirmar precios, cuotas ni capacidad garantizada. Los límites, modelos y condiciones pueden cambiar; antes de un despliegue se debe consultar la documentación oficial ya referida en `docs/academic/14-referencias.md`, confirmar las condiciones vigentes y establecer presupuestos, alertas y una política de continuidad. La frontera `AiProvider`, los límites por atleta y la caché reducen exposición a consumo y dependencia, pero no eliminan el riesgo operativo de un servicio externo.

| Dimensión | Decisión verificable | Alcance y límite |
| --- | --- | --- |
| Técnica | SDK oficial aislado por `AiProvider` y JSON Schema validado con Zod. | Sustituible por adaptador; no acredita disponibilidad externa. |
| Operativa | Estado degradado y proveedor simulado sin red. | La IA no opera sin configuración; el resto del sistema sí. |
| Económica | Nivel gratuito durante el prototipo, caché y límites por atleta. | No se infieren precios ni cuotas; deben revisarse condiciones oficiales vigentes. |

La dependencia permanece también bajo control operativo mediante `AI_TIMEOUT_MS`: una solicitud externa no debe bloquear indefinidamente al atleta. La caché evita repetir peticiones para el mismo contexto, y los límites por minuto y día contienen tanto errores de uso accidental como una carga elevada durante una demostración. Tales mecanismos son controles de prototipo; para producción se requerirían métricas persistentes, alertas y una política de recuperación ante indisponibilidad.

En consecuencia, la viabilidad económica no se deduce de que exista un nivel gratuito. Depende del volumen real, del modelo finalmente elegido y de las condiciones vigentes al desplegar. La documentación oficial citada es la referencia para reevaluar ese supuesto antes de comprometer presupuesto institucional.

La eventual sustitución de proveedor exige implementar y probar un nuevo adaptador, pero no recalcular los hechos ni rediseñar las pantallas. Esa separación conserva la inversión ya realizada en dominio y contratos.

## 4.9 Consideración económica de la fase 4

Durante el prototipo se utiliza el nivel gratuito disponible del proveedor. No se consignan precios, cuotas ni proyecciones porque cambian y no fueron objeto de una contratación ni de una medición económica. Antes de cualquier despliegue deberá revisarse la documentación oficial del proveedor para confirmar modelos disponibles, límites y condiciones vigentes.

| Rubro de IA | Criterio de decisión | Estado |
| --- | --- | --- |
| Consumo del proveedor | Nivel gratuito disponible durante el prototipo | Usado sin estimar costo |
| Precio y cuota | Consulta vigente en documentación oficial | PENDIENTE antes de producción |
| Control de consumo | Límite por atleta e instancia y caché por contexto | Implementado |

La referencia del proveedor se añade al capítulo 14; no sustituye una cotización formal ni garantiza permanencia de condiciones.

## 4.10 Factibilidad de la distribución directa en la fase 5

La distribución directa del APK es factible para el alcance académico porque aprovecha herramientas ya disponibles en el equipo: JDK 21, Android SDK con plataformas 34 a 36, build-tools 37.0.0 y Gradle generado por Expo. El flujo `expo prebuild` seguido de `gradlew assembleRelease` no requiere cuentas de pago ni un servicio de compilación externo. La decisión de no emplear una tienda se documenta en el ADR 0010 y es congruente con una demostración controlada del prototipo.

Durante el prototipo no se documentó un cobro por cuenta de publicación: el archivo se compila localmente y se registra mediante la CLI del proyecto en el almacenamiento de releases existente. Ello no equivale a costo cero ni a una condición garantizada para producción: siguen pendientes las cotizaciones de servidor, transferencia, respaldo y tiempo de operación. La descarga exige aceptar la advertencia de instalación desde origen externo y la firma de depuración obliga a desinstalar antes de una futura versión firmada con una clave distinta.

La factibilidad demostrada se limita al APK, su firma, metadatos, publicación y descarga con checksum. Permanecen PENDIENTES la validación con Gemini real por falta de clave, la instalación en un dispositivo Android por ausencia de teléfono o emulador, y Google OAuth por falta de credenciales. Estas restricciones no se presentan como resultados positivos del prototipo.
