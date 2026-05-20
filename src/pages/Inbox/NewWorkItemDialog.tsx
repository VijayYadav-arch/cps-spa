import { useState, type FormEvent } from 'react';
import { enqueueWorkItem, type EnqueueWorkItemRequest, type WorkQueueItem } from '@/api/billing';

const TYPE_OPTIONS = [
  { value: 'claim-review',       label: 'Claim Review' },
  { value: 'denial',             label: 'Denial' },
  { value: 'prior-auth',         label: 'Prior Auth' },
  { value: 'era-posting',        label: 'ERA Posting' },
  { value: 'rebill',             label: 'Rebill' },
  { value: 'follow-up',          label: 'Follow-Up' },
  { value: 'eligibility-recheck', label: 'Eligibility' },
  { value: 'breach-escalation',  label: 'Breach' },
];

const PRIORITY_OPTIONS: EnqueueWorkItemRequest['priority'][] =
  ['critical', 'high', 'medium', 'low'];

export interface NewWorkItemDialogProps {
  onClose: () => void;
  onCreated: (item: WorkQueueItem) => void;
}

/**
 * Modal for ad-hoc work item creation. The auto-population pipeline
 * (WorkQueueMonitorLogic) creates most rows automatically from denials /
 * claim status changes / eligibility expirations, so this dialog is for the
 * "I need to track a follow-up that doesn't have an upstream trigger" case
 * — phone calls, manual reviews, escalations.
 */
export function NewWorkItemDialog({ onClose, onCreated }: NewWorkItemDialogProps) {
  const [type, setType] = useState<string>('follow-up');
  const [priority, setPriority] = useState<EnqueueWorkItemRequest['priority']>('medium');
  const [description, setDescription] = useState('');
  const [claimId, setClaimId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await enqueueWorkItem({
        type,
        priority,
        description: description.trim(),
        claimId: claimId ? Number(claimId) : null,
        patientId: patientId ? Number(patientId) : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onCreated(created);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg ?? 'Failed to create work item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)',
          zIndex: 50,
        }}
      />
      <form
        role="dialog"
        aria-label="New work item"
        onSubmit={handleSubmit}
        style={{
          position: 'fixed', top: '15vh', left: '50%', transform: 'translateX(-50%)',
          width: 440, background: '#fff', padding: 24, borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.20)', zIndex: 51,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>New work item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new work item dialog"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#64748b',
            }}
          >
            ×
          </button>
        </div>

        <label style={{ fontSize: 13, color: '#475569' }}>
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={inputStyle}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 13, color: '#475569' }}>
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as EnqueueWorkItemRequest['priority'])}
            style={inputStyle}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 13, color: '#475569' }}>
          Description *
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What needs to happen?"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, fontSize: 13, color: '#475569' }}>
            Claim ID
            <input
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              placeholder="optional"
              style={inputStyle}
            />
          </label>
          <label style={{ flex: 1, fontSize: 13, color: '#475569' }}>
            Patient ID
            <input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="optional"
              style={inputStyle}
            />
          </label>
        </div>

        <label style={{ fontSize: 13, color: '#475569' }}>
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error && (
          <div role="alert" style={{ color: '#991b1b', background: '#fee2e2', padding: 8, borderRadius: 4, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#fff', color: '#475569', border: '1px solid #cbd5e1',
              borderRadius: 4, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#94a3b8' : '#0ea5e9', color: '#fff',
              border: 'none', borderRadius: 4, padding: '8px 16px',
              cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13,
              fontWeight: 600,
            }}
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: 13,
  marginTop: 4,
};
