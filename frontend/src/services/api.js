import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (data) => api.post('/api/auth/register', data),
  demoLogin: (role) => api.post(`/api/auth/demo-login?role=${role}`),
};

// ─── Patients ──────────────────────────────────────────────────────────────

export const patientAPI = {
  getAll: () => api.get('/api/patients/'),
  getById: (id) => api.get(`/api/patients/${id}`),
  create: (data) => api.post('/api/patients/', data),
  update: (id, data) => api.put(`/api/patients/${id}`, data),
  delete: (id) => api.delete(`/api/patients/${id}`),
  stats: () => api.get('/api/patients/stats/summary'),
};

// ─── Vitals ────────────────────────────────────────────────────────────────

export const vitalsAPI = {
  snapshot: (patientId) => api.get(`/api/vitals/${patientId}`),
  allSnapshot: () => api.get('/api/vitals/all/snapshot'),
};

// ─── Predictions ───────────────────────────────────────────────────────────

export const predictAPI = {
  heart: (data) => api.post('/api/predict/heart', data),
  diabetes: (data) => api.post('/api/predict/diabetes', data),
  healthScore: (patientId) => api.get(`/api/predict/health-score/${patientId}`),
  quick: (patientId) => api.get(`/api/predict/quick/${patientId}`),
};

// ─── Alerts ────────────────────────────────────────────────────────────────

export const alertAPI = {
  getAll: () => api.get('/api/alerts/'),
  getActive: () => api.get('/api/alerts/active'),
  resolve: (id) => api.put(`/api/alerts/${id}/resolve`),
};

// ─── Reports ───────────────────────────────────────────────────────────────

export const reportAPI = {
  daily: (patientId) => api.get(`/api/reports/daily/${patientId}`),
  weekly: (patientId) => api.get(`/api/reports/weekly/${patientId}`),
  overview: () => api.get('/api/reports/analytics/overview'),
};

// ─── Admin ─────────────────────────────────────────────────────────────────

export const adminAPI = {
  stats: () => api.get('/api/admin/stats'),
  users: () => api.get('/api/admin/users'),
  systemHealth: () => api.get('/api/admin/system-health'),
  getAuditLogs: () => api.get('/api/admin/audit'),
};

// ─── Chatbot ───────────────────────────────────────────────────────────────

export const chatbotAPI = {
  message: (message, patient_id = null, image_data = null) => api.post('/api/chatbot/message', { message, patient_id, image_data }),
};

// ─── Clinical AI ────────────────────────────────────────────────────────────

export const clinicalAPI = {
  soap: (patientId) => api.get(`/api/clinical/soap/${patientId}`),
  forecast: (patientId) => api.get(`/api/clinical/forecast/${patientId}`),
  copilot: (patientId) => api.get(`/api/clinical/copilot/${patientId}`),
  /** POST /api/patients/{id}/intervention — triggers live status change & HIPAA audit */
  intervention: (patientId, treatment) =>
    api.post(`/api/patients/${patientId}/intervention`, { treatment }),
};

// ─── WebSocket helper ──────────────────────────────────────────────────────

export const WS_BASE = BASE_URL.replace('http', 'ws');

export function createVitalsSocket(patientId, onMessage, onError) {
  const ws = new WebSocket(`${WS_BASE}/ws/vitals/${patientId}`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  ws.onerror = onError || console.error;
  ws.onclose = () => console.log(`WS closed for ${patientId}`);
  return ws;
}

export function createAllVitalsSocket(onMessage, onError) {
  const ws = new WebSocket(`${WS_BASE}/ws/all`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  ws.onerror = onError || console.error;
  return ws;
}
