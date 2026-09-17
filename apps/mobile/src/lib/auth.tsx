import { ApiError, createApiClient } from '@garfit/api-client';
import type { AthleteProfile, AuthResponse, AuthTokens, User } from '@garfit/types';
import type { AthleteProfileInput, LoginInput, RegisterInput } from '@garfit/validation';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import type * as GoogleSignIn from '@react-native-google-signin/google-signin';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NativeModules, Platform } from 'react-native';

const TOKEN_STORAGE_KEY = 'garfit.authTokens';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

// The API client reads this in-memory copy; SecureStore is the durable source.
let currentTokens: AuthTokens | null = null;

export const api = createApiClient({
  baseUrl: apiUrl,
  getAccessToken: () => currentTokens?.accessToken ?? null,
});

type SessionContextValue = {
  ready: boolean;
  user: User | null;
  profile: AthleteProfile | null;
  googleEnabled: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<AthleteProfile | null>;
  saveProfile: (input: AthleteProfileInput) => Promise<void>;
  request: <Result>(action: () => Promise<Result>) => Promise<Result>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

void SplashScreen.preventAutoHideAsync();

function readStoredTokens(value: string | null): AuthTokens | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'accessToken' in parsed &&
      'refreshToken' in parsed
    ) {
      return parsed as AuthTokens;
    }
  } catch {
    // A malformed secure value is treated as an absent session.
  }

  return null;
}

function isGoogleModuleAvailable(): boolean {
  return (
    Platform.OS !== 'web' &&
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) &&
    Boolean(NativeModules.RNGoogleSignin)
  );
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const clearLocalSession = useCallback(async () => {
    currentTokens = null;
    setUser(null);
    setProfile(null);
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  }, []);

  const saveAuthResponse = useCallback(async (response: AuthResponse) => {
    currentTokens = response.tokens;
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(response.tokens));
    setUser(response.user);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!currentTokens) return false;

    try {
      // Refresh tokens rotate, so persist the replacement before another request.
      const response = await api.auth.refresh(currentTokens.refreshToken);
      await saveAuthResponse(response);
      return true;
    } catch {
      await clearLocalSession();
      return false;
    }
  }, [clearLocalSession, saveAuthResponse]);

  const withSessionRefresh = useCallback(
    async <Result,>(request: () => Promise<Result>): Promise<Result> => {
      try {
        return await request();
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;

        // Every protected request gets exactly one refresh-and-retry opportunity.
        if (!(await refreshSession())) throw error;
        return request();
      }
    },
    [refreshSession],
  );

  const loadProfile = useCallback(async (): Promise<AthleteProfile | null> => {
    try {
      const value = await withSessionRefresh(() => api.profile.get());
      setProfile(value);
      return value;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.code === 'PROFILE_NOT_FOUND') {
        setProfile(null);
        return null;
      }
      throw error;
    }
  }, [withSessionRefresh]);

  const saveProfile = useCallback(
    async (input: AthleteProfileInput) => {
      const value = await withSessionRefresh(() => api.profile.upsert(input));
      setProfile(value);
    },
    [withSessionRefresh],
  );

  const completeAuthentication = useCallback(
    async (response: AuthResponse) => {
      await saveAuthResponse(response);
      await loadProfile().catch(() => undefined);
    },
    [loadProfile, saveAuthResponse],
  );

  useEffect(() => {
    async function restoreSession() {
      currentTokens = readStoredTokens(await SecureStore.getItemAsync(TOKEN_STORAGE_KEY));

      if (currentTokens && (await refreshSession())) {
        try {
          setUser(await api.auth.me());
          await loadProfile();
        } catch {
          await clearLocalSession();
        }
      }

      if (isGoogleModuleAvailable()) {
        try {
          const providers = await api.auth.providers();
          setGoogleEnabled(providers.google.enabled);
        } catch {
          setGoogleEnabled(false);
        }
      }

      setReady(true);
      await SplashScreen.hideAsync();
    }

    void restoreSession();
  }, [clearLocalSession, loadProfile, refreshSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      await completeAuthentication(await api.auth.login(input));
    },
    [completeAuthentication],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await completeAuthentication(await api.auth.register(input));
    },
    [completeAuthentication],
  );

  const logout = useCallback(async () => {
    try {
      if (currentTokens) await api.auth.logout(currentTokens.refreshToken);
    } finally {
      await clearLocalSession();
    }
  }, [clearLocalSession]);

  const signInWithGoogle = useCallback(async () => {
    if (!googleEnabled || !isGoogleModuleAvailable()) {
      throw new Error('Google no está disponible en esta compilación.');
    }

    // Expo Go lacks this native module, so load it after checking availability.
    const google = require('@react-native-google-signin/google-signin') as typeof GoogleSignIn;
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) throw new Error('Google no está configurado.');

    google.GoogleSignin.configure({ webClientId });
    const result = await google.GoogleSignin.signIn();
    if (result.type === 'cancelled') return;
    if (!result.data.idToken) throw new Error('No se recibió un token de Google.');

    await completeAuthentication(await api.auth.google(result.data.idToken));
  }, [completeAuthentication, googleEnabled]);

  const value = useMemo(
    () => ({
      ready,
      user,
      profile,
      googleEnabled,
      login,
      register,
      signInWithGoogle,
      logout,
      loadProfile,
      saveProfile,
      request: withSessionRefresh,
    }),
    [
      googleEnabled,
      loadProfile,
      login,
      logout,
      profile,
      ready,
      register,
      saveProfile,
      withSessionRefresh,
      signInWithGoogle,
      user,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession debe usarse dentro de SessionProvider.');
  return value;
}

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'EMAIL_ALREADY_REGISTERED') return 'Este correo ya está registrado.';
    if (error.code === 'INVALID_CREDENTIALS') return 'Correo o contraseña incorrectos.';
    if (error.code === 'NETWORK_ERROR') return 'No fue posible conectar con el servidor.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
