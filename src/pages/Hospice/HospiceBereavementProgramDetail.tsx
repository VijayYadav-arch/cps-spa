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

  if (isLoading) return <div role="status">Loading bereavement program…</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!program) return <div>Program not found.</div>;

  const readOnly = program.status === 'Closed';

  return (
    <div style={{ padding: 24, maxWidth: 1000, display: 'grid', gap: 24 }}>
      <header style={{ display: 'grid', gap: 4 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          Bereavement Program #{program.id}
        </h2>
        <p style={{ color: '#64748b' }}>
          Patient #{program.patientId} · Status: <strong>{program.status}</strong> · DoD{' '}
          {program.dateOfDeath} · Ends {program.programEndDate} (
          {program.daysUntilProgramEnd} days)
        </p>
      </header>

      {actionError && <div role="alert" style={{ color: '#b91c1c' }}>{actionError}</div>}

      {!readOnly && (
        <section style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleComplete}>Complete Program</button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              placeholder="Closure reason"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
            />
            <button onClick={handleClose}>Close Program</button>
          </div>
        </section>
      )}

      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Risk History</h3>
        <pre
          style={{
            background: '#f8fafc',
            padding: 12,
            borderRadius: 6,
            overflowX: 'auto',
            fontSize: 12,
          }}
        >
          {program.riskHistory || '[]'}
        </pre>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as BereavementRiskLevel)}
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
              style={{ minWidth: 280 }}
            />
            <button onClick={handleAddRisk}>Add Risk Assessment</button>
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Contacts</h3>
        {contacts.length === 0 ? (
          <p style={{ color: '#64748b' }}>No contacts.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Name</th>
                <th style={{ padding: '6px 10px' }}>Relationship</th>
                <th style={{ padding: '6px 10px' }}>Preference</th>
                <th style={{ padding: '6px 10px' }}>Primary</th>
                <th style={{ padding: '6px 10px' }}>Opted Out</th>
                <th style={{ padding: '6px 10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>
                    {c.firstName} {c.lastName}
                  </td>
                  <td style={{ padding: '6px 10px' }}>{c.relationship}</td>
                  <td style={{ padding: '6px 10px' }}>{c.contactPreference}</td>
                  <td style={{ padding: '6px 10px' }}>{c.isPrimaryContact ? 'Yes' : ''}</td>
                  <td style={{ padding: '6px 10px' }}>{c.optedOut ? 'Yes' : ''}</td>
                  <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                    {!readOnly && !c.isPrimaryContact && (
                      <button onClick={() => handleSetPrimary(c.id)}>Set Primary</button>
                    )}
                    {!readOnly && !c.optedOut && (
                      <button onClick={() => handleOptOut(c.id)}>Opt Out</button>
                    )}
                    {!readOnly && (
                      <button onClick={() => handleDeleteContact(c.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!readOnly && (
          <BereavementContactForm
            programId={programId}
            onCreated={() => void refresh()}
          />
        )}
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Encounters</h3>
        {encounters.length === 0 ? (
          <p style={{ color: '#64748b' }}>No encounters recorded.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Date</th>
                <th style={{ padding: '6px 10px' }}>Type</th>
                <th style={{ padding: '6px 10px' }}>Duration (min)</th>
                <th style={{ padding: '6px 10px' }}>Follow-up</th>
                <th style={{ padding: '6px 10px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>{e.encounterDate}</td>
                  <td style={{ padding: '6px 10px' }}>{e.encounterType}</td>
                  <td style={{ padding: '6px 10px' }}>{e.durationMinutes ?? '—'}</td>
                  <td style={{ padding: '6px 10px' }}>
                    {e.followUpRequired ? (e.followUpByDate ?? 'Yes') : ''}
                  </td>
                  <td style={{ padding: '6px 10px' }}>{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
