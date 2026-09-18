# 3. Objetivos

## 3.1 Objetivo general

Construir el prototipo GarFit como sistema web y móvil para seguimiento individual deportivo, con autenticación, perfil de atleta, movimientos, marcas, entrenamientos, WODs, análisis con evidencia, distribución controlada de una aplicación Android y API central verificable. El objetivo se acredita dentro del alcance funcional congelado en el release candidate; no presupone validación clínica, impacto deportivo, operación productiva ni disponibilidad de proveedores externos.

## 3.2 Objetivos específicos

### 3.2.1 Identidad y sesión

Implementar registro e inicio de sesión local y autenticación Google mediante ID token verificado por servidor. La solución normaliza correo, no expone hashes y emite JWT de acceso junto con refresh opaco. Las pruebas cubren credenciales, protección de recursos, renovación, expiración y cierre.

### 3.2.2 Perfil deportivo

Permitir crear, consultar y actualizar un perfil propio con nombre visible, experiencia y objetivo principal. El perfil debe estar aislado entre usuarios. `ProfileController` y `profile.spec.ts` aportan implementación y evidencia.

### 3.2.3 Contratos y clientes

Proveer API NestJS, web Next.js, móvil Expo y landing Astro con tipos, validación y cliente API compartidos cuando corresponde. El servidor mantiene DTO y validación propios para no confiar en clientes modificables.

### 3.2.4 APK e IA

Permitir que un operador publique por CLI una APK con versión, código y changelog, y que los clientes descarguen sólo una publicación válida. Proporcionar análisis de IA con consentimiento, hechos deterministas y evidencia, sin claves en clientes; la integración real con Gemini requiere una clave externa y no se declara verificada sin ella.

> **PENDIENTE:** criterios académicos, instrumentos y umbrales para evaluar el objetivo general; responsable: tesista y asesoría.

## 3.3 Relación entre objetivos y productos

El objetivo de identidad se relaciona con los módulos auth, Prisma y las entidades User, AuthAccount y Session. Su producto visible no es sólo una pantalla de login: es un conjunto de endpoints y reglas que comparten los clientes. El objetivo de perfil se relaciona con AthleteProfile y una interfaz protegida. El objetivo de distribución enlaza CLI, AppRelease, almacenamiento y una consulta pública. Cada objetivo tiene por tanto un límite técnico que puede revisarse.

El objetivo de contratos evita que web, móvil y landing inventen sus propias formas de interpretar una respuesta. types declara interfaces, validation expone restricciones de interfaz y api-client concentra la traducción de HTTP a valores o errores. Esta coordinación no convierte los paquetes en autoridad; el objetivo también exige que API aplique validadores propios. La arquitectura busca consistencia sin confundir reutilización con confianza.

El objetivo de IA se implementa mediante `AiProvider`, que separa los controladores de dominio de Gemini. El proveedor simulado permitió verificar consentimiento, contexto, evidencia, historial y presentación sin red. El criterio de logro cubre ese recorrido reproducible y la protección de secretos; no acredita una respuesta de Gemini real, que permanece pendiente de credencial.

## 3.4 Exclusiones del objetivo

No se incluyen objetivos de monetización, administración de gimnasio, marketplace, clasificación social ni integración de dispositivos. Tampoco se establece un objetivo de predicción deportiva o diagnóstico. Añadirlos requeriría alcance, datos, riesgos y validación distintos. Esta exclusión conserva la coherencia entre objetivo general, requisitos disponibles y evidencia ejecutada.
