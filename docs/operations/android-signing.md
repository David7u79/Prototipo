# Firma de la aplicación Android

Este documento explica cómo se firma el APK de GarFit, por qué la clave de firma debe conservarse
y cómo construir una versión nueva. **No contiene contraseñas ni rutas a secretos compartidos**:
sólo describe el procedimiento.

## Qué se firma y con qué

Android exige que todo APK esté firmado para poder instalarse. Hasta la fase 5 se usó el keystore
de depuración que genera `expo prebuild`, suficiente para instalar fuera de Google Play pero
inservible como identidad estable del proyecto (ADR 0010). Desde el release candidate de la fase 6,
GarFit se firma con un **keystore propio**:

| Dato | Valor |
| --- | --- |
| Algoritmo | RSA 4096, SHA384withRSA |
| Alias | `garfit` |
| Validez | 10 950 días (30 años) |
| Titular | `CN=GarFit, OU=Prototipo academico, O=GarFit, L=Tlaxcala, ST=Tlaxcala, C=MX` |
| Ubicación | Fuera del repositorio, en el directorio personal de quien compila |

El certificado es autofirmado, que es lo normal para distribución directa: no interviene ninguna
autoridad certificadora, y lo que importa es que **todas las versiones se firmen con la misma
clave**.

## Por qué la clave debe conservarse

Android identifica una aplicación por la pareja «identificador de paquete + clave de firma». Si una
versión nueva se firma con otra clave, el sistema la considera una aplicación distinta y **se niega
a instalarla encima** de la anterior: la persona tendría que desinstalar GarFit, perdiendo la sesión
guardada en el dispositivo. Por eso:

- La clave se guarda **fuera del repositorio** y nunca se sube a Git, ni siquiera cifrada: el
  `.gitignore` excluye `*.keystore`, `*.jks`, `*.keystore.env` y `keystore.properties`.
- Su copia de seguridad es responsabilidad de quien mantiene el proyecto y debe hacerse en un
  soporte que no sea el repositorio: un gestor de contraseñas o un medio cifrado bajo su control.
  GarFit **no** copia el keystore a ningún servicio externo de forma automática.
- La contraseña se guarda junto al keystore, en un fichero de entorno del directorio personal, y se
  entrega a las herramientas por variables de entorno, nunca por la línea de órdenes en un script
  versionado ni en la documentación.

## Qué ocurre si se pierde

Si se pierde el keystore o su contraseña, no hay forma de recuperarlos: no existe nada parecido a
un «olvidé mi contraseña». Las consecuencias son:

1. Las instalaciones existentes ya no pueden actualizarse; hay que desinstalar y volver a instalar.
2. Habría que generar un keystore nuevo, documentar el cambio y avisar de que la versión siguiente
   no se instala encima de la anterior.
3. Si algún día GarFit llegara a una tienda de aplicaciones, perder la clave impediría publicar
   actualizaciones de esa misma aplicación.

## Cómo generar el keystore (sólo la primera vez)

```bash
keytool -genkeypair -v \
  -keystore "$HOME/.garfit/garfit-release.keystore" \
  -alias garfit -keyalg RSA -keysize 4096 -validity 10950 \
  -dname "CN=GarFit, OU=Prototipo academico, O=GarFit, L=Tlaxcala, ST=Tlaxcala, C=MX"
```

`keytool` pide la contraseña de forma interactiva. Guárdala en tu gestor de contraseñas y, si
quieres automatizar las compilaciones, en un fichero de entorno **fuera del repositorio**, por
ejemplo `~/.garfit/garfit-release.keystore.env`, con permisos restringidos:

```env
GARFIT_KEYSTORE_PASSWORD=
GARFIT_KEY_ALIAS=garfit
GARFIT_KEY_PASSWORD=
```

## Cómo construir y firmar una versión nueva

1. Actualiza la versión en el `package.json` raíz (`version` y `garfit.androidVersionCode`, que debe
   ser mayor que el publicado) y propágala:

   ```bash
   pnpm version:sync
   ```

2. Genera el proyecto nativo y compila. `EXPO_PUBLIC_API_URL` queda incrustada en el APK, así que
   debe apuntar a la API contra la que se va a usar la aplicación:

   ```bash
   EXPO_PUBLIC_API_URL="https://api.ejemplo" pnpm --filter @garfit/mobile exec expo prebuild --platform android --clean
   cd apps/mobile/android && ./gradlew assembleRelease
   ```

3. Firma el APK con la clave de GarFit, sustituyendo la firma de depuración que pone la plantilla
   de Expo (`apksigner` está en `build-tools` del SDK de Android):

   ```bash
   apksigner sign \
     --ks "$HOME/.garfit/garfit-release.keystore" --ks-key-alias garfit \
     --out GarFit-<versión>.apk \
     apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

   Las contraseñas se pasan por las variables de entorno que admite `apksigner`
   (`--ks-pass env:...` y `--key-pass env:...`) leídas del fichero de entorno anterior. Nunca se
   escriben en un script versionado.

4. Comprueba la firma y obtén los datos del artefacto:

   ```bash
   apksigner verify --print-certs GarFit-<versión>.apk
   aapt2 dump badging GarFit-<versión>.apk | head -1
   node scripts/release/manifest.mjs --apk GarFit-<versión>.apk
   ```

5. Publica con la CLI del proyecto, que calcula el checksum y el tamaño sobre el fichero real:

   ```bash
   pnpm --filter @garfit/api release:publish --file GarFit-<versión>.apk \
     --version <versión> --version-code <versionCode> --changelog "..."
   ```

El procedimiento completo de publicación, incluida la comprobación de la descarga, está en
[`release.md`](release.md).
