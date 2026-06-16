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

export function CommercialReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
                    {report.url ? (
                      <a
                        data-testid="report-download"
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-teal-700 hover:underline"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-xs italic text-slate-400">Not available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
