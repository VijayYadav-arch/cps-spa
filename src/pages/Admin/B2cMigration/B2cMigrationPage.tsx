import { useEffect, useState } from 'react';
import {
  listB2cOrganizations,
  migrateOrgToB2c,
  type B2cMigrateResult,
  type B2cOrgStatus,
} from '@/api/b2cMigration';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

function OrgCard({ org }: { org: B2cOrgStatus }) {
  const [result, setResult] = useState<B2cMigrateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Send Invitations → POST /admin/b2c-migration/{orgId}/migrate → class-level
  // [Authorize(Policy = Permissions.PlatformAdmin)] ("platform:admin").
  const canMigrate = usePermission(PERMISSIONS.PLATFORM_ADMIN);

  async function handleMigrate() {
    setLoading(true);
    setError(null);
    try {
      const r = await migrateOrgToB2c(org.orgId);
      setResult(r);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      setError(
        err.status === 502
          ? 'Graph API unreachable — check server configuration'
          : err.message ?? 'Migration failed'
      );
    } finally {
      setLoading(false);
    }
  }

  const migrated =
    org.b2CMigrated || (result?.failed === 0 && (result?.invited ?? 0) + (result?.skipped ?? 0) > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{org.orgName}</h3>
          <p className="text-xs text-slate-500">{org.slug}</p>
        </div>
        {migrated && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
            B2C Migrated
          </span>
        )}
      </div>

      <div className="text-sm text-slate-600">
        <span>{org.activeUsers} active</span>
        <span className="text-slate-300 mx-1">&middot;</span>
        <span>{org.totalUsers} total</span>
        {org.b2CMigratedAt && (
          <>
            <span className="text-slate-300 mx-1">&middot;</span>
            <span>Migrated {new Date(org.b2CMigratedAt).toLocaleDateString()}</span>
          </>
        )}
      </div>

      {result && (
        <p className="text-sm text-green-700">
          {result.invited} invited &middot; {result.skipped} skipped &middot; {result.failed} failed
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleMigrate}
        disabled={loading || org.b2CMigrated || !canMigrate}
        title={!canMigrate ? NO_PERMISSION : undefined}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
      >
        {loading ? 'Sending...' : 'Send Invitations'}
      </button>
    </div>
  );
}

export function B2cMigrationPage() {
  const [orgs, setOrgs] = useState<B2cOrgStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listB2cOrganizations()
      .then((data) => {
        if (!cancelled) setOrgs(data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load organizations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-slate-900">B2C Migration</h1>
        <p className="text-slate-500 text-sm mt-1">
          Send Azure AD B2C invitations to all active users per organization. Run this for every
          card before removing the legacy login endpoint.
        </p>
      </header>

      {loading && <p className="text-slate-500 text-sm">Loading...</p>}
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map((org) => (
          <OrgCard key={org.orgId} org={org} />
        ))}
      </div>
    </section>
  );
}
