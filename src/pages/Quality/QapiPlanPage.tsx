import { useEffect, useState } from 'react';
import {
  getActivePlan,
  listPlanVersions,
  createPlanDraft,
  approvePlan,
  type HospiceQapiPlan,
} from '@/api/qapi';

export function QapiPlanPage() {
  const [activePlan, setActivePlan] = useState<HospiceQapiPlan | null>(null);
  const [versions, setVersions] = useState<HospiceQapiPlan[]>([]);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

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
    <div className="qapi-plan-page">
      <header>
        <h1>QAPI Plan</h1>
        <button onClick={() => setShowDraftForm(s => !s)}>+ New Draft</button>
      </header>

      {showDraftForm && (
        <form onSubmit={handleCreateDraft} aria-label="Create draft plan">
          <label htmlFor="plan-title">Title</label>
          <input id="plan-title" value={title} onChange={e => setTitle(e.target.value)} required />
          <label htmlFor="plan-body">Body (Markdown)</label>
          <textarea id="plan-body" value={bodyMarkdown} onChange={e => setBodyMarkdown(e.target.value)} rows={10} required />
          <label htmlFor="plan-effective">Effective Date</label>
          <input id="plan-effective" type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} required />
          <button type="submit">Create Draft</button>
        </form>
      )}

      <section>
        <h2>Active Plan</h2>
        {activePlan ? (
          <article>
            <h3>{activePlan.title} (v{activePlan.version})</h3>
            <p>Effective: {activePlan.effectiveDate}</p>
            <pre>{activePlan.bodyMarkdown}</pre>
          </article>
        ) : <p>No active plan.</p>}
      </section>

      <section>
        <h2>Versions</h2>
        <table>
          <thead><tr><th>Version</th><th>Title</th><th>Effective</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {versions.map(v => (
              <tr key={v.id}>
                <td>v{v.version}</td>
                <td>{v.title}</td>
                <td>{v.effectiveDate}</td>
                <td>{v.status}</td>
                <td>
                  {v.status === 'Draft' && <button onClick={() => handleApprove(v.id)}>Approve</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
