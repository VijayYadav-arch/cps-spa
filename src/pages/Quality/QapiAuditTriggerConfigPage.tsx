import { useEffect, useState } from 'react';
import {
  listAuditTriggers,
  upsertAuditTrigger,
  type HospiceQapiAuditTrigger,
  type HospiceAdverseEventCategory,
  type HospiceAdverseEventSeverity,
} from '@/api/qapi';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const CATEGORIES: HospiceAdverseEventCategory[] = ['PatientFall', 'MedicationError', 'UnscheduledHospitalization', 'Complaint', 'GipDeath', 'Other'];
const SEVERITIES: HospiceAdverseEventSeverity[] = ['Minor', 'Moderate', 'Major', 'Critical'];

export function QapiAuditTriggerConfigPage() {
  const [triggers, setTriggers] = useState<HospiceQapiAuditTrigger[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState<HospiceAdverseEventCategory>('PatientFall');
  const [newSeverity, setNewSeverity] = useState<HospiceAdverseEventSeverity>('Moderate');

  // Add / toggle / edit all hit PUT /audit-triggers, gated by
  // hospice:qapi_audit_trigger_manage.
  const canManage = usePermission(PERMISSIONS.HOSPICE_QAPI_AUDIT_TRIGGER_MANAGE);

  const reload = async () => { setTriggers(await listAuditTriggers()); };
  useEffect(() => { void reload(); }, []);

  const handleToggle = async (t: HospiceQapiAuditTrigger) => {
    await upsertAuditTrigger({
      auditEventCode: t.auditEventCode,
      category: t.category,
      severity: t.severity,
      isEnabled: !t.isEnabled,
    });
    await reload();
  };

  const handleUpdate = async (t: HospiceQapiAuditTrigger, patch: Partial<HospiceQapiAuditTrigger>) => {
    await upsertAuditTrigger({
      auditEventCode: t.auditEventCode,
      category: patch.category ?? t.category,
      severity: patch.severity ?? t.severity,
      isEnabled: patch.isEnabled ?? t.isEnabled,
    });
    await reload();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode) return;
    await upsertAuditTrigger({
      auditEventCode: newCode,
      category: newCategory,
      severity: newSeverity,
      isEnabled: true,
    });
    setNewCode('');
    await reload();
  };

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">QAPI Audit Triggers</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">Configure which audit-anomaly event codes automatically generate Draft adverse events. Admin only.</p>
      </header>

      <form onSubmit={handleAdd} aria-label="Add trigger" className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input className="form-input w-auto" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="audit event code (e.g., bulk-read)" required />
        <select className="form-input w-auto" value={newCategory} onChange={e => setNewCategory(e.target.value as HospiceAdverseEventCategory)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input w-auto" value={newSeverity} onChange={e => setNewSeverity(e.target.value as HospiceAdverseEventSeverity)}>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          type="submit"
          disabled={!canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Trigger
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map(t => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{t.auditEventCode}</td>
                <td className="px-4 py-3 text-slate-700">
                  <select
                    className="form-input w-auto"
                    value={t.category}
                    onChange={e => handleUpdate(t, { category: e.target.value as HospiceAdverseEventCategory })}
                    disabled={!canManage}
                    title={!canManage ? NO_PERMISSION : undefined}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <select
                    className="form-input w-auto"
                    value={t.severity}
                    onChange={e => handleUpdate(t, { severity: e.target.value as HospiceAdverseEventSeverity })}
                    disabled={!canManage}
                    title={!canManage ? NO_PERMISSION : undefined}
                  >
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <label className="inline-flex items-center gap-2" title={!canManage ? NO_PERMISSION : undefined}>
                    <input type="checkbox" checked={t.isEnabled} onChange={() => handleToggle(t)} disabled={!canManage} />
                    {t.isEnabled ? 'Enabled' : 'Disabled'}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
