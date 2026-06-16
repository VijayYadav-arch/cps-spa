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
        className="fixed inset-0 z-50 bg-navy-950/35"
      />
      <form
        role="dialog"
        aria-label="New work item"
        onSubmit={handleSubmit}
        className="fixed left-1/2 top-[15vh] z-[51] flex w-[440px] -translate-x-1/2 flex-col gap-3 rounded-xl bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.20)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg">New work item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new work item dialog"
            className="cursor-pointer border-none bg-transparent text-xl text-slate-500"
          >
            ×
          </button>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="form-input"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as EnqueueWorkItemRequest['priority'])}
            className="form-input"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Description *</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What needs to happen?"
            className="form-input resize-y"
          />
        </label>

        <div className="flex gap-2">
          <label className="grid flex-1 gap-1.5">
            <span className="text-sm font-medium text-slate-600">Claim ID</span>
            <input
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              placeholder="optional"
              className="form-input"
            />
          </label>
          <label className="grid flex-1 gap-1.5">
            <span className="text-sm font-medium text-slate-600">Patient ID</span>
            <input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="optional"
              className="form-input"
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="form-input"
          />
        </label>

        {error && (
          <div role="alert" className="rounded border border-red-200 bg-red-50 px-2 py-2 text-[13px] text-red-800">
            {error}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </>
  );
}
