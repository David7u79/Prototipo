import { API_ERROR_CODES } from '@garfit/types';

const APP_ROUTE_PREFIX = '/app';

/**
 * Accept only an internal application route after authentication. This avoids
 * turning the login form into an open redirect to an external website.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value?.startsWith(APP_ROUTE_PREFIX) || value.startsWith('//')) {
    return APP_ROUTE_PREFIX;
  }

  return value;
}

export function authErrorMessage(code: string): string {
  switch (code) {
    case API_ERROR_CODES.EMAIL_ALREADY_REGISTERED:
      return 'Este correo ya está registrado.';
    case API_ERROR_CODES.INVALID_CREDENTIALS:
      return 'El correo o la contraseña no son correctos.';
    case 'NETWORK_ERROR':
      return 'No fue posible conectar con el servidor.';
    case API_ERROR_CODES.INVALID_GOOGLE_TOKEN:
      return 'No fue posible verificar tu cuenta de Google.';
    default:
      return 'No fue posible completar la operación. Inténtalo de nuevo.';
  }
}
