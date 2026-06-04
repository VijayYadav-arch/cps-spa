import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface PhysicianOrder {
  id: number;
  orderDate: string;
  orderType: string;
  orderText: string;
  orderedBy: string;
  isVerbal: boolean;
  signedBy?: string | null;
  status: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  discontinued: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-slate-50 text-slate-600 border-slate-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
        STATUS_BADGE[status] ?? STATUS_BADGE.active
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<PhysicianOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ data: PhysicianOrder[] }>('/clinical/orders')
      .then((res) => {
        if (!cancelled) setOrders(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load orders');
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
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">Physician Orders</h1>
        <p className="text-slate-600 mt-1">Manage physician orders and signatures</p>
      </header>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No orders yet</p>
            <p className="text-sm">Physician orders will appear here.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Ordered By</th>
                <th className="px-5 py-3">Verbal</th>
                <th className="px-5 py-3">Signed</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-sm capitalize">{o.orderType}</td>
                  <td className="px-5 py-4 text-sm max-w-xs truncate">{o.orderText}</td>
                  <td className="px-5 py-4 text-sm">{o.orderedBy}</td>
                  <td className="px-5 py-4 text-sm">{o.isVerbal ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-4 text-sm">{o.signedBy ?? 'Pending'}</td>
                  <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
