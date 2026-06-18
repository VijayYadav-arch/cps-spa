import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatients, type PatientSummary } from '@/api/patients';
import { usePermission, PERMISSIONS } from '@/permissions';

export function PatientsList() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const canIntake = usePermission(PERMISSIONS.PATIENTS_INTAKE);

  // Debounce the name search so we don't fire a request per keystroke; reset to
  // page 1 whenever the query changes so results aren't hidden on a later page.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getPatients({ page, pageSize: 20, q: debouncedSearch || undefined })
      .then((res) => {
        if (!cancelled) {
          setPatients(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load patients.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>;

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">Patients</h2>
        {canIntake ? (
          <Link to="/patients/intake" className="btn-primary">
            + New Patient
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="You don't have permission to start patient intake."
            className="btn-primary"
          >
            + New Patient
          </button>
        )}
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name…"
        aria-label="Search patients by name"
        className="form-input max-w-sm"
      />
      {isLoading ? (
        <div role="status" className="text-slate-500">Loading patients…</div>
      ) : patients.length === 0 ? (
        <p className="text-slate-500">{debouncedSearch ? 'No patients match your search.' : 'No patients found.'}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Date of Birth</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{p.id}</td>
                  <td className="px-4 py-3 text-slate-700">{p.firstName} {p.lastName}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(p.dateOfBirth).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <Link to={`/patients/${p.id}`} className="font-medium text-teal-700 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}
