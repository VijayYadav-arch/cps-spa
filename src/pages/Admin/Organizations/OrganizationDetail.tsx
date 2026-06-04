import '@/styles/clients.css';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orgsApi } from './orgsApi';
import type { OrganizationDetail as Org } from './orgsTypes';

/**
 * Read-only organization detail with Edit / Soft-delete / Restore actions.
 *
 *  - Edit: navigates to /admin/organizations/{id}/edit.
 *  - Soft-delete: visible only when !org.isDeleted; confirm() + softDelete +
 *    navigate to list.
 *  - Restore: visible only when org.isDeleted; confirm() + restore + reload
 *    the detail in place.
 *
 * Status badge: green=active / amber=inactive / red=deleted.
 */
export function OrganizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Org | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!id) return;
    setError(null);
    orgsApi
      .getById(parseInt(id, 10))
      .then(setOrg)
      .catch((e: Error) => setError(e.message));
  }
  useEffect(load, [id]);

  async function onDelete() {
    if (!org) return;
    if (!window.confirm(`Soft-delete ${org.name}? You can restore it later.`)) return;
    setBusy(true);
    try {
      await orgsApi.softDelete(org.id);
      navigate('/admin/organizations');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function onRestore() {
    if (!org) return;
    if (!window.confirm(`Restore ${org.name}?`)) return;
    setBusy(true);
    try {
      await orgsApi.restore(org.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <p role="alert" className="text-red-600 p-6">
        {error}
      </p>
    );
  if (!org)
    return (
      <p role="status" className="text-navy-500 p-6">
        Loading…
      </p>
    );

  const statusBadge = org.isDeleted ? (
    <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs">Deleted</span>
  ) : org.active ? (
    <span className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs">Active</span>
  ) : (
    <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs">Inactive</span>
  );

  const btnCls = 'px-4 py-2 min-h-12 md:min-h-11 lg:min-h-10 rounded-md';

  return (
    <section className="max-w-4xl mx-auto p-4 lg:p-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-serif text-navy-900">{org.name}</h1>
          {statusBadge}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/organizations/${org.id}/claims`}
            className={`${btnCls} border border-navy-200 text-teal-700 hover:bg-teal-50`}
          >
            View claims ({org.claimsCount})
          </Link>
          <Link
            to={`/admin/organizations/${org.id}/patients`}
            className={`${btnCls} border border-navy-200 text-teal-700 hover:bg-teal-50`}
          >
            View patients ({org.patientsCount})
          </Link>
          <Link
            to={`/admin/organizations/${org.id}/encounters`}
            className={`${btnCls} border border-navy-200 text-teal-700 hover:bg-teal-50`}
          >
            View encounters
          </Link>
          <Link
            to={`/admin/organizations/${org.id}/documents`}
            className={`${btnCls} border border-navy-200 text-teal-700 hover:bg-teal-50`}
          >
            View documents
          </Link>
          <Link
            to={`/admin/organizations/${org.id}/reports`}
            className={`${btnCls} border border-navy-200 text-teal-700 hover:bg-teal-50`}
          >
            View reports
          </Link>
          {!org.isDeleted && (
            <Link
              to={`/admin/organizations/${org.id}/edit`}
              className={`${btnCls} border border-navy-200 text-navy-700 hover:bg-navy-50`}
            >
              Edit
            </Link>
          )}
          {!org.isDeleted && (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className={`${btnCls} border border-red-600 text-red-600 hover:bg-red-50 disabled:opacity-50`}
            >
              Soft-delete
            </button>
          )}
          {org.isDeleted && (
            <button
              type="button"
              disabled={busy}
              onClick={onRestore}
              className={`${btnCls} bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50`}
            >
              Restore
            </button>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 bg-white border border-navy-100 rounded-md p-4 lg:p-6">
        <Row label="Slug" value={org.slug} />
        <Row label="Email" value={org.email ?? '—'} />
        <Row label="Phone" value={org.phone ?? '—'} />
        <Row label="Tax ID" value={org.taxId ?? '—'} />
        <Row
          label="Parent organization"
          value={
            org.parentOrganizationId ? (
              <Link
                to={`/admin/organizations/${org.parentOrganizationId}`}
                className="text-teal-600 hover:underline"
              >
                #{org.parentOrganizationId}
              </Link>
            ) : (
              '—'
            )
          }
        />
        <Row label="Active" value={org.active ? 'Yes' : 'No'} />
        <Row
          label="Address"
          value={org.address ? <span className="whitespace-pre-line">{org.address}</span> : '—'}
          fullWidth
        />
        <Row label="Claims" value={String(org.claimsCount)} />
        <Row label="Patients" value={String(org.patientsCount)} />
        <Row label="Created" value={new Date(org.createdAt).toLocaleString()} />
        <Row label="Updated" value={new Date(org.updatedAt).toLocaleString()} />
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'lg:col-span-2' : ''}>
      <dt className="text-xs text-navy-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-navy-900 mt-1">{value}</dd>
    </div>
  );
}
