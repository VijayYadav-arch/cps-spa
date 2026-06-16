import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  acknowledgeAddendum,
  draftAddendum,
  getCurrentAddendum,
  issueAddendum,
  listAddenda,
  refuseAddendum,
  reviseAddendum,
  type HospiceElectionAddendum,
  type HospiceElectionAddendumItem,
} from '@/api/hospice';
import { HospiceAddendumItemList } from '@/components/HospiceAddendumItemList';

export function HospiceAddendumPage() {
  const { electionId: idStr } = useParams<{ electionId: string }>();
  const electionId = Number(idStr);

  const [history, setHistory] = useState<HospiceElectionAddendum[]>([]);
  const [current, setCurrent] = useState<HospiceElectionAddendum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Draft / revise editor state
  const [editingItems, setEditingItems] = useState<HospiceElectionAddendumItem[]>([]);
  const [hospiceContactInfo, setHospiceContactInfo] = useState('');
  const [mode, setMode] = useState<'draft' | 'revise' | null>(null);

  // Issue / acknowledge / refuse panels
  const [issueDate, setIssueDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [signerName, setSignerName] = useState('');
  const [signerRelationship, setSignerRelationship] = useState('');
  const [refusalReason, setRefusalReason] = useState('');

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const [hist, cur] = await Promise.all([
        listAddenda(electionId),
        getCurrentAddendum(electionId),
      ]);
      setHistory(hist.data);
      setCurrent(cur);
    } catch {
      setError('Failed to load addendum data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(electionId)) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId]);

  async function handleSaveDraft() {
    setBusy(true);
    setActionError(null);
    try {
      await draftAddendum(electionId, {
        items: editingItems,
        hospiceContactInfo: hospiceContactInfo.trim() || null,
      });
      setMode(null);
      setEditingItems([]);
      setHospiceContactInfo('');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to save draft.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveRevision() {
    setBusy(true);
    setActionError(null);
    try {
      await reviseAddendum(electionId, {
        items: editingItems,
        hospiceContactInfo: hospiceContactInfo.trim() || null,
        issuedDate: issueDate,
      });
      setMode(null);
      setEditingItems([]);
      setHospiceContactInfo('');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to revise addendum.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleIssue() {
    if (!current) return;
    setBusy(true);
    setActionError(null);
    try {
      await issueAddendum(current.id, {
        issuedDate: issueDate,
        hospiceContactInfo: hospiceContactInfo.trim() || null,
      });
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to issue addendum.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleAcknowledge() {
    if (!current) return;
    if (!signerName.trim()) {
      setActionError('Signer name is required.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await acknowledgeAddendum(current.id, {
        signerName: signerName.trim(),
        signerRelationship: signerRelationship.trim() || null,
        acknowledgedAt: new Date().toISOString(),
      });
      setSignerName('');
      setSignerRelationship('');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to acknowledge addendum.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRefuse() {
    if (!current) return;
    if (!refusalReason.trim()) {
      setActionError('Refusal reason is required.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await refuseAddendum(current.id, {
        reason: refusalReason.trim(),
        refusedAt: new Date().toISOString(),
      });
      setRefusalReason('');
      await refresh();
    } catch (err) {
      setActionError(extractError(err, 'Failed to record refusal.'));
    } finally {
      setBusy(false);
    }
  }

  function startDraft() {
    setMode('draft');
    setEditingItems([]);
    setHospiceContactInfo('');
  }

  function startRevise() {
    setMode('revise');
    setEditingItems(current ? [...current.items] : []);
    setHospiceContactInfo(current?.hospiceContactInfo ?? '');
    setIssueDate(new Date().toISOString().slice(0, 10));
  }

  if (isLoading)
    return (
      <div role="status" className="text-slate-500">
        Loading addendum…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        {error}
      </div>
    );

  return (
    <div className="grid max-w-[900px] gap-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl">
          Hospice Election Addendum — Election #{electionId}
        </h2>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Patient Notification of Hospice Non-Covered Items, Services, and Drugs
          (42 CFR 418.24(c))
        </p>
      </header>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          {actionError}
        </div>
      )}

      {/* Current addendum */}
      <section className="grid gap-3">
        <h3 className="text-lg font-semibold">Current Addendum</h3>
        {current === null ? (
          <p className="text-slate-500">
            No addendum on file yet for this election.
          </p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-slate-800">
              <strong>Version {current.version}</strong> · Status:{' '}
              <strong>{current.status}</strong>
              {current.issuedDate && ` · Issued ${current.issuedDate}`}
              {current.acknowledgedAt &&
                ` · Acknowledged ${new Date(current.acknowledgedAt).toLocaleString()}`}
            </p>
            {current.hospiceContactInfo && (
              <p className="mt-1 text-slate-500">
                Contact: {current.hospiceContactInfo}
              </p>
            )}
            <div className="mt-3">
              <HospiceAddendumItemList
                items={current.items}
                onChange={() => {}}
                readOnly
              />
            </div>
            {current.acknowledgedBySignerName && (
              <p className="mt-3 text-slate-800">
                Acknowledged by: <strong>{current.acknowledgedBySignerName}</strong>
                {current.acknowledgedBySignerRelationship &&
                  ` (${current.acknowledgedBySignerRelationship})`}
              </p>
            )}
            {current.refusalReason && (
              <p className="mt-3 text-red-700">
                Refusal reason: {current.refusalReason}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Action panels */}
      {current === null && !mode && (
        <section>
          <button onClick={startDraft} className="btn-primary">
            Draft New Addendum
          </button>
        </section>
      )}

      {current?.status === 'Draft' && (
        <section className="grid max-w-[480px] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-700">Issue this draft</h4>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Issued date</span>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="form-input"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">
              Hospice contact info (optional)
            </span>
            <input
              value={hospiceContactInfo}
              onChange={(e) => setHospiceContactInfo(e.target.value)}
              className="form-input"
            />
          </label>
          <div>
            <button onClick={handleIssue} disabled={busy} className="btn-primary">
              {busy ? 'Issuing…' : 'Issue'}
            </button>
          </div>
        </section>
      )}

      {current?.status === 'Issued' && (
        <section className="grid max-w-[800px] grid-cols-2 gap-4">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-700">
              Acknowledge (signature)
            </h4>
            <input
              placeholder="Signer name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="form-input"
            />
            <input
              placeholder="Relationship (optional)"
              value={signerRelationship}
              onChange={(e) => setSignerRelationship(e.target.value)}
              className="form-input"
            />
            <div>
              <button
                onClick={handleAcknowledge}
                disabled={busy}
                className="btn-primary"
              >
                {busy ? 'Saving…' : 'Acknowledge'}
              </button>
            </div>
          </div>
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-700">Record Refusal</h4>
            <textarea
              placeholder="Refusal reason"
              rows={3}
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              className="form-input"
            />
            <div>
              <button onClick={handleRefuse} disabled={busy} className="btn-primary">
                {busy ? 'Saving…' : 'Record Refusal'}
              </button>
            </div>
          </div>
        </section>
      )}

      {current && current.status !== 'Draft' && !mode && (
        <section>
          <button onClick={startRevise} className="btn-primary">
            Revise Addendum (issue new version)
          </button>
        </section>
      )}

      {/* Editor (draft or revise) */}
      {mode && (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-700">
            {mode === 'draft' ? 'New Draft' : `Revise to Version ${(current?.version ?? 0) + 1}`}
          </h4>
          <HospiceAddendumItemList
            items={editingItems}
            onChange={setEditingItems}
          />
          <label className="grid max-w-[480px] gap-1.5">
            <span className="text-sm font-medium text-slate-600">
              Hospice contact info
            </span>
            <input
              value={hospiceContactInfo}
              onChange={(e) => setHospiceContactInfo(e.target.value)}
              placeholder="Phone, email, or address printed on the issued document"
              className="form-input"
            />
          </label>
          {mode === 'revise' && (
            <label className="grid max-w-[240px] gap-1.5">
              <span className="text-sm font-medium text-slate-600">
                Issued date for this revision
              </span>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="form-input"
              />
            </label>
          )}
          <div className="flex gap-2">
            <button
              onClick={mode === 'draft' ? handleSaveDraft : handleSaveRevision}
              disabled={busy || editingItems.length === 0}
              className="btn-primary"
            >
              {busy
                ? 'Saving…'
                : mode === 'draft'
                  ? 'Save Draft'
                  : 'Issue Revision'}
            </button>
            <button
              onClick={() => setMode(null)}
              disabled={busy}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* History */}
      {history.length > 1 && (
        <section className="grid gap-3">
          <h3 className="text-lg font-semibold">History</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Items</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700">v{h.version}</td>
                    <td className="px-4 py-3 text-slate-700">{h.status}</td>
                    <td className="px-4 py-3 text-slate-700">{h.issuedDate ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{h.items.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    fallback
  );
}
