import { useState } from 'react';
import {
  recordBereavementEncounter,
  type BereavementContact,
  type BereavementEncounter,
  type BereavementEncounterType,
} from '@/api/hospice';

interface Props {
  programId: number;
  contacts: BereavementContact[];
  onCreated: (encounter: BereavementEncounter) => void;
}

const TYPES: BereavementEncounterType[] = [
  'Phone',
  'Visit',
  'GroupSession',
  'Letter',
  'Card',
  'Email',
  'Other',
];

const DURATION_REQUIRED: ReadonlySet<BereavementEncounterType> = new Set([
  'Phone',
  'Visit',
  'GroupSession',
]);

export function BereavementEncounterForm({ programId, contacts, onCreated }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [contactId, setContactId] = useState<string>('');
  const [encounterDate, setEncounterDate] = useState(today);
  const [encounterType, setEncounterType] =
    useState<BereavementEncounterType>('Phone');
  const [durationMinutes, setDurationMinutes] = useState<string>('15');
  const [notes, setNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpByDate, setFollowUpByDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (followUpRequired && !followUpByDate) {
      setError('Follow-up date is required when follow-up is checked.');
      return;
    }
    setBusy(true);
    try {
      const encounter = await recordBereavementEncounter(programId, {
        contactId: contactId ? Number(contactId) : null,
        encounterDate,
        encounterType,
        durationMinutes:
          durationMinutes && DURATION_REQUIRED.has(encounterType)
            ? Number(durationMinutes)
            : null,
        notes: notes.trim(),
        followUpRequired,
        followUpByDate: followUpRequired ? followUpByDate : null,
      });
      onCreated(encounter);
      setNotes('');
      setFollowUpRequired(false);
      setFollowUpByDate('');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to record encounter.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const showDuration = DURATION_REQUIRED.has(encounterType);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600 }}>Record Encounter</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Date</span>
          <input
            type="date"
            value={encounterDate}
            onChange={(e) => setEncounterDate(e.target.value)}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Type</span>
          <select
            value={encounterType}
            onChange={(e) =>
              setEncounterType(e.target.value as BereavementEncounterType)
            }
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Contact (optional)</span>
        <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">— None —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName} ({c.relationship})
            </option>
          ))}
        </select>
      </label>
      {showDuration && (
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Duration (minutes)</span>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            min={1}
            required
          />
        </label>
      )}
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={followUpRequired}
          onChange={(e) => setFollowUpRequired(e.target.checked)}
        />
        <span>Follow-up required</span>
      </label>
      {followUpRequired && (
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Follow-up by</span>
          <input
            type="date"
            value={followUpByDate}
            onChange={(e) => setFollowUpByDate(e.target.value)}
            required
          />
        </label>
      )}
      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      <button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Record Encounter'}
      </button>
    </form>
  );
}
