# Guion de demostración de GarFit

La demostración dura aproximadamente diez minutos. Antes de abrir el navegador, prepare un estado
repetible en una terminal. Nunca escriba una contraseña real en la pantalla ni en este documento.

```sh
pnpm db:up
DEMO_USER_EMAIL=demo@garfit.example DEMO_USER_PASSWORD=<contraseña-demo> pnpm --filter @garfit/api demo:reset
AI_PROVIDER=fake pnpm dev:api
pnpm dev:web
pnpm dev:landing
```

Si Gemini no tiene una clave configurada, mantenga `AI_PROVIDER=fake`: el análisis usa hechos
calculados por GarFit y queda persistido localmente para el recorrido.

| Tiempo | Qué se enseña | Qué se dice y qué debe verse |
| --- | --- | --- |
| 0:00–0:40 | Landing | “GarFit concentra registro, evolución y explicación.” Muestre el acceso web y la descarga Android. |
| 0:40–1:20 | Registro o inicio de sesión | Inicie sesión con la cuenta preparada. Indique que la contraseña no se muestra ni se guarda en el guion. |
| 1:20–1:50 | Perfil | Muestre Atleta demo, nivel intermedio, objetivo de fuerza y unidades métricas. |
| 1:50–2:25 | Catálogo de movimientos | Busque sentadilla con barra; explique que el catálogo normaliza movimientos y tipos de marca. |
| 2:25–3:05 | Marca personal | Abra la marca manual de press de banca de 82.5 kg y su fecha; señale la trazabilidad manual. |
| 3:05–3:55 | Entrenamiento | Abra una sesión completada de sentadilla y sus series estructuradas. |
| 3:55–4:25 | Marca automática | Muestre la marca derivada de 110 kg; explique que aparece al completar el entrenamiento y no se captura dos veces. |
| 4:25–5:15 | WOD | Abra Fran y sus tres ejecuciones. Deben verse 5:30, 5:06 y 4:48. |
| 5:15–5:55 | Comparación | En rendimiento de Fran, señale mejor 4:48 y la mejora respecto a 5:06. |
| 5:55–6:45 | Análisis de IA | Abra el análisis de progreso y aclare que el proveedor fake interpreta datos ya calculados por GarFit. |
| 6:45–7:25 | Evidencia del análisis | Muestre las observaciones, sugerencias y evidencia enlazada a hechos deportivos. |
| 7:25–7:55 | Historial de análisis | Abra el historial: debe existir al menos un análisis persistido. |
| 7:55–8:35 | Descarga Android | Desde la landing, muestre el APK publicado, versión y checksum SHA-256. |
| 8:35–10:00 | Arquitectura | Cierre con clientes web/móvil/landing, API NestJS, paquetes de dominio y PostgreSQL; destaque que los cálculos viven en GarFit. |

Al mostrar estadísticas, confirme que la comparación de periodos contiene sesiones tanto en la
ventana actual como en la anterior. La semilla incluye ambas para evitar una gráfica vacía.
