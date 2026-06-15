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
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Superbills</h1>
          <p style={{ color: '#64748b', maxWidth: 720 }}>
            Encounter slips capturing diagnosis + procedure codes for a
            single patient visit. Draft → finalize → PDF.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New superbill'}
        </button>
      </header>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}
      {actionMsg && (
        <div style={{ color: '#15803d', marginBottom: 12 }}>{actionMsg}</div>
      )}

      {showForm && (
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: 8, padding: 16,
          marginBottom: 16, background: '#f8fafc',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <label>
              <div style={{ fontSize: 12, color: '#475569' }}>Patient ID *</div>
              <input
                type="number"
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                style={{ width: '100%' }}
              />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#475569' }}>Provider ID *</div>
              <input
                type="text"
                value={form.providerId}
                onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))}
                placeholder="e.g. NPI or internal id"
                style={{ width: '100%' }}
              />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#475569' }}>Service date</div>
              <input
                type="date"
                value={form.serviceDate}
                onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#475569' }}>
              Diagnosis codes (space or comma separated)
            </div>
            <input
              type="text"
              value={form.diagnosisInput}
              onChange={(e) => setForm((f) => ({ ...f, diagnosisInput: e.target.value }))}
              placeholder="J18.9 I10 E11.9"
              style={{ width: '100%' }}
            />
          </label>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Procedures *</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                  <th style={{ padding: 4, width: '40%' }}>Code</th>
                  <th style={{ padding: 4, width: '15%' }}>Modifier</th>
                  <th style={{ padding: 4, width: '15%' }}>Units</th>
                  <th style={{ padding: 4, width: '30%' }}>Charge</th>
                </tr>
              </thead>
              <tbody>
                {form.procedures.map((p, i) => (
                  <tr key={i}>
                    <td style={{ padding: 4 }}>
                      <BillingCodeAutocomplete
                        id={`sb-cpt-${i}`}
                        type="cpt"
                        value={p.code}
                        onChange={(v) => updateProcedure(i, { code: v })}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <input
                        type="text"
                        value={p.modifier}
                        onChange={(e) => updateProcedure(i, { modifier: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <input
                        type="number"
                        min={1}
                        value={p.units}
                        onChange={(e) => updateProcedure(i, { units: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.charge}
                        onChange={(e) => updateProcedure(i, { charge: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addProcedureRow} style={{ marginTop: 6, fontSize: 12 }}>
              + Add procedure row
            </button>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#475569' }}>Notes (optional)</div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ width: '100%' }}
            />
          </label>

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { void handleCreate(); }}
              disabled={creating || !canManage}
              aria-busy={creating}
              title={!canManage ? NO_PERMISSION : undefined}
            >
              {creating ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </div>
      )}

      {isLoading && <div>Loading…</div>}
      {!isLoading && rows.length === 0 && !error && (
        <div style={{ color: '#64748b' }}>No superbills yet.</div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Service date</th>
              <th style={{ padding: 8 }}>Patient</th>
              <th style={{ padding: 8 }}>Provider</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((sb) => {
              const diagnoses = parseCodes(sb.diagnosisCodes);
              return (
                <tr key={sb.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>#{sb.id}</td>
                  <td style={{ padding: 8 }}>{new Date(sb.serviceDate).toLocaleDateString()}</td>
                  <td style={{ padding: 8 }}>#{sb.patientId}</td>
                  <td style={{ padding: 8 }}>{sb.providerId}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{money(sb.totalCharge)}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      background: sb.status === 'finalized' ? '#dcfce7' : '#fef3c7',
                      color: sb.status === 'finalized' ? '#166534' : '#92400e',
                    }}>
                      {sb.status}
                    </span>
                    {diagnoses.length > 0 && (
                      <span style={{ marginLeft: 8, color: '#64748b', fontSize: 12 }}>
                        Dx: {diagnoses.slice(0, 2).join(', ')}
                        {diagnoses.length > 2 && ` +${diagnoses.length - 2}`}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 8, display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === sb.id ? null : sb.id)}
                      style={{ fontSize: 12 }}
                    >
                      {selectedId === sb.id ? 'Hide' : 'View'}
                    </button>
                    {sb.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => { void handleFinalize(sb); }}
                        disabled={!canManage}
                        title={!canManage ? NO_PERMISSION : undefined}
                        style={{ fontSize: 12 }}
                      >
                        Finalize
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { void handlePdf(sb); }}
                      disabled={!canManage}
                      title={!canManage ? NO_PERMISSION : undefined}
                      style={{ fontSize: 12 }}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected && (
        <div style={{
          marginTop: 16, border: '1px solid #cbd5e1',
          borderRadius: 8, padding: 16, background: '#f8fafc',
        }}>
          <h2 style={{ marginTop: 0 }}>Superbill #{selected.id} detail</h2>
          <div style={{ marginBottom: 8 }}>
            <strong>Diagnoses:</strong>{' '}
            {parseCodes(selected.diagnosisCodes).join(', ') || '—'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: 4 }}>Code</th>
                <th style={{ padding: 4 }}>Modifier</th>
                <th style={{ padding: 4 }}>Units</th>
                <th style={{ padding: 4 }}>Charge</th>
              </tr>
            </thead>
            <tbody>
              {parseProcedures(selected.procedureCodes).map((p, i) => (
                <tr key={i}>
                  <td style={{ padding: 4, fontFamily: 'monospace' }}>{p.code}</td>
                  <td style={{ padding: 4, fontFamily: 'monospace' }}>{p.modifier ?? ''}</td>
                  <td style={{ padding: 4 }}>{p.units}</td>
                  <td style={{ padding: 4 }}>{money(p.charge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected.notes && (
            <div style={{ marginTop: 8, color: '#475569' }}>
              <strong>Notes:</strong> {selected.notes}
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>Page {page} of {totalPages} · {total.toLocaleString()} rows</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
