# 1. Descripción del proyecto

## 1.1 Propósito y naturaleza

GarFit es un prototipo académico de Ingeniería en Computación orientado al seguimiento individual de atletas. Su lema, «Entrena · Registra · Evoluciona», expresa una finalidad de producto: concentrar información de entrenamiento, marcas personales y evolución para que una persona pueda revisarla. Esta afirmación debe leerse junto con el alcance real de la primera fase; no declara que todos esos dominios estén implementados.

El release candidate de la fase 6 construye una base técnica de identidad, sesión, perfil deportivo, catálogo de movimientos, marcas, entrenamientos, WODs, análisis con evidencia y distribución controlada de APK Android. El repositorio contiene una landing pública, una aplicación web, una aplicación móvil y una API central. El flujo disponible permite pasar de la landing a la web, registrarse o iniciar sesión, crear o editar el perfil y operar las funciones deportivas descritas en este documento.

## 1.2 Alcance realizado

La API permite registro e inicio de sesión local, renovación y cierre de sesión. Cuando existe configuración del servidor, acepta un ID token de Google y verifica la identidad fuera del cliente. Una sesión autenticada permite crear, consultar y actualizar un perfil, movimientos, marcas, entrenamientos, WODs y análisis. Estas responsabilidades se encuentran en los módulos correspondientes de `apps/api/src`.

La distribución Android se resuelve como una operación técnica controlada. Un operador ejecuta `pnpm --filter @garfit/api release:publish`; el servicio conserva los metadatos de la versión y expone sólo la versión publicada más reciente y su descarga. El archivo binario no se guarda en PostgreSQL: `ReleaseStorage` define el contrato y `LocalReleaseStorage` es la implementación actual. La landing consulta el endpoint público para mostrar la descarga.

## 1.3 Límites de la fase

Las afirmaciones de alcance de las fases iniciales se conservan como antecedente, pero no describen el cierre actual. El dominio y la persistencia de catálogo, marcas, entrenamientos, WODs, historial, estadísticas, evolución y análisis con evidencia están implementados y verificados con proveedor simulado. La validación real de Gemini, Google OAuth y la instalación en Android físico permanecen como pendientes externos, detallados en [Pendientes externos](PENDIENTES-EXTERNOS.md).

GarFit tampoco es un sistema de gestión de gimnasios. Quedan fuera de alcance membresías, pagos, facturación, reservaciones, clases, coaches, punto de venta, inventario, torniquetes, biometría, leaderboards públicos, operación multi-gimnasio y SaaS. Esta exclusión evita atribuir al prototipo obligaciones comerciales o financieras que el código no atiende.

## 1.4 Actores y entregables

El atleta es el actor directo: se identifica y conserva su perfil básico. El operador técnico publica APK por línea de comandos. La persona visitante consulta la landing sin autenticarse. La API constituye la frontera común de confianza; por eso las reglas de persistencia, identidad y autorización no se delegan a web ni a móvil.

Los entregables técnicos son `apps/api` (NestJS y Prisma), `apps/web` (Next.js), `apps/mobile` (Expo/React Native), `apps/landing` (Astro) y los paquetes `types`, `validation`, `api-client` y `config`. OpenAPI, el ERD y TypeDoc se generan desde fuentes de código. La relación comprobable entre requerimientos y pruebas está en [TRACEABILITY](../TRACEABILITY.md).

> **PENDIENTE:** levantamiento de necesidades, población, instrumento y análisis de usuarios; responsable: tesista.

## 1.5 Enfoque de documentación

El documento se organiza para distinguir fuente manual, fuente generada y evidencia. Los capítulos académicos describen intención, alcance y decisiones; architecture explica flujos y contenedores; ADR conserva motivos de decisiones; y TRACEABILITY enlaza requisitos con rutas y pruebas. OpenAPI se genera desde la aplicación NestJS, el ERD desde Prisma y TypeDoc desde paquetes. Esta separación permite actualizar un artefacto desde código sin reescribir una interpretación académica.

La documentación manual no reemplaza el código. Cuando existe discrepancia, schema.prisma define datos, controladores definen rutas y las pruebas muestran los escenarios automatizados. La documentación usa enlaces a esas fuentes para que una revisión pueda seguir la afirmación hasta una implementación. Donde no hay fuente ni evidencia, se usa un bloque PENDIENTE con la persona responsable en lugar de completar el texto con una suposición.

El prototipo se mantiene como base de investigación e ingeniería. Su evolución debe preservar esta disciplina: agregar una pantalla no basta para declarar una capacidad; se requieren requisitos, modelo de datos, reglas de autorización, pruebas y evidencia de resultado. Esa regla es especialmente relevante para funciones que tratan hábitos, información sensible o recomendaciones.
