import axios from 'axios';

/**
 * Axios instance for family-member API calls (uses FamilyJwt scheme).
 *
 * Token source: sessionStorage 'cps-family-token' (managed by PortalAuthContext.loginAsFamily).
 * 401 handling: clear family-* keys + redirect to /family/login?reason=expired.
 *
 * Do NOT use this instance for staff API calls — use apiClient (src/api/client.ts) instead.
 * Do NOT use this instance for patient-self-service API calls — use portalApi/portalClient instead.
 *
 * baseURL chosen to match the cps-dotnet FamilyJwt scheme route prefix (/family-api/...).
 * Family pages should call e.g. familyApi.get('/dashboard') which maps to /family-api/dashboard.
 */
export const familyApi = axios.create({
  baseURL: '/family-api',
});

familyApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('cps-family-token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

familyApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      sessionStorage.removeItem('cps-family-token');
      sessionStorage.removeItem('cps-family-expires-at');
      sessionStorage.removeItem('cps-family-patient-id');
      sessionStorage.removeItem('cps-family-access-id');
      // Redirect to family login. Use window.location.href to fully reset React state.
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/family/login')) {
        window.location.href = '/family/login?reason=expired';
      }
    }
    return Promise.reject(error);
  }
);
