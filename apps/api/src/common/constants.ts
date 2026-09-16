// Réplica de las reglas de packages/validation/src/index.ts. La API no importa ese paquete
// en runtime porque exporta TypeScript sin compilar; si cambias un valor, cámbialo en ambos.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 80;
export const DISPLAY_NAME_MAX_LENGTH = 40;

/** SemVer 2.0.0 estricto (https://semver.org), usado para versiones de releases. */
export const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
