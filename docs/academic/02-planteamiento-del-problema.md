# 2. Planteamiento del problema

## 2.1 Situación

El seguimiento deportivo individual requiere conservar información asociada a una persona a través del tiempo. Antes de registrar resultados o producir análisis, una solución necesita identificar al usuario, proteger su sesión, aislar sus datos y contar con un perfil que contextualice experiencia y objetivo. GarFit resuelve estas condiciones fundacionales; no afirma todavía resolver el seguimiento completo de entrenamientos.

El problema aumenta cuando la misma persona usa web y móvil. Si cada cliente interpretara identidad y validación por su cuenta, podrían existir cuentas duplicadas, reglas distintas o secretos expuestos. Por ello se concentra persistencia y autenticación en NestJS/PostgreSQL y se comparten contratos. El servidor vuelve a validar su frontera: una validación de interfaz no equivale a autorización.

## 2.2 Pregunta de trabajo

La pregunta inicial de la fase fue: ¿cómo construir una base web y móvil para seguimiento individual deportivo que autentique usuarios, conserve un perfil y distribuya una versión Android con contratos y decisiones de seguridad consistentes? Al cierre, esa base se extendió con movimientos, marcas, entrenamientos, WODs y análisis con evidencia; la respuesta se verifica con pruebas de integración contra PostgreSQL, pruebas unitarias de paquetes, recorridos E2E y artefactos generados desde código.

La formulación no permite inferir satisfacción, rendimiento físico, aceptación de una población ni eficacia de recomendaciones. El repositorio no contiene encuestas, datos de participantes ni experimentos; por tanto, ninguna de esas conclusiones se deduce de la implementación.

## 2.3 Riesgos atendidos y límites

Sin una frontera común, los clientes podrían divergir en normalización de correo y sesiones. Sin refresh rotativo, un token reutilizado conservaría utilidad. Sin publicación controlada, una ruta HTTP administrativa ampliaría la superficie de ataque. La solución usa API central, hash SHA-256 de refresh tokens, revocación ante reutilización y publicación por CLI.

`apps/api/test/auth.spec.ts`, `google-auth.spec.ts` y `profile.spec.ts` verifican identidad y perfil contra PostgreSQL de prueba. `releases.spec.ts` y `local-release-storage.spec.ts` verifican releases y contención de rutas. Los conteos fechados están en [evidence/fase-1](../evidence/fase-1/).

> **PENDIENTE:** evidencia de necesidades, problemas observados, población e instrumentos; responsable: tesista.

## 2.4 Alcance del problema técnico

La identidad es un requisito previo de toda información personal posterior. El correo se normaliza para que variantes de capitalización no creen sujetos diferentes. La relación User/AuthAccount permite tratar la cuenta local y Google como credenciales de un mismo usuario, en lugar de modelar dos personas por proveedor. Esta decisión es relevante porque el problema no es sólo iniciar sesión, sino conservar propiedad estable cuando cambian las formas de autenticarse.

La sesión tiene dos duraciones y finalidades. El acceso permite autorizar operaciones de corta duración; el refresh permite solicitar una nueva sesión sin guardar una contraseña en el dispositivo. Si ambos fueran indistinguibles, un token de larga duración tendría mayor exposición. La base persiste sólo hash del refresh y estado de revocación. Esta respuesta no evita toda pérdida de credenciales, pero hace comprobable una regla de renovación y reutilización.

El perfil responde a una necesidad de contexto mínima. No intenta diagnosticar condición física, registrar historia médica ni deducir capacidad. Sus enumeraciones limitan la información a experiencia y objetivo. La elección protege el alcance: una fase posterior necesitará justificar qué nuevas variables captura y por qué son necesarias para una función determinada.

El problema de distribución es independiente del dominio deportivo, pero condiciona la disponibilidad de móvil. Una APK debe tener versión, código de orden, tamaño, checksum y estado de publicación. Exponer una carpeta del servidor como descarga sin metadatos no permite distinguir borradores ni verificar qué versión corresponde a un enlace. La solución mantiene esa información en AppRelease y limita la escritura a una utilidad de operador.

## 2.5 Criterios de no solución

No se considera resuelto el problema de seguimiento sólo porque haya autenticación y perfil. No hay modelo para series, repeticiones, carga, duración, fechas de entrenamiento o marcas. En consecuencia, no existe una consulta de progreso ni una recomendación que utilice esos datos. Esta precisión evita que la frase “seguimiento deportivo” se interprete como una afirmación de características ausentes.

Tampoco se considera resuelta la gobernanza de datos. El hecho de usar hash de contraseñas y almacenamiento de sesión reduce riesgos técnicos concretos, pero faltan políticas de retención, derechos de titulares, gestión de incidentes y revisión legal. La fase entrega una base para discutirlos, no un cumplimiento certificado.
