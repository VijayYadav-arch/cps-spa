/**
 * Email sequence templates for customer onboarding.
 * Defines the welcome/nurture email sequence sent to new organizations
 * during their trial period.
 */

export interface EmailTemplate {
  id: string;
  day: number;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  triggerCondition?: string;
}

// ── Template Definitions ──────────────────────────────────────────

const welcomeSequence: EmailTemplate[] = [
  {
    id: "welcome-day-0",
    day: 0,
    subject: "Welcome to CPS! Here's how to get started",
    bodyText: `Hi {{firstName}},

Welcome to CPS Medical Billing! We're thrilled to have {{organizationName}} on board.

Your 14-day free trial is now active, and you have full access to all features. Here's how to make the most of it:

1. Complete your setup: Visit your onboarding dashboard to finish configuring your organization.
2. Add your team: Invite billing staff and clinicians to collaborate.
3. Submit your first claim: Use our guided walkthrough to submit a test claim in minutes.

Log in to your dashboard: {{dashboardUrl}}

Need help? Our team is here for you. Reply to this email or reach us at support@cpsmedicalbilling.com.

Best regards,
The CPS Medical Billing Team`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CPS Medical Billing</h1>
  </div>
  <div style="padding: 32px 24px; background: #ffffff;">
    <h2 style="color: #0f172a; font-size: 20px;">Welcome, {{firstName}}!</h2>
    <p style="color: #475569; line-height: 1.6;">We're thrilled to have <strong>{{organizationName}}</strong> on board. Your 14-day free trial is now active with full access to all features.</p>
    <h3 style="color: #0f172a; font-size: 16px;">Get started in 3 steps:</h3>
    <ol style="color: #475569; line-height: 1.8;">
      <li><strong>Complete your setup</strong> - Finish configuring your organization</li>
      <li><strong>Add your team</strong> - Invite billing staff and clinicians</li>
      <li><strong>Submit your first claim</strong> - Use our guided walkthrough</li>
    </ol>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{dashboardUrl}}" style="background: #0d9488; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
    </div>
    <p style="color: #94a3b8; font-size: 14px;">Need help? Reply to this email or reach us at support@cpsmedicalbilling.com.</p>
  </div>
</div>`,
  },
  {
    id: "setup-reminder-day-1",
    day: 1,
    subject: "Complete your setup in 5 minutes",
    triggerCondition: "hasNotCompletedOnboarding",
    bodyText: `Hi {{firstName}},

Just a quick reminder - you're almost there! Complete your CPS Medical Billing setup in just 5 minutes.

Here's what's left to do:
{{remainingSteps}}

The sooner you finish setup, the sooner you can start streamlining your billing workflow.

Complete your setup: {{onboardingUrl}}

Best regards,
The CPS Medical Billing Team`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CPS Medical Billing</h1>
  </div>
  <div style="padding: 32px 24px; background: #ffffff;">
    <h2 style="color: #0f172a; font-size: 20px;">Almost there, {{firstName}}!</h2>
    <p style="color: #475569; line-height: 1.6;">Complete your setup in just 5 minutes. Here's what's left:</p>
    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
      {{remainingStepsHtml}}
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{onboardingUrl}}" style="background: #0d9488; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Complete Setup</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "first-claim-nudge-day-3",
    day: 3,
    subject: "Have you submitted your first claim yet?",
    triggerCondition: "hasNotSubmittedFirstClaim",
    bodyText: `Hi {{firstName}},

Great news - your CPS Medical Billing account is set up and ready to go!

Have you submitted your first claim yet? Our guided walkthrough makes it easy:

1. Select a patient from your roster
2. Verify insurance information
3. Enter diagnosis codes (we'll suggest the right ones)
4. Add service lines
5. Review, scrub, and submit!

Try the walkthrough: {{walkthroughUrl}}

Don't have patient data yet? Load our sample data to practice: {{sampleDataUrl}}

Best regards,
The CPS Medical Billing Team`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CPS Medical Billing</h1>
  </div>
  <div style="padding: 32px 24px; background: #ffffff;">
    <h2 style="color: #0f172a; font-size: 20px;">Ready to submit your first claim?</h2>
    <p style="color: #475569; line-height: 1.6;">Our guided walkthrough makes it easy to submit your first claim in minutes.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{walkthroughUrl}}" style="background: #0d9488; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Walkthrough</a>
    </div>
    <p style="color: #94a3b8; font-size: 14px;">Don't have patient data yet? <a href="{{sampleDataUrl}}" style="color: #0d9488;">Load sample data</a> to practice.</p>
  </div>
</div>`,
  },
  {
    id: "tips-day-7",
    day: 7,
    subject: "Quick tips to maximize your billing efficiency",
    bodyText: `Hi {{firstName}},

You've been using CPS Medical Billing for a week now. Here are some tips to boost your efficiency:

1. Claim Scrubbing: Our built-in scrubber catches errors before submission, reducing denials by up to 30%.

2. Batch Operations: Submit multiple claims at once. Go to Billing > Batch to process claims in bulk.

3. Denial Management: Track and appeal denied claims from your Billing > Denials dashboard.

4. Reports & Analytics: View your revenue trends, collection rates, and aging in Billing > Analytics.

5. API Integration: Automate claim submission with our REST API. Generate your API key from Settings.

Explore these features: {{dashboardUrl}}

Best regards,
The CPS Medical Billing Team`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CPS Medical Billing</h1>
  </div>
  <div style="padding: 32px 24px; background: #ffffff;">
    <h2 style="color: #0f172a; font-size: 20px;">Tips to maximize your efficiency</h2>
    <p style="color: #475569; line-height: 1.6;">You've been with us for a week! Here are some power-user tips:</p>
    <div style="margin: 16px 0;">
      <div style="padding: 12px; border-left: 3px solid #0d9488; margin-bottom: 12px;">
        <strong style="color: #0f172a;">Claim Scrubbing</strong>
        <p style="color: #475569; margin: 4px 0 0 0; font-size: 14px;">Catches errors before submission, reducing denials by up to 30%.</p>
      </div>
      <div style="padding: 12px; border-left: 3px solid #0d9488; margin-bottom: 12px;">
        <strong style="color: #0f172a;">Batch Operations</strong>
        <p style="color: #475569; margin: 4px 0 0 0; font-size: 14px;">Submit multiple claims at once from Billing &gt; Batch.</p>
      </div>
      <div style="padding: 12px; border-left: 3px solid #0d9488; margin-bottom: 12px;">
        <strong style="color: #0f172a;">Denial Management</strong>
        <p style="color: #475569; margin: 4px 0 0 0; font-size: 14px;">Track and appeal denied claims from your Denials dashboard.</p>
      </div>
      <div style="padding: 12px; border-left: 3px solid #0d9488; margin-bottom: 12px;">
        <strong style="color: #0f172a;">Reports &amp; Analytics</strong>
        <p style="color: #475569; margin: 4px 0 0 0; font-size: 14px;">Revenue trends, collection rates, and aging reports.</p>
      </div>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{dashboardUrl}}" style="background: #0d9488; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Explore Features</a>
    </div>
  </div>
</div>`,
  },
  {
    id: "trial-ending-day-12",
    day: 12,
    subject: "Your trial ends in 2 days -- here's what you'll lose",
    triggerCondition: "isStillTrialing",
    bodyText: `Hi {{firstName}},

Your 14-day free trial of CPS Medical Billing ends in 2 days.

When your trial ends, you'll lose access to:
- Claim submission and tracking
- Denial management and appeals
- Batch operations
- Reports and analytics
- API access
- Team collaboration features

Your data will be preserved for 30 days, so you can upgrade at any time.

Current plan: {{planName}}

Upgrade now to keep all your features: {{upgradeUrl}}

Need more time? Reply to this email and we'll extend your trial.

Best regards,
The CPS Medical Billing Team`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #dc2626; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CPS Medical Billing</h1>
  </div>
  <div style="padding: 32px 24px; background: #ffffff;">
    <h2 style="color: #0f172a; font-size: 20px;">Your trial ends in 2 days</h2>
    <p style="color: #475569; line-height: 1.6;">When your trial expires, you'll lose access to:</p>
    <ul style="color: #475569; line-height: 1.8;">
      <li>Claim submission and tracking</li>
      <li>Denial management and appeals</li>
      <li>Batch operations</li>
      <li>Reports and analytics</li>
      <li>API access</li>
      <li>Team collaboration features</li>
    </ul>
    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="color: #991b1b; margin: 0; font-size: 14px;">Your data will be preserved for 30 days after trial end.</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{upgradeUrl}}" style="background: #0d9488; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Upgrade Now</a>
    </div>
    <p style="color: #94a3b8; font-size: 14px; text-align: center;">Need more time? Reply to this email and we'll extend your trial.</p>
  </div>
</div>`,
  },
  {
    id: "trial-ended-day-14",
    day: 14,
    subject: "Your trial has ended -- upgrade to keep your features",
    triggerCondition: "isStillTrialing",
    bodyText: `Hi {{firstName}},

Your 14-day free trial of CPS Medical Billing has ended.

Don't worry - your data is safe. We'll keep it for 30 days so you can upgrade and pick up right where you left off.

During your trial, you:
{{trialSummary}}

Upgrade to a paid plan to continue billing with CPS: {{upgradeUrl}}

Plans start at just $149/month. See all plans: {{pricingUrl}}

Questions? Reply to this email or call us at (801) 555-0199.

Best regards,
The CPS Medical Billing Team`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #0f172a; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">CPS Medical Billing</h1>
  </div>
  <div style="padding: 32px 24px; background: #ffffff;">
    <h2 style="color: #0f172a; font-size: 20px;">Your trial has ended</h2>
    <p style="color: #475569; line-height: 1.6;">Your data is safe — we'll keep it for 30 days so you can upgrade and pick up right where you left off.</p>
    <div style="background: #f0fdfa; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #99f6e4;">
      <p style="color: #0f766e; margin: 0; font-weight: 600;">Plans start at just $149/month</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{upgradeUrl}}" style="background: #0d9488; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Upgrade Now</a>
      <br/><br/>
      <a href="{{pricingUrl}}" style="color: #0d9488; text-decoration: none; font-size: 14px;">View all plans</a>
    </div>
    <p style="color: #94a3b8; font-size: 14px; text-align: center;">Questions? Reply to this email or call (801) 555-0199.</p>
  </div>
</div>`,
  },
];

/**
 * Get the complete welcome email sequence.
 */
export function getWelcomeSequence(): EmailTemplate[] {
  return welcomeSequence;
}

/**
 * Get the email template for a specific day.
 */
export function getEmailForDay(day: number): EmailTemplate | null {
  return welcomeSequence.find((t) => t.day === day) || null;
}

/**
 * Decide whether an email should be sent. Trigger evaluation lives on the
 * backend (the cps Next.js version queried Prisma directly; cps-spa is
 * read-only here). Always returns true to allow the preview UI to render.
 */
export function shouldSendEmail(_orgId: number, templateId: string): boolean {
  const template = welcomeSequence.find((t) => t.id === templateId);
  if (!template) return false;
  return true;
}
