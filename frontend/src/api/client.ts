import axios from 'axios';
import { supabase } from '../lib/supabase';

function resolveApiUrl() {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  // Fast local-first default for development.
  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:8000`;
    }
    return origin;
  }

  return 'http://localhost:8000';
}

const API_URL = resolveApiUrl();

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

// Attach the live Supabase session token to every request.
// Uses getSession() so it always reads the correct key regardless of project ref.
client.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default client;
