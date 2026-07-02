/**
 * Service-line module catalog — mirrors CPS.Core.Authorization.Modules on the backend. An org is
 * entitled to a set of these ("à la carte"); provisioning offers bundle presets. Effective access
 * to a feature is: org entitled to the module AND the user holds the permission.
 *
 * Keep these string values in lockstep with the backend Modules constants.
 */
export const MODULES = {
  HOSPICE: 'hospice',
  HOME_HEALTH: 'home_health',
  CLINICAL: 'clinical',
  BILLING: 'billing',
  AI: 'ai',
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

/** Every module, in display order. */
export const ALL_MODULES: ModuleKey[] = [
  MODULES.HOSPICE,
  MODULES.HOME_HEALTH,
  MODULES.CLINICAL,
  MODULES.BILLING,
  MODULES.AI,
];

/** Human-facing labels + one-line descriptions for the provisioning / admin toggles. */
export const MODULE_META: Record<ModuleKey, { label: string; description: string }> = {
  [MODULES.HOSPICE]: {
    label: 'Hospice',
    description: 'Election, certification, IDG, bereavement, HQRP, per-diem billing.',
  },
  [MODULES.HOME_HEALTH]: {
    label: 'Home Health',
    description: 'Episodes, OASIS-E, POC/F2F, PDGM billing (HIPPS, NOA, 837I).',
  },
  [MODULES.CLINICAL]: {
    label: 'Clinical',
    description: 'Visit documentation, vitals, medications, orders, care plans, referrals.',
  },
  [MODULES.BILLING]: {
    label: 'Billing',
    description: 'Charges, claims, ERA/payments, denials, AR, statements.',
  },
  [MODULES.AI]: {
    label: 'AI Assist',
    description: 'Denial prediction, coding suggestions, IDG briefs, family chat (opt-in).',
  },
};

/**
 * Bundle presets shown at provisioning as one-click starting points. "Custom" (no preset) lets the
 * admin pick à la carte. These are convenience groupings only — the persisted state is always the
 * resolved module set, never the preset name.
 */
export interface ModuleBundle {
  key: string;
  label: string;
  description: string;
  modules: ModuleKey[];
}

export const MODULE_BUNDLES: ModuleBundle[] = [
  {
    key: 'hospice-suite',
    label: 'Hospice Suite',
    description: 'Hospice care + clinical documentation + billing.',
    modules: [MODULES.HOSPICE, MODULES.CLINICAL, MODULES.BILLING],
  },
  {
    key: 'home-health-suite',
    label: 'Home Health Suite',
    description: 'Home health episodes + clinical documentation + billing.',
    modules: [MODULES.HOME_HEALTH, MODULES.CLINICAL, MODULES.BILLING],
  },
  {
    key: 'full-platform',
    label: 'Full Platform',
    description: 'Every service line plus AI assist.',
    modules: [...ALL_MODULES],
  },
];
