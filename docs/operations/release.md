# Procedimiento de publicación

Cómo llevar GarFit desde el código hasta una versión instalable y descargable. Cada paso es un
comando real; ninguno inventa datos ni escribe a mano un checksum.

## 0. Antes de empezar

- El árbol de trabajo debe estar limpio y la rama debe ser la que se va a publicar.
- El keystore de firma debe estar disponible; su procedimiento y sus riesgos están en
  [`android-signing.md`](android-signing.md).
- Decide contra qué API se compilará la aplicación móvil: `EXPO_PUBLIC_API_URL` queda incrustada en
  el APK y no se puede cambiar después sin recompilar.

## 1. Fijar la versión

La versión vive en un único sitio: el `package.json` de la raíz (`version` y
`garfit.androidVersionCode`). El `versionCode` debe ser un entero mayor que el de la última
publicación.

```bash
# editar package.json: version y garfit.androidVersionCode
pnpm version:sync     # propaga a apps/* y a apps/mobile/app.json
pnpm version:check    # falla si algo quedó desincronizado
```

## 2. Verificar el repositorio

```bash
pnpm release:check
```

Comprueba, en una sola pasada: árbol limpio, versiones sincronizadas, lint, typecheck, pruebas,
compilación, documentación generada (OpenAPI, ERD y artefactos versionados), respuestas de OpenAPI
con esquema y ausencia de secretos versionados. Con `--fast` omite pruebas y compilación, útil
mientras se itera; para publicar se ejecuta completo. No publica nada por sí mismo.

## 3. Compilar la aplicación Android

```bash
EXPO_PUBLIC_API_URL="https://api.ejemplo" \
  pnpm --filter @garfit/mobile exec expo prebuild --platform android --clean
cd apps/mobile/android && ./gradlew assembleRelease
```

Si la compilación agota la memoria de la JVM, repítela con
`-Dorg.gradle.jvmargs="-Xmx4096m -XX:MaxMetaspaceSize=1024m"`.

## 4. Firmar el APK

La plantilla de Expo firma la variante de release con el keystore de depuración; hay que sustituir
esa firma por la de GarFit antes de publicar:

```bash
apksigner sign --ks "$HOME/.garfit/garfit-release.keystore" --ks-key-alias garfit \
  --out GarFit-<versión>.apk \
  apps/mobile/android/app/build/outputs/apk/release/app-release.apk
apksigner verify --print-certs GarFit-<versión>.apk
```

El certificado que imprime debe ser el de GarFit, no `CN=Android Debug`.

## 5. Generar el manifiesto

```bash
pnpm release:manifest --apk GarFit-<versión>.apk
```

Escribe `docs/generated/release-manifest.json` con nombre, versión, `versionCode`, identificador de
paquete, SHA-256, tamaño, commit y fecha de compilación, calculando el checksum y el tamaño sobre el
fichero real. Regenerar la documentación después (`pnpm docs:generate`) hace que `BUILD_INFO.md`
incluya ese SHA-256.

## 6. Publicar

```bash
pnpm --filter @garfit/api release:publish --file GarFit-<versión>.apk \
  --version <versión> --version-code <versionCode> \
  --changelog "Primera línea del changelog" --changelog "Segunda línea"
```

La CLI copia el APK al almacenamiento de releases y registra `AppRelease` calculando de nuevo el
checksum y el tamaño. No existe endpoint HTTP de publicación y nunca se insertan filas a mano.
Añade `--draft` para registrar la versión sin servirla todavía.

## 7. Comprobar la descarga

```bash
curl -s http://localhost:4000/releases/latest/android
curl -s -o /tmp/descarga.apk -D - http://localhost:4000/releases/android/latest/download
sha256sum /tmp/descarga.apk
```

El SHA-256 del fichero descargado debe coincidir con el del manifiesto, con el que devuelve
`/releases/latest/android` y con la cabecera `X-Checksum-Sha256`. La landing muestra la versión, el
tamaño, la fecha, las notas y el mismo checksum, y su código QR apunta a la descarga estable.

## 8. Etiquetar

```bash
git tag -a v<versión> -m "GarFit <versión>"
```

La etiqueta se sube (`git push origin v<versión>`) sólo cuando la persona responsable del proyecto
lo autoriza; publicar el APK y etiquetar el repositorio son decisiones suyas, no automáticas.

## 9. Registrar la evidencia

Añade a `docs/evidence/fase-N/` la salida de las comprobaciones: versión, checksum, tamaño,
certificado de firma y resultado de la descarga. Es lo que permite demostrar más tarde que el
artefacto publicado es exactamente el que se compiló.
