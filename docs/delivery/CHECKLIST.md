# Lista final de comprobación

- [x] El código, la documentación académica y la matriz de trazabilidad están incluidos en el repositorio.
- [x] El manual de operación y los diagramas de arquitectura están enlazados desde la entrega.
- [x] La evidencia automatizada y las capturas se conservan en `docs/evidence/`.
- [x] La versión del release candidate procede de la fuente única `package.json` y puede comprobarse con `pnpm version:check`.
- [x] La entrega señala los pendientes externos de Gemini, Google OAuth y Android físico.
- [ ] Datos del alumno: corresponde a la persona tesista.
- [ ] Autorización institucional: corresponde a la persona responsable ante la institución.
- [ ] Validación o firma de asesoría: corresponde a asesoría y a la persona tesista.

## Comprobaciones que GarFit puede realizar por sí mismo

Las marcas de este bloque corresponden a evidencia disponible o verificaciones que
puede ejecutar quien prepare el entorno. No sustituyen servicios externos ni trámites.

- [x] Dependencias y versión declaradas: `pnpm install --frozen-lockfile` usa `pnpm-lock.yaml`, y `pnpm version:check` comprueba `package.json`.
- [x] Base y catálogo reproducibles: `pnpm db:up`, `pnpm db:migrate` y `pnpm db:seed` están en el manual, secciones 11.1–11.3.
- [x] Validación estática disponible: `pnpm lint` y `pnpm typecheck` verifican el monorepo.
- [x] Pruebas automatizadas localizables: `pnpm test` ejecuta `apps/api/test/`, `packages/*/src/*.test.ts` y pruebas web.
- [x] Cobertura regenerable: `pnpm test:coverage` produce `docs/generated/coverage/SUMMARY.md`.
- [x] E2E reproducibles: `pnpm evidence:web` ejecuta Playwright en `apps/web/e2e/`; puede requerir `pnpm exec playwright install chromium`.
- [x] Capturas históricas disponibles: `docs/evidence/fase-2/capturas/` a `docs/evidence/fase-5/capturas/` conservan cortes visuales.
- [x] Informes por fase disponibles: `docs/evidence/fase-N/pruebas-AAAA-MM-DD.md` identifica resultado y alcance.
- [x] OpenAPI verificable: `pnpm docs:check` revisa `docs/generated/openapi/`, y `pnpm docs:check-openapi` revisa esquemas 2xx.
- [x] ERD verificable: `pnpm docs:check` comprueba `docs/generated/database/erd.svg` contra el modelo.
- [x] Corte de compilación disponible: `docs/generated/BUILD_INFO.md` registra entorno, commit, migración y versiones.
- [x] Documentación localizada: `docs/academic/`, `docs/architecture/`, `docs/adr/`, `docs/TRACEABILITY.md` y `docs/delivery/README.md`.
- [x] Manual disponible: `docs/academic/11-manual-de-operacion.md` contiene preparación, uso y comprobación de descarga.
- [x] Código compilable: `pnpm build` compila aplicaciones y paquetes desde la raíz.
- [x] APK trazable: `docs/evidence/fase-5/distribucion-android.md` conserva compilación, publicación, descarga e integridad históricas.
- [x] Checksum verificable: `Get-FileHash .\nombre-del-archivo.apk -Algorithm SHA256` permite contrastar el hash publicado; `release:publish` lo calcula sobre el archivo real.
- [x] Manifiesto verificable: `package.json` es fuente de versión y `androidVersionCode`; `pnpm version:check` comprueba su propagación.
- [x] Límites externos documentados: `docs/academic/PENDIENTES-EXTERNOS.md` separa Gemini, OAuth y Android físico.

## Comprobaciones administrativas que corresponden a la persona responsable

Estas casillas siguen sin marcar: no son propiedades del código ni pueden demostrarse
con un comando del repositorio. Deben completarse con evidencia institucional.

- [ ] Datos del alumno o autora/or: requieren identidad y datos aprobados por la persona tesista; el repositorio no debe inventarlos.
- [ ] Modalidad, programa y número de control: requieren constancia académica vigente, a la que GarFit no tiene acceso.
- [ ] Autorización o registro del proyecto: requiere acto institucional y documento firmado; las pruebas no lo sustituyen.
- [ ] Nombre y aceptación de asesoría: requieren confirmación de asesoría y coordinación; no se atribuye una aprobación inexistente.
- [ ] Fecha, sede y modalidad de presentación: las fija la institución o el órgano evaluador, no el manifiesto de software.
- [ ] Integración del sínodo y firmas: requieren designación y presencia de participantes; la matriz técnica sólo prepara evidencia.
- [ ] Aviso de privacidad, consentimiento institucional y revisión legal: requieren responsables y criterio institucional; el estudio los declara pendientes.
- [ ] Credencial autorizada para Gemini: requiere una `GEMINI_API_KEY`; sin ella `pnpm test:gemini` no acredita llamada real.
- [ ] Credenciales y configuración de Google OAuth: requieren clientes, orígenes y audiencias de Google; pruebas simuladas no equivalen a aprobación.
- [ ] Dispositivo o emulador Android final: requiere hardware o infraestructura y una URL alcanzable; el proyecto acredita APK y checksum, no instalación no realizada.
