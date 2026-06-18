/**
 * Permission string constants — hand-mirrored from cps-dotnet's
 * `CPS.Core.Authorization.Permissions` static class (81 constants).
 *
 * KEEP IN SYNC: cps-dotnet CI emits permissions.json via PermissionsContractExportTests.
 * cps-spa CI compares this file against that JSON; drift fails the build.
 *
 * Adding a permission:
 *   1. Add the constant in cps-dotnet/.../Permissions.cs
 *   2. Run cps-dotnet tests to regenerate permissions.json
 *   3. Add the matching entry below (key = SCREAMING_SNAKE of the C# name; value = literal string)
 *   4. Ship both repos together
 */
export const PERMISSIONS = {
  // Patients
  PATIENTS_VIEW: 'patients:view',
  PATIENTS_CREATE: 'patients:create',
  PATIENTS_EDIT: 'patients:edit',
  PATIENTS_DELETE: 'patients:delete',
  PATIENTS_INTAKE: 'patients:intake',

  // Claims
  CLAIMS_VIEW: 'claims:view',
  CLAIMS_CREATE: 'claims:create',
  CLAIMS_SUBMIT: 'claims:submit',
  CLAIMS_EDIT: 'claims:edit',
  CLAIMS_VOID: 'claims:void',
  CLAIMS_PRINT: 'claims:print',

  // Billing
  BILLING_SCRUB: 'billing:scrub',
  BILLING_ERA: 'billing:era',
  BILLING_DENIALS: 'billing:denials',
  BILLING_STATEMENTS: 'billing:statements',
  BILLING_CODES: 'billing:codes',
  BILLING_QUEUE: 'billing:queue',
  BILLING_BATCH: 'billing:batch',
  BILLING_SUPERBILLS: 'billing:superbills',
  BILLING_AR_FOLLOW_UP: 'billing:ar-followup',

  // Clinical
  CLINICAL_VISIT_NOTES: 'clinical:visit_notes',
  CLINICAL_VITALS: 'clinical:vitals',
  CLINICAL_CARE_PLANS: 'clinical:care_plans',
  CLINICAL_MEDICATIONS: 'clinical:medications',
  CLINICAL_ORDERS: 'clinical:orders',
  CLINICAL_DISCHARGE: 'clinical:discharge',
  CLINICAL_PRIOR_AUTH: 'clinical:prior_auth',
  CLINICAL_QUALITY: 'clinical:quality',
  CLINICAL_REFERRALS: 'clinical:referrals',

  // Admin
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_MANAGE_ROLES: 'admin:manage_roles',
  ADMIN_MANAGE_ORGS: 'admin:manage_orgs',
  ADMIN_AUDIT_LOGS: 'admin:audit_logs',
  ADMIN_SYSTEM_CONFIG: 'admin:system_config',
  ADMIN_IMPORT: 'admin:import',
  ADMIN_MANAGE_BRANCHES: 'admin:manage_branches',

  // Integrations
  INTEGRATIONS_MANAGE: 'integrations:manage',
  INTEGRATIONS_SUBMIT_CLAIM: 'integrations:submit_claim',
  INTEGRATIONS_ELIGIBILITY: 'integrations:eligibility',
  INTEGRATIONS_EMR_SYNC: 'integrations:emr_sync',
  INTEGRATIONS_FHIR_INGEST: 'integrations:fhir_ingest',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Portal (client-side)
  PORTAL_DASHBOARD: 'portal:dashboard',
  PORTAL_DOCUMENTS: 'portal:documents',
  PORTAL_REPORTS: 'portal:reports',
  PORTAL_BRANDING: 'portal:branding',
  PORTAL_MANAGE_USERS: 'portal:manage_users',

  // Organization (tenant-scoped admin actions on org-owned resources)
  ORG_API_KEYS: 'org:api_keys',
  ORG_ROLLUP_VIEW: 'org:rollup_view',

  // Platform
  PLATFORM_API_KEYS: 'platform:api_keys',
  PLATFORM_WEBHOOKS: 'platform:webhooks',
  PLATFORM_SSO: 'platform:sso',
  PLATFORM_ONBOARDING: 'platform:onboarding',
  PLATFORM_ADMIN: 'platform:admin',

  // Compliance
  COMPLIANCE_BREACHES: 'compliance:breaches',
  COMPLIANCE_PHI_REVIEW: 'compliance:phi_review',
  COMPLIANCE_SURVEYOR_EXPORT: 'compliance:surveyor_export',

  // Hospice benefit management (Sub-system A)
  HOSPICE_MANAGE: 'hospice:manage',
  HOSPICE_IDG_MANAGE: 'hospice:idg_manage',
  HOSPICE_VIEW: 'hospice:view',

  // Hospice live-discharge management (Sub-system E)
  HOSPICE_DISCHARGE_MANAGE: 'hospice:discharge_manage',
  HOSPICE_DISCHARGE_VIEW: 'hospice:discharge_view',

  // Hospice per-diem billing (Sub-system B)
  HOSPICE_PER_DIEM_BILLING: 'hospice:per_diem_billing',

  // Hospice clinical operations (Sub-system C)
  HOSPICE_CLINICAL_ASSESSMENT: 'hospice:clinical_assessment',

  // Hospice bereavement (Sub-system D)
  HOSPICE_BEREAVEMENT: 'hospice:bereavement',

  // Hospice election-statement addendum (42 CFR 418.24(c))
  HOSPICE_ADDENDUM: 'hospice:addendum',

  // Hospice volunteers (42 CFR 418.78 — 5% rule)
  HOSPICE_VOLUNTEERS: 'hospice:volunteers',

  // Hospice CAHPS Survey case management (HQRP submission tracking)
  HOSPICE_CAHPS: 'hospice:cahps',

  // Hospice QAPI (Sub-system F — 42 CFR 418.58)
  HOSPICE_QAPI_PLAN_VIEW: 'hospice:qapi_plan_view',
  HOSPICE_QAPI_PLAN_MANAGE: 'hospice:qapi_plan_manage',
  HOSPICE_QAPI_PIP_VIEW: 'hospice:qapi_pip_view',
  HOSPICE_QAPI_PIP_MANAGE: 'hospice:qapi_pip_manage',
  HOSPICE_QAPI_ADVERSE_EVENT_VIEW: 'hospice:qapi_adverse_event_view',
  HOSPICE_QAPI_ADVERSE_EVENT_MANAGE: 'hospice:qapi_adverse_event_manage',
  HOSPICE_QAPI_RCA_MANAGE: 'hospice:qapi_rca_manage',
  HOSPICE_QAPI_REVIEW_VIEW: 'hospice:qapi_review_view',
  HOSPICE_QAPI_REVIEW_MANAGE: 'hospice:qapi_review_manage',
  HOSPICE_QAPI_AUDIT_TRIGGER_MANAGE: 'hospice:qapi_audit_trigger_manage',

  // Time tracking — paid employee hours
  TIME_LOG: 'time:log',
  TIME_VIEW: 'time:view',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
