import axios from 'axios';
import { API_BASE } from './config';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;

// Attach idToken automatically when available
import { getIdToken } from '../auth';

client.interceptors.request.use(async (cfg) => {
  try {
    const token = await getIdToken();
    if (token) {
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return cfg;
}, (err) => Promise.reject(err));