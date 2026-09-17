# 0010 Distribución directa del APK de Android

Estado: Aceptado (fase 5)

## Contexto

GarFit es un prototipo académico de titulación. Hasta la fase 4 la aplicación móvil sólo se
comprobaba con `expo export --platform android`, que demuestra que el bundle se genera pero no
produce nada instalable. Para defender el trabajo hace falta que cualquiera —el sínodo, un
compañero— pueda descargar la aplicación y verla funcionando en un teléfono.

Las opciones eran publicar en Google Play, usar el servicio de compilación en la nube de Expo
(EAS Build) o compilar en local y distribuir el APK desde la propia infraestructura de GarFit, que
ya tiene un modelo `AppRelease`, un almacenamiento de releases y endpoints de descarga desde la
fase 1.

## Decisión

1. **Distribución directa del APK, sin Google Play.** Play exige cuenta de desarrollador de pago,
   revisión, política de privacidad publicada y un compromiso de mantenimiento que un prototipo
   académico no puede sostener. La descarga directa desde la landing es suficiente para demostrar
   el producto y mantiene el control del proyecto.
2. **Compilación local con Gradle, no EAS Build.** El equipo ya tiene instalado el SDK de Android
   (plataformas 34 a 36, build-tools y NDK) y JDK 21, así que `expo prebuild` más
   `gradlew assembleRelease` produce el APK sin cuentas externas, sin cola de espera y sin
   depender de un servicio de terceros. EAS queda como alternativa documentada si algún día hace
   falta compilar desde una máquina sin herramientas.
3. **Proyecto nativo generado, no versionado.** `apps/mobile/android` lo genera `expo prebuild` y
   está en `.gitignore`: la configuración vive en `app.json` (flujo CNG de Expo) y el directorio
   nativo es un artefacto reproducible, no código fuente que mantener a mano.
4. **Una sola fuente para la versión.** `app.json` define `expo.version` (`0.5.0`, SemVer) y
   `expo.android.versionCode` (`5`, entero creciente). El prebuild los copia a `build.gradle` como
   `versionName` y `versionCode`, y son los mismos valores que recibe la CLI de publicación. No se
   escriben versiones a mano en ningún otro sitio.
5. **Identificador `com.garfit.app`.** Es neutral y ya estaba en el proyecto. No se usa un
   identificador institucional (`mx.edu.uatx.*`) porque GarFit no es una aplicación oficial de la
   Universidad Autónoma de Tlaxcala y un identificador así lo daría a entender.
6. **Firma con el keystore de depuración que genera el prebuild.** Es el comportamiento por
   defecto de la plantilla de Expo y basta para instalar fuera de Play. No se crea un keystore de
   publicación porque no hay nada que publicar en una tienda y una clave de firma real es un
   secreto que habría que custodiar. Ni el keystore ni ninguna contraseña entran en Git: viven en
   el directorio nativo ignorado. Cuando GarFit necesite actualizaciones sobre instalaciones
   existentes, habrá que generar un keystore propio y guardarlo fuera del repositorio.
7. **Publicación sólo por la CLI existente.** `pnpm --filter @garfit/api release:publish` copia el
   APK al almacenamiento de releases y registra `AppRelease` calculando el SHA-256 y el tamaño a
   partir del fichero real. No hay endpoint HTTP de publicación y nunca se inserta una release a
   mano en la base de datos: el checksum que se publica es siempre el del archivo servido.
8. **El APK no se versiona en Git.** `storage/releases/android/` está ignorado salvo su
   `.gitkeep`. Un binario de decenas de megabytes por versión haría crecer el repositorio sin
   aportar nada: el artefacto se reconstruye desde el código y su integridad se comprueba con el
   checksum registrado.
9. **Descarga estable además de la versionada.** `GET /releases/android/latest/download` resuelve
   la última versión publicada y sirve el archivo, junto a la descarga por versión que ya existía.
   El código QR de la landing apunta a esa URL estable para que no caduque con cada publicación,
   mientras que la descarga por versión permite recuperar una concreta.

## Consecuencias

- Cualquiera puede instalar GarFit desde la landing, a cambio de aceptar la advertencia de Android
  sobre aplicaciones de origen externo, que el manual explica.
- Al firmar con el keystore de depuración, las instalaciones no son actualizables desde una futura
  versión firmada de otro modo: habría que desinstalar y volver a instalar.
- El APK incorpora la URL de la API con la que se compiló (`EXPO_PUBLIC_API_URL`), así que un APK
  compilado para el emulador no sirve contra otro servidor: distribuir a dispositivos reales
  exige recompilar con la dirección adecuada.
- El repositorio se mantiene ligero, pero el APK publicado depende del almacenamiento del servidor
  y de su copia de seguridad.
