import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  addRiskAssessment,
  closeBereavementProgram,
  completeBereavementProgram,
  deleteBereavementContact,
  getBereavementProgram,
  listBereavementContacts,
  listBereavementEncounters,
  optOutContact,
  setPrimaryContact,
  type BereavementContact,
  type BereavementEncounter,
  type BereavementProgram,
  type BereavementRiskLevel,
} from '@/api/hospice';
import { BereavementContactForm } from '@/components/BereavementContactForm';
import { BereavementEncounterForm } from '@/components/BereavementEncounterForm';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';
const RISK_LEVELS: BereavementRiskLevel[] = ['Low', 'Moderate', 'High'];

export function HospiceBereavementProgramDetail() {
  const { programId: idStr } = useParams<{ programId: string }>();
  const programId = Number(idStr);
  const [program, setProgram] = useState<BereavementProgram | null>(null);
  const [contacts, setContacts] = useState<BereavementContact[]>([]);
  const [encounters, setEncounters] = useState<BereavementEncounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<BereavementRiskLevel>('Moderate');
  const [riskNotes, setRiskNotes] = useState('');
  const [closeReason, setCloseReason] = useState('');

  // All state-changing actions on this page (complete/close/add-risk program +
  // set-primary/opt-out/delete contact) hit endpoints gated by hospice:bereavement.
  const canManage = usePermission(PERMISSIONS.HOSPICE_BEREAVEMENT);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [p, c, e] = await Promise.all([
        getBereavementProgram(programId),
        listBereavementContacts(programId),
        listBereavementEncounters(programId),
      ]);
      setProgram(p);
      setContacts(c.data);
      setEncounters(e.data);
    } catch {
      setError('Failed to load bereavement program.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(programId)) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  async function handleComplete() {
    setActionError(null);
    try {
      const updated = await completeBereavementProgram(programId);
      setProgram(updated);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to complete program.';
      setActionError(msg);
    }
  }

  async function handleClose() {
    setActionError(null);
    if (!closeReason.trim()) {
      setActionError('Closure reason is required.');
      return;
    }
    try {
      const updated = await closeBereavementProgram(programId, closeReason.trim());
      setProgram(updated);
      setCloseReason('');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to close program.';
      setActionError(msg);
    }
  }

  async function handleAddRisk() {
    setActionError(null);
    try {
      const updated = await addRiskAssessment(programId, {
        riskLevel,
        factors: null,
        notes: riskNotes.trim() || null,
      });
      setProgram(updated);
      setRiskNotes('');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to add risk assessment.';
      setActionError(msg);
    }
  }

  async function handleSetPrimary(id: number) {
    setActionError(null);
    try {
      await setPrimaryContact(id);
      await refresh();
    } catch {
      setActionError('Failed to set primary contact.');
    }
  }

  async function handleOptOut(id: number) {
    setActionError(null);
    try {
      await optOutContact(id, null);
      await refresh();
    } catch {
      setActionError('Failed to opt out contact.');
    }
  }

  async function handleDeleteContact(id: number) {
    setActionError(null);
    try {
      await deleteBereavementContact(id);
      await refresh();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to delete contact.';
      setActionError(msg);
    }
  }

  if (isLoading)
    return (
      <div role="status" className="text-slate-500">
        Loading bereavement program…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );
  if (!program) return <div className="text-slate-500">Program not found.</div>;

  const readOnly = program.status === 'Closed';

  return (
    <div className="grid max-w-[1000px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">Bereavement Program #{program.id}</h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Patient #{program.patientId} · Status: <strong>{program.status}</strong> · DoD{' '}
          {program.dateOfDeath} · Ends {program.programEndDate} (
          {program.daysUntilProgramEnd} days)
        </p>
      </header>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {actionError}
        </div>
      )}

      {!readOnly && (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            onClick={handleComplete}
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary"
          >
            Complete Program
          </button>
          <div className="flex items-center gap-2">
            <input
              placeholder="Closure reason"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="form-input"
            />
            <button
              onClick={handleClose}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close Program
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Risk History</h3>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          {program.riskHistory || '[]'}
        </pre>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as BereavementRiskLevel)}
              className="form-input w-auto"
            >
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              placeholder="Notes"
              value={riskNotes}
              onChange={(e) => setRiskNotes(e.target.value)}
              className="form-input min-w-[280px]"
            />
            <button
              onClick={handleAddRisk}
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Risk Assessment
            </button>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Contacts</h3>
        {contacts.length === 0 ? (
          <p className="text-slate-500">No contacts.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Relationship</th>
                  <th className="px-4 py-3">Preference</th>
                  <th className="px-4 py-3">Primary</th>
                  <th className="px-4 py-3">Opted Out</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.relationship}</td>
                    <td className="px-4 py-3 text-slate-700">{c.contactPreference}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.isPrimaryContact ? 'Yes' : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.optedOut ? 'Yes' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!readOnly && !c.isPrimaryContact && (
                          <button
                            onClick={() => handleSetPrimary(c.id)}
                            disabled={!canManage}
                            title={!canManage ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Set Primary
                          </button>
                        )}
                        {!readOnly && !c.optedOut && (
                          <button
                            onClick={() => handleOptOut(c.id)}
                            disabled={!canManage}
                            title={!canManage ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Opt Out
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            disabled={!canManage}
                            title={!canManage ? NO_PERMISSION : undefined}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!readOnly && (
          <BereavementContactForm
            programId={programId}
            onCreated={() => void refresh()}
          />
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Encounters</h3>
        {encounters.length === 0 ? (
          <p className="text-slate-500">No encounters recorded.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Duration (min)</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700">{e.encounterDate}</td>
                    <td className="px-4 py-3 text-slate-700">{e.encounterType}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {e.durationMinutes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {e.followUpRequired ? (e.followUpByDate ?? 'Yes') : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {program.status === 'Active' && (
          <BereavementEncounterForm
            programId={programId}
            contacts={contacts}
            onCreated={() => void refresh()}
          />
        )}
      </section>
    </div>
  );
}
