import axios from 'axios';
import { useDevAuth } from '@/auth/msalConfig';
import { getAccessToken } from '@/auth/getAccessToken';
import { getDevClaims, serializeDevClaims } from '@/auth/devLogin';

export const apiClient = axios.create({
  baseURL: '/api/v2',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (useDevAuth()) {
    const claims = getDevClaims();
    if (claims) {
      config.headers.set('X-Dev-Claims', serializeDevClaims(claims));
    }
  } else {
    const token = await getAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (err: unknown) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 401
    ) {
      window.location.href = '/login?reason=expired';
    }
    return Promise.reject(err);
  }
);
