import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import {API_ORIGIN, TOKEN_KEY} from './links';
import type {Overview} from './types';

class ApiError extends Error { constructor(message: string, readonly status: number) {super(message);} }
export async function api<T>(path: string, token: string | null, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_ORIGIN}/api/mobile/${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(result?.error || 'DriveDrop is temporarily unavailable.', response.status);
    if (!result || typeof result !== 'object') throw new Error('We could not verify the response. Please try again.');
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Unable to connect. Check your connection and try again.');
  } finally { clearTimeout(timer); }
}

type Session = {
  token: string | null; data: Overview | null; loading: boolean; refreshing: boolean; error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>; refresh: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({children}: {children: React.ReactNode}) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<string | null>(null);
  const generation = useRef(0);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const active = current.current;
    const epoch = generation.current;
    if (!active) return;
    const sequence = ++refreshSequence.current;
    setRefreshing(true);
    try {
      const next = await api<Overview>('overview', active);
      if (epoch !== generation.current || sequence !== refreshSequence.current) return;
      if (next.version !== 1 || !next.user || !['CUSTOMER', 'TRANSPORTER'].includes(next.user.role) || !Array.isArray(next.bookings) || !Array.isArray(next.notifications)) throw new Error('Please update DriveDrop and try again.');
      setData(next); setError('');
    } catch (cause) {
      if (epoch !== generation.current || sequence !== refreshSequence.current) return;
      if (cause instanceof ApiError && cause.status === 401) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        if (epoch !== generation.current || sequence !== refreshSequence.current) return;
        current.current = null; setToken(null); setData(null);
      }
      setError(cause instanceof Error ? cause.message : 'Unable to refresh.');
    } finally { if (epoch === generation.current && sequence === refreshSequence.current) setRefreshing(false); }
  }, []);

  useEffect(() => {
    let mounted = true;
    const epochRef = generation;
    (async () => {
      try {
        if (!await SecureStore.isAvailableAsync()) throw new Error('Secure sign-in is unavailable on this device.');
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!mounted) return;
        current.current = saved; setToken(saved);
        await refresh();
      } catch (cause) { if (mounted) setError(cause instanceof Error ? cause.message : 'Unable to restore sign-in.'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => {mounted = false; epochRef.current++;};
  }, [refresh]);

  async function signIn(email: string, password: string) {
    if (!await SecureStore.isAvailableAsync()) throw new Error('Secure sign-in is unavailable on this device.');
    const result = await api<{token: string; expiresAt: string}>('login', null, {email: email.trim(), password});
    if (!/^ddm_[a-f0-9]{64}$/.test(result.token) || !Number.isFinite(Date.parse(result.expiresAt))) throw new Error('We could not verify sign-in.');
    try { await SecureStore.setItemAsync(TOKEN_KEY, result.token, {keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}); }
    catch { await api('logout', result.token, {}).catch(() => {}); throw new Error('Unable to save sign-in securely. Please try again.'); }
    generation.current++; current.current = result.token; setToken(result.token); setData(null); setError('');
    await refresh();
  }

  async function signOut() {
    const previous = current.current;
    // Do not announce local logout if removing the stored credential fails.
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    generation.current++; current.current = null; setToken(null); setData(null); setRefreshing(false); setError('');
    if (previous) await api('logout', previous, {}).catch(() => {setError('Signed out on this phone. Server sign-out could not be confirmed; change your password on the website to end all sessions.');});
  }
  return <Context.Provider value={{token, data, loading, refreshing, error, signIn, signOut, refresh}}>{children}</Context.Provider>;
}
export function useSession() {const value = useContext(Context); if (!value) throw new Error('SessionProvider is required'); return value;}
