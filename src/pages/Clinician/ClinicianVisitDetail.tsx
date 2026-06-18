import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

interface VisitNote {
  id: number;
  patientId: number;
  visitType: string;
  visitDate: string;
  vitals: string | null;
  assessment: string | null;
  planOfCare: string | null;
  notes: string | null;
  status: string;
  signedAt: string | null;
}

const NO_PERMISSION = 'You do not have permission to perform this action';

export function ClinicianVisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManage = usePermission(PERMISSIONS.CLINICAL_VISIT_NOTES);
  const [note, setNote] = useState<VisitNote | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    apiClient
      .get<{ data: VisitNote }>(`/clinician/visits/${id}`)
      .then((r) => {
        setNote(r.data.data);
        return apiClient
          .get<{ data: { firstName: string; lastName: string } }>(`/patients/${r.data.data.patientId}`)
          .then((p) => setPatientName(`${p.data.data.lastName}, ${p.data.data.firstName}`))
          .catch(() => undefined);
      })
      .catch(() => setError('Failed to load the visit note.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleSign() {
    if (!note) return;
    setSigning(true);
    setError(null);
    try {
      await apiClient.post(`/clinician/visits/${note.id}/sign`, {});
      load();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not sign the visit note.',
      );
    } finally {
      setSigning(false);
    }
  }

  if (loading) return <div role="status" className="p-6 text-slate-500">Loading…</div>;
  if (error && !note)
    return <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;
  if (!note) return null;

  const isDraft = note.status === 'draft';

  return (
    <div className="mx-auto grid max-w-[800px] gap-6 p-6">
      <header className="space-y-2">
        <button
          onClick={() => navigate(-1)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl">Visit Note #{note.id}</h2>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              note.status === 'signed'
                ? 'bg-green-100 text-green-800'
                : note.status === 'amended'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {note.status}
          </span>
          {note.signedAt && (
            <span className="text-xs text-slate-500">signed {new Date(note.signedAt).toLocaleString()}</span>
          )}
        </div>
        <div className="section-line" />
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <dt className="font-medium text-slate-600">Patient</dt>
        <dd className="text-slate-700">{patientName ?? `#${note.patientId}`}</dd>
        <dt className="font-medium text-slate-600">Visit type</dt>
        <dd className="text-slate-700">{note.visitType}</dd>
        <dt className="font-medium text-slate-600">Visit date</dt>
        <dd className="text-slate-700">{new Date(note.visitDate).toLocaleString()}</dd>
      </dl>

      <Section title="Vitals" body={note.vitals} mono />
      <Section title="Assessment" body={note.assessment} />
      <Section title="Plan of care" body={note.planOfCare} />
      <Section title="Notes" body={note.notes} />

      {isDraft && (
        <div>
          <button
            onClick={handleSign}
            disabled={signing || !canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signing ? 'Signing…' : 'Sign visit note'}
          </button>
          <p className="mt-1 text-xs text-slate-500">Signing locks the note for handoff and compliance.</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, body, mono }: { title: string; body: string | null; mono?: boolean }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {body ? (
        <p className={`mt-1 whitespace-pre-wrap text-sm text-slate-700 ${mono ? 'font-mono text-xs' : ''}`}>{body}</p>
      ) : (
        <p className="mt-1 text-sm text-slate-400">—</p>
      )}
    </section>
  );
}
