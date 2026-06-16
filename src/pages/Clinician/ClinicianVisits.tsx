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
    <div className="mx-auto max-w-[720px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 data-testid="page-title" className="text-xl">
          Recent Visits
        </h1>
        <Link
          to="/clinician/visits/new"
          data-testid="action-new-visit"
          className="rounded-md bg-teal-600 px-3.5 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-teal-700"
        >
          New
        </Link>
      </div>

      {loading && (
        <div role="status" className="text-slate-500">
          Loading…
        </div>
      )}
      {error && (
        <div role="alert" className="text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && visits.length === 0 && (
        <p data-testid="empty-state" className="text-slate-500">
          No visit notes yet.
        </p>
      )}

      <ul className="m-0 list-none p-0">
        {visits.map((v) => (
          <li
            key={v.id}
            data-testid={`visit-row-${v.id}`}
            className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-slate-700">
                {patientName(v)}
              </div>
              <div className="text-xs text-slate-500">
                {v.visitType} · {formatDate(v.visitDate)} · {v.status}
              </div>
            </div>
            <button
              type="button"
              data-testid={`summarize-${v.id}`}
              onClick={() => setSummarizing(v)}
              disabled={!canSummarize}
              title={!canSummarize ? NO_PERMISSION : undefined}
              className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[13px] font-medium text-teal-700 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
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
