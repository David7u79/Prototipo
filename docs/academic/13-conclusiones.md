# 13. Conclusiones

## 13.1 Conclusión verificable de fase 1

La fase 1 deja una base técnica comprobable: API central, clientes web y móvil, landing pública, autenticación local y Google condicionada a configuración, perfil deportivo, releases Android por CLI y documentación generada. Las pruebas registradas demuestran los conjuntos automatizados ejecutados en el worktree, incluidos casos de sesión, perfil, releases y contratos.

La conclusión se restringe a esos hechos. El modelo aún no contiene entrenamientos, resultados, marcas personales, estadísticas ni asistente de IA funcional. Tampoco hay evidencia para concluir rendimiento, aceptación, impacto deportivo u operación productiva. Mantener estos límites explícitos es necesario para que el resultado académico sea verificable.

> **PENDIENTE:** conclusiones finales sustentadas en evaluación, resultados de usuario y revisión de asesoría; responsable: tesista y asesoría.

## 13.2 Aprendizajes técnicos delimitados

La separación entre API y clientes facilita asignar a cada capa una responsabilidad comprobable. Los clientes pueden mejorar experiencia y conservar sesión de acuerdo con su plataforma, mientras el servidor conserva reglas de identidad y acceso. El modelo de cuentas por proveedor permite ampliar autenticación sin crear de inicio una base de usuarios por cada proveedor. El refresh rotativo evidencia que el diseño de sesión puede incorporar respuesta a reutilización sin exponer la credencial original en la base.

La abstracción de releases muestra un patrón de evolución útil: la primera implementación local cumple el contrato y las pruebas de ruta; una implementación de objetos puede cambiar detrás de la misma interfaz si conserva las garantías. El mismo principio aparece en IA: definir la frontera antes del proveedor evita mezclar una integración futura con endpoints actuales. Estos aprendizajes son sobre estructura del prototipo, no sobre superioridad universal de las tecnologías elegidas.

La documentación como código añade una práctica verificable. Al derivar OpenAPI y ERD, el repositorio detecta diferencias entre fuentes y artefactos versionados. Al separar evidencia fechada de reportes regenerables, evita presentar una salida actual como si fuera resultado histórico. Este enfoque requiere disciplina de ejecución y revisión; un archivo generado correcto no sustituye la interpretación académica ni la prueba con usuarios.
