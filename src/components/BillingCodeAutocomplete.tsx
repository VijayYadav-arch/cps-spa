import { useEffect, useRef, useState } from 'react';
import {
  searchBillingCodes,
  type BillingCodeEntry,
} from '@/api/claims';

interface Props {
  value: string;
  onChange: (code: string) => void;
  /**
   * Backend code-type filter: 'cpt' | 'icd10' | 'hcpcs' | 'revenue' (any
   * string the BillingCodeService.Search accepts). Omit to search all.
   */
  type?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  id?: string;
  /** Debounce window in ms before firing the search. */
  debounceMs?: number;
}

/**
 * Code-lookup combobox. Caller passes the current value (a code string)
 * and an onChange that fires when the user picks a result. Free-text
 * entry is allowed so a clinician can type a code we don't have in the
 * dictionary — onChange fires on raw input too. The dropdown is the
 * helper, not a gate.
 */
export function BillingCodeAutocomplete({
  value, onChange, type, placeholder, label, required, id,
  debounceMs = 200,
}: Props) {
  const [query, setQuery] = useState(value);
  const [hits, setHits] = useState<BillingCodeEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Keep input text in sync if the parent resets value externally.
  useEffect(() => { setQuery(value); }, [value]);

  // Debounced lookup.
  useEffect(() => {
    if (!query.trim()) { setHits([]); return; }
    const handle = window.setTimeout(() => {
      searchBillingCodes({ query: query.trim(), type })
        .then((res) => setHits(res.data))
        .catch(() => setHits([]));
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [query, type, debounceMs]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (entry: BillingCodeEntry) => {
    setQuery(entry.code);
    onChange(entry.code);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pick(hits[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {label && (
        <label htmlFor={id} style={{ display: 'block', fontSize: 12, color: '#475569' }}>
          {label}{required ? ' *' : ''}
        </label>
      )}
      <input
        id={id}
        type="text"
        value={query}
        placeholder={placeholder}
        required={required}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        aria-expanded={open && hits.length > 0}
        style={{ width: '100%' }}
      />
      {open && hits.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#fff', border: '1px solid #cbd5e1',
            borderRadius: 4, margin: 0, padding: 0, listStyle: 'none',
            maxHeight: 240, overflowY: 'auto', zIndex: 50,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          {hits.map((h, i) => (
            <li
              key={`${h.type}-${h.code}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); pick(h); }}
              style={{
                padding: '6px 10px', cursor: 'pointer',
                background: i === activeIndex ? '#dbeafe' : '#fff',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {h.code}
                <span style={{
                  marginLeft: 8, color: '#64748b', fontFamily: 'inherit',
                  fontWeight: 400, fontSize: 11,
                }}>
                  {h.type}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>{h.description}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
