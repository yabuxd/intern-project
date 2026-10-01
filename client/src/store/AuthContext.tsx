import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, PermissionName } from '@intern/shared';
import type { Session } from '@supabase/supabase-js';
import { fetchMe, setUnauthorizedHandler, supabase } from '../services';
import { queryClient } from '../queryClient';
import {
  detectAuthMode,
  isLocalAuth,
  readLocalSession,
  signInLocal,
  signOutLocal,
  signUpLocal,
} from '../services/localAuth';

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: PermissionName) => boolean;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(accessToken: string | undefined): Promise<AuthUser | null> {
  if (!accessToken) {
    return null;
  }
  return fetchMe(accessToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const inFlightUserIdRef = useRef<string | null>(null);

  const clearAuthState = useCallback(() => {
    loadedUserIdRef.current = null;
    inFlightUserIdRef.current = null;
    setSession(null);
    setUser(null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncProfile = async (nextSession: Session | null) => {
      const userId = nextSession?.user?.id ?? null;

      if (userId === null) {
        loadedUserIdRef.current = null;
        inFlightUserIdRef.current = null;
        if (mounted) {
          setUser(null);
        }
        return;
      }

      if (userId === loadedUserIdRef.current || userId === inFlightUserIdRef.current) {
        return;
      }

      inFlightUserIdRef.current = userId;

      try {
        const me = await loadProfile(nextSession?.access_token);
        if (!mounted || inFlightUserIdRef.current !== userId) {
          return;
        }
        loadedUserIdRef.current = userId;
        setUser(me);
        setError(null);
      } catch (err) {
        if (!mounted || inFlightUserIdRef.current !== userId) {
          return;
        }
        loadedUserIdRef.current = null;
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        setUser(null);
      } finally {
        if (inFlightUserIdRef.current === userId) {
          inFlightUserIdRef.current = null;
        }
      }
    };

    const hydrateSession = async () => {
      await detectAuthMode();
      if (!mounted) return;

      if (isLocalAuth()) {
        const localSession = readLocalSession();
        setSession(localSession);
        await syncProfile(localSession);
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      await syncProfile(data.session);
      if (mounted) {
        setLoading(false);
      }
    };

    void hydrateSession();

    let unsubscribe: (() => void) | undefined;
    void detectAuthMode().then(() => {
      if (!mounted || isLocalAuth()) {
        return;
      }
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setError(null);
        void syncProfile(nextSession);
      });
      unsubscribe = () => authListener.subscription.unsubscribe();
    });

    // Re-validate after bfcache restore so back/forward cannot revive a signed-out session.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (isLocalAuth()) {
        const localSession = readLocalSession();
        setSession(localSession);
        if (!localSession) {
          clearAuthState();
        } else {
          void syncProfile(localSession);
        }
        return;
      }
      void supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (!data.session) {
          clearAuthState();
        } else {
          void syncProfile(data.session);
        }
      });
    };
    window.addEventListener('pageshow', onPageShow);

    setUnauthorizedHandler(() => {
      if (isLocalAuth()) {
        signOutLocal();
      } else {
        void supabase.auth.signOut();
      }
      clearAuthState();
    });

    return () => {
      mounted = false;
      unsubscribe?.();
      window.removeEventListener('pageshow', onPageShow);
      setUnauthorizedHandler(null);
    };
  }, [clearAuthState]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    if (isLocalAuth()) {
      try {
        const nextSession = await signInLocal(email, password);
        loadedUserIdRef.current = null;
        setSession(nextSession);
        const me = await loadProfile(nextSession.access_token);
        loadedUserIdRef.current = nextSession.user.id;
        setUser(me);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign in failed';
        setError(message);
        throw err;
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) {
      return;
    }

    if (/failed to fetch|networkerror|load failed/i.test(signInError.message)) {
      try {
        const nextSession = await signInLocal(email, password);
        loadedUserIdRef.current = null;
        setSession(nextSession);
        const me = await loadProfile(nextSession.access_token);
        loadedUserIdRef.current = nextSession.user.id;
        setUser(me);
        return;
      } catch {
        // keep the original cloud error below
      }
    }

    setError(signInError.message);
    throw signInError;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    setError(null);
    if (isLocalAuth()) {
      try {
        const nextSession = await signUpLocal(email, password, fullName);
        loadedUserIdRef.current = null;
        setSession(nextSession);
        const me = await loadProfile(nextSession.access_token);
        loadedUserIdRef.current = nextSession.user.id;
        setUser(me);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign up failed';
        setError(message);
        throw err;
      }
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      throw signUpError;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    if (isLocalAuth()) {
      signOutLocal();
      clearAuthState();
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
    clearAuthState();
  }, [clearAuthState]);

  const refreshMe = useCallback(async () => {
    const nextSession = isLocalAuth()
      ? readLocalSession()
      : (await supabase.auth.getSession()).data.session;
    const token = nextSession?.access_token;
    const userId = nextSession?.user?.id ?? null;
    const me = await loadProfile(token);
    loadedUserIdRef.current = userId;
    setUser(me);
  }, []);

  const hasPermission = useCallback(
    (permission: PermissionName) => Boolean(user?.permissions.includes(permission)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      hasPermission,
      refreshMe,
    }),
    [session, user, loading, error, signIn, signUp, signOut, hasPermission, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
