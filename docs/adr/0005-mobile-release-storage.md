# 0005 Releases móviles por CLI y almacenamiento abstraído

Estado: Aceptado

## Contexto

La APK requiere una publicación controlada sin exponer administración HTTP.

## Decisión

Publicar sólo con `release:publish` y almacenar mediante `ReleaseStorage`; inicialmente
`LocalReleaseStorage` valida rutas y symlinks.

## Alternativas consideradas

Endpoint admin; archivos públicos sin metadatos; acoplar a S3 desde el inicio.

## Consecuencias

No hay rol admin ni endpoint de escritura. S3/R2 puede añadirse tras la abstracción.
