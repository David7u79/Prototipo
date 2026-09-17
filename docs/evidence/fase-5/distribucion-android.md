# Distribución del APK de Android — fase 5

Fecha: 2026-09-17. Rama `fase-5-validacion-distribucion`.

## Compilación

Estrategia: compilación local con Gradle, sin servicios externos (ADR 0010). Herramientas del
equipo: JDK 21, Android SDK con plataformas 34 a 36, build-tools 37.0.0 y NDK 27.

```text
pnpm --filter @garfit/mobile exec expo prebuild --platform android --clean
cd apps/mobile/android && ./gradlew assembleRelease
```

El primer intento agotó el espacio de metadatos de la JVM (`OutOfMemoryError: Metaspace`) con los
valores por defecto del proyecto (`-Xmx2048m -XX:MaxMetaspaceSize=512m`). Se repitió con
`-Dorg.gradle.jvmargs="-Xmx4096m -XX:MaxMetaspaceSize=1024m"` y un directorio de Gradle propio, y
terminó en `BUILD SUCCESSFUL in 17m 24s`.

## Artefacto

| Dato | Valor |
| --- | --- |
| Fichero | `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` |
| Identificador | `com.garfit.app` |
| `versionName` | `0.5.0` |
| `versionCode` | `5` |
| `minSdkVersion` | 24 |
| `targetSdkVersion` | 36 |
| Tamaño | 104 931 518 bytes |
| SHA-256 | `e4eabfe20c7dd44d4ef0ca6d448b2ff98f03caf13e4ae7559166cb8f95846bd5` |

Firma comprobada con `apksigner verify --print-certs`: esquema V2, certificado
`CN=Android Debug, OU=Android, O=Unknown` (huella SHA-256 `fac61745dc09…`). Es el keystore de
depuración que genera el prebuild de Expo, suficiente para instalar fuera de Google Play y
documentado como tal en el ADR 0010.

## Publicación

Se publicó con la CLI real del proyecto, la única vía disponible (no hay endpoint HTTP de
publicación):

```text
pnpm --filter @garfit/api release:publish --file <ruta>/GarFit-0.5.0.apk \
  --version 0.5.0 --version-code 5 \
  --changelog "Análisis con IA trazable, historial de análisis y comparación de rendimiento" \
  --changelog "Primera APK instalable de GarFit (prototipo académico)"

Release 0.5.0 (5) publicada. SHA-256 e4eabfe20c7dd44d4ef0ca6d448b2ff98f03caf13e4ae7559166cb8f95846bd5
```

El checksum y el tamaño los calcula la CLI sobre el fichero real; no se introducen a mano ni se
inserta la release directamente en la base de datos.

## Descarga verificada

`GET /releases/latest/android` devolvió versión `0.5.0`, `versionCode` 5, tamaño 104 931 518,
el mismo SHA-256 y los dos elementos del changelog.

| Petición | Código | Bytes | SHA-256 del cuerpo |
| --- | --- | ---: | --- |
| `GET /releases/android/0.5.0/download` | 200 | 104 931 518 | `e4eabfe2…46bd5` |
| `GET /releases/android/latest/download` | 200 | 104 931 518 | `e4eabfe2…46bd5` |

Cabeceras de la descarga por versión: `X-Checksum-Sha256` con el checksum registrado,
`Content-Type: application/vnd.android.package-archive` y
`Content-Disposition: attachment; filename="garfit-0.5.0.apk"`. Ambas descargas coinciden byte a
byte con el APK compilado y con el checksum guardado en `AppRelease`.

Antes de publicar, `GET /releases/android/latest/download` respondía 404 `NO_RELEASE_PUBLISHED`.

## Instalación en un dispositivo

PENDIENTE — instalación física en Android. No hay teléfono conectado (`adb devices` vacío) ni
imágenes de sistema instaladas para crear un emulador, y no se instaló infraestructura adicional
para ello. Lo comprobado sin dispositivo es lo anterior: APK generado, firma válida, metadatos del
paquete, versión, tamaño y checksum tras descargarlo del servidor.

El APK incorpora la URL de la API con la que se compiló (`EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`,
la dirección del emulador). Para instalarlo en un teléfono real contra otro servidor hay que
recompilarlo con la dirección correspondiente.
