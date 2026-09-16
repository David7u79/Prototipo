import { createApiClient } from '@garfit/api-client';
import type { AuthTokens } from '@garfit/types';
import { cookies } from 'next/headers';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

type CookieStore = {
  set: (name: string, value: string, options: object) => void;
};

export function apiBaseUrl(): string {
  return process.env.API_URL ?? 'http://localhost:4000';
}

export function serverApi() {
  return createApiClient({
    baseUrl: apiBaseUrl(),
    getAccessToken: async () => {
      const cookieStore = await cookies();
      return cookieStore.get('garfit_access')?.value ?? null;
    },
  });
}

/** Stores tokens only in httpOnly cookies, never browser JavaScript. */
export function setSession(store: CookieStore, tokens: AuthTokens): void {
  store.set('garfit_access', tokens.accessToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: tokens.accessTokenExpiresIn,
  });
  store.set('garfit_refresh', tokens.refreshToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(tokens.refreshTokenExpiresAt),
  });
}

export function clearSession(store: CookieStore): void {
  store.set('garfit_access', '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  store.set('garfit_refresh', '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}
