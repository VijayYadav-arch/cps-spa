// In-app user documentation. Authored as structured content blocks (no markdown dependency)
// and rendered by HelpPage. Task-based guides grouped by the area of the product they cover.
// The comprehensive/extended versions of these live on the dedicated docs site; this is the
// contextual, in-product subset covering the most common tasks.

export type HelpBlock =
  | { kind: 'p'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'note'; text: string };

export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  blocks: HelpBlock[];
}

export interface HelpSection {
  id: string;
  label: string;
  topics: HelpTopic[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    topics: [
      {
        id: 'signing-in',
        title: 'Signing in & navigating',
        summary: 'How to log in and find your way around.',
        blocks: [
          { kind: 'p', text: 'CPS is organized by the work you do. The left sidebar groups pages by area — Billing, Clinical, Intake, Administration, and more. You only see the areas your role grants.' },
          { kind: 'steps', items: [
            'Sign in with your organization account.',
            'Use the left sidebar to move between areas; the current page is highlighted.',
            'Your organization and signed-in user appear in the top bar.',
          ] },
          { kind: 'note', text: 'If a button looks greyed out with a tooltip, your role does not include that permission — ask an administrator to grant it.' },
        ],
      },
      {
        id: 'roles-permissions',
        title: 'Roles & permissions',
        summary: 'Why some actions are visible but disabled.',
        blocks: [
          { kind: 'p', text: 'Every action is gated by a permission tied to your role (biller, nurse, billing manager, administrator, and so on). Pages and buttons you lack permission for are either hidden or shown disabled with an explanatory tooltip.' },
          { kind: 'list', items: [
            'Hidden — the whole page is not in your sidebar.',
            'Disabled with a tooltip — you can see the action but cannot perform it.',
          ] },
          { kind: 'p', text: 'Administrators manage who has which role under Administration → Users.' },
        ],
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    topics: [
      {
        id: 'submit-a-claim',
        title: 'Create & submit a claim',
        summary: 'From a draft claim to clearinghouse transmission.',
        blocks: [
          { kind: 'p', text: 'Claims are born as drafts and move forward through a single status: draft → submitting → submitted → accepted → paid (or denied). The claims list always reflects the real state.' },
          { kind: 'steps', items: [
            'Open Billing → Claims and create a claim (or build one from an encounter).',
            'Complete the required fields and service lines, then review the draft.',
            'Click Submit. If real submission is enabled for your organization, the claim transmits to your clearinghouse and moves to "submitting" then "submitted". Otherwise it is marked submitted for tracking.',
            'Track progress from the claims list; statuses update as acknowledgements and remittances arrive.',
          ] },
          { kind: 'note', text: 'Only draft or rejected claims can be submitted. A never-transmitted draft is not counted as a receivable in A/R.' },
        ],
      },
      {
        id: 'denials-appeals',
        title: 'Work denials & appeals',
        summary: 'Triage denied claims and draft appeals.',
        blocks: [
          { kind: 'p', text: 'When a payer denies a claim (via an 835 remittance), CPS creates a denial work item and records the reason code.' },
          { kind: 'steps', items: [
            'Open Billing → Denials to see the denial queue.',
            'Open a denial to view the reason code, category, and the underlying claim.',
            'Assign it, then either correct & resubmit, draft an appeal, or write it off with a reason.',
          ] },
          { kind: 'note', text: 'The appeal drafter can generate a starting letter from the denial reason; always review before sending.' },
        ],
      },
      {
        id: 'era-payments',
        title: 'Posting payments (ERA / 835)',
        summary: 'How remittances post to claims.',
        blocks: [
          { kind: 'p', text: 'Electronic remittances (835s) post payments, contractual adjustments, and denials onto the matching claim and its service lines. Paid amounts reduce the claim balance in A/R.' },
          { kind: 'steps', items: [
            'Remittances are fetched and posted automatically for transmitted claims; you can also post an 835 manually under Billing → ERA.',
            'Review the posting summary — matched claims, payment amount, and any unmatched items land in the work queue.',
          ] },
          { kind: 'note', text: 'Patient-responsibility amounts are NOT written off — they remain on the patient balance for statements.' },
        ],
      },
      {
        id: 'secondary-cob',
        title: 'Secondary / COB billing',
        summary: 'Bill the secondary payer after a partial primary payment.',
        blocks: [
          { kind: 'p', text: 'When the primary payer pays only part of a claim and a secondary payer is on file, CPS flags the claim for coordination-of-benefits (COB) billing.' },
          { kind: 'steps', items: [
            'Open Billing → Secondary Claims to see claims eligible for secondary submission.',
            'Build the secondary claim — this generates the COB 837 with the primary payment recorded.',
            'Review, then submit it to the clearinghouse.',
          ] },
          { kind: 'note', text: 'Secondary submission follows the same go-live gate as primary claims — it only transmits live once your organization is enabled.' },
        ],
      },
    ],
  },
  {
    id: 'clinical',
    label: 'Clinical',
    topics: [
      {
        id: 'visit-notes',
        title: 'Document a visit note',
        summary: 'Record a clinical visit.',
        blocks: [
          { kind: 'steps', items: [
            'Open the patient from Clinical → Encounters or your schedule.',
            'Add a visit note: visit type, date, and your clinical documentation.',
            'Save. The note is attached to the patient chart and available for IDG review and audit.',
          ] },
          { kind: 'note', text: 'An AI visit-note summary can produce a chart abstract for clinicians; it is a draft aid, not a substitute for your documentation.' },
        ],
      },
      {
        id: 'oasis',
        title: 'OASIS assessment (home health)',
        summary: 'Complete an OASIS-E assessment that drives PDGM billing.',
        blocks: [
          { kind: 'p', text: 'For home-health episodes, the OASIS-E assessment feeds the PDGM grouper (HIPPS code) that determines the 30-day payment period.' },
          { kind: 'steps', items: [
            'Open the home-health episode and start the OASIS assessment for the appropriate time point.',
            'Complete the assessment items and submit.',
            'The episode then drives the Notice of Admission (NOA) and the period billing.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'intake',
    label: 'Intake',
    topics: [
      {
        id: 'admit-patient',
        title: 'Admit a patient',
        summary: 'Run the intake wizard.',
        blocks: [
          { kind: 'steps', items: [
            'Open Intake and start a new admission.',
            'Work through the wizard: patient demographics, payer/insurance, diagnosis, and election/benefit-period details.',
            'Submit to create the patient and (for hospice) the benefit-period election.',
          ] },
          { kind: 'note', text: 'Accurate payer and secondary-payer entry here is what later enables clean claim submission and COB billing.' },
        ],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    topics: [
      {
        id: 'submission-rollout',
        title: 'Enable real claim submission (go-live)',
        summary: 'Use the Submission Rollout panel to turn on real clearinghouse transmission for an organization.',
        blocks: [
          { kind: 'p', text: 'Real submission is enabled per organization so a single org can be piloted before a broad rollout. An org can only be enabled once it passes the readiness pre-flight.' },
          { kind: 'steps', items: [
            'Open Administration → Submission Rollout.',
            'Find the organization. The Readiness column shows Ready or Not ready, listing any failing checks.',
            'Resolve failing checks: an active primary clearinghouse with credentials, and at least one active payer enrollment.',
            'Once the org shows Ready, click Enable, add an audit note (e.g. go-live ticket #), and confirm.',
          ] },
          { kind: 'note', text: 'Enable stays disabled until the org is Ready; the system also refuses a not-ready enable. Disable is always available to revert an org to the legacy status-flip path.' },
        ],
      },
      {
        id: 'ai-opt-in',
        title: 'AI opt-in',
        summary: 'Control whether an organization can use AI features.',
        blocks: [
          { kind: 'p', text: 'AI features (coding suggestions, denial prediction, visit-note summaries, family chat) only run for organizations with an enabled AI opt-in row. Until then, no PHI from that org flows to any AI provider.' },
          { kind: 'steps', items: [
            'Open Administration → AI Opt-In.',
            'Enable or disable per organization, adding a BAA/change-ticket note for the audit trail.',
          ] },
        ],
      },
      {
        id: 'manage-users',
        title: 'Manage users & permissions',
        summary: 'Grant roles that control what each person can do.',
        blocks: [
          { kind: 'steps', items: [
            'Open Administration → Users.',
            'Invite or edit a user and assign their role.',
            'Roles map to permissions; changes take effect on their next sign-in.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'family-portal',
    label: 'Family portal',
    topics: [
      {
        id: 'family-overview',
        title: 'What families can access',
        summary: 'The patient/family-facing portal.',
        blocks: [
          { kind: 'p', text: 'Family members sign in to a separate portal scoped strictly to their own patient. They can view permitted information and use the family chat assistant for common questions.' },
          { kind: 'note', text: 'The family portal uses its own access path and never exposes other organizations’ or patients’ data.' },
        ],
      },
    ],
  },
];

export function findTopic(topicId: string): { section: HelpSection; topic: HelpTopic } | null {
  for (const section of HELP_SECTIONS) {
    const topic = section.topics.find((t) => t.id === topicId);
    if (topic) return { section, topic };
  }
  return null;
}
