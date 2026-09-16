# 0002 Frontends separados

Estado: Aceptado

## Contexto

Landing pública, aplicación web y móvil tienen ciclos y necesidades diferentes.

## Decisión

Usar Astro estático para landing, Next.js para web y Expo/React Native para móvil.

## Alternativas consideradas

Una única aplicación web; una landing dentro de Next.js; móvil web únicamente.

## Consecuencias

Se comparte el cliente tipado, pero cada cliente gestiona su sesión y su interfaz.
