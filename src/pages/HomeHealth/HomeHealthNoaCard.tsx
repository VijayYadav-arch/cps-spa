import { useCallback, useEffect, useState } from 'react';
import { getNoa, submitNoa, type HomeHealthNoa } from '@/api/homehealth';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_TINT: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  submitted: 'bg-green-100 text-green-800',
  late: 'bg-red-100 text-red-800',
};

export function HomeHealthNoaCard({ episodeId, canManage }: { episodeId: number; canManage: boolean }) {
  const [noa, setNoa] = useState<HomeHealthNoa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getNoa(episodeId).then(setNoa).catch(() => undefined);
  }, [episodeId]);

  useEffect(load, [load]);

  async function submit(mode: string) {
    setBusy(true);
    setError(null);
    try {
      await submitNoa(episodeId, mode);
      load();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not submit the NOA.');
    } finally {
      setBusy(false);
    }
  }

  if (!noa) return null;

  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notice of Admission</h3>
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TINT[noa.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {noa.status}
        </span>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <p className="text-sm text-slate-600">
        Timely-filing deadline <strong>{noa.deadlineDate}</strong> (Start of Care + 5 days).
        {noa.submittedAt && <> Submitted {new Date(noa.submittedAt).toLocaleDateString()}{noa.submissionMode ? ` (${noa.submissionMode})` : ''}.</>}
      </p>

      {noa.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => submit('manual')}
            disabled={!canManage || busy}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
          >
            {busy ? 'Submitting…' : 'Submit NOA'}
          </button>
        </div>
      )}
    </section>
  );
}
