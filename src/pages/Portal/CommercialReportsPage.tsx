import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface Report {
  id: number;
  title: string;
  type: string;
  period: string;
  summary: string | null;
  url: string | null;
  createdAt: string;
}

interface ReportsEnvelope {
  data: Report[];
}

interface GeneratedReport {
  reportId: number;
  title: string;
  type: string;
  period: string;
  generatedAt: string;
  result: Record<string, unknown>;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const TYPE_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  'ar-aging': 'A/R Aging',
  denials: 'Denials',
  custom: 'Custom',
};

const SECTION_ORDER = ['monthly', 'ar-aging', 'denials', 'custom'];

const isMoney = (key: string) =>
  /amount|paid|current|days\d|over\d/i.test(key);

const formatValue = (key: string, value: unknown): string => {
  if (typeof value === 'number') {
    return isMoney(key)
      ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      : value.toLocaleString('en-US');
  }
  return String(value);
};

const humanize = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d+)to(\d+)/, '$1–$2 days')
    .replace(/^./, (c) => c.toUpperCase());

function ResultView({ result }: { result: Record<string, unknown> }) {
  const scalars = Object.entries(result).filter(([, v]) => typeof v !== 'object' || v === null);
  const groups = Object.entries(result).filter(([, v]) => Array.isArray(v)) as [string, Record<string, unknown>[]][];

  return (
    <div className="grid gap-4">
      {scalars.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {scalars.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-slate-100 py-1">
              <dt className="text-slate-500">{humanize(k)}</dt>
              <dd className="font-medium text-slate-800">{formatValue(k, v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {groups.map(([groupKey, rows]) => (
        <div key={groupKey}>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{humanize(groupKey)}</h4>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">None.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Object.entries(row).map(([ck, cv]) => (
                      <td key={ck} className="py-1 pr-4 text-slate-700">
                        {formatValue(ck, cv)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

export function CommercialReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [generated, setGenerated] = useState<GeneratedReport | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  function handleView(report: Report) {
    setGeneratingId(report.id);
    setGenerateError(null);
    apiClient
      .get<{ data: GeneratedReport }>(`/reports/${report.id}/generate`)
      .then((res) => setGenerated(res.data.data))
      .catch(() => setGenerateError('Could not generate this report. Please try again.'))
      .finally(() => setGeneratingId(null));
  }

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<ReportsEnvelope>('/reports?orderBy=createdAt:desc')
      .then((res) => {
        if (cancelled) return;
        setReports(res.data.data ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      >
        Failed to load reports.
      </div>
    );
  if (loading)
    return (
      <div role="status" className="text-slate-500">
        Loading…
      </div>
    );

  const grouped: Record<string, Report[]> = {};
  for (const r of reports) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  const sections: { type: string; label: string; reports: Report[] }[] = [];
  for (const t of SECTION_ORDER) {
    if (grouped[t]?.length) {
      sections.push({ type: t, label: TYPE_LABEL[t] ?? t, reports: grouped[t] });
    }
  }
  for (const t of Object.keys(grouped)) {
    if (!SECTION_ORDER.includes(t)) {
      sections.push({ type: t, label: TYPE_LABEL[t] ?? t, reports: grouped[t] });
    }
  }

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div>
        <h1 data-testid="page-title" className="text-2xl">
          Monthly Reports &amp; Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review your billing performance reports and analytics
        </p>
      </div>

      {generateError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {generateError}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
          No reports available yet.
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.type} className="grid gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {section.label} Reports
              <span className="text-xs text-slate-400">({section.reports.length})</span>
            </h2>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {section.reports.map((report) => (
                <div
                  key={report.id}
                  data-testid="report-row"
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex justify-between">
                    <h3 data-testid="report-name" className="text-sm font-semibold text-slate-700">
                      {report.title}
                    </h3>
                    <span className="inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                      {TYPE_LABEL[report.type] ?? report.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Period: {report.period}</p>
                  {report.summary && (
                    <p className="my-1 text-xs text-slate-400">{report.summary}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">
                      {formatDate(report.createdAt)}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        data-testid="report-view"
                        onClick={() => handleView(report)}
                        disabled={generatingId === report.id}
                        className="text-xs font-medium text-teal-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {generatingId === report.id ? 'Generating…' : 'View'}
                      </button>
                      {report.url && (
                        <a
                          data-testid="report-download"
                          href={report.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-teal-700 hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {generated && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${generated.title} results`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGenerated(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{generated.title}</h3>
                <p className="text-xs text-slate-500">
                  {TYPE_LABEL[generated.type] ?? generated.type} · Period {generated.period || '—'} ·
                  Generated {new Date(generated.generatedAt).toLocaleString('en-US')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGenerated(null)}
                aria-label="Close"
                className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <ResultView result={generated.result} />
          </div>
        </div>
      )}
    </div>
  );
}
