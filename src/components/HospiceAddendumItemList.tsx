import type { HospiceElectionAddendumItem } from '@/api/hospice';

interface Props {
  items: HospiceElectionAddendumItem[];
  onChange: (items: HospiceElectionAddendumItem[]) => void;
  readOnly?: boolean;
}

const CATEGORIES = ['Drug', 'Service', 'DME', 'Condition', 'Procedure', 'Other'];

export function HospiceAddendumItemList({ items, onChange, readOnly }: Props) {
  function update(i: number, patch: Partial<HospiceElectionAddendumItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  function addBlank() {
    onChange([
      ...items,
      {
        category: 'Drug',
        description: '',
        clinicalExplanation: '',
        relatedCondition: null,
      },
    ]);
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.length === 0 && (
        <p style={{ color: '#64748b' }}>
          No items declared. Add at least one item the hospice has determined is not
          related to the terminal illness.
        </p>
      )}
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: 12,
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Item #{idx + 1}</strong>
            {!readOnly && (
              <button type="button" onClick={() => remove(idx)} style={{ color: '#b91c1c' }}>
                Remove
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Category</span>
              {readOnly ? (
                <span>{item.category}</span>
              ) : (
                <select
                  value={item.category}
                  onChange={(e) => update(idx, { category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Related (unrelated) condition</span>
              {readOnly ? (
                <span>{item.relatedCondition ?? '—'}</span>
              ) : (
                <input
                  value={item.relatedCondition ?? ''}
                  onChange={(e) =>
                    update(idx, { relatedCondition: e.target.value || null })
                  }
                  placeholder="e.g., ESRD"
                />
              )}
            </label>
          </div>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Description (patient-facing)</span>
            {readOnly ? (
              <span>{item.description}</span>
            ) : (
              <input
                value={item.description}
                onChange={(e) => update(idx, { description: e.target.value })}
                required
              />
            )}
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Clinical explanation (plain language; required per 42 CFR 418.24(c))</span>
            {readOnly ? (
              <span>{item.clinicalExplanation}</span>
            ) : (
              <textarea
                value={item.clinicalExplanation}
                onChange={(e) => update(idx, { clinicalExplanation: e.target.value })}
                rows={3}
                required
              />
            )}
          </label>
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={addBlank}>
          + Add Item
        </button>
      )}
    </div>
  );
}
