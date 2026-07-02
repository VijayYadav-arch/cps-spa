import { MODULE_BUNDLES, MODULE_META, ALL_MODULES, type ModuleKey } from '@/permissions';

interface ModuleSelectorProps {
  /** Currently-selected module keys. */
  value: string[];
  onChange: (modules: string[]) => void;
  disabled?: boolean;
}

/**
 * À-la-carte + presets picker for an org's service-line entitlements. Bundle buttons set the whole
 * selection at once; the per-module checkboxes then let the admin fine-tune. The persisted value is
 * always the resolved module set — presets are convenience only.
 */
export function ModuleSelector({ value, onChange, disabled }: ModuleSelectorProps) {
  const selected = new Set(value);

  const toggle = (key: ModuleKey) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // Preserve catalog order for a stable payload.
    onChange(ALL_MODULES.filter((m) => next.has(m)));
  };

  const applyBundle = (modules: ModuleKey[]) => onChange([...modules]);

  const bundleMatches = (modules: ModuleKey[]) =>
    modules.length === selected.size && modules.every((m) => selected.has(m));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-navy-500 uppercase tracking-wide">Bundle presets</span>
        <div className="flex flex-wrap gap-2">
          {MODULE_BUNDLES.map((b) => {
            const active = bundleMatches(b.modules);
            return (
              <button
                key={b.key}
                type="button"
                disabled={disabled}
                onClick={() => applyBundle(b.modules)}
                title={b.description}
                className={`px-3 py-2 min-h-10 rounded-md border text-sm disabled:opacity-50 ${
                  active
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-navy-200 text-navy-700 hover:bg-navy-50'
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
        <legend className="text-xs text-navy-500 uppercase tracking-wide mb-1">Modules</legend>
        {ALL_MODULES.map((key) => (
          <label
            key={key}
            className="flex items-start gap-3 p-3 rounded-md border border-navy-100 hover:bg-navy-50 min-h-12 cursor-pointer"
          >
            <input
              type="checkbox"
              className="mt-1"
              aria-label={MODULE_META[key].label}
              checked={selected.has(key)}
              disabled={disabled}
              onChange={() => toggle(key)}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-navy-900">{MODULE_META[key].label}</span>
              <span className="text-xs text-navy-500">{MODULE_META[key].description}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
