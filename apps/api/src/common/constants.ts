// Reglas exclusivas de la API. Las reglas de dominio compartidas (longitudes, enums, límites)
// viven en @garfit/domain y no se duplican aquí.

/** SemVer 2.0.0 estricto (https://semver.org), usado para versiones de releases. */
export const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
