import { useEffect, useState } from 'react';
import {
  listFamilyAccess,
  provisionFamilyAccess,
  rotateFamilyPin,
  type FamilyGrantee,
  type FamilyProvisionResult,
} from '@/api/familyAccess';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

export function FamilyAccessCard({ patientId }: { patientId: number }) {
  const canManage = usePermission(PERMISSIONS.PATIENTS_EDIT);
  const [grantees, setGrantees] = useState<FamilyGrantee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The one-time PIN to display after provision/rotate.
  const [issued, setIssued] = useState<FamilyProvisionResult | null>(null);

  function refresh() {
    listFamilyAccess(patientId)
      .then((r) => setGrantees(r.data))
      .catch(() => undefined);
  }

  useEffect(refresh, [patientId]);

  async function handleProvision() {
    if (!relationship.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await provisionFamilyAccess(patientId, {
        relationshipLabel: relationship.trim(),
        email: email || null,
        phoneNumber: phone || null,
      });
      setIssued(result);
      setShowForm(false);
      setRelationship('');
      setEmail('');
      setPhone('');
      refresh();
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Could not provision family access.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRotate(id: number) {
    setError(null);
    try {
      setIssued(await rotateFamilyPin(patientId, id));
      refresh();
    } catch {
      setError('Could not rotate the PIN.');
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Family Portal Access</h3>
        {!showForm && (
          <button
            onClick={() => { setIssued(null); setShowForm(true); }}
            disabled={!canManage}
            title={!canManage ? NO_PERMISSION : undefined}
            className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Grant Access
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {issued && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-semibold text-green-800">
            One-time PIN — share securely now; it can't be shown again.
          </p>
          <p className="mt-1 font-mono text-2xl tracking-widest text-green-900">{issued.pin}</p>
          <p className="text-xs text-green-700">
            Patient ID {issued.patientId} · expires {new Date(issued.pinExpiry).toLocaleDateString()}
          </p>
        </div>
      )}

      {showForm && (
        <div className="mt-3 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Relationship</span>
            <input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Daughter, Spouse"
              className="form-input w-64"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input w-64"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Phone (optional)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input w-64"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleProvision}
              disabled={submitting || !relationship.trim()}
              className="rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? 'Issuing…' : 'Issue PIN'}
            </button>
          </div>
        </div>
      )}

      {grantees.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No family members have portal access.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {grantees.map((g) => (
            <li key={g.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span>
                <span className="font-medium text-slate-700">{g.relationshipLabel}</span>
                {g.email && <span className="text-slate-400"> · {g.email}</span>}
                {!g.isActive && <span className="ml-2 text-xs text-slate-400">(inactive)</span>}
                <span className="block text-xs text-slate-400">
                  PIN expires {new Date(g.pinExpiry).toLocaleDateString()} ·{' '}
                  {g.lastLoginAt
                    ? `last login ${new Date(g.lastLoginAt).toLocaleDateString()}`
                    : 'never logged in'}
                </span>
              </span>
              {canManage && (
                <button
                  onClick={() => handleRotate(g.id)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Rotate PIN
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
