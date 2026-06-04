import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchBillingCodes, type BillingCodeEntry } from '@/api/claims';

const TYPE_LABELS: Record<string, string> = {
  all: 'All',
  icd10: 'ICD-10',
  cpt: 'CPT',
  hcpcs: 'HCPCS',
  revenue: 'Revenue Codes',
};

const CATEGORY_OPTIONS = ['all', 'hospice', 'home-health', 'palliative', 'general'] as const;

const TYPE_BADGE: Record<string, string> = {
  icd10: 'bg-blue-100 text-blue-700',
  cpt: 'bg-purple-100 text-purple-700',
  hcpcs: 'bg-teal-100 text-teal-700',
  revenue: 'bg-amber-100 text-amber-700',
};

export function BillingCodesPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_OPTIONS)[number]>('all');
  const [results, setResults] = useState<BillingCodeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params: Parameters<typeof searchBillingCodes>[0] = {};
    if (query.trim()) params.query = query.trim();
    if (typeFilter !== 'all') params.type = typeFilter;
    if (categoryFilter !== 'all') params.category = categoryFilter;

    searchBillingCodes(params)
      .then((res) => {
        if (cancelled) return;
        setResults(res.data ?? []);
        setTotal(res.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to search billing codes');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, typeFilter, categoryFilter]);

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard API can fail in non-https/test environments; non-fatal.
    }
  }

  return (
    <section className="p-4 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <Link to="/billing" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Back to Billing
        </Link>
        <h1 className="text-2xl font-serif text-slate-900 mt-2">Billing Code Lookup</h1>
        <p className="text-slate-500 text-sm mt-1">
          Search ICD-10, CPT, HCPCS, and Revenue Codes by description, code, or category.
        </p>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a code (I50.9) or description (heart failure)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Code Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as (typeof CATEGORY_OPTIONS)[number])
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 text-sm text-slate-600">
          {loading
            ? 'Searching...'
            : `${total} result${total === 1 ? '' : 's'}${query ? ` for "${query}"` : ''}`}
        </div>
        {!loading && results.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No codes match</p>
            <p className="text-sm">Try a different search term or relax the filters.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r) => (
                <tr key={`${r.type}-${r.code}`} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-mono font-semibold">{r.code}</td>
                  <td className="px-5 py-3 text-sm text-slate-700">{r.description}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        TYPE_BADGE[r.type] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 capitalize">{r.category}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopy(r.code)}
                      className="px-2 py-1 text-xs rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      {copied === r.code ? 'Copied!' : 'Copy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
