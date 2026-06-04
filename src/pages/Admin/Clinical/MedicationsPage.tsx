import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface Medication {
  id: number;
  name: string;
  genericName?: string | null;
  dosage: string;
  route: string;
  frequency: string;
  purpose?: string | null;
  isHospiceRelated?: boolean | null;
  isActive: boolean;
}

export function MedicationsPage() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ data: Medication[] }>('/clinical/medications')
      .then((res) => {
        if (!cancelled) setMeds(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load medications');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = meds.filter((m) => m.isActive).length;
  const hospiceRelatedCount = meds.filter((m) => m.isHospiceRelated).length;

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">Medications</h1>
        <p className="text-slate-600 mt-1">Patient medication management and reconciliation</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-500">Active Medications</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-500">Hospice-Related</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{hospiceRelatedCount}</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading medications...</div>
        ) : meds.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No medications recorded</p>
            <p className="text-sm">Patient medications will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Dosage</th>
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Frequency</th>
                <th className="px-5 py-3">Purpose</th>
                <th className="px-5 py-3">Hospice Related</th>
                <th className="px-5 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meds.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium">
                    {m.name}
                    {m.genericName && (
                      <span className="text-xs text-slate-400 ml-1">({m.genericName})</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">{m.dosage}</td>
                  <td className="px-5 py-4 text-sm capitalize">{m.route}</td>
                  <td className="px-5 py-4 text-sm">{m.frequency}</td>
                  <td className="px-5 py-4 text-sm capitalize">{m.purpose ?? '—'}</td>
                  <td className="px-5 py-4 text-sm">
                    {m.isHospiceRelated === true ? (
                      <span className="text-green-600 font-semibold">Yes</span>
                    ) : m.isHospiceRelated === false ? (
                      <span className="text-slate-400">No</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {m.isActive ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                        Inactive
                      </span>
                    )}
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
