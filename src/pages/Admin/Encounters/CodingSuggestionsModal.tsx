import { useEffect, useState } from 'react';
import { encountersApi } from './encountersApi';
import type { CodeSuggestion, CodeSuggestions } from './encountersTypes';

interface CodingSuggestionsModalProps {
  encounterId: number;
  patientLabel: string;
  onClose: () => void;
}

/**
 * Pre-coding AI advisory modal for an encounter row.
 *
 * Regulatory shape (HIGHEST risk feature in the AI rollout):
 *  - Big yellow banner: "Coder must verify each code in the patient record
 *    before billing. AI suggestions are NOT a substitute for human coding
 *    judgment." Never removed by toggle/setting.
 *  - Each suggestion shows code + description + confidence badge + rationale.
 *  - Per-code Copy button for the code-only string; no "Apply" affordance --
 *    this is intentionally an out-of-band copy/paste flow so codes don't
 *    flow into the claim record via this surface without coder review.
 *  - Empty arrays render a "no suggestions" sentinel rather than guessing.
 */
export function CodingSuggestionsModal({
  encounterId, patientLabel, onClose,
}: CodingSuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<CodeSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    encountersApi.suggestCodes(encounterId)
      .then((s) => { if (!cancelled) setSuggestions(s); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = (e as { response?: { data?: { error?: string } } })
          ?.response?.data?.error ?? 'Failed to fetch AI suggestions';
        setError(msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [encounterId]);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`AI code suggestions for encounter ${encounterId}`}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-4 p-6 border-b border-navy-100">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">AI code suggestions</h2>
            <p className="text-sm text-navy-500 mt-1">
              Encounter #{encounterId} · {patientLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close suggestions"
            className="text-navy-400 hover:text-navy-700 text-2xl leading-none"
          >
            ×
          </button>
        </header>

        <div className="p-6">
          {/* Regulatory banner — non-dismissable */}
          <div
            role="note"
            className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-3 rounded mb-4 text-sm"
          >
            <strong>Coder verification required.</strong> The AI is suggesting codes
            based on visit notes; the coder MUST verify each code against the
            patient record before billing. Rubber-stamping LLM-suggested codes is
            False Claims Act exposure.
          </div>

          {loading && <p role="status" className="text-navy-500">Loading suggestions…</p>}
          {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}

          {suggestions && (
            <>
              <CodeBlock
                title="CPT (procedure) suggestions"
                items={suggestions.cptSuggestions}
                onCopy={copyCode}
                copiedCode={copiedCode}
              />
              <CodeBlock
                title="ICD-10 (diagnosis) suggestions"
                items={suggestions.icd10Suggestions}
                onCopy={copyCode}
                copiedCode={copiedCode}
              />

              {suggestions.cptSuggestions.length === 0 &&
                suggestions.icd10Suggestions.length === 0 && (
                  <p className="text-navy-500 text-sm">
                    No code suggestions returned. The clinical context may be too thin,
                    or the AI provider is disabled in this environment. Code this
                    encounter manually.
                  </p>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-navy-100 p-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-navy-700 text-white hover:bg-navy-800"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function CodeBlock({
  title, items, onCopy, copiedCode,
}: {
  title: string;
  items: CodeSuggestion[];
  onCopy: (code: string) => void | Promise<void>;
  copiedCode: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h3 className="font-semibold text-navy-900 mb-3">{title}</h3>
      <ul className="space-y-3">
        {items.map((s) => (
          <li
            key={`${s.code}-${s.confidence}`}
            className={`border-l-4 ${confidenceBorder(s.confidence)} bg-slate-50 rounded p-3`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <code className="font-mono font-bold text-navy-900 text-base">{s.code}</code>
                <span
                  className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${confidenceBadge(s.confidence)}`}
                >
                  {s.confidence} confidence
                </span>
              </div>
              <button
                type="button"
                onClick={() => { void onCopy(s.code); }}
                aria-label={`Copy code ${s.code}`}
                className="text-xs text-teal-700 hover:text-teal-900 underline"
              >
                {copiedCode === s.code ? 'Copied!' : 'Copy code'}
              </button>
            </div>
            <p className="text-sm text-navy-800 mt-1">{s.description}</p>
            <p className="text-xs text-navy-500 mt-2 italic">Rationale: {s.rationale}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function confidenceBadge(level: CodeSuggestion['confidence']): string {
  switch (level) {
    case 'high': return 'bg-green-100 text-green-800';
    case 'moderate': return 'bg-amber-100 text-amber-800';
    default: return 'bg-slate-200 text-slate-700';
  }
}

function confidenceBorder(level: CodeSuggestion['confidence']): string {
  switch (level) {
    case 'high': return 'border-green-500';
    case 'moderate': return 'border-amber-500';
    default: return 'border-slate-400';
  }
}
