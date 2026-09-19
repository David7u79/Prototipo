# 13. Conclusiones

## 13.1 Conclusión verificable del release candidate

El objetivo general se cumplió dentro del alcance declarado: GarFit integra una API central, clientes web y móvil, landing pública, autenticación local, perfil, catálogo de movimientos, marcas, entrenamientos, WODs, historial, comparaciones, análisis con evidencia y distribución Android. La versión `0.9.0-rc.1` usa `versionCode` 6 e identificador `com.garfit.app`.

La verificación automatizada reúne 289 pruebas y ocho recorridos E2E; OpenAPI registra 35 rutas con esquema en cada respuesta 2xx. El análisis de IA se comprobó con proveedor simulado, consentimiento y evidencia de los datos utilizados. Tampoco hay evidencia para concluir rendimiento, aceptación, impacto deportivo u operación productiva.

Las limitaciones externas son precisas: falta validar Gemini con una clave real, Google OAuth con credenciales y la instalación en un dispositivo Android físico. Se describen sin ocultamiento en [Pendientes externos](PENDIENTES-EXTERNOS.md). El alcance excluye, entre otros, chat contextual, planes de entrenamiento, wearables, iOS y nutrición.

## 13.2 Aprendizajes técnicos delimitados

La separación entre API y clientes facilita asignar a cada capa una responsabilidad comprobable. Los clientes pueden mejorar experiencia y conservar sesión de acuerdo con su plataforma, mientras el servidor conserva reglas de identidad y acceso. El modelo de cuentas por proveedor permite ampliar autenticación sin crear de inicio una base de usuarios por cada proveedor. El refresh rotativo evidencia que el diseño de sesión puede incorporar respuesta a reutilización sin exponer la credencial original en la base.

La abstracción de releases muestra un patrón de evolución útil: el almacenamiento puede cambiar detrás de su contrato si conserva las garantías. El mismo principio aparece en IA: `AiProvider` aísla el proveedor de los cálculos y conserva en GarFit los hechos utilizados como evidencia. Estos aprendizajes son sobre estructura del prototipo, no sobre superioridad universal de las tecnologías elegidas.

La documentación como código añade una práctica verificable. Al derivar OpenAPI y ERD, el repositorio detecta diferencias entre fuentes y artefactos versionados. Al separar evidencia fechada de reportes regenerables, evita presentar una salida actual como si fuera resultado histórico. Este enfoque requiere disciplina de ejecución y revisión; un archivo generado correcto no sustituye la interpretación académica ni la prueba con usuarios.
