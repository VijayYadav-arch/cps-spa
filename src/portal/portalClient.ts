import axios from 'axios';

/**
 * Separate axios instance for the patient portal. Uses /family-api as base,
 * pulls token from sessionStorage under cps_portal_token. On 401, redirects
 * to /portal/login instead of the staff /login.
 */
export const portalClient = axios.create({
  baseURL: '/family-api',
  headers: { 'Content-Type': 'application/json' },
});

portalClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('cps_portal_token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

portalClient.interceptors.response.use(
  (response) => response,
  (err: unknown) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 401
    ) {
      sessionStorage.removeItem('cps_portal_token');
      sessionStorage.removeItem('cps_portal_patient_id');
      // Avoid redirect loop if already on the login page
      if (!window.location.pathname.startsWith('/portal/login')) {
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(err);
  },
);
