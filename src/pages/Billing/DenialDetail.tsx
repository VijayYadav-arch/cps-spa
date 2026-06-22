import '@/styles/denials.css';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  analyzeDenial,
  assignDenial,
  draftDenialAppealStreaming,
  escalateDenial,
  getDenialById,
  resolveDenial,
  startDenialAppeal,
  submitDenialAppeal,
  writeOffDenial,
  type DenialAnalysisResult,
  type DenialItem,
} from '@/api/billing';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  'in-review': 'bg-amber-100 text-amber-700',
  appealing: 'bg-purple-100 text-purple-700',
  correcting: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  'written-off': 'bg-slate-100 text-slate-600',
};

const CATEGORY_BADGE: Record<string, string> = {
  auth: 'bg-orange-100 text-orange-700',
  'medical-necessity': 'bg-red-100 text-red-700',
  coding: 'bg-blue-100 text-blue-700',
  'timely-filing': 'bg-purple-100 text-purple-700',
  duplicate: 'bg-amber-100 text-amber-700',
  documentation: 'bg-cyan-100 text-cyan-700',
  'patient-responsibility': 'bg-pink-100 text-pink-700',
  other: 'bg-slate-100 text-slate-600',
};

type ModalType = 'appeal' | 'submit-appeal' | 'escalate' | 'resolve' | 'assign' | 'write-off' | null;

function getActionForStatus(status: string): ModalType {
  if (status === 'new') return 'appeal';
  if (status === 'in-review') return 'submit-appeal';
  if (status === 'appealing') return 'escalate';
  if (status === 'correcting') return 'resolve';
  return null;
}

interface HistoryEntry {
  action: string;
  timestamp: string;
  notes: string | null;
}

