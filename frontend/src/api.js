import axios from 'axios';
import { createStaticDemoAdapter } from './mockApi';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const useStaticDemo = import.meta.env.VITE_STATIC_DEMO === 'true'
  || (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io'));

export const api = axios.create({
  baseURL: apiBaseUrl,
  ...(useStaticDemo ? { adapter: createStaticDemoAdapter() } : {})
});
