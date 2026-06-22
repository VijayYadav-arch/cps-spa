import { useCallback, useEffect, useState } from 'react';
import { listOasis, createOasis, completeOasis, type HomeHealthOasis } from '@/api/homehealth';

const NO_PERMISSION = 'You do not have permission to perform this action';

const TYPES = [
  { value: 'start-of-care', label: 'Start of Care' },
  { value: 'resumption', label: 'Resumption of Care' },
  { value: 'recertification', label: 'Recertification' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'transfer', label: 'Transfer' },
];

const FUNCTIONAL_ITEMS: { key: keyof FormState; label: string }[] = [
  { key: 'grooming', label: 'Grooming (M1800)' },
  { key: 'dressUpper', label: 'Dress upper (M1810)' },
  { key: 'dressLower', label: 'Dress lower (M1820)' },
  { key: 'bathing', label: 'Bathing (M1830)' },
  { key: 'toiletTransferring', label: 'Toilet transfer (M1840)' },
  { key: 'transferring', label: 'Transferring (M1850)' },
  { key: 'ambulation', label: 'Ambulation (M1860)' },
];

interface FormState {
  grooming: number;
  dressUpper: number;
  dressLower: number;
  bathing: number;
  toiletTransferring: number;
  transferring: number;
  ambulation: number;
}

const ZERO: FormState = {
  grooming: 0, dressUpper: 0, dressLower: 0, bathing: 0, toiletTransferring: 0, transferring: 0, ambulation: 0,
};

const LEVEL_TINT: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};

export function HomeHealthOasisSection({ episodeId, canManage }: { episodeId: number; canManage: boolean }) {
  const [items, setItems] = useState<HomeHealthOasis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('start-of-care');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [functional, setFunctional] = useState<FormState>(ZERO);

  const load = useCallback(() => {
    listOasis(episodeId).then(setItems).catch(() => undefined);
  }, [episodeId]);

  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      await createOasis(episodeId, { assessmentType: type, assessmentDate: date, ...functional });
      setShowForm(false);
      setFunctional(ZERO);
    });
  }

  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">OASIS-E Assessments</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
          >
            New OASIS
          </button>
        )}
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Reason</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="form-input w-52">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Assessment date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input w-44" />
            </label>
          </div>
          <p className="text-xs text-slate-500">Functional items — OASIS response value (0 = independent, higher = more impaired).</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FUNCTIONAL_ITEMS.map((it) => (
              <label key={it.key} className="grid gap-1 text-xs">
                <span className="text-slate-600">{it.label}</span>
                <input
                  type="number" min={0} max={6}
                  value={functional[it.key]}
                  onChange={(e) => setFunctional((f) => ({ ...f, [it.key]: Number(e.target.value) }))}
                  aria-label={it.label}
                  className="form-input"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} disabled={busy}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
              {busy ? 'Saving…' : 'Create OASIS'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No OASIS assessment yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-1.5">Reason</th>
              <th className="py-1.5">Date</th>
              <th className="py-1.5">Functional</th>
              <th className="py-1.5">Status</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="py-2 capitalize text-slate-700">{a.assessmentType.replace(/-/g, ' ')}</td>
                <td className="py-2 text-slate-700">{a.assessmentDate}</td>
                <td className="py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_TINT[a.functionalLevel] ?? 'bg-slate-100 text-slate-600'}`}>
                    {a.functionalLevel} ({a.functionalPoints})
                  </span>
                </td>
                <td className="py-2 text-slate-600 capitalize">{a.status}</td>
                <td className="py-2 text-right">
                  {a.status === 'draft' && (
                    <button
                      onClick={() => run(() => completeOasis(a.id))}
                      disabled={!canManage || busy}
                      title={!canManage ? NO_PERMISSION : undefined}
                      className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
