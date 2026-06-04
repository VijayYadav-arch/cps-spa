import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { ClaimsRoutes } from '@/pages/Claims/ClaimsRoutes';
import { PatientsRoutes } from '@/pages/Patients/PatientsRoutes';
import { BillingRoutes } from '@/pages/Billing/BillingRoutes';
import { ClinicalOverview } from '@/pages/Clinical/ClinicalOverview';
import { DocumentsList } from '@/pages/Documents/DocumentsList';
import { PlatformRoutes } from '@/pages/Platform/PlatformRoutes';
import { AdminDashboard } from '@/pages/Admin/AdminDashboard';
import { HospiceDischargeWizard } from '@/pages/Hospice/HospiceDischargeWizard';
import { HospiceDischargeDetail } from '@/pages/Hospice/HospiceDischargeDetail';
import { HospiceDischargedElectionsList } from '@/pages/Hospice/HospiceDischargedElectionsList';
import { HospiceWorkQueue } from '@/pages/Hospice/HospiceWorkQueue';
import { HospiceHopeOverdue } from '@/pages/Hospice/HospiceHopeOverdue';
import { HospiceIdgMeeting } from '@/pages/Hospice/HospiceIdgMeeting';
import { HospiceBereavementList } from '@/pages/Hospice/HospiceBereavementList';
import { HospiceBereavementProgramDetail } from '@/pages/Hospice/HospiceBereavementProgramDetail';
import { HospiceBereavementEligible } from '@/pages/Hospice/HospiceBereavementEligible';
import { HospiceAddendumPage } from '@/pages/Hospice/HospiceAddendumPage';
import { HospiceFtfPage } from '@/pages/Hospice/HospiceFtfPage';
import { HospiceHqrpDashboard } from '@/pages/Hospice/HospiceHqrpDashboard';
import { HospiceMedicareCapDashboard } from '@/pages/Hospice/HospiceMedicareCapDashboard';
import { HospiceVolunteersDashboard } from '@/pages/Hospice/HospiceVolunteersDashboard';
import { HospiceCahpsDashboard } from '@/pages/Hospice/HospiceCahpsDashboard';
import { HospiceClaimSubmissionsPage } from '@/pages/Hospice/HospiceClaimSubmissionsPage';
import { PaidTimeDashboard } from '@/pages/Time/PaidTimeDashboard';
import { MyTimeDashboard } from '@/pages/Time/MyTimeDashboard';
import { SessionsPage } from '@/pages/Me/SessionsPage';
import { PhiAccessReviewDashboard } from '@/pages/Compliance/PhiAccessReviewDashboard';
import { SurveyorBundlePage } from '@/pages/Compliance/SurveyorBundlePage';
import { BreachWorkflowPage } from '@/pages/Compliance/BreachWorkflowPage';
import { AuditAnomalyReviewPage } from '@/pages/Compliance/AuditAnomalyReviewPage';
import { FhirFeedPage } from '@/pages/Integrations/FhirFeedPage';
import { AuditLogSearchPage } from '@/pages/Admin/AuditLogSearchPage';
import { OrgRollupPage } from '@/pages/Admin/OrgRollupPage';
import { BranchesPage } from '@/pages/Admin/BranchesPage';
import { OrganizationsRoutes } from '@/pages/Admin/Organizations/OrganizationsRoutes';
import { EncountersRoutes } from '@/pages/Admin/Encounters/EncountersRoutes';
import { B2cMigrationPage } from '@/pages/Admin/B2cMigration/B2cMigrationPage';
import { InquiriesPage } from '@/pages/Admin/Inquiries/InquiriesPage';
import { ImportPage } from '@/pages/Admin/Import/ImportPage';
import { OnboardingPage } from '@/pages/Admin/Onboarding/OnboardingPage';
import { OnboardingEmailsPage } from '@/pages/Admin/Onboarding/OnboardingEmailsPage';
import { MedicationsPage } from '@/pages/Admin/Clinical/MedicationsPage';
import { OrdersPage } from '@/pages/Admin/Clinical/OrdersPage';
import { ReferralsPage } from '@/pages/Admin/Clinical/ReferralsPage';
import { IdgMeetingsPage } from '@/pages/Admin/IdgMeetings/IdgMeetingsPage';
import { ConsentPage } from '@/pages/Admin/Compliance/ConsentPage';
import { SlaPage } from '@/pages/Admin/Compliance/SlaPage';
import { PortalPaymentPage } from '@/pages/Portal/PortalPaymentPage';
import { AnalyticsDashboardPage } from '@/pages/Analytics/AnalyticsDashboardPage';
import { InboxPage } from '@/pages/Inbox/InboxPage';
import { QapiPlanPage } from '@/pages/Quality/QapiPlanPage';
import { QapiPipListPage } from '@/pages/Quality/QapiPipListPage';
import { QapiPipDetailPage } from '@/pages/Quality/QapiPipDetailPage';
import { AdverseEventListPage } from '@/pages/Quality/AdverseEventListPage';
import { AdverseEventDetailPage } from '@/pages/Quality/AdverseEventDetailPage';
import { QapiReviewLogPage } from '@/pages/Quality/QapiReviewLogPage';
import { QapiDashboardPage } from '@/pages/Quality/QapiDashboardPage';
import { QapiAuditTriggerConfigPage } from '@/pages/Quality/QapiAuditTriggerConfigPage';
import { ClinicianRoutes } from '@/pages/Clinician/ClinicianRoutes';
import { CommercialPortalRoutes } from '@/pages/Portal/CommercialPortalRoutes';
import { FamilyRoutes } from '@/pages/Family/FamilyRoutes';
import { PortalAuthProvider } from '@/portal/PortalAuthContext';
import Unauthorized from '@/pages/Unauthorized';
import { RoleRoute, PERMISSIONS } from '@/permissions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PortalAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/portal/pay/:runId" element={<PortalPaymentPage />} />
          <Route
            path="/portal/*"
            element={
              <ProtectedRoute>
                <CommercialPortalRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinician/*"
            element={
              <ProtectedRoute>
                <ClinicianRoutes />
              </ProtectedRoute>
            }
          />
          {/* Family portal uses its own auth (FamilyJwt) — RequireFamilyAuth lives inside FamilyRoutes */}
          <Route path="/family/*" element={<FamilyRoutes />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="claims/*"
              element={
                <RoleRoute required={PERMISSIONS.CLAIMS_VIEW}>
                  <ClaimsRoutes />
                </RoleRoute>
              }
            />
            <Route
              path="patients/*"
              element={
                <RoleRoute required={PERMISSIONS.PATIENTS_VIEW}>
                  <PatientsRoutes />
                </RoleRoute>
              }
            />
            <Route
              path="billing/*"
              element={
                <RoleRoute required={PERMISSIONS.BILLING_QUEUE}>
                  <BillingRoutes />
                </RoleRoute>
              }
            />
            <Route
              path="clinical/*"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_VISIT_NOTES}>
                  <ClinicalOverview />
                </RoleRoute>
              }
            />
            <Route path="documents/*" element={<DocumentsList />} />
            <Route
              path="platform/*"
              element={
                <RoleRoute required={PERMISSIONS.PLATFORM_ADMIN}>
                  <PlatformRoutes />
                </RoleRoute>
              }
            />
            <Route
              path="admin/*"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_DASHBOARD}>
                  <AdminDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/work-queue"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceWorkQueue />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/hope/overdue"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceHopeOverdue />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/idg-meetings/:meetingId"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceIdgMeeting />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/bereavement"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceBereavementList />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/bereavement/eligible"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceBereavementEligible />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/bereavement/:programId"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceBereavementProgramDetail />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/elections/:electionId/addendum"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceAddendumPage />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/elections/:electionId/periods/:periodId/ftf"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceFtfPage />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/hqrp"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceHqrpDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/medicare-cap"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceMedicareCapDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/volunteers"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceVolunteersDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/cahps"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceCahpsDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/claims/:claimId/submissions"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <HospiceClaimSubmissionsPage />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/elections/:electionId/discharge/new"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_DISCHARGE}>
                  <HospiceDischargeWizard />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/discharges/:dischargeId"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_DISCHARGE}>
                  <HospiceDischargeDetail />
                </RoleRoute>
              }
            />
            <Route
              path="hospice/discharges"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_DISCHARGE}>
                  <HospiceDischargedElectionsList />
                </RoleRoute>
              }
            />
            <Route path="inbox" element={<InboxPage />} />
            <Route
              path="analytics"
              element={
                <RoleRoute required={PERMISSIONS.REPORTS_VIEW}>
                  <AnalyticsDashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="time"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_DASHBOARD}>
                  <PaidTimeDashboard />
                </RoleRoute>
              }
            />
            <Route path="me/time" element={<MyTimeDashboard />} />
            <Route path="me/sessions" element={<SessionsPage />} />
            <Route
              path="compliance/phi-access"
              element={
                <RoleRoute required={PERMISSIONS.COMPLIANCE_PHI_REVIEW}>
                  <PhiAccessReviewDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="compliance/surveyor-bundle"
              element={
                <RoleRoute required={PERMISSIONS.COMPLIANCE_SURVEYOR_EXPORT}>
                  <SurveyorBundlePage />
                </RoleRoute>
              }
            />
            <Route
              path="compliance/breaches"
              element={
                <RoleRoute required={PERMISSIONS.COMPLIANCE_BREACHES}>
                  <BreachWorkflowPage />
                </RoleRoute>
              }
            />
            <Route
              path="compliance/anomalies"
              element={<AuditAnomalyReviewPage />}
            />
            <Route
              path="integrations/fhir-feed"
              element={
                <RoleRoute required={PERMISSIONS.INTEGRATIONS_FHIR_INGEST}>
                  <FhirFeedPage />
                </RoleRoute>
              }
            />
            <Route
              path="org/rollup"
              element={
                <RoleRoute required={PERMISSIONS.ORG_ROLLUP_VIEW}>
                  <OrgRollupPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/organizations/*"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_MANAGE_ORGS}>
                  <OrganizationsRoutes />
                </RoleRoute>
              }
            />
            <Route
              path="admin/encounters/*"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_VISIT_NOTES}>
                  <EncountersRoutes />
                </RoleRoute>
              }
            />
            <Route
              path="admin/branches"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_MANAGE_BRANCHES}>
                  <BranchesPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/audit-log"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_AUDIT_LOGS}>
                  <AuditLogSearchPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/b2c-migration"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_MANAGE_ORGS}>
                  <B2cMigrationPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/inquiries"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_MANAGE_ORGS}>
                  <InquiriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/import"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_IMPORT}>
                  <ImportPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/onboarding"
              element={
                <RoleRoute required={PERMISSIONS.PLATFORM_ONBOARDING}>
                  <OnboardingPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/onboarding/emails"
              element={
                <RoleRoute required={PERMISSIONS.PLATFORM_ONBOARDING}>
                  <OnboardingEmailsPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/medications"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_MEDICATIONS}>
                  <MedicationsPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/orders"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_ORDERS}>
                  <OrdersPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/referrals"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_REFERRALS}>
                  <ReferralsPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/idg-meetings"
              element={
                <RoleRoute required={PERMISSIONS.HOSPICE_VIEW}>
                  <IdgMeetingsPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/consent"
              element={
                <RoleRoute required={PERMISSIONS.COMPLIANCE_PHI_REVIEW}>
                  <ConsentPage />
                </RoleRoute>
              }
            />
            <Route
              path="admin/sla"
              element={
                <RoleRoute required={PERMISSIONS.ADMIN_SYSTEM_CONFIG}>
                  <SlaPage />
                </RoleRoute>
              }
            />
            {/* Sub-system F: QAPI program */}
            <Route
              path="quality/qapi"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <QapiDashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="quality/qapi/plan"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <QapiPlanPage />
                </RoleRoute>
              }
            />
            <Route
              path="quality/qapi/pips"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <QapiPipListPage />
                </RoleRoute>
              }
            />
            <Route
              path="quality/qapi/pips/:pipId"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <QapiPipDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="quality/qapi/adverse-events"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <AdverseEventListPage />
                </RoleRoute>
              }
            />
            <Route
              path="quality/qapi/adverse-events/:eventId"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <AdverseEventDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="quality/qapi/reviews"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <QapiReviewLogPage />
                </RoleRoute>
              }
            />
            <Route
              path="quality/qapi/audit-triggers"
              element={
                <RoleRoute required={PERMISSIONS.CLINICAL_QUALITY}>
                  <QapiAuditTriggerConfigPage />
                </RoleRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
        </PortalAuthProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
}
