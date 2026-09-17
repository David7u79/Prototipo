import { ApiError } from '@garfit/api-client';

export function aiErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return 'No fue posible generar el análisis.';
  }

  const messages: Record<string, string> = {
    AI_CONSENT_REQUIRED: 'Necesitas aceptar el consentimiento para continuar.',
    AI_DISABLED: 'Servicio de análisis no configurado.',
    AI_NOT_CONFIGURED: 'Servicio de análisis no configurado.',
    AI_PROVIDER_UNAVAILABLE: 'El proveedor de IA no está disponible. Inténtalo más tarde.',
    AI_RATE_LIMITED: 'Se alcanzó el límite de solicitudes. Inténtalo más tarde.',
    AI_INVALID_RESPONSE: 'El proveedor devolvió una respuesta no válida.',
  };
  return messages[error.code] ?? 'No fue posible generar el análisis.';
}
