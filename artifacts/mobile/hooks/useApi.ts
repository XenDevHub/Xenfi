import { useAuth } from '@/context/AuthContext';
import { Platform } from 'react-native';

/**
 * Using your confirmed Mac IP: 192.168.235.31
 */
const API_BASE = "http://192.168.0.176:3000";
export function useApi() {
  const { token } = useAuth();

  async function apiFetch(path: string, options: RequestInit = {}) {
    // Corrected to use API_BASE to match the variable defined above
    const url = `${API_BASE}/api${path}`;
    
    console.log(`[Xenfi Debug] Fetching: ${url}`);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });

      // Handle empty or non-JSON responses safely
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error(`[Xenfi API Error]: ${res.status}`, data);
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      // Updated error message to reflect the correct IP
      console.error(`[Xenfi Network Error]: Check if server is running at ${API_BASE}`);
      throw error;
    }
  }

  return { apiFetch };
}