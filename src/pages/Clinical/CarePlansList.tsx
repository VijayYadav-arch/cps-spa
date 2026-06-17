import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCarePlans,
  createCarePlan,
  updateCarePlan,
  parseJsonStringArray,
  type CarePlan,
  type PaginationMeta,
} from '@/api/clinical';
import { getPatients, type PatientSummary } from '@/api/patients';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const PAGE_SIZE = 25;
const NO_PERMISSION = 'You do not have permission to perform this action';
const STATUSES = ['draft', 'active', 'revised', 'discontinued'];

interface FormState {
  id: number | null;
  patientId: string;
  status: string;
  effectiveDate: string;
  reviewDate: string;
  goalsText: string;
  interventionsText: string;
  frequency: string;
}

const blankForm: FormState = {
  id: null,
  patientId: '',
  status: 'draft',
  effectiveDate: new Date().toISOString().slice(0, 10),
  reviewDate: '',
  goalsText: '',
  interventionsText: '',
  frequency: '',
};

// One item per non-empty line → JSON array string.
function linesToJson(text: string): string {
  return JSON.stringify(
    text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  );
}

export function CarePlansList() {
  const navigate = useNavigate();
  const canManage = usePermission(PERMISSIONS.CLINICAL_CARE_PLANS);
  const [items, setItems] = useState<CarePlan[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    getCarePlans({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then((r) => {
        setItems(r.data);
        setPagination(r.pagination);
      })
      .catch(() => setError('Failed to load care plans.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, status]);
  useEffect(() => {
    getPatients({ pageSize: 200 })
      .then((r) => setPatients(r.data))
      .catch(() => undefined);
  }, []);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const editing = form?.id != null;

  function openAdd() {
    setForm({ ...blankForm });
  }
  function openEdit(cp: CarePlan) {
    setForm({
      id: cp.id,
      patientId: String(cp.patientId),
      status: cp.status,
      effectiveDate: cp.effectiveDate.slice(0, 10),
      reviewDate: cp.reviewDate?.slice(0, 10) ?? '',
      goalsText: parseJsonStringArray(cp.goals).join('\n'),
      interventionsText: parseJsonStringArray(cp.interventions).join('\n'),
      frequency: cp.frequency ?? '',
    });
  }

  async function handleSubmit() {
    if (!form) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        status: form.status,
        effectiveDate: new Date(form.effectiveDate).toISOString(),
        reviewDate: form.reviewDate ? new Date(form.reviewDate).toISOString() : null,
        goals: linesToJson(form.goalsText),
        interventions: linesToJson(form.interventionsText),
        frequency: form.frequency || null,
      };
      if (form.id == null) {
        await createCarePlan({ patientId: parseInt(form.patientId, 10), ...payload });
      } else {
        await updateCarePlan(form.id, payload);
      }
      setForm(null);
      load();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not save the care plan.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <button
          onClick={() => navigate('/clinical')}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          ← Clinical Overview
        </button>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Care Plans</h2>
          {!form && (
            <button
              onClick={openAdd}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              New Care Plan
            </button>
          )}
        </div>
        <div className="section-line" />
      </header>

      <div className="flex items-center gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Status</span>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="form-input w-48"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {form && (
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">{editing ? 'Edit care plan' : 'New care plan'}</h3>
          {!editing && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Patient</span>
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="form-input w-72"
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.lastName}, {p.firstName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="form-input w-40"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Effective Date</span>
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                className="form-input w-44"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Next Review</span>
              <input
                type="date"
                value={form.reviewDate}
                onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
                className="form-input w-44"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Visit Frequency</span>
              <input
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                placeholder="RN 2x/week, Aide 3x/week"
                className="form-input w-64"
              />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Goals (one per line)</span>
            <textarea
              value={form.goalsText}
              onChange={(e) => setForm({ ...form, goalsText: e.target.value })}
              rows={3}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Interventions (one per line)</span>
            <textarea
              value={form.interventionsText}
              onChange={(e) => setForm({ ...form, interventionsText: e.target.value })}
              rows={3}
              className="form-input"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setForm(null)}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (!editing && !form.patientId) || !form.effectiveDate}
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create care plan'}
            </button>
          </div>
        </section>
      )}

      {isLoading ? (
        <div role="status" className="text-slate-500">Loading care plans…</div>
      ) : items.length === 0 ? (
        <p className="text-slate-500">No care plans.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Care Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Goals</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Next Review</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cp) => (
                <tr key={cp.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">
                    #{cp.id} <span className="text-xs text-slate-400">v{cp.version}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{cp.status}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {parseJsonStringArray(cp.goals).length} goal(s)
                  </td>
                  <td className="px-4 py-3 text-slate-500">{cp.effectiveDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-500">{cp.reviewDate?.slice(0, 10) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex gap-2">
                      <button
                        onClick={() => navigate(`/patients/${cp.patientId}`)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Patient
                      </button>
                      {canManage && (
                        <button
                          onClick={() => openEdit(cp)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
