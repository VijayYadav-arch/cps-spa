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
      <div style={{ padding: '1rem', color: 'red' }} role="alert">
        Failed to load reports.
      </div>
    );
  if (loading) return <div style={{ padding: '1rem' }}>Loading…</div>;

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
    <div style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 data-testid="page-title" style={{ fontSize: 24, fontWeight: 600 }}>
          Monthly Reports &amp; Analytics
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Review your billing performance reports and analytics
        </p>
      </div>

      {reports.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: '#94a3b8',
            background: 'white',
            borderRadius: 12,
            border: '1px solid #f1f5f9',
          }}
        >
          No reports available yet.
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.type} style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {section.label} Reports
              <span style={{ fontSize: 12, color: '#94a3b8' }}>({section.reports.length})</span>
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {section.reports.map((report) => (
                <div
                  key={report.id}
                  data-testid="report-row"
                  style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <h3
                      data-testid="report-name"
                      style={{ fontSize: 14, fontWeight: 600 }}
                    >
                      {report.title}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        background: '#ecfeff',
                        color: '#0d9488',
                        borderRadius: 4,
                      }}
                    >
                      {TYPE_LABEL[report.type] ?? report.type}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b' }}>Period: {report.period}</p>
                  {report.summary && (
                    <p
                      style={{
                        fontSize: 12,
                        color: '#94a3b8',
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    >
                      {report.summary}
                    </p>
                  )}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 12,
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {formatDate(report.createdAt)}
                    </span>
                    {report.url ? (
                      <a
                        data-testid="report-download"
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#0d9488',
                          fontSize: 12,
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        Download
                      </a>
                    ) : (
                      <span
                        style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}
                      >
                        Not available
                      </span>
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
