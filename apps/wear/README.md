# GarFit Wear OS
Módulo Wear OS para Samsung Galaxy Watch Ultra (Health Services + Data Layer).

### Compilar e instalar
```bash
cd apps/wear && .\gradlew.bat :app:assembleDebug
adb -s <IP_O_ID_RELOJ>:5555 install app/build/outputs/apk/debug/app-debug.apk
```
**Requisito de firma:** Wearable Data Layer exige que la app de reloj y móvil compartan `applicationId` (`com.garfit.app`) y la misma clave de firma (`~/.android/debug.keystore`).
