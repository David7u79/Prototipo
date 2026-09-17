# 0004 Autenticación Google verificada en servidor

Estado: Aceptado

## Contexto

El cliente obtiene un ID token y la identidad debe validarse fuera del cliente.

## Decisión

Verificar ID token y audiencias en API, exigir correo verificado y no usar client secret.
Se vincula por `sub`; por correo se vincula sin duplicar. Una LOCAL no verificada se
elimina y sus sesiones se revocan antes de vincular Google.

## Alternativas consideradas

Confiar en el cliente; almacenar secretos en apps; crear duplicados por proveedor.

## Consecuencias

Se requiere configuración Google en servidor y clientes; se evita pre-registro hostil.
