import { useState, type FormEvent } from 'react';
import { useDevAuth } from './msalConfig';
import { setDevClaims, getDevClaims } from './devLogin';
import { DevClaimsValidationError } from './errors';

export function DevLoginForm() {
  const isDevAuth = useDevAuth();
  const initial = getDevClaims();
  const [userId, setUserId] = useState(String(initial?.userId ?? '1'));
  const [orgId, setOrgId] = useState(String(initial?.organizationId ?? '1'));
  const [roles, setRoles] = useState((initial?.roles ?? ['system_admin']).join(', '));
  const [perms, setPerms] = useState((initial?.permissions ?? []).join(', '));
  const [error, setError] = useState<DevClaimsValidationError | null>(null);

  if (!isDevAuth) return null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const parsedUserId = Number(userId);
      if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
        throw new DevClaimsValidationError('userId', 'must be a positive integer');
      }
      const parsedOrgId = orgId.trim() === '' ? undefined : Number(orgId);
      if (parsedOrgId !== undefined && (!Number.isInteger(parsedOrgId) || parsedOrgId <= 0)) {
        throw new DevClaimsValidationError('organizationId', 'must be a positive integer or empty');
      }
      const parsedRoles = roles.split(',').map((s) => s.trim()).filter(Boolean);
      if (parsedRoles.length === 0) {
        throw new DevClaimsValidationError('roles', 'at least one role is required');
      }
      const parsedPerms = perms.split(',').map((s) => s.trim()).filter(Boolean);

      setError(null);
      setDevClaims({
        userId: parsedUserId,
        organizationId: parsedOrgId,
        roles: parsedRoles,
        permissions: parsedPerms,
      });
    } catch (err) {
      if (err instanceof DevClaimsValidationError) setError(err);
      else throw err;
    }
  };

  return (
    <form onSubmit={onSubmit} className="dev-login-form" aria-label="Dev login form">
      <h2>Dev Identity Picker</h2>
      <p className="dev-warning">Dev mode: B2C is not active in this environment.</p>

      <label htmlFor="dev-userid">User ID</label>
      <input
        id="dev-userid"
        type="text"
        inputMode="numeric"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      {error?.field === 'userId' && (
        <span className="field-error" role="alert">User ID must be a positive integer</span>
      )}

      <label htmlFor="dev-orgid">Organization ID</label>
      <input
        id="dev-orgid"
        type="text"
        inputMode="numeric"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
      />
      {error?.field === 'organizationId' && (
        <span className="field-error" role="alert">Organization ID must be a positive integer</span>
      )}

      <label htmlFor="dev-roles">Roles (comma-separated)</label>
      <input
        id="dev-roles"
        type="text"
        value={roles}
        onChange={(e) => setRoles(e.target.value)}
        placeholder="system_admin, billing_admin"
      />
      {error?.field === 'roles' && (
        <span className="field-error" role="alert">At least one role is required</span>
      )}

      <label htmlFor="dev-perms">Permissions (comma-separated)</label>
      <input
        id="dev-perms"
        type="text"
        value={perms}
        onChange={(e) => setPerms(e.target.value)}
        placeholder="platform:dashboard, claims:view"
      />

      <button type="submit">Sign in as dev</button>
    </form>
  );
}
