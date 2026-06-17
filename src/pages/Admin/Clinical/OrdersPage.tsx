import { useEffect, useState } from 'react';
import {
  getOrders,
  createOrder,
  updateOrder,
  type PhysicianOrder,
  type CreatePhysicianOrderRequest,
} from '@/api/clinical';
import { getPatients, type PatientSummary } from '@/api/patients';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

const ORDER_TYPES = ['medication', 'treatment', 'diagnostic', 'referral', 'standing'];
const STATUSES = ['active', 'completed', 'discontinued', 'expired'];

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

interface FormState {
  id: number | null;
  patientId: string;
  orderType: string;
  orderText: string;
  orderedBy: string;
  frequency: string;
  isVerbal: boolean;
  status: string;
}

const blankForm: FormState = {
  id: null,
  patientId: '',
  orderType: 'medication',
  orderText: '',
  orderedBy: '',
  frequency: '',
  isVerbal: false,
  status: 'active',
};

export function OrdersPage() {
  const canManage = usePermission(PERMISSIONS.CLINICAL_ORDERS);
  const [orders, setOrders] = useState<PhysicianOrder[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    setLoading(true);
    getOrders()
      .then((r) => setOrders(r.data ?? []))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    getPatients({ pageSize: 200 })
      .then((r) => setPatients(r.data))
      .catch(() => undefined);
  }, []);

  function openAdd() {
    setForm({ ...blankForm });
  }
  function openEdit(o: PhysicianOrder) {
    setForm({
      id: o.id,
      patientId: String(o.patientId),
      orderType: o.orderType,
      orderText: o.orderText,
      orderedBy: o.orderedBy,
      frequency: o.frequency ?? '',
      isVerbal: o.isVerbal,
      status: o.status,
    });
  }

  const editing = form?.id != null;

  async function handleSubmit() {
    if (!form) return;
    setSubmitting(true);
    setError(null);
    try {
      if (form.id == null) {
        const req: CreatePhysicianOrderRequest = {
          patientId: parseInt(form.patientId, 10),
          orderType: form.orderType,
          orderText: form.orderText,
          orderedBy: form.orderedBy,
          orderDate: new Date().toISOString(),
          frequency: form.frequency || null,
          isVerbal: form.isVerbal,
          status: form.status,
        };
        await createOrder(req);
      } else {
        await updateOrder(form.id, {
          orderType: form.orderType,
          orderText: form.orderText,
          orderedBy: form.orderedBy,
          frequency: form.frequency || null,
          isVerbal: form.isVerbal,
          status: form.status,
        });
      }
      setForm(null);
      refresh();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not save the order.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-slate-900">Physician Orders</h1>
          <p className="text-slate-600 mt-1">Manage physician orders and signatures</p>
        </div>
        {!form && (
          <button
            onClick={openAdd}
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Order
          </button>
        )}
      </header>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {form && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 grid gap-4">
          <h2 className="text-lg font-semibold">{editing ? 'Edit order' : 'Add order'}</h2>
          {!editing && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Patient</span>
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="form-input w-72"
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.lastName}, {p.firstName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Type</span>
              <select
                value={form.orderType}
                onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                className="form-input w-40"
              >
                {ORDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Ordered By</span>
              <input
                value={form.orderedBy}
                onChange={(e) => setForm({ ...form, orderedBy: e.target.value })}
                placeholder="Dr. Name"
                className="form-input w-48"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Frequency</span>
              <input
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                placeholder="e.g. PRN"
                className="form-input w-32"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-600">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="form-input w-40"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Order Text</span>
            <textarea
              value={form.orderText}
              onChange={(e) => setForm({ ...form, orderText: e.target.value })}
              rows={2}
              className="form-input"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isVerbal}
              onChange={(e) => setForm({ ...form, isVerbal: e.target.checked })}
            />
            Verbal order
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setForm(null)}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !form.orderText ||
                !form.orderedBy ||
                (!editing && !form.patientId)
              }
              className="btn-primary disabled:opacity-60"
            >
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add order'}
            </button>
          </div>
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
                <th className="px-5 py-3">Actions</th>
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
                  <td className="px-5 py-4 text-sm">
                    {canManage && (
                      <button
                        onClick={() => openEdit(o)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
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
