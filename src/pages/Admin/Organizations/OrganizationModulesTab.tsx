import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import { ModuleSelector } from './ModuleSelector';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

/**
 * Per-org service-line entitlement management (platform admin's switch panel).
 * Loads GET /api/v2/admin/organizations/{orgId}/modules, edits via ModuleSelector, saves the exact
 * allowlist with PUT. Gated by ADMIN_SYSTEM_CONFIG — mirrors the controller's admin:system_config.
 */
export function OrganizationModulesTab() {
  const { id } = useParams();
  const orgId = id ? parseInt(id, 10) : NaN;
  const [selected, setSelected] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canManage = usePermission(PERMISSIONS.ADMIN_SYSTEM_CONFIG);

  useEffect(() => {
    if (Number.isNaN(orgId)) return;
    setError(null);
    orgsApi
      .getModules(orgId)
      .then((r) => setSelected(r.enabled))
      .catch((e: Error) => setError(e.message));
  }, [orgId]);

  async function onSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await orgsApi.setModules(orgId, selected);
      setSelected(res.enabled);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-3xl mx-auto p-4 lg:p-8">
      <div className="mb-4">
        <Link to={`/admin/organizations/${orgId}`} className="text-sm text-teal-600 hover:underline">
          ← Back to organization
        </Link>
      </div>
      <h1 className="text-2xl font-serif text-navy-900 mb-2">Service-line modules</h1>
      <p className="text-sm text-navy-500 mb-6">
        Control which service lines this organization has purchased. Users still need the relevant
        permission — a module only unlocks the feature area for the org.
      </p>

      {error && (
        <p role="alert" className="text-red-600 text-sm mb-4">
          {error}
        </p>
      )}

      {selected === null && !error && (
        <p role="status" className="text-navy-500">
          Loading…
        </p>
      )}

      {selected !== null && (
        <div className="bg-white border border-navy-100 rounded-md p-4 lg:p-6 flex flex-col gap-6">
          <ModuleSelector value={selected} onChange={setSelected} disabled={!canManage || saving} />

          <div className="flex items-center gap-3 justify-end border-t border-navy-100 pt-4">
            {saved && <span className="text-sm text-green-700 mr-auto">Saved.</span>}
            <button
              type="button"
              disabled={saving || !canManage}
              onClick={onSave}
              title={!canManage ? NO_PERMISSION : undefined}
              className="px-6 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md bg-teal-600 text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save modules'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
