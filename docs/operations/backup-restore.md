# Copia y restauración

Una copia útil de GarFit contiene PostgreSQL y el volumen de releases. La base guarda los metadatos de cada APK; el volumen `garfit-demo-releases` guarda el binario, por lo que restaurar sólo la base deja enlaces de descarga rotos.

## Copia

Con la composición en ejecución, genere un volcado en formato personalizado y archive el contenido del volumen. Cree primero un directorio local protegido para los artefactos.

```sh
mkdir -p backups/$(date +%F)
docker compose -f docker-compose.demo.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > backups/$(date +%F)/garfit.dump
docker run --rm \
  -v garfit-demo-releases:/source:ro \
  -v "$(pwd)/backups/$(date +%F):/backup" \
  alpine:3.21 tar -czf /backup/releases.tar.gz -C /source .
```

Ejecute los comandos con `POSTGRES_USER` y `POSTGRES_DB` exportados desde `.env.demo`. Mantenga los archivos cifrados cuando salgan del servidor: el volcado puede incluir datos personales.

## Restauración y validación

Detenga sólo los servicios que consumen datos, mantenga PostgreSQL accesible y restaure en una base vacía. El siguiente procedimiento sustituye de forma intencionada la base de demostración, por lo que debe probarse primero en un entorno aislado.

```sh
docker compose -f docker-compose.demo.yml stop api web landing
docker compose -f docker-compose.demo.yml exec -T postgres \
  dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
docker compose -f docker-compose.demo.yml exec -T postgres \
  createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose -f docker-compose.demo.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < backups/AAAA-MM-DD/garfit.dump
docker run --rm \
  -v garfit-demo-releases:/target \
  -v "$(pwd)/backups/AAAA-MM-DD:/backup:ro" \
  alpine:3.21 sh -c 'rm -rf /target/* && tar -xzf /backup/releases.tar.gz -C /target'
docker compose -f docker-compose.demo.yml up -d api web landing
```

Valide la restauración con `curl -fsS http://localhost:4000/health`, una consulta autenticada representativa y la descarga de una APK cuya fila exista en `AppRelease`. Compruebe también `tar -tzf backups/AAAA-MM-DD/releases.tar.gz` antes de restaurar. Para el prototipo se recomienda una copia diaria mientras haya demostraciones activas, otra inmediatamente antes de una entrega y una restauración de prueba mensual.
