import { Link } from 'react-router-dom';
import { getWelcomeSequence } from '@/data/onboardingEmailTemplates';

const VARS = {
  '{{firstName}}': 'John',
  '{{organizationName}}': 'Sample Hospice',
  '{{dashboardUrl}}': '#',
  '{{onboardingUrl}}': '#',
  '{{walkthroughUrl}}': '#',
  '{{sampleDataUrl}}': '#',
  '{{upgradeUrl}}': '#',
  '{{pricingUrl}}': '#',
  '{{planName}}': 'Starter',
  '{{remainingStepsHtml}}': '<p>Configure payers, Add patient</p>',
  '{{remainingSteps}}': '- Configure payers\n- Add patient',
  '{{trialSummary}}': '<p>Submitted 5 claims, Added 3 patients</p>',
};

function substitute(s: string): string {
  let out = s;
  for (const [k, v] of Object.entries(VARS)) {
    out = out.split(k).join(v);
  }
  return out;
}

/**
 * Minimal HTML sanitizer for the preview pane. Templates and substitution VARS
 * are both hard-coded under our repo control, so risk here is theoretical —
 * but `dangerouslySetInnerHTML` warrants a defensive pass anyway. Strips
 * `<script>` blocks, on*= event handler attributes, and javascript: URLs.
 * If templates ever become DB- or user-sourced, replace this with DOMPurify.
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

export function OnboardingEmailsPage() {
  const templates = getWelcomeSequence();
  const conditionalCount = templates.filter((t) => t.triggerCondition).length;

  return (
    <section className="p-4 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <Link to="/admin/onboarding" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Back to Onboarding
        </Link>
        <h1 className="text-2xl font-serif text-slate-900 mt-2">Email Templates</h1>
        <p className="text-slate-500 mt-1">
          Preview and review the onboarding email sequence templates.
        </p>
      </header>

      <div
        className="bg-white rounded-xl border border-slate-200 p-6 mb-8"
        data-testid="email-summary"
      >
        <h2 className="font-semibold text-slate-900 mb-4">Welcome Sequence</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500">Total Templates</p>
            <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Sequence Duration</p>
            <p className="text-2xl font-bold text-slate-900">14 days</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Conditional Templates</p>
            <p className="text-2xl font-bold text-slate-900">{conditionalCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6" data-testid="email-templates">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                    Day {template.day}
                  </span>
                  <h3 className="font-semibold text-slate-900">{template.subject}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {template.triggerCondition && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                      Conditional: {template.triggerCondition}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">ID: {template.id}</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    HTML Preview
                  </h4>
                  <div
                    className="border border-slate-200 rounded-lg p-4 bg-white max-h-64 overflow-y-auto text-xs"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(substitute(template.bodyHtml)) }}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Plain Text
                  </h4>
                  <pre className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-64 overflow-y-auto text-xs text-slate-600 whitespace-pre-wrap font-sans">
                    {substitute(template.bodyText)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
