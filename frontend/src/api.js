import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

// Turns a relative "/uploads/xyz.png" from the API into an absolute URL.
export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('blob:')) return path;
  return `${API_URL}${path}`;
}

export default client;
