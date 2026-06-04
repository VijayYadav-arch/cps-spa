import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface Inquiry {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  organization: string | null;
  serviceType: string;
  message: string;
  status: string;
  createdAt: string;
}

interface InquiriesResponse {
  data: Inquiry[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const SERVICE_LABELS: Record<string, string> = {
  'hospice-billing': 'Hospice Billing',
  'home-health-billing': 'Home Health Billing',
  'palliative-care-billing': 'Palliative Care Billing',
  consulting: 'Consulting',
  'payer-setup': 'Payer Setup',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-yellow-100 text-yellow-700',
  contacted: 'bg-teal-100 text-teal-700',
  closed: 'bg-slate-100 text-slate-600',
};

export function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Inquiry | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<InquiriesResponse>('/inquiries')
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setInquiries(list);
      })
      .catch(() => {
        /* keep empty */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-serif text-slate-900">Inquiries</h1>
        <p className="text-slate-600 mt-1">
          {inquiries.length} total inquiries from the public website
        </p>
      </header>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 mt-4">Loading inquiries...</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <p className="text-slate-500">No inquiries yet.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {inquiries.map((inq) => (
              <button
                key={inq.id}
                type="button"
                onClick={() => setSelected(inq)}
                className={`w-full text-left bg-white rounded-xl p-5 border ${
                  selected?.id === inq.id
                    ? 'border-teal-400 shadow-md ring-1 ring-teal-400/20'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {inq.firstName} {inq.lastName}
                      </h3>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[inq.status] ?? STATUS_COLORS.new
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate">
                      {inq.email}
                      {inq.organization && ` · ${inq.organization}`}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-600 font-medium">
                        {SERVICE_LABELS[inq.serviceType] ?? inq.serviceType}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(inq.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <aside className="lg:col-span-1">
            {selected ? (
              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm sticky top-6">
                <h3 className="text-lg font-serif text-slate-900 mb-4">Inquiry Details</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400 uppercase tracking-wider">Name</dt>
                    <dd className="font-medium text-slate-900">
                      {selected.firstName} {selected.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400 uppercase tracking-wider">Email</dt>
                    <dd>
                      <a href={`mailto:${selected.email}`} className="text-teal-600">
                        {selected.email}
                      </a>
                    </dd>
                  </div>
                  {selected.phone && (
                    <div>
                      <dt className="text-xs text-slate-400 uppercase tracking-wider">Phone</dt>
                      <dd>
                        <a href={`tel:${selected.phone}`} className="text-teal-600">
                          {selected.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {selected.organization && (
                    <div>
                      <dt className="text-xs text-slate-400 uppercase tracking-wider">Organization</dt>
                      <dd className="text-slate-900">{selected.organization}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-slate-400 uppercase tracking-wider">Service</dt>
                    <dd className="text-slate-900">
                      {SERVICE_LABELS[selected.serviceType] ?? selected.serviceType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400 uppercase tracking-wider">Message</dt>
                    <dd className="text-slate-600 whitespace-pre-wrap">{selected.message}</dd>
                  </div>
                </dl>
                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <a
                    href={`mailto:${selected.email}`}
                    className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 flex-1 text-center"
                  >
                    Reply
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 border border-slate-100 text-center">
                <p className="text-sm text-slate-500">Select an inquiry to view details</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
