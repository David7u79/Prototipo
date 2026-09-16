import { createApiClient } from '@garfit/api-client';
import { NextResponse, type NextRequest } from 'next/server';
import { apiBaseUrl, clearSession, setSession } from '@/lib/auth';

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function isPublicAuthRoute(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('garfit_access')?.value;
  const refreshToken = request.cookies.get('garfit_refresh')?.value;

  if (isPublicAuthRoute(pathname)) {
    return accessToken || refreshToken
      ? NextResponse.redirect(new URL('/app', request.url))
      : NextResponse.next();
  }

  if (!pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    return loginRedirect(request);
  }

  if (accessToken) {
    return NextResponse.next();
  }

  // The refresh token is server-only. Refresh it here and attach new httpOnly
  // cookies before the protected route reaches a Server Component.
  const response = NextResponse.next();
  try {
    const authResponse = await createApiClient({
      baseUrl: apiBaseUrl(),
    }).auth.refresh(refreshToken);
    setSession(response.cookies, authResponse.tokens);
    return response;
  } catch {
    const redirectResponse = loginRedirect(request);
    clearSession(redirectResponse.cookies);
    return redirectResponse;
  }
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register'],
};
