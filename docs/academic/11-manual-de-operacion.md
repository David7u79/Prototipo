# 11. Manual de operación

## 11.1 Requisitos e instalación

Instale Node >=22.12, pnpm 11.20 y Docker con PostgreSQL disponible. En la raíz ejecute pnpm install, pnpm db:up y pnpm db:migrate. No versionar archivos .env. API usa DATABASE_URL, TEST_DATABASE_URL, JWT_ACCESS_SECRET, CORS_ORIGINS, GOOGLE_WEB_CLIENT_ID, GOOGLE_EXTRA_AUDIENCES, GEMINI_API_KEY y GEMINI_MODEL. Landing usa PUBLIC_WEB_APP_URL y PUBLIC_API_URL. Móvil usa EXPO_PUBLIC_API_URL y EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID; variables EXPO_PUBLIC se incluyen en el bundle y no deben contener secretos.

## 11.2 Ejecución y base

Después de iniciar PostgreSQL, ejecute pnpm db:migrate para aplicar migraciones y pnpm dev para servicios del monorepo. API escucha 4000, web 3000, landing 4321 y Expo 8081; PostgreSQL escucha 5442. Swagger se habilita con SWAGGER_ENABLED=true y se sirve desde la API según setup-app.ts. Si 5442 está ocupado, identifique el proceso o cambie el mapeo de Docker y actualice DATABASE_URL y TEST_DATABASE_URL de forma consistente; no reutilice una base de producción para pruebas.

## 11.3 APK y Android

Con API compilable y base disponible, publique mediante:

    pnpm --filter @garfit/api release:publish -- --file ruta/app.apk --version 1.0.0 --version-code 1 --changelog "Cambios"

Agregue --draft para no publicar. La landing sólo muestra publicadas. Para Google, cree y configure el cliente web, autorice http://localhost:3000 y defina GOOGLE_WEB_CLIENT_ID; agregue audiencias Android en GOOGLE_EXTRA_AUDIENCES cuando aplique. No se usa client secret. Google móvil requiere Development Build: ejecute pnpm --filter @garfit/mobile prebuild y después pnpm --filter @garfit/mobile android, no Expo Go.

## 11.4 Diagnóstico

Si Prisma no conecta, confirme contenedor, puerto y URL. Si migraciones fallan, no borre datos sin respaldo; revise la URL y el estado de PostgreSQL. Si Google aparece desactivado, confirme que el client ID se definió en API y móvil. Si el emulador no conecta, use http://10.0.2.2:4000; en dispositivo físico use IP LAN. Si una APK no aparece, compruebe que no se publicó con --draft y que su archivo permanece en el almacenamiento configurado.

## 11.5 Procedimiento de verificación local

Antes de ejecutar pruebas API, confirme que las variables apuntan a bases diferentes: DATABASE_URL identifica garfit y TEST_DATABASE_URL identifica garfit_test. Inicie la infraestructura con pnpm db:up y aplique las migraciones. Ejecute pnpm test dentro de apps/api; el proceso reinicia datos de la base de prueba. No use una URL de producción ni claves de usuario reales durante esta operación.

Para verificar el contrato documental desde la raíz, ejecute node scripts/docs/generate.mjs y después node scripts/docs/generate.mjs --check. El primer comando genera OpenAPI, ERD, TypeDoc, resumen de cobertura disponible e información de compilación. El segundo falla si OpenAPI o ERD versionados ya no coinciden con las fuentes. Revise los cambios antes de versionarlos; la generación no autoriza aceptar una diferencia sin entenderla.

Para trabajar sólo con la web, levante API y ejecute el script dev de apps/web. Abra la aplicación en localhost:3000, registre una cuenta de prueba y complete perfil. Para landing, ejecute su dev y abra localhost:4321; si no hay una release publicada, el resultado esperado es que no se ofrezca descarga. Para móvil, defina EXPO_PUBLIC_API_URL antes de crear el bundle: una dirección localhost no llega directamente a un teléfono físico.

## 11.6 Protección de configuración

JWT_ACCESS_SECRET debe tener longitud suficiente y ser distinto en cada entorno. GOOGLE_WEB_CLIENT_ID es identificador público de OAuth, pero GEMINI_API_KEY no debe aparecer en variables EXPO_PUBLIC ni PUBLIC. CORS_ORIGINS debe contener sólo orígenes permitidos. RELEASES_STORAGE_DIR debe apuntar a un directorio controlado; la aplicación valida claves relativas, pero el operador sigue siendo responsable de permisos y respaldos del directorio.

## 11.7 Operación de autenticación

Para probar cuenta local desde la web, abra la ruta de registro y use una dirección de prueba. La API normaliza el correo y rechaza una segunda cuenta con la misma dirección aunque cambie la capitalización. Después del registro, complete el perfil desde la zona protegida. Cierre sesión y confirme que la ruta protegida redirige al login. Estas operaciones no requieren una cuenta Google ni una APK publicada.

Para habilitar Google, configure primero API y móvil con los identificadores correctos. La API informa proveedores mediante auth/providers; si el valor de Google está desactivado, no intente diagnosticar la interfaz antes de revisar GOOGLE_WEB_CLIENT_ID. El servidor comprueba que el correo de identidad esté verificado. No agregue un client secret al repositorio, a la aplicación web ni a la aplicación móvil; el flujo descrito usa sólo ID token y verificación de servidor.

Las cookies web deben evaluarse en el dominio y protocolo finales. En desarrollo localhost permite observar el flujo, pero una implementación productiva debe configurar HTTPS y orígenes CORS específicos. Si una acción de servidor recibe un error de API, revise primero estado de servicio, URL de API y cookie. No registre el valor de accessToken o refreshToken en consola, capturas o evidencia.

## 11.8 Operación de releases

Antes de publicar, compruebe que el archivo señalado por --file es una APK preparada para el canal que se desea distribuir. Seleccione una versión SemVer y version-code que no existan para Android; esas combinaciones son únicas en la base. El changelog debe describir cambios reales y no debe contener secretos. El comando almacena el archivo bajo una clave relativa; no edite filePath directamente en la base.

Después de publicar sin --draft, consulte el endpoint latest/android o la página de descarga. Compare el checksum de cabecera con el registrado al publicar si el procedimiento de distribución exige verificación. Si la consulta responde que no hay release, revise published, publishedAt, plataforma y versionCode en los metadatos antes de repetir la carga. No exponga el directorio de almacenamiento como carpeta pública para eludir el endpoint: eso anula la regla de borradores y el contrato de descarga.

Si se necesita reemplazar almacenamiento local por otro proveedor, implemente ReleaseStorage y ejecute las pruebas de contrato de rutas antes de cambiar configuración. No basta con copiar archivos: la implementación debe conservar validación de claves, lectura segura, tamaño y comportamiento ante ausencia. Conserve una copia recuperable antes de modificar almacenamiento o migraciones.
