import axios from 'axios';

// Every request goes through this Axios instance. The JWT is attached automatically.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('pf_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('pf_token');
      localStorage.removeItem('pf_user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export function errMsg(e) {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return d || e?.message || 'Something went wrong';
}

export default api;
