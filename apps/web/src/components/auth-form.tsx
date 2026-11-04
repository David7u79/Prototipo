'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import type { AuthState } from '@/app/auth-actions';
import { GarFitLogo } from '@/components/logo';

const EMPTY_AUTH_STATE: AuthState = { errors: {}, message: '' };

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (configuration: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: { theme: string; size: string; width: number },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

type AuthFormProps = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  googleClientId?: string | null;
  next?: string;
  register?: boolean;
};

type FieldProps = {
  error?: string[];
  label: string;
  name: string;
  type?: 'email' | 'password' | 'text';
};

function FormField({ error, label, name, type = 'text' }: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor={name}>
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : undefined}
        autoComplete={name === 'password' ? 'current-password' : name}
        id={name}
        name={name}
        type={type}
      />
      {error?.map((message) => (
        <p className="mt-1 text-xs text-danger" id={errorId} key={message}>
          {message}
        </p>
      ))}
    </div>
  );
}

function AuthHeading({ register }: { register: boolean }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">
        <GarFitLogo size={48} />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-accent">GarFit</p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
        {register ? 'Crea tu cuenta' : 'Inicia sesión'}
      </h1>
      <p className="mt-1 text-xs text-muted">Entrena · Registra · Evoluciona</p>
    </div>
  );
}

function AuthSwitch({ register }: { register: boolean }) {
  const href = register ? '/login' : '/register';
  const prompt = register ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?';
  const linkText = register ? 'Inicia sesión' : 'Regístrate';

  return (
    <p className="text-center text-sm text-muted">
      {prompt}{' '}
      <Link className="font-semibold text-accent underline hover:text-ink" href={href}>
        {linkText}
      </Link>
    </p>
  );
}

export function AuthForm({ action, googleClientId, next, register = false }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, EMPTY_AUTH_STATE);
  const [googleError, setGoogleError] = useState('');
  const googleButton = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const configureGoogle = useCallback((): void => {
    if (!googleClientId || !window.google || !googleButton.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async ({ credential }) => {
        if (!credential) {
          return;
        }

        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: credential }),
        });

        if (response.ok) {
          router.push('/app');
        } else {
          setGoogleError('No fue posible iniciar sesión con Google.');
        }
      },
    });
    window.google.accounts.id.renderButton(googleButton.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
    });
  }, [googleClientId, router]);

  useEffect(() => {
    configureGoogle();
  }, [configureGoogle]);

  return (
    <div className="w-full">
      <form
        action={formAction}
        className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
      >
        <input name="next" type="hidden" value={next ?? ''} />
        <AuthHeading register={register} />
        {register && <FormField error={state.errors.name} label="Nombre" name="name" />}
        <FormField
          error={state.errors.email}
          label="Correo electrónico"
          name="email"
          type="email"
        />
        <FormField
          error={state.errors.password}
          label="Contraseña"
          name="password"
          type="password"
        />
        {state.message && (
          <p
            className="rounded-[10px] border border-danger/30 bg-danger/15 p-3 text-sm text-danger"
            role="alert"
          >
            {state.message}
          </p>
        )}
        <button
          type="submit"
          className="btn-primary w-full py-3 text-center"
          disabled={pending}
        >
          {pending ? 'Procesando…' : register ? 'Crear cuenta' : 'Entrar'}
        </button>
        <AuthSwitch register={register} />
      </form>
      {googleClientId && (
        <>
          <Script
            onLoad={configureGoogle}
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
          />
          <div className="mt-4 flex justify-center" ref={googleButton} />
          {googleError && (
            <p
              className="mt-2 text-center text-xs text-danger"
              role="alert"
            >
              {googleError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
