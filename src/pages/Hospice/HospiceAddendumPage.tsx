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

  if (isLoading) return <div role="status">Loading addendum…</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900, display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          Hospice Election Addendum — Election #{electionId}
        </h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Patient Notification of Hospice Non-Covered Items, Services, and Drugs
          (42 CFR 418.24(c))
        </p>
      </header>

      {actionError && (
        <div role="alert" style={{ color: '#b91c1c' }}>
          {actionError}
        </div>
      )}

      {/* Current addendum */}
      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Current Addendum</h3>
        {current === null ? (
          <p style={{ color: '#64748b' }}>
            No addendum on file yet for this election.
          </p>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 16 }}>
            <p>
              <strong>Version {current.version}</strong> · Status:{' '}
              <strong>{current.status}</strong>
              {current.issuedDate && ` · Issued ${current.issuedDate}`}
              {current.acknowledgedAt &&
                ` · Acknowledged ${new Date(current.acknowledgedAt).toLocaleString()}`}
            </p>
            {current.hospiceContactInfo && (
              <p style={{ color: '#64748b', marginTop: 4 }}>
                Contact: {current.hospiceContactInfo}
              </p>
            )}
            <div style={{ marginTop: 12 }}>
              <HospiceAddendumItemList
                items={current.items}
                onChange={() => {}}
                readOnly
              />
            </div>
            {current.acknowledgedBySignerName && (
              <p style={{ marginTop: 12 }}>
                Acknowledged by: <strong>{current.acknowledgedBySignerName}</strong>
                {current.acknowledgedBySignerRelationship &&
                  ` (${current.acknowledgedBySignerRelationship})`}
              </p>
            )}
            {current.refusalReason && (
              <p style={{ marginTop: 12, color: '#b91c1c' }}>
                Refusal reason: {current.refusalReason}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Action panels */}
      {current === null && !mode && (
        <section>
          <button onClick={startDraft}>Draft New Addendum</button>
        </section>
      )}

      {current?.status === 'Draft' && (
        <section style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <h4 style={{ fontWeight: 600 }}>Issue this draft</h4>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Issued date</span>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Hospice contact info (optional)</span>
            <input
              value={hospiceContactInfo}
              onChange={(e) => setHospiceContactInfo(e.target.value)}
            />
          </label>
          <button onClick={handleIssue} disabled={busy}>
            {busy ? 'Issuing…' : 'Issue'}
          </button>
        </section>
      )}

      {current?.status === 'Issued' && (
        <section
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: '1fr 1fr',
            maxWidth: 800,
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <h4 style={{ fontWeight: 600 }}>Acknowledge (signature)</h4>
            <input
              placeholder="Signer name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
            <input
              placeholder="Relationship (optional)"
              value={signerRelationship}
              onChange={(e) => setSignerRelationship(e.target.value)}
            />
            <button onClick={handleAcknowledge} disabled={busy}>
              {busy ? 'Saving…' : 'Acknowledge'}
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <h4 style={{ fontWeight: 600 }}>Record Refusal</h4>
            <textarea
              placeholder="Refusal reason"
              rows={3}
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
            />
            <button onClick={handleRefuse} disabled={busy}>
              {busy ? 'Saving…' : 'Record Refusal'}
            </button>
          </div>
        </section>
      )}

      {current && current.status !== 'Draft' && !mode && (
        <section>
          <button onClick={startRevise}>Revise Addendum (issue new version)</button>
        </section>
      )}

      {/* Editor (draft or revise) */}
      {mode && (
        <section style={{ display: 'grid', gap: 12 }}>
          <h4 style={{ fontWeight: 600 }}>
            {mode === 'draft' ? 'New Draft' : `Revise to Version ${(current?.version ?? 0) + 1}`}
          </h4>
          <HospiceAddendumItemList
            items={editingItems}
            onChange={setEditingItems}
          />
          <label style={{ display: 'grid', gap: 4, maxWidth: 480 }}>
            <span>Hospice contact info</span>
            <input
              value={hospiceContactInfo}
              onChange={(e) => setHospiceContactInfo(e.target.value)}
              placeholder="Phone, email, or address printed on the issued document"
            />
          </label>
          {mode === 'revise' && (
            <label style={{ display: 'grid', gap: 4, maxWidth: 240 }}>
              <span>Issued date for this revision</span>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </label>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={mode === 'draft' ? handleSaveDraft : handleSaveRevision}
              disabled={busy || editingItems.length === 0}
            >
              {busy
                ? 'Saving…'
                : mode === 'draft'
                  ? 'Save Draft'
                  : 'Issue Revision'}
            </button>
            <button onClick={() => setMode(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* History */}
      {history.length > 1 && (
        <section style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>History</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Version</th>
                <th style={{ padding: '6px 10px' }}>Status</th>
                <th style={{ padding: '6px 10px' }}>Issued</th>
                <th style={{ padding: '6px 10px' }}>Items</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>v{h.version}</td>
                  <td style={{ padding: '6px 10px' }}>{h.status}</td>
                  <td style={{ padding: '6px 10px' }}>{h.issuedDate ?? '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{h.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
