import axios from 'axios';

// Every call already hardcodes its own "/api/..." path, so API_URL must be
// an origin (protocol + host), never a path prefix like "/api" — otherwise
// it doubles up into "/api/api/...". Some hosts inject VITE_API_URL as a
// path rather than an origin, so only honor it when it's a full URL;
// anything else (including a bare path) falls back to same-origin. Local
// dev against a separately-running backend sets VITE_API_URL explicitly in
// .env.local (see client/.env.example).
const envApiUrl = import.meta.env.VITE_API_URL;
export const API_URL = envApiUrl && /^https?:\/\//.test(envApiUrl) ? envApiUrl : '';

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('psw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error messages so callers can just do err.message
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Something went wrong.';
    return Promise.reject(new Error(message));
  }
);

// Turns a relative "/assets/uploads/xyz.png" from the API into an absolute URL.
export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('blob:')) return path;
  return `${API_URL}${path}`;
}

export default client;
