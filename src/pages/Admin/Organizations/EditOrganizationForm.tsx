import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import { initialOrgForm, type CreateOrgRequest, type OrganizationDetail } from './orgsTypes';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

/**
 * Mirror of NewOrganizationForm with pre-population from the backend.
 *
 * Soft-deleted orgs render a "restore first" message + Restore button
 * rather than the edit form — the backend returns 409 if PUT is called on
 * a soft-deleted org, and there's no value in letting the user fill the
 * form just to fail at submit time.
 */
export function EditOrganizationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateOrgRequest>(initialOrgForm);
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof CreateOrgRequest, string>>>({});

  // Both update (PUT) and restore are gated by admin:manage_orgs on
  // OrganizationsController. The detail GET is claims:view (route guard covers it).
  const canManage = usePermission(PERMISSIONS.ADMIN_MANAGE_ORGS);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    orgsApi
      .getById(parseInt(id, 10))
      .then((o) => {
        setOrg(o);
        setForm({
          name: o.name,
          slug: o.slug,
          email: o.email,
          phone: o.phone,
          address: o.address,
          taxId: o.taxId,
          active: o.active,
          parentOrganizationId: o.parentOrganizationId,
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function set<K extends keyof CreateOrgRequest>(field: K, value: CreateOrgRequest[K]) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateOrgRequest, string>> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.slug.trim()) errs.slug = 'Required';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !org) return;
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await orgsApi.update(parseInt(id, 10), form);
      navigate(`/admin/organizations/${id}`);
    } catch (e) {
      setError((e as Error).message || 'Failed to update organization');
      setSubmitting(false);
    }
  }

  async function onRestore() {
    if (!org) return;
    if (!window.confirm(`Restore ${org.name}?`)) return;
    setSubmitting(true);
    try {
      await orgsApi.restore(org.id);
      navigate(`/admin/organizations/${org.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <p role="status" className="text-navy-500 p-6">
        Loading…
      </p>
    );

  if (error && !org)
    return (
      <p role="alert" className="text-red-600 p-6">
        {error}
      </p>
    );

  if (org?.isDeleted) {
    return (
      <section className="max-w-3xl mx-auto p-4 lg:p-8">
        <h1 className="text-2xl font-serif text-navy-900 mb-4">Edit organization</h1>
        <div className="rounded-md border border-amber-600 bg-amber-50 p-4 text-amber-700">
          <p className="mb-3">
            <strong>{org.name}</strong> is soft-deleted and cannot be edited. Restore it first to
            make changes.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/admin/organizations/${org.id}`)}
              className="px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !canManage}
              onClick={onRestore}
              title={!canManage ? NO_PERMISSION : undefined}
              className="px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md bg-teal-600 text-white disabled:opacity-50"
            >
              {submitting ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const inputCls =
    'px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 focus:border-teal-500';

  return (
    <section className="max-w-3xl mx-auto p-4 lg:p-8">
      <h1 className="text-2xl font-serif text-navy-900 mb-6">Edit organization</h1>
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-navy-700">Name *</span>
          <input
            id="name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={!!validationErrors.name}
            className={inputCls}
          />
          {validationErrors.name && (
            <span className="text-xs text-red-600">{validationErrors.name}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Slug *</span>
          <input
            id="slug"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            aria-invalid={!!validationErrors.slug}
            className={inputCls}
          />
          {validationErrors.slug && (
            <span className="text-xs text-red-600">{validationErrors.slug}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Email</span>
          <input
            id="email"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => set('email', e.target.value || null)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Phone</span>
          <input
            id="phone"
            type="tel"
            value={form.phone ?? ''}
            onChange={(e) => set('phone', e.target.value || null)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Tax ID</span>
          <input
            id="taxId"
            value={form.taxId ?? ''}
            onChange={(e) => set('taxId', e.target.value || null)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-sm text-navy-700">Address</span>
          <textarea
            id="address"
            value={form.address ?? ''}
            onChange={(e) => set('address', e.target.value || null)}
            rows={2}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-navy-700">Parent organization ID</span>
          <input
            id="parentOrganizationId"
            type="number"
            value={form.parentOrganizationId ?? ''}
            onChange={(e) =>
              set('parentOrganizationId', e.target.value ? parseInt(e.target.value, 10) : null)
            }
            className={inputCls}
          />
        </label>

        <label className="flex items-center gap-2 md:col-span-2 min-h-12">
          <input
            id="active"
            type="checkbox"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          <span className="text-sm text-navy-700">Active</span>
        </label>

        {error && (
          <p role="alert" className="md:col-span-2 text-red-600 text-sm">
            {error}
          </p>
        )}

        <div className="md:col-span-2 flex gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/organizations/${id}`)}
            className="px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="px-6 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md bg-teal-600 text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </section>
  );
}
