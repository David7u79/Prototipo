# 3. Objetivos

## 3.1 Objetivo general

Construir la primera fase del prototipo GarFit como base web y móvil para seguimiento individual deportivo, con autenticación, perfil de atleta, distribución controlada de una aplicación Android y una API central verificable. Este objetivo se limita al alcance implementado y no presupone movimientos, entrenamientos, resultados ni análisis de rendimiento terminados.

## 3.2 Objetivos específicos

### 3.2.1 Identidad y sesión

Implementar registro e inicio de sesión local y autenticación Google mediante ID token verificado por servidor. La solución normaliza correo, no expone hashes y emite JWT de acceso junto con refresh opaco. Las pruebas cubren credenciales, protección de recursos, renovación, expiración y cierre.

### 3.2.2 Perfil deportivo

Permitir crear, consultar y actualizar un perfil propio con nombre visible, experiencia y objetivo principal. El perfil debe estar aislado entre usuarios. `ProfileController` y `profile.spec.ts` aportan implementación y evidencia.

### 3.2.3 Contratos y clientes

Proveer API NestJS, web Next.js, móvil Expo y landing Astro con tipos, validación y cliente API compartidos cuando corresponde. El servidor mantiene DTO y validación propios para no confiar en clientes modificables.

### 3.2.4 APK e IA

Permitir que un operador publique por CLI una APK con versión, código y changelog, y que los clientes descarguen sólo una publicación válida. Definir además un proveedor de IA sin claves en clientes que actualmente responde como no implementado; la frontera no constituye un asistente operativo.

> **PENDIENTE:** criterios académicos, instrumentos y umbrales para evaluar el objetivo general; responsable: tesista y asesoría.

## 3.3 Relación entre objetivos y productos

El objetivo de identidad se relaciona con los módulos auth, Prisma y las entidades User, AuthAccount y Session. Su producto visible no es sólo una pantalla de login: es un conjunto de endpoints y reglas que comparten los clientes. El objetivo de perfil se relaciona con AthleteProfile y una interfaz protegida. El objetivo de distribución enlaza CLI, AppRelease, almacenamiento y una consulta pública. Cada objetivo tiene por tanto un límite técnico que puede revisarse.

El objetivo de contratos evita que web, móvil y landing inventen sus propias formas de interpretar una respuesta. types declara interfaces, validation expone restricciones de interfaz y api-client concentra la traducción de HTTP a valores o errores. Esta coordinación no convierte los paquetes en autoridad; el objetivo también exige que API aplique validadores propios. La arquitectura busca consistencia sin confundir reutilización con confianza.

El objetivo de IA es preparatorio. AiProvider introduce una dependencia invertida para que controladores de dominio no dependan directamente de Gemini. La implementación que rechaza la operación es una decisión explícita: permite incluir el límite de secreto y la forma de extensión sin simular respuestas inteligentes. El criterio de logro para esta fase es que la frontera existe y no entrega claves a clientes, no que genere análisis.

## 3.4 Exclusiones del objetivo

No se incluyen objetivos de monetización, administración de gimnasio, marketplace, clasificación social ni integración de dispositivos. Tampoco se establece un objetivo de predicción deportiva o diagnóstico. Añadirlos requeriría alcance, datos, riesgos y validación distintos. Esta exclusión conserva la coherencia entre objetivo general, requisitos disponibles y evidencia ejecutada.
