# 4. Estudio de factibilidad

## 4.1 Técnica

La implementación es reproducible localmente con Node.js, pnpm, PostgreSQL y un monorepo TypeScript. NestJS, Prisma y PostgreSQL proporcionan la capa API; Next.js sirve la web, Astro la landing y Expo/React Native el móvil. PostgreSQL de desarrollo escucha en 5442 y los casos de integración usan `garfit_test`. Las versiones declaradas se registran en el capítulo 8.

`ReleaseStorage` desacopla metadatos de releases de archivos. Los paquetes compartidos disminuyen repetición. OpenAPI, ERD y TypeDoc se derivan desde código. No hay proveedor Gemini funcional, almacenamiento de objetos configurado ni pruebas e2e móviles; Google OAuth depende de configuración y Development Build.

## 4.2 Operativa

El equipo técnico instala dependencias, inicia PostgreSQL, aplica migraciones y levanta las aplicaciones con comandos reproducibles. Debe definir variables sin versionar secretos y publicar una APK desde un equipo con acceso al archivo y a la base. Para el atleta, el uso de fase 1 se reduce a registro, sesión y perfil.

No se demuestra operación productiva: faltan roles administrativos, respaldo, observabilidad, recuperación de contraseña, verificación de correo, avisos de privacidad y soporte. El manual es de desarrollo, no de operación institucional.

## 4.3 Económica

No se calculan montos sin cotizaciones ni horizonte de despliegue.

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

## 4.8 Consideración económica de la fase 4

Durante el prototipo se utiliza el nivel gratuito disponible del proveedor. No se consignan precios, cuotas ni proyecciones porque cambian y no fueron objeto de una contratación ni de una medición económica. Antes de cualquier despliegue deberá revisarse la documentación oficial del proveedor para confirmar modelos disponibles, límites y condiciones vigentes.

| Rubro de IA | Criterio de decisión | Estado |
| --- | --- | --- |
| Consumo del proveedor | Nivel gratuito disponible durante el prototipo | Usado sin estimar costo |
| Precio y cuota | Consulta vigente en documentación oficial | PENDIENTE antes de producción |
| Control de consumo | Límite por atleta e instancia y caché por contexto | Implementado |

La referencia del proveedor se añade al capítulo 14; no sustituye una cotización formal ni garantiza permanencia de condiciones.
