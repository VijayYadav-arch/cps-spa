import { useEffect, useState } from 'react';
import {
  getMedications,
  createMedication,
  updateMedication,
  recordAdministration,
  type Medication,
  type CreateMedicationRequest,
  type AdministrationStatus,
} from '@/api/clinical';
import { getPatients, type PatientSummary } from '@/api/patients';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const ROUTES = ['oral', 'IV', 'topical', 'sublingual', 'inhaled', 'subcutaneous'];
const FREQUENCIES = ['daily', 'BID', 'TID', 'QID', 'PRN', 'weekly'];
const ADMIN_STATUSES: AdministrationStatus[] = ['given', 'held', 'refused', 'missed'];

interface AdminState {
  med: Medication;
  status: AdministrationStatus;
  dose: string;
  notes: string;
}

interface FormState {
  id: number | null;
  patientId: string;
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  purpose: string;
  isHospiceRelated: boolean;
  isActive: boolean;
}

const blankForm: FormState = {
  id: null,
  patientId: '',
  name: '',
  dosage: '',
  route: 'oral',
  frequency: 'daily',
  purpose: '',
  isHospiceRelated: false,
  isActive: true,
};

export function MedicationsPage() {
  const canManage = usePermission(PERMISSIONS.CLINICAL_MEDICATIONS);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [admin, setAdmin] = useState<AdminState | null>(null);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    getMedications()
      .then((r) => setMeds(r.data ?? []))
      .catch(() => setError('Failed to load medications'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    getPatients({ pageSize: 200 })
      .then((r) => setPatients(r.data))
      .catch(() => undefined);
  }, []);

  const activeCount = meds.filter((m) => m.isActive).length;
  const hospiceRelatedCount = meds.filter((m) => m.isHospiceRelated).length;

  function openAdd() {
    setForm({ ...blankForm });
  }
  function openEdit(m: Medication) {
    setForm({
      id: m.id,
      patientId: String(m.patientId),
      name: m.name,
      dosage: m.dosage,
      route: m.route,
      frequency: m.frequency,
      purpose: m.purpose ?? '',
      isHospiceRelated: m.isHospiceRelated ?? false,
      isActive: m.isActive,
    });
  }

  async function handleSubmit() {
    if (!form) return;
    setSubmitting(true);
    setError(null);
    try {
      if (form.id == null) {
        const req: CreateMedicationRequest = {
          patientId: parseInt(form.patientId, 10),
          name: form.name,
          dosage: form.dosage,
          route: form.route,
          frequency: form.frequency,
          purpose: form.purpose || null,
          isHospiceRelated: form.isHospiceRelated,
          isActive: form.isActive,
        };
        await createMedication(req);
      } else {
        await updateMedication(form.id, {
          name: form.name,
          dosage: form.dosage,
          route: form.route,
          frequency: form.frequency,
          purpose: form.purpose || null,
          isHospiceRelated: form.isHospiceRelated,
          isActive: form.isActive,
        });
      }
      setForm(null);
      refresh();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not save the medication.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openAdminister(m: Medication) {
    setAdminMsg(null);
    setAdmin({ med: m, status: 'given', dose: m.dosage, notes: '' });
  }

  async function handleRecordAdministration() {
    if (!admin) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordAdministration({
        medicationId: admin.med.id,
        status: admin.status,
        dose: admin.dose || null,
        notes: admin.notes || null,
      });
      setAdminMsg(`Recorded ${admin.status} for ${admin.med.name}.`);
      setAdmin(null);
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not record the administration.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(m: Medication) {
    try {
      await updateMedication(m.id, { isActive: !m.isActive });
      refresh();
    } catch {
      setError('Could not update the medication.');
    }
  }

  const editing = form?.id != null;

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-slate-900">Medications</h1>
          <p className="text-slate-600 mt-1">Patient medication management and reconciliation</p>
        </div>
        {!form && (
          <button
            onClick={openAdd}
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Medication
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-500">Active Medications</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-500">Hospice-Related</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{hospiceRelatedCount}</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {adminMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">{adminMsg}</p>
        </div>
      )}

      {admin && (
        <div
          role="dialog"
          aria-label="Record administration"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-lg grid gap-4">
            <h2 className="text-lg font-semibold">Administer — {admin.med.name}</h2>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Outcome</span>
              <select
                value={admin.status}
                onChange={(e) =>
                  setAdmin({ ...admin, status: e.target.value as AdministrationStatus })
                }
                className="form-input w-48"
              >
                {ADMIN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Dose</span>
              <input
                value={admin.dose}
                onChange={(e) => setAdmin({ ...admin, dose: e.target.value })}
                className="form-input w-40"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Notes (reason if held/refused)</span>
              <textarea
                value={admin.notes}
                onChange={(e) => setAdmin({ ...admin, notes: e.target.value })}
                rows={2}
                className="form-input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAdmin(null)}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordAdministration}
                disabled={submitting}
                className="btn-primary disabled:opacity-60"
              >
                {submitting ? 'Recording…' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {form && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid gap-4">
          <h2 className="text-lg font-semibold">{editing ? 'Edit medication' : 'Add medication'}</h2>
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
              <span className="text-sm font-medium text-slate-600">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input w-56"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Dosage</span>
              <input
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                placeholder="e.g. 10mg"
                className="form-input w-32"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Route</span>
              <select
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                className="form-input w-40"
              >
                {ROUTES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Frequency</span>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="form-input w-32"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Purpose</span>
              <input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. pain"
                className="form-input w-40"
              />
            </label>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isHospiceRelated}
                onChange={(e) => setForm({ ...form, isHospiceRelated: e.target.checked })}
              />
              Hospice-related
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>
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
              disabled={
                submitting ||
                !form.name ||
                !form.dosage ||
                (!editing && !form.patientId)
              }
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add medication'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading medications...</div>
        ) : meds.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No medications recorded</p>
            <p className="text-sm">Patient medications will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Dosage</th>
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Frequency</th>
                <th className="px-5 py-3">Purpose</th>
                <th className="px-5 py-3">Hospice Related</th>
                <th className="px-5 py-3">Active</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meds.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium">
                    {m.name}
                    {m.genericName && (
                      <span className="text-xs text-slate-400 ml-1">({m.genericName})</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">{m.dosage}</td>
                  <td className="px-5 py-4 text-sm capitalize">{m.route}</td>
                  <td className="px-5 py-4 text-sm">{m.frequency}</td>
                  <td className="px-5 py-4 text-sm capitalize">{m.purpose ?? '—'}</td>
                  <td className="px-5 py-4 text-sm">
                    {m.isHospiceRelated === true ? (
                      <span className="text-green-600 font-semibold">Yes</span>
                    ) : m.isHospiceRelated === false ? (
                      <span className="text-slate-400">No</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {m.isActive ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {canManage && (
                      <span className="flex gap-2">
                        {m.isActive && (
                          <button
                            onClick={() => openAdminister(m)}
                            className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                          >
                            Administer
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(m)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(m)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          {m.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
