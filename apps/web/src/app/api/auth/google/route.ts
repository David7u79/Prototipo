import { ApiError } from '@garfit/api-client';
import { NextResponse } from 'next/server';
import { serverApi, setSession } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth-utils';

function idTokenFrom(body: unknown): string | null {
  if (body && typeof body === 'object' && 'idToken' in body && typeof body.idToken === 'string') {
    return body.idToken;
  }

  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const idToken = idTokenFrom(body);

  if (!idToken) {
    return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
  }

  try {
    const authResponse = await serverApi().auth.google(idToken);
    const response = NextResponse.json({ ok: true });
    setSession(response.cookies, authResponse.tokens);
    return response;
  } catch (error) {
    const code = error instanceof ApiError ? error.code : 'NETWORK_ERROR';
    return NextResponse.json({ message: authErrorMessage(code) }, { status: 401 });
  }
}
