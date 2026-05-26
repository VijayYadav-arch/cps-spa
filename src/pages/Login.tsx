import { useSearchParams } from 'react-router-dom';
import { SsoButton } from '@/auth/SsoButton';
import { DevLoginForm } from '@/auth/DevLoginForm';
import { useDevAuth } from '@/auth/msalConfig';

export function Login() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const devMode = useDevAuth();

  return (
    <div className="login-page">
      <header>
        <h1>CPS</h1>
        <p>Care Practice Suite</p>
      </header>

      {reason === 'expired' && (
        <div role="alert" className="login-banner login-banner--info">
          Your session ended. Please sign in again.
        </div>
      )}

      {reason === 'invalid_token' && (
        <div role="alert" className="login-banner login-banner--warning">
          Sign-in could not be completed. Contact your administrator if this persists.
        </div>
      )}

      {devMode ? <DevLoginForm /> : <SsoButton />}
    </div>
  );
}

export default Login;
