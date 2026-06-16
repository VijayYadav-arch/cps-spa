import { useEffect, useState } from 'react';
import { BillingCodeAutocomplete } from '@/components/BillingCodeAutocomplete';
import {
  createSuperbill,
  downloadSuperbillPdf,
  finalizeSuperbill,
  listSuperbills,
  type CreateSuperbillRequest,
  type Superbill,
  type SuperbillProcedure,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const PAGE_SIZE = 25;

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function parseCodes(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch { return []; }
}

function parseProcedures(json: string): SuperbillProcedure[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as SuperbillProcedure[]) : [];
  } catch { return []; }
}

interface FormProcedureRow {
  code: string;
  modifier: string;
  units: string;
  charge: string;
}

const EMPTY_FORM: {
  patientId: string;
  providerId: string;
  serviceDate: string;
  diagnosisInput: string;
  procedures: FormProcedureRow[];
  notes: string;
} = {
  patientId: '',
  providerId: '',
  serviceDate: new Date().toISOString().slice(0, 10),
  diagnosisInput: '',
  procedures: [{ code: '', modifier: '', units: '1', charge: '' }],
  notes: '',
};

export function SuperbillsPage() {
  const [rows, setRows] = useState<Superbill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Create/finalize/PDF all hit the SuperbillsController (policy billing:superbills).
  const canManage = usePermission(PERMISSIONS.BILLING_SUPERBILLS);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listSuperbills({ page, pageSize: PAGE_SIZE });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load superbills';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = selectedId != null ? rows.find((r) => r.id === selectedId) ?? null : null;

  const handleCreate = async () => {
    setCreating(true);
    setActionMsg(null);
    setError(null);
    try {
      const procs: SuperbillProcedure[] = form.procedures
        .filter((p) => p.code.trim())
        .map((p) => ({
          code: p.code.trim(),
          modifier: p.modifier.trim() || null,
          units: Number(p.units) || 1,
          charge: Number(p.charge) || 0,
        }));
      const diagnoses = form.diagnosisInput
        .split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
      const req: CreateSuperbillRequest = {
        patientId: Number(form.patientId),
        providerId: form.providerId.trim(),
        serviceDate: new Date(form.serviceDate).toISOString(),
        diagnosisCodes: diagnoses,
        procedureCodes: procs,
        notes: form.notes.trim() || null,
      };
      if (!req.patientId || !req.providerId || procs.length === 0) {
        setError('Patient ID, Provider, and at least one procedure are required.');
        setCreating(false);
        return;
      }
      const created = await createSuperbill(req);
      setActionMsg(`Created superbill #${created.id}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Create failed';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleFinalize = async (sb: Superbill) => {
    setActionMsg(null);
    try {
      await finalizeSuperbill(sb.id);
      setActionMsg(`Finalized superbill #${sb.id}`);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Finalize failed';
      setError(message);
    }
  };

  const handlePdf = async (sb: Superbill) => {
    setError(null);
    try {
      const blob = await downloadSuperbillPdf(sb.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superbill-${sb.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF download failed');
    }
  };

  const updateProcedure = (idx: number, patch: Partial<FormProcedureRow>) => {
    setForm((f) => ({
      ...f,
      procedures: f.procedures.map((row, i) => i === idx ? { ...row, ...patch } : row),
    }));
  };

  const addProcedureRow = () => {
    setForm((f) => ({
      ...f,
      procedures: [...f.procedures, { code: '', modifier: '', units: '1', charge: '' }],
    }));
  };

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl">Superbills</h2>
          <div className="section-line" />
          <p className="max-w-3xl text-slate-500">
            Encounter slips capturing diagnosis + procedure codes for a
            single patient visit. Draft → finalize → PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {showForm ? 'Cancel' : '+ New superbill'}
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}
      {actionMsg && (
        <div className="rounded-lg border-l-4 border-success bg-green-50 px-4 py-3 font-semibold text-green-800">{actionMsg}</div>
      )}

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Patient ID *</span>
              <input
                type="number"
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Provider ID *</span>
              <input
                type="text"
                value={form.providerId}
                onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))}
                placeholder="e.g. NPI or internal id"
                className="form-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Service date</span>
              <input
                type="date"
                value={form.serviceDate}
                onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))}
                className="form-input"
              />
            </label>
          </div>
          <label className="mt-4 grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">
              Diagnosis codes (space or comma separated)
            </span>
            <input
              type="text"
              value={form.diagnosisInput}
              onChange={(e) => setForm((f) => ({ ...f, diagnosisInput: e.target.value }))}
              placeholder="J18.9 I10 E11.9"
              className="form-input"
            />
          </label>

          <div className="mt-4">
            <div className="mb-1 text-sm font-medium text-slate-600">Procedures *</div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="w-2/5 px-1 py-1">Code</th>
                  <th className="w-[15%] px-1 py-1">Modifier</th>
                  <th className="w-[15%] px-1 py-1">Units</th>
                  <th className="w-[30%] px-1 py-1">Charge</th>
                </tr>
              </thead>
              <tbody>
                {form.procedures.map((p, i) => (
                  <tr key={i}>
                    <td className="px-1 py-1">
                      <BillingCodeAutocomplete
                        id={`sb-cpt-${i}`}
                        type="cpt"
                        value={p.code}
                        onChange={(v) => updateProcedure(i, { code: v })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={p.modifier}
                        onChange={(e) => updateProcedure(i, { modifier: e.target.value })}
                        className="form-input"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min={1}
                        value={p.units}
                        onChange={(e) => updateProcedure(i, { units: e.target.value })}
                        className="form-input"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.charge}
                        onChange={(e) => updateProcedure(i, { charge: e.target.value })}
                        className="form-input"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addProcedureRow}
              className="mt-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              + Add procedure row
            </button>
          </div>

          <label className="mt-4 grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Notes (optional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="form-input"
            />
          </label>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => { void handleCreate(); }}
              disabled={creating || !canManage}
              aria-busy={creating}
              title={!canManage ? NO_PERMISSION : undefined}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </div>
      )}

      {isLoading && <div role="status" className="text-slate-500">Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div className="text-slate-500">No superbills yet.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Service date</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sb) => {
                const diagnoses = parseCodes(sb.diagnosisCodes);
                return (
                  <tr key={sb.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">#{sb.id}</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(sb.serviceDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-700">#{sb.patientId}</td>
                    <td className="px-4 py-3 text-slate-700">{sb.providerId}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{money(sb.totalCharge)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        sb.status === 'finalized' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sb.status}
                      </span>
                      {diagnoses.length > 0 && (
                        <span className="ml-2 text-xs text-slate-500">
                          Dx: {diagnoses.slice(0, 2).join(', ')}
                          {diagnoses.length > 2 && ` +${diagnoses.length - 2}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(selectedId === sb.id ? null : sb.id)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          {selectedId === sb.id ? 'Hide' : 'View'}
                        </button>
                        {sb.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => { void handleFinalize(sb); }}
                            disabled={!canManage}
                            title={!canManage ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Finalize
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { void handlePdf(sb); }}
                          disabled={!canManage}
                          title={!canManage ? NO_PERMISSION : undefined}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Superbill #{selected.id} detail</h3>
          <div className="mt-2 text-slate-700">
            <strong>Diagnoses:</strong>{' '}
            {parseCodes(selected.diagnosisCodes).join(', ') || '—'}
          </div>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-1 py-1">Code</th>
                <th className="px-1 py-1">Modifier</th>
                <th className="px-1 py-1">Units</th>
                <th className="px-1 py-1">Charge</th>
              </tr>
            </thead>
            <tbody>
              {parseProcedures(selected.procedureCodes).map((p, i) => (
                <tr key={i}>
                  <td className="px-1 py-1 font-mono text-slate-700">{p.code}</td>
                  <td className="px-1 py-1 font-mono text-slate-700">{p.modifier ?? ''}</td>
                  <td className="px-1 py-1 text-slate-700">{p.units}</td>
                  <td className="px-1 py-1 text-slate-700">{money(p.charge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected.notes && (
            <div className="mt-2 text-slate-600">
              <strong>Notes:</strong> {selected.notes}
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages} · {total.toLocaleString()} rows</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
