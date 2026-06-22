import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getHomeHealthEpisode, type HomeHealthEpisode } from '@/api/homehealth';

const STATUS_TINT: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  discharged: 'bg-slate-100 text-slate-600',
  transferred: 'bg-amber-100 text-amber-800',
};

export function HomeHealthEpisodeDetail() {
  const { id, episodeId } = useParams<{ id: string; episodeId: string }>();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<HomeHealthEpisode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!episodeId) return;
    getHomeHealthEpisode(parseInt(episodeId, 10))
      .then(setEpisode)
      .catch(() => setError('Failed to load the home-health episode.'));
  }, [episodeId]);

  if (error)
    return (
      <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {error}
      </div>
    );
  if (!episode) return <div role="status" className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto grid max-w-[800px] gap-6 p-6">
      <header className="space-y-2">
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to patient
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl">Home Health Episode #{episode.id}</h2>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              STATUS_TINT[episode.status] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {episode.status}
          </span>
        </div>
        <div className="section-line" />
      </header>

      <dl className="grid grid-cols-[200px_1fr] gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <dt className="font-medium text-slate-600">Start of Care</dt>
        <dd className="text-slate-800">{episode.startOfCareDate}</dd>
        <dt className="font-medium text-slate-600">Admission source</dt>
        <dd className="text-slate-800 capitalize">{episode.admissionSource}</dd>
        <dt className="font-medium text-slate-600">Certification period</dt>
        <dd className="text-slate-800">
          {episode.certFromDate} → {episode.certToDate} (period {episode.periodNumber})
        </dd>
      </dl>

      <p className="text-sm text-slate-400">
        Plan of care, OASIS assessment, and PDGM billing arrive in later phases of the home-health build.
      </p>
    </div>
  );
}
