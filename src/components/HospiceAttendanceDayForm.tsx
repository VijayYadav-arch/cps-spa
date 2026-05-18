import { useState, type FormEvent } from 'react';
import type {
  HospiceLevelOfCare,
  RecordAttendanceRequest,
} from '@/api/hospice';

const LOC_OPTIONS: Array<{ value: HospiceLevelOfCare; label: string }> = [
  { value: 'RoutineHomeCare', label: 'Routine Home Care' },
  { value: 'ContinuousHomeCare', label: 'Continuous Home Care' },
  { value: 'InpatientRespiteCare', label: 'Inpatient Respite Care' },
  { value: 'GeneralInpatient', label: 'General Inpatient' },
];

interface Props {
  serviceDate: string;
  initial?: Partial<RecordAttendanceRequest>;
  onSubmit: (req: RecordAttendanceRequest) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function HospiceAttendanceDayForm({
  serviceDate,
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: Props) {
  const [loc, setLoc] = useState<HospiceLevelOfCare>(initial?.levelOfCare ?? 'RoutineHomeCare');
  const [hours, setHours] = useState<string>(
    initial?.chcHoursOfCare != null ? String(initial.chcHoursOfCare) : '',
  );
  const [nurseId, setNurseId] = useState<string>(
    initial?.primaryNurseUserId != null ? String(initial.primaryNurseUserId) : '',
  );
  const [facility, setFacility] = useState<string>(initial?.facilityName ?? '');
  const [notes, setNotes] = useState<string>(initial?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoursNumber = parseFloat(hours);
  const chcInvalid =
    loc === 'ContinuousHomeCare' && (Number.isNaN(hoursNumber) || hoursNumber < 8);
  const canSubmit = !submitting && !chcInvalid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        serviceDate,
        levelOfCare: loc,
        chcHoursOfCare: loc === 'ContinuousHomeCare' ? hoursNumber : null,
        primaryNurseUserId: nurseId.trim() ? parseInt(nurseId, 10) : null,
        facilityName: facility.trim() || null,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance day.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
        Attendance for {serviceDate}
      </h3>

      {error && (
        <div role="alert" style={{ color: '#b91c1c' }}>
          {error}
        </div>
      )}

      <label style={{ display: 'block' }}>
        Level of Care
        <select
          value={loc}
          onChange={(e) => setLoc(e.target.value as HospiceLevelOfCare)}
          style={{ display: 'block', marginTop: 4 }}
        >
          {LOC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {loc === 'ContinuousHomeCare' && (
        <label style={{ display: 'block' }}>
          Hours of Continuous Care (≥ 8)
          <input
            type="number"
            min={8}
            step={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            style={{ display: 'block', marginTop: 4 }}
          />
          {chcInvalid && (
            <small style={{ color: '#b91c1c' }}>
              CHC requires at least 8 hours per day.
            </small>
          )}
        </label>
      )}

      <label style={{ display: 'block' }}>
        Primary Nurse User Id
        <input
          type="number"
          value={nurseId}
          onChange={(e) => setNurseId(e.target.value)}
          style={{ display: 'block', marginTop: 4 }}
        />
      </label>

      {(loc === 'InpatientRespiteCare' || loc === 'GeneralInpatient') && (
        <label style={{ display: 'block' }}>
          Facility Name
          <input
            type="text"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>
      )}

      <label style={{ display: 'block' }}>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ display: 'block', marginTop: 4, width: '100%' }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={!canSubmit}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
