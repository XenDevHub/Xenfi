import { useAuth } from '@/context/AuthContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function useApi() {
  const { token } = useAuth();

  async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  return { apiFetch };
}
