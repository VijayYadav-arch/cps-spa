import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getHomeHealthEpisode,
  listPlansOfCare,
  createPlanOfCare,
  signPlanOfCare,
  recertifyEpisode,
  type HomeHealthEpisode,
  type HomeHealthPlanOfCare,
} from '@/api/homehealth';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';
import { HomeHealthOasisSection } from './HomeHealthOasisSection';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_TINT: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  discharged: 'bg-slate-100 text-slate-600',
  transferred: 'bg-amber-100 text-amber-800',
};

export function HomeHealthEpisodeDetail() {
  const { id, episodeId } = useParams<{ id: string; episodeId: string }>();
  const navigate = useNavigate();
  const epId = episodeId ? parseInt(episodeId, 10) : 0;
  const canManage = usePermission(PERMISSIONS.HOMEHEALTH_MANAGE);

  const [episode, setEpisode] = useState<HomeHealthEpisode | null>(null);
  const [pocs, setPocs] = useState<HomeHealthPlanOfCare[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ certifyingPhysicianName: '', certifyingPhysicianNpi: '', faceToFaceDate: '', orders: '', goals: '' });

  const load = useCallback(() => {
    if (!epId) return;
    getHomeHealthEpisode(epId).then(setEpisode).catch(() => setError('Failed to load the home-health episode.'));
    listPlansOfCare(epId).then(setPocs).catch(() => undefined);
  }, [epId]);

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
      await createPlanOfCare(epId, {
        certifyingPhysicianName: form.certifyingPhysicianName,
        certifyingPhysicianNpi: form.certifyingPhysicianNpi || null,
        faceToFaceDate: form.faceToFaceDate || null,
        orders: form.orders || null,
        goals: form.goals || null,
      });
      setShowForm(false);
      setForm({ certifyingPhysicianName: '', certifyingPhysicianNpi: '', faceToFaceDate: '', orders: '', goals: '' });
    });
  }

  function handleSign(poc: HomeHealthPlanOfCare) {
    const signer = window.prompt('Sign plan of care — certifying clinician name:');
    if (!signer || !signer.trim()) return;
    void run(() => signPlanOfCare(poc.id, signer.trim()));
  }

  if (error && !episode)
    return <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;
  if (!episode) return <div role="status" className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto grid max-w-[800px] gap-6 p-6">
      <header className="space-y-2">
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to patient
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl">Home Health Episode #{episode.id}</h2>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TINT[episode.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {episode.status}
          </span>
        </div>
        <div className="section-line" />
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <dl className="grid grid-cols-[200px_1fr] gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <dt className="font-medium text-slate-600">Start of Care</dt>
        <dd className="text-slate-800">{episode.startOfCareDate}</dd>
        <dt className="font-medium text-slate-600">Admission source</dt>
        <dd className="text-slate-800 capitalize">{episode.admissionSource}</dd>
        <dt className="font-medium text-slate-600">Certification period</dt>
        <dd className="text-slate-800">{episode.certFromDate} → {episode.certToDate} (period {episode.periodNumber})</dd>
      </dl>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Plans of Care (CMS-485)</h3>
          <div className="flex gap-2">
            {episode.status === 'active' && (
              <button
                onClick={() => run(() => recertifyEpisode(epId))}
                disabled={!canManage || busy}
                title={!canManage ? NO_PERMISSION : undefined}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Recertify (next 60 days)
              </button>
            )}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                disabled={!canManage}
                title={!canManage ? NO_PERMISSION : undefined}
                className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
              >
                New plan of care
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Certifying physician *</span>
              <input required value={form.certifyingPhysicianName}
                onChange={(e) => setForm((f) => ({ ...f, certifyingPhysicianName: e.target.value }))} className="form-input" />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-600">Physician NPI</span>
                <input value={form.certifyingPhysicianNpi}
                  onChange={(e) => setForm((f) => ({ ...f, certifyingPhysicianNpi: e.target.value }))} className="form-input w-44" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-600">Face-to-Face date</span>
                <input type="date" value={form.faceToFaceDate}
                  onChange={(e) => setForm((f) => ({ ...f, faceToFaceDate: e.target.value }))} className="form-input w-44" />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Orders</span>
              <textarea rows={2} value={form.orders}
                onChange={(e) => setForm((f) => ({ ...f, orders: e.target.value }))} className="form-input" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-600">Goals</span>
              <textarea rows={2} value={form.goals}
                onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} className="form-input" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} disabled={busy}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
                {busy ? 'Saving…' : 'Create plan of care'}
              </button>
            </div>
          </form>
        )}

        {pocs.length === 0 ? (
          <p className="text-sm text-slate-500">No plan of care yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-1.5">Period</th>
                <th className="py-1.5">Physician</th>
                <th className="py-1.5">F2F</th>
                <th className="py-1.5">Status</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {pocs.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{p.periodNumber}</td>
                  <td className="py-2 text-slate-700">{p.certifyingPhysicianName}</td>
                  <td className="py-2 text-slate-700">{p.faceToFaceDate ?? '—'}</td>
                  <td className="py-2">
                    <span className={`text-xs font-semibold ${p.status === 'signed' ? 'text-green-700' : 'text-slate-500'}`}>
                      {p.status === 'signed' ? `✓ signed${p.signedBy ? ` (${p.signedBy})` : ''}` : 'draft'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {p.status === 'draft' && (
                      <button
                        onClick={() => handleSign(p)}
                        disabled={!canManage || busy}
                        title={!canManage ? NO_PERMISSION : undefined}
                        className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                      >
                        Sign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <HomeHealthOasisSection episodeId={epId} canManage={canManage} />

      <p className="text-sm text-slate-400">PDGM billing (HIPPS, NOA, 837I) arrives in a later phase of the home-health build.</p>
    </div>
  );
}
