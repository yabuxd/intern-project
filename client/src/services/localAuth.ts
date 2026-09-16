import type { Session, User } from '@supabase/supabase-js';
import { fetchAuthDriver, localLogin, localRegister, type LocalAuthResult } from './api';

let localAuth = import.meta.env.VITE_AUTH_MODE === 'local';

export function isLocalAuth(): boolean {
  return localAuth;
}

export async function detectAuthMode(): Promise<boolean> {
  if (import.meta.env.VITE_AUTH_MODE === 'local') {
    localAuth = true;
    return true;
  }

  try {
    localAuth = (await fetchAuthDriver()) === 'local';
  } catch {
    localAuth = false;
  }

  return localAuth;
}

const STORAGE_KEY = 'intern.local.session';

function toSession(payload: LocalAuthResult): Session {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: payload.user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: payload.user.email,
    app_metadata: {},
    user_metadata: { full_name: payload.user.name ?? '' },
    created_at: new Date().toISOString(),
  } as User;

  return {
    access_token: payload.access_token,
    refresh_token: '',
    expires_in: payload.expires_in,
    expires_at: now + payload.expires_in,
    token_type: 'bearer',
    user,
  };
}

export function readLocalSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (!session.access_token || !session.user?.id) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function writeLocalSession(session: Session | null): void {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function signInLocal(email: string, password: string): Promise<Session> {
  const session = toSession(await localLogin(email, password));
  writeLocalSession(session);
  return session;
}

export async function signUpLocal(
  email: string,
  password: string,
  fullName?: string,
): Promise<Session> {
  const session = toSession(await localRegister(email, password, fullName));
  writeLocalSession(session);
  return session;
}

export function signOutLocal(): void {
  writeLocalSession(null);
}
