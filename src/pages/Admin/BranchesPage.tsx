import { useEffect, useState } from 'react';
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type Branch,
  type CreateBranchRequest,
} from '@/api/admin';
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';

const NO_PERMISSION = 'You do not have permission to perform this action';

function extractError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? fallback
  );
}

const EMPTY_FORM: CreateBranchRequest = {
  name: '',
  code: '',
  ccnNumber: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  zipCode: null,
  phone: null,
};

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<CreateBranchRequest>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  // Create / update / delete branches all require admin:manage_branches
  // (POST|PUT|DELETE /branches are gated by that policy). The list (GET) is
  // open to any authenticated user, so viewing isn't gated.
  const canManage = usePermission(PERMISSIONS.ADMIN_MANAGE_BRANCHES);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listBranches(false);
      setBranches(data);
    } catch {
      setError('Failed to load branches.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setActionMsg(null);
  }

  function startEdit(b: Branch) {
    setEditing(b);
    setForm({
      name: b.name,
      code: b.code,
      ccnNumber: b.ccnNumber,
      addressLine1: b.addressLine1,
      addressLine2: b.addressLine2,
      city: b.city,
      state: b.state,
      zipCode: b.zipCode,
      phone: b.phone,
    });
    setShowForm(true);
    setActionMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionMsg(null);
    try {
      if (editing) {
        await updateBranch(editing.id, {
          name: form.name,
          ccnNumber: form.ccnNumber,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          phone: form.phone,
          isActive: editing.isActive,
        });
        setActionMsg(`Updated branch ${form.name}.`);
      } else {
        await createBranch(form);
        setActionMsg(`Created branch ${form.name}.`);
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Save failed.'));
    }
  }

  async function handleToggleActive(b: Branch) {
    setError(null);
    try {
      await updateBranch(b.id, {
        name: b.name,
        ccnNumber: b.ccnNumber,
        addressLine1: b.addressLine1,
        addressLine2: b.addressLine2,
        city: b.city,
        state: b.state,
        zipCode: b.zipCode,
        phone: b.phone,
        isActive: !b.isActive,
      });
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to toggle active state.'));
    }
  }

  async function handleDelete(b: Branch) {
    if (!window.confirm(`Delete branch "${b.name}"? This is soft-delete and can be reversed by re-creating.`)) {
      return;
    }
    setError(null);
    try {
      await deleteBranch(b.id);
      setActionMsg(`Deleted branch ${b.name}.`);
      await refresh();
    } catch (err) {
      setError(extractError(err, 'Failed to delete branch.'));
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Branches</h2>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Intra-organization sites or service lines. Patients and claims can be
            optionally assigned to a branch for operational reporting.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={!canManage}
          title={!canManage ? NO_PERMISSION : undefined}
          style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
        >
          + New Branch
        </button>
      </header>

      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#15803d' }}>{actionMsg}</div>}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: 16,
            background: '#f8fafc',
            display: 'grid',
            gap: 8,
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <h3 style={{ gridColumn: '1 / -1', fontSize: 16, fontWeight: 600 }}>
            {editing ? `Edit Branch #${editing.id}` : 'New Branch'}
          </h3>
          <label>
            <div>Name *</div>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>Code *</div>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              disabled={!!editing}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>CCN Number</div>
            <input
              value={form.ccnNumber ?? ''}
              onChange={(e) => setForm({ ...form, ccnNumber: e.target.value || null })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>Phone</div>
            <input
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <div>Address line 1</div>
            <input
              value={form.addressLine1 ?? ''}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value || null })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>City</div>
            <input
              value={form.city ?? ''}
              onChange={(e) => setForm({ ...form, city: e.target.value || null })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>State</div>
            <input
              value={form.state ?? ''}
              onChange={(e) => setForm({ ...form, state: e.target.value || null })}
              maxLength={2}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <div>ZIP</div>
            <input
              value={form.zipCode ?? ''}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value || null })}
              style={{ width: '100%' }}
            />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={!canManage}
              title={!canManage ? NO_PERMISSION : undefined}
              style={{ cursor: !canManage ? 'not-allowed' : 'pointer' }}
            >
              {editing ? 'Save' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {isLoading && <div role="status">Loading…</div>}
      {!isLoading && branches.length === 0 && (
        <p style={{ color: '#64748b' }}>No branches yet — create one to get started.</p>
      )}
      {!isLoading && branches.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Name</th>
              <th style={{ padding: '6px 10px' }}>Code</th>
              <th style={{ padding: '6px 10px' }}>CCN</th>
              <th style={{ padding: '6px 10px' }}>Location</th>
              <th style={{ padding: '6px 10px' }}>Active</th>
              <th style={{ padding: '6px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{b.name}</td>
                <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 13 }}>{b.code}</td>
                <td style={{ padding: '6px 10px', color: '#64748b' }}>{b.ccnNumber ?? '—'}</td>
                <td style={{ padding: '6px 10px', color: '#64748b' }}>
                  {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {b.isActive ? (
                    <span style={{ color: '#15803d' }}>Active</span>
                  ) : (
                    <span style={{ color: '#64748b' }}>Inactive</span>
                  )}
                </td>
                <td style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => startEdit(b)} style={{ fontSize: 12 }}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(b)}
                    disabled={!canManage}
                    title={!canManage ? NO_PERMISSION : undefined}
                    style={{ fontSize: 12, cursor: !canManage ? 'not-allowed' : 'pointer' }}
                  >
                    {b.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(b)}
                    disabled={!canManage}
                    title={!canManage ? NO_PERMISSION : undefined}
                    style={{ fontSize: 12, color: '#b91c1c', cursor: !canManage ? 'not-allowed' : 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
