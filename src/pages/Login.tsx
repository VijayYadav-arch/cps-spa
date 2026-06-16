import { useSearchParams } from 'react-router-dom';
import { SsoButton } from '@/auth/SsoButton';
import { DevLoginForm } from '@/auth/DevLoginForm';
import { useDevAuth } from '@/auth/msalConfig';

export function Login() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const devMode = useDevAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-4 py-10">
      <header className="flex flex-col items-center text-center">
        <img src="/brand/mira-wordmark.svg" alt="Mira" className="h-14 w-auto" />
        <p className="mt-2 max-w-xs text-sm font-medium tracking-wide text-slate-500">
          The AI-native platform for hospice &amp; home-health.
        </p>
      </header>

      {reason === 'expired' && (
        <div
          role="alert"
          className="w-full max-w-sm rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info"
        >
          Your session ended. Please sign in again.
        </div>
      )}

      {reason === 'invalid_token' && (
        <div
          role="alert"
          className="w-full max-w-sm rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 text-sm text-accent-700"
        >
          Sign-in could not be completed. Contact your administrator if this persists.
        </div>
      )}

      {devMode ? <DevLoginForm /> : <SsoButton />}
    </div>
  );
}

export default Login;
