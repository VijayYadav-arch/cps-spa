import { useEffect, useState } from 'react';
import {
  listAuditTriggers,
  upsertAuditTrigger,
  type HospiceQapiAuditTrigger,
  type HospiceAdverseEventCategory,
  type HospiceAdverseEventSeverity,
} from '@/api/qapi';

const CATEGORIES: HospiceAdverseEventCategory[] = ['PatientFall', 'MedicationError', 'UnscheduledHospitalization', 'Complaint', 'GipDeath', 'Other'];
const SEVERITIES: HospiceAdverseEventSeverity[] = ['Minor', 'Moderate', 'Major', 'Critical'];

export function QapiAuditTriggerConfigPage() {
  const [triggers, setTriggers] = useState<HospiceQapiAuditTrigger[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState<HospiceAdverseEventCategory>('PatientFall');
  const [newSeverity, setNewSeverity] = useState<HospiceAdverseEventSeverity>('Moderate');

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
    <div>
      <header>
        <h1>QAPI Audit Triggers</h1>
        <p>Configure which audit-anomaly event codes automatically generate Draft adverse events. Admin only.</p>
      </header>

      <form onSubmit={handleAdd} aria-label="Add trigger">
        <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="audit event code (e.g., bulk-read)" required />
        <select value={newCategory} onChange={e => setNewCategory(e.target.value as HospiceAdverseEventCategory)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={newSeverity} onChange={e => setNewSeverity(e.target.value as HospiceAdverseEventSeverity)}>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit">Add Trigger</button>
      </form>

      <table>
        <thead><tr><th>Code</th><th>Category</th><th>Severity</th><th>Enabled</th></tr></thead>
        <tbody>
          {triggers.map(t => (
            <tr key={t.id}>
              <td>{t.auditEventCode}</td>
              <td>
                <select value={t.category} onChange={e => handleUpdate(t, { category: e.target.value as HospiceAdverseEventCategory })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td>
                <select value={t.severity} onChange={e => handleUpdate(t, { severity: e.target.value as HospiceAdverseEventSeverity })}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>
                <label>
                  <input type="checkbox" checked={t.isEnabled} onChange={() => handleToggle(t)} />
                  {t.isEnabled ? 'Enabled' : 'Disabled'}
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
