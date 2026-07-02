import '@/styles/clients.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import { initialOrgForm, type CreateOrgRequest } from './orgsTypes';
import { ModuleSelector } from './ModuleSelector';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

/**
 * Single-page create form. Validates name + slug client-side. On success,
 * navigates to /admin/organizations/{created.id}.
 *
 * Layout: grid-cols-1 on mobile, md:grid-cols-2 on tablet+. Touch targets
 * min-h-12 mobile, shrinking at md/lg.
 */
export function NewOrganizationForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateOrgRequest>(initialOrgForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof CreateOrgRequest, string>>>({});

  // POST /organizations is gated by platform:admin on OrganizationsController.Create.
  const canCreate = usePermission(PERMISSIONS.PLATFORM_ADMIN);

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
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await orgsApi.create(form);
      navigate(`/admin/organizations/${created.id}`);
    } catch (e) {
      setError((e as Error).message || 'Failed to create organization');
      setSubmitting(false);
    }
  }

  const inputCls =
    'px-3 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200 focus:border-teal-500';

  return (
    <section className="max-w-3xl mx-auto p-4 lg:p-8">
      <h1 className="text-2xl font-serif text-navy-900 mb-6">New organization</h1>
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

        <div className="md:col-span-2 flex flex-col gap-2 pt-2 border-t border-navy-100">
          <span className="text-sm text-navy-700">Service-line modules</span>
          <p className="text-xs text-navy-500">
            Choose which service lines this organization has purchased. Pick a bundle preset, then
            fine-tune. This can be changed later from the organization's Modules page.
          </p>
          <ModuleSelector
            value={form.modules ?? []}
            onChange={(modules) => set('modules', modules)}
          />
        </div>

        {error && (
          <p role="alert" className="md:col-span-2 text-red-600 text-sm">
            {error}
          </p>
        )}

        <div className="md:col-span-2 flex gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md border border-navy-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !canCreate}
            title={!canCreate ? NO_PERMISSION : undefined}
            className="px-6 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md bg-teal-600 text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </section>
  );
}
