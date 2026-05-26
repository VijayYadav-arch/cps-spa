import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useDevAuth } from './msalConfig';

export function SsoButton() {
  const { loginWithSSO } = useContext(AuthContext);
  const disabled = useDevAuth();
  return (
    <button
      type="button"
      onClick={() => void loginWithSSO()}
      disabled={disabled}
      title={
        disabled ? 'B2C not configured in this environment' : 'Sign in with company SSO'
      }
      className="sso-button"
    >
      Sign in with company SSO
    </button>
  );
}