function ActionModal({
  type,
  onClose,
  onConfirm,
  saving,
}: {
  type: ModalType;
  onClose: () => void;
  onConfirm: (text: string) => void;
  saving: boolean;
}) {
  const [text, setText] = useState('');
  if (!type) return null;

  const titles: Record<string, string> = {
    appeal: 'Start Appeal',
    'submit-appeal': 'Submit Appeal',
    escalate: 'Escalate Denial',
    resolve: 'Resolve Denial',
    assign: 'Assign Denial',
    'write-off': 'Write Off Denial',
  };
  const isResolve = type === 'resolve';
  const isAssign = type === 'assign';
  const isWriteOff = type === 'write-off';
  const requiresText = isResolve || isWriteOff;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titles[type]}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-navy-900 mb-4">{titles[type]}</h2>
        {requiresText ? (
          <label className="block">
            <span className="block text-sm font-medium text-navy-700 mb-1">
              {isWriteOff ? 'Reason' : 'Resolution'} <span className="text-red-600">*</span>
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={isWriteOff ? 'Why is this denial being written off?' : 'Describe how this denial was resolved...'}
              className="w-full border border-navy-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </label>
        ) : isAssign ? (
          <label className="block">
            <span className="block text-sm font-medium text-navy-700 mb-1">User ID</span>
            <input
              type="number"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter user ID"
              className="w-full border border-navy-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </label>
        ) : (
          <label className="block">
            <span className="block text-sm font-medium text-navy-700 mb-1">Notes (optional)</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Add notes..."
              className="w-full border border-navy-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </label>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-navy-600 hover:text-navy-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(text)}
            disabled={saving || (requiresText && !text.trim()) || (isAssign && !text.trim())}
            className="px-5 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DenialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<DenialItem | null>(null);
  const [analysis, setAnalysis] = useState<DenialAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftCopied, setAiDraftCopied] = useState(false);

  // All denial state-changing endpoints (appeal/submit/escalate/resolve/assign
  // and the AI draft-appeal) sit behind the controller-wide billing:denials
  // policy. Gate the action-triggering buttons accordingly.
  const canManageDenials = usePermission(PERMISSIONS.BILLING_DENIALS);

  async function handleDraftAppeal() {
    if (!item) return;
    setAiDrafting(true);
    setError(null);

    // Live-streamed draft text -- buffer locally, paint to the same draft
    // textarea via setItem({...item, draftAppealText: assembled}) so the
    // biller sees the appeal letter painting in real time. The `done` event
    // is authoritative for the final text + timestamp.
    let assembled = '';
    const baseItem = item;
    let streamErrored = false;

    try {
      await draftDenialAppealStreaming(item.id, {
        onDelta: (text) => {
          assembled += text;
          setItem({
            ...baseItem,
            draftAppealText: assembled,
            // No timestamp yet -- the server only stamps it after the
            // database write at the end of stream. Show a blank for now;
            // `done` fills it in.
            draftAppealGeneratedAtUtc: null,
          });
        },
        onDone: (result) => {
          setItem({
            ...baseItem,
            draftAppealText: result.draftAppealText,
            draftAppealGeneratedAtUtc: result.draftAppealGeneratedAtUtc,
          });
        },
        onError: (event) => {
          streamErrored = true;
          if (event.error === 'rate_limited') {
            setError('Too many AI drafts recently. Please try again in a moment.');
          } else if (event.error === 'ai_not_available') {
            setError('The AI assistant is not currently available for your organization.');
          } else if (event.error === 'ai_provider_unreachable') {
            setError("Couldn't reach the AI service. Please try again shortly.");
          } else if (event.error === 'not_found') {
            setError('Denial work item not found.');
          } else {
            setError('Failed to draft appeal. Please try again.');
          }
          // Restore the prior draft if any deltas had painted before failure.
          setItem(baseItem);
        },
      });
    } catch {
      if (!streamErrored) {
        setError('Failed to draft appeal. Please try again.');
        setItem(baseItem);
      }
    } finally {
      setAiDrafting(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getDenialById(parseInt(id, 10))
      .then(async (denial) => {
        if (cancelled) return;
        setItem(denial);
        try {
          const aResult = await analyzeDenial({
            denialCode: denial.denialCode,
            payerName: denial.payerName ?? 'Unknown',
            denialDate: denial.createdAt,
          });
          if (!cancelled) setAnalysis(aResult);
        } catch {
          // Analyze is best-effort; failure is non-fatal.
        }
      })
      .catch(() => {
        if (!cancelled) setError('Denial not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleAction(text: string) {
    if (!item || !modal) return;
    setSaving(true);
    try {
      if (modal === 'appeal') await startDenialAppeal(item.id, text || null);
      else if (modal === 'submit-appeal') await submitDenialAppeal(item.id, text || null);
      else if (modal === 'escalate') await escalateDenial(item.id, text || null);
      else if (modal === 'resolve') await resolveDenial(item.id, text);
      else if (modal === 'write-off') await writeOffDenial(item.id, text);
      else if (modal === 'assign') await assignDenial(item.id, parseInt(text, 10));
      const refreshed = await getDenialById(item.id);
      setItem(refreshed);
      setModal(null);
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-12 text-center text-navy-400">Loading...</div>;
  if (error || !item)
    return (
      <div className="p-12 text-center text-red-600" role="alert">
        {error ?? 'Not found'}
      </div>
    );

  const history: HistoryEntry[] = (() => {
    try {
      return JSON.parse(item.appealHistory ?? '[]') as HistoryEntry[];
    } catch {
      return [];
    }
  })();

  const primaryAction = getActionForStatus(item.status);
  const daysOld = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000);
  const deadlineDays = analysis
    ? Math.round((new Date(analysis.appealDeadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <section className="p-4 lg:p-8 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/billing/denials')}
        className="text-sm text-navy-500 hover:text-navy-800 mb-6 inline-flex items-center gap-1"
      >
        &larr; Back to Denials
      </button>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-serif text-navy-900">
              <Link to={`/claims/${item.claimId}`} className="hover:text-teal-700">
                Claim #{item.claimId}
              </Link>
            </h1>
            <p className="text-navy-500 mt-1 text-sm">
              Denial Code: <span className="font-mono font-semibold">{item.denialCode}</span>
            </p>
            <p className="text-navy-700 text-sm mt-1">{item.denialReason}</p>
            <p className="text-navy-400 text-xs mt-2">
              Days Old: {daysOld} &middot; Deadline:{' '}
              {item.appealDeadline ? new Date(item.appealDeadline).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                STATUS_BADGE[item.status] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.status.replace(/-/g, ' ')}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                CATEGORY_BADGE[item.category] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.category.replace(/-/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="bg-white rounded-xl border border-navy-100 p-6 mb-6">
          <h2 className="font-semibold text-navy-900 mb-4">CARC Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-navy-500 uppercase font-semibold mb-1">Category</div>
              <div className="text-sm text-navy-800">{analysis.category.replace(/-/g, ' ')}</div>
            </div>
            <div>
              <div className="text-xs text-navy-500 uppercase font-semibold mb-1">Appeal Deadline</div>
              <div className="text-sm text-navy-800">
                {new Date(analysis.appealDeadline).toLocaleDateString()}
                {deadlineDays !== null && (
                  <span
                    className={`ml-2 text-xs ${
                      deadlineDays < 14 ? 'text-red-600 font-semibold' : 'text-navy-400'
                    }`}
                  >
                    ({deadlineDays} days)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-navy-500 uppercase font-semibold mb-1">Recommended Action</div>
            <div className="text-sm text-navy-800">{analysis.recommendedAction}</div>
          </div>
          {analysis.appealTemplate && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-navy-500 uppercase font-semibold">Appeal Template</div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(analysis.appealTemplate!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-xs text-navy-400 hover:text-navy-700"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs text-navy-700 bg-navy-50 rounded-lg p-4 whitespace-pre-wrap font-mono border border-navy-100">
                {analysis.appealTemplate}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="font-semibold text-navy-900">AI Drafted Appeal</h2>
          <button
            type="button"
            onClick={handleDraftAppeal}
            disabled={aiDrafting || !canManageDenials}
            title={!canManageDenials ? NO_PERMISSION : undefined}
            className="text-sm bg-teal-600 text-white px-3 py-1.5 rounded hover:bg-teal-700 disabled:opacity-50"
          >
            {aiDrafting
              ? 'Drafting…'
              : item.draftAppealText
              ? 'Regenerate draft'
              : 'Draft appeal'}
          </button>
        </div>
        {item.draftAppealText ? (
          <div>
            <div className="flex items-center justify-end mb-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(item.draftAppealText!);
                  setAiDraftCopied(true);
                  setTimeout(() => setAiDraftCopied(false), 2000);
                }}
                className="text-xs text-navy-400 hover:text-navy-700"
              >
                {aiDraftCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre
              aria-label={`AI-drafted appeal for denial ${item.id}`}
              className="text-sm text-navy-800 bg-indigo-50 border-l-4 border-indigo-500 rounded p-4 whitespace-pre-wrap font-sans"
            >
              {item.draftAppealText}
              {item.draftAppealGeneratedAtUtc && (
                <span className="block mt-4 text-xs text-navy-400">
                  AI-generated {new Date(item.draftAppealGeneratedAtUtc).toLocaleString()}
                  {' '}— review, edit, and verify all [bracketed] placeholders before submitting.
                </span>
              )}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-navy-400">
            Click <span className="font-semibold">Draft appeal</span> to generate a draft letter
            from the denial reason, claim details, and clinical notes around the service date.
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-6">
        <h2 className="font-semibold text-navy-900 mb-4">Appeal History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-navy-400">No actions taken yet.</p>
        ) : (
          <ol className="relative border-l border-navy-200 ml-3 space-y-4">
            {history.map((entry, i) => (
              <li key={i} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-navy-300 border-2 border-white" />
                <div className="text-xs text-navy-400 mb-0.5">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="text-sm font-medium text-navy-700">
                  {entry.action.replace(/_/g, ' ')}
                </div>
                {entry.notes && <div className="text-sm text-navy-500 mt-0.5">{entry.notes}</div>}
              </li>
            ))}
          </ol>
        )}
      </div>

      {primaryAction && (
        <div className="bg-white rounded-xl border border-navy-100 p-6">
          <h2 className="font-semibold text-navy-900 mb-4">Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setModal(primaryAction)}
              disabled={!canManageDenials}
              title={!canManageDenials ? NO_PERMISSION : undefined}
              className="px-5 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50"
            >
              {primaryAction === 'appeal'
                ? 'Start Appeal'
                : primaryAction === 'submit-appeal'
                ? 'Submit Appeal'
                : primaryAction === 'escalate'
                ? 'Escalate'
                : 'Resolve'}
            </button>
            <button
              type="button"
              onClick={() => setModal('assign')}
              disabled={!canManageDenials}
              title={!canManageDenials ? NO_PERMISSION : undefined}
              className="px-5 py-2 bg-navy-100 text-navy-700 text-sm rounded-lg hover:bg-navy-200 disabled:opacity-50"
            >
              Assign
            </button>
            <button
              type="button"
              onClick={() => setModal('write-off')}
              disabled={!canManageDenials}
              title={!canManageDenials ? NO_PERMISSION : undefined}
              className="px-5 py-2 bg-red-50 text-red-700 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              Write off
            </button>
          </div>
        </div>
      )}
      {item.status === 'written-off' && (
        <div className="bg-navy-50 rounded-xl border border-navy-100 p-6 text-center text-navy-600 font-medium">
          Written off {item.resolvedAt ? `on ${new Date(item.resolvedAt).toLocaleDateString()}` : ''}
        </div>
      )}
      {item.status === 'resolved' && (
        <div className="bg-green-50 rounded-xl border border-green-100 p-6 text-center text-green-700 font-medium">
          Resolved {item.resolvedAt ? `on ${new Date(item.resolvedAt).toLocaleDateString()}` : ''}
        </div>
      )}

      <ActionModal
        type={modal}
        onClose={() => setModal(null)}
        onConfirm={handleAction}
        saving={saving}
      />
    </section>
  );
}
