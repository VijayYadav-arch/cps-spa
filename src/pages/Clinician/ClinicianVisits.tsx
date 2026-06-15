import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { VisitNoteSummaryModal } from '@/components/VisitNoteSummaryModal';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

interface VisitNote {
  id: number;
  patientId: number;
  visitType: string;
  visitDate: string;
  status: string;
}

interface VisitsEnvelope {
  data: VisitNote[];
  pagination?: { total: number };
}

interface PatientLite {
  id: number;
  firstName: string;
  lastName: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ClinicianVisits() {
  const [visits, setVisits] = useState<VisitNote[]>([]);
  const [patientsById, setPatientsById] = useState<Record<number, PatientLite>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<VisitNote | null>(null);

  // AI summary hits POST /clinician/visits/{id}/summarize, gated by the
  // clinical:visit_notes policy on VisitNoteSummaryController.
  const canSummarize = usePermission(PERMISSIONS.CLINICAL_VISIT_NOTES);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<VisitsEnvelope>('/clinician/visits?pageSize=20')
      .then(async (res) => {
        if (cancelled) return;
        const list = res.data.data;
        setVisits(list);
        const uniquePatientIds = Array.from(new Set(list.map((v) => v.patientId)));
        const fetched = await Promise.all(
          uniquePatientIds.map((pid) =>
            apiClient
              .get<{ data: PatientLite }>(`/patients/${pid}`)
              .then((r) => r.data.data)
              .catch(() => null)
          )
        );
        if (cancelled) return;
        const map: Record<number, PatientLite> = {};
        for (const p of fetched) {
          if (p) map[p.id] = p;
        }
        setPatientsById(map);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load visits.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patientName = (v: VisitNote) => {
    const p = patientsById[v.patientId];
    return p ? `${p.lastName}, ${p.firstName}` : `Patient #${v.patientId}`;
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
      <div
        style={{
          marginTop: 16,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 data-testid="page-title" style={{ fontSize: 20, fontWeight: 600 }}>
          Recent Visits
        </h1>
        <Link
          to="/clinician/visits/new"
          data-testid="action-new-visit"
          style={{
            padding: '8px 14px',
            background: '#0d9488',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          New
        </Link>
      </div>

      {loading && <div>Loading…</div>}
      {error && (
        <div role="alert" style={{ color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {!loading && !error && visits.length === 0 && (
        <p data-testid="empty-state" style={{ color: '#64748b' }}>
          No visit notes yet.
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {visits.map((v) => (
          <li
            key={v.id}
            data-testid={`visit-row-${v.id}`}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 12,
              border: '1px solid #f1f5f9',
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {patientName(v)}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {v.visitType} · {formatDate(v.visitDate)} · {v.status}
              </div>
            </div>
            <button
              type="button"
              data-testid={`summarize-${v.id}`}
              onClick={() => setSummarizing(v)}
              disabled={!canSummarize}
              title={!canSummarize ? NO_PERMISSION : undefined}
              style={{
                padding: '6px 10px',
                fontSize: 13,
                background: '#f0fdfa',
                color: '#0d9488',
                border: '1px solid #99f6e4',
                borderRadius: 8,
                cursor: canSummarize ? 'pointer' : 'not-allowed',
                fontWeight: 500,
              }}
            >
              AI summary
            </button>
          </li>
        ))}
      </ul>

      {summarizing && (
        <VisitNoteSummaryModal
          visitId={summarizing.id}
          visitLabel={`${patientName(summarizing)} · ${formatDate(summarizing.visitDate)}`}
          onClose={() => setSummarizing(null)}
        />
      )}
    </div>
  );
}
