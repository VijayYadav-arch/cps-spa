import { useEffect, useState } from 'react';
import {
  getActivePlan,
  listPlanVersions,
  createPlanDraft,
  approvePlan,
  type HospiceQapiPlan,
} from '@/api/qapi';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function QapiPlanPage() {
  const [activePlan, setActivePlan] = useState<HospiceQapiPlan | null>(null);
  const [versions, setVersions] = useState<HospiceQapiPlan[]>([]);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  // Create-draft + approve both hit endpoints gated by hospice:qapi_plan_manage.
  const canManage = usePermission(PERMISSIONS.HOSPICE_QAPI_PLAN_MANAGE);

  const reload = async () => {
    const [active, list] = await Promise.all([getActivePlan(), listPlanVersions()]);
    setActivePlan(active);
    setVersions(list);
  };

  useEffect(() => { void reload(); }, []);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPlanDraft({ title, bodyMarkdown, effectiveDate });
    setShowDraftForm(false);
    setTitle(''); setBodyMarkdown(''); setEffectiveDate('');
    await reload();
  };

  const handleApprove = async (planId: number) => {
    await approvePlan(planId);
    await reload();
  };

  return (
    <div className="qapi-plan-page grid max-w-[1200px] gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">QAPI Plan</h2>
        <button
          onClick={() => setShowDraftForm(s => !s)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          + New Draft
        </button>
      </header>

      {showDraftForm && (
        <form onSubmit={handleCreateDraft} aria-label="Create draft plan" className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="plan-title" className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Title</span>
            <input id="plan-title" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
          </label>
          <label htmlFor="plan-body" className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Body (Markdown)</span>
            <textarea id="plan-body" className="form-input" value={bodyMarkdown} onChange={e => setBodyMarkdown(e.target.value)} rows={10} required />
          </label>
          <label htmlFor="plan-effective" className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Effective Date</span>
            <input id="plan-effective" className="form-input w-auto" type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} required />
          </label>
          <button
            type="submit"
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary justify-self-start disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Draft
          </button>
        </form>
      )}

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Active Plan</h3>
        {activePlan ? (
          <article className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-700">{activePlan.title} (v{activePlan.version})</h4>
            <p className="text-slate-700">Effective: {activePlan.effectiveDate}</p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{activePlan.bodyMarkdown}</pre>
          </article>
        ) : <p className="text-slate-500">No active plan.</p>}
      </section>

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Versions</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">v{v.version}</td>
                  <td className="px-4 py-3 text-slate-700">{v.title}</td>
                  <td className="px-4 py-3 text-slate-700">{v.effectiveDate}</td>
                  <td className="px-4 py-3 text-slate-700">{v.status}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {v.status === 'Draft' && (
                      <button
                        onClick={() => handleApprove(v.id)}
                        disabled={!canManage}
                        title={!canManage ? NO_PERMISSION : undefined}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
