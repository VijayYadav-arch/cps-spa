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

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 ' +
    'focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';
  const labelClass = 'text-sm font-medium text-slate-700';
  const errorClass = 'text-xs text-red-600';

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Dev login form"
      className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm"
    >
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-900">Dev Identity Picker</h2>
        <p className="mt-1 text-sm text-amber-600">
          Dev mode: B2C is not active in this environment.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dev-userid" className={labelClass}>User ID</label>
        <input
          id="dev-userid"
          type="text"
          inputMode="numeric"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className={inputClass}
        />
        {error?.field === 'userId' && (
          <span className={errorClass} role="alert">User ID must be a positive integer</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dev-orgid" className={labelClass}>Organization ID</label>
        <input
          id="dev-orgid"
          type="text"
          inputMode="numeric"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className={inputClass}
        />
        {error?.field === 'organizationId' && (
          <span className={errorClass} role="alert">Organization ID must be a positive integer</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dev-roles" className={labelClass}>Roles (comma-separated)</label>
        <input
          id="dev-roles"
          type="text"
          value={roles}
          onChange={(e) => setRoles(e.target.value)}
          placeholder="system_admin, billing_admin"
          className={inputClass}
        />
        {error?.field === 'roles' && (
          <span className={errorClass} role="alert">At least one role is required</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dev-perms" className={labelClass}>Permissions (comma-separated)</label>
        <input
          id="dev-perms"
          type="text"
          value={perms}
          onChange={(e) => setPerms(e.target.value)}
          placeholder="patients:view, claims:view, hospice:manage"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
      >
        Sign in as dev
      </button>
    </form>
  );
}
