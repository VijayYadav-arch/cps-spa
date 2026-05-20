import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { portalLogin, portalMe, type PortalMe } from './portalApi';

interface PortalAuthState {
  me: PortalMe | null;
  loading: boolean;
  login: (patientId: number, pin: string) => Promise<void>;
  logout: () => void;
}

const PortalAuthContext = createContext<PortalAuthState | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<PortalMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('cps_portal_token');
    if (!token) {
      setLoading(false);
      return;
    }
    portalMe()
      .then(setMe)
      .catch(() => {
        sessionStorage.removeItem('cps_portal_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (patientId: number, pin: string) => {
    const res = await portalLogin({ patientId, pin });
    sessionStorage.setItem('cps_portal_token', res.token);
    sessionStorage.setItem('cps_portal_patient_id', String(patientId));
    const meData = await portalMe();
    setMe(meData);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('cps_portal_token');
    sessionStorage.removeItem('cps_portal_patient_id');
    setMe(null);
    window.location.href = '/portal/login';
  }, []);

  const value = useMemo<PortalAuthState>(
    () => ({ me, loading, login, logout }),
    [me, loading, login, logout],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth(): PortalAuthState {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used inside PortalAuthProvider');
  return ctx;
}
