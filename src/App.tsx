import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { ClaimsList } from '@/pages/Claims/ClaimsList';
import { ClaimDetail } from '@/pages/Claims/ClaimDetail';
import { PatientsRoutes } from '@/pages/Patients/PatientsRoutes';
import { BillingDashboard } from '@/pages/Billing/BillingDashboard';
import { ClinicalOverview } from '@/pages/Clinical/ClinicalOverview';
import { DocumentsList } from '@/pages/Documents/DocumentsList';
import { PlatformDashboard } from '@/pages/Platform/PlatformDashboard';
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
import { PortalAuthProvider } from '@/portal/PortalAuthContext';
import { PortalProtectedRoute } from '@/portal/PortalProtectedRoute';
import { PortalLayout } from '@/portal/PortalLayout';
import { PortalLogin } from '@/pages/Portal/PortalLogin';
import { PortalOverview } from '@/pages/Portal/PortalOverview';
import { PortalStatements } from '@/pages/Portal/PortalStatements';
import { PortalStatementDetail } from '@/pages/Portal/PortalStatementDetail';
import { PortalDocuments } from '@/pages/Portal/PortalDocuments';
import { PortalPayments } from '@/pages/Portal/PortalPayments';
import Unauthorized from '@/pages/Unauthorized';

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
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/portal/pay/:runId" element={<PortalPaymentPage />} />
          <Route
            path="/portal/*"
            element={
              <PortalAuthProvider>
                <PortalRoutes />
              </PortalAuthProvider>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="claims" element={<ClaimsList />} />
            <Route path="claims/:id" element={<ClaimDetail />} />
            <Route path="patients/*" element={<PatientsRoutes />} />
            <Route path="billing/*" element={<BillingDashboard />} />
            <Route path="clinical/*" element={<ClinicalOverview />} />
            <Route path="documents/*" element={<DocumentsList />} />
            <Route path="platform/*" element={<PlatformDashboard />} />
            <Route path="admin/*" element={<AdminDashboard />} />
            <Route path="hospice/work-queue" element={<HospiceWorkQueue />} />
            <Route path="hospice/hope/overdue" element={<HospiceHopeOverdue />} />
            <Route path="hospice/idg-meetings/:meetingId" element={<HospiceIdgMeeting />} />
            <Route
              path="hospice/bereavement"
              element={<HospiceBereavementList />}
            />
            <Route
              path="hospice/bereavement/eligible"
              element={<HospiceBereavementEligible />}
            />
            <Route
              path="hospice/bereavement/:programId"
              element={<HospiceBereavementProgramDetail />}
            />
            <Route
              path="hospice/elections/:electionId/addendum"
              element={<HospiceAddendumPage />}
            />
            <Route
              path="hospice/elections/:electionId/periods/:periodId/ftf"
              element={<HospiceFtfPage />}
            />
            <Route path="hospice/hqrp" element={<HospiceHqrpDashboard />} />
            <Route
              path="hospice/medicare-cap"
              element={<HospiceMedicareCapDashboard />}
            />
            <Route
              path="hospice/volunteers"
              element={<HospiceVolunteersDashboard />}
            />
            <Route path="hospice/cahps" element={<HospiceCahpsDashboard />} />
            <Route
              path="hospice/claims/:claimId/submissions"
              element={<HospiceClaimSubmissionsPage />}
            />
            <Route
              path="hospice/elections/:electionId/discharge/new"
              element={<HospiceDischargeWizard />}
            />
            <Route
              path="hospice/discharges/:dischargeId"
              element={<HospiceDischargeDetail />}
            />
            <Route
              path="hospice/discharges"
              element={<HospiceDischargedElectionsList />}
            />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="analytics" element={<AnalyticsDashboardPage />} />
            <Route path="time" element={<PaidTimeDashboard />} />
            <Route path="me/time" element={<MyTimeDashboard />} />
            <Route path="me/sessions" element={<SessionsPage />} />
            <Route
              path="compliance/phi-access"
              element={<PhiAccessReviewDashboard />}
            />
            <Route
              path="compliance/surveyor-bundle"
              element={<SurveyorBundlePage />}
            />
            <Route
              path="compliance/breaches"
              element={<BreachWorkflowPage />}
            />
            <Route
              path="compliance/anomalies"
              element={<AuditAnomalyReviewPage />}
            />
            <Route
              path="integrations/fhir-feed"
              element={<FhirFeedPage />}
            />
            <Route path="org/rollup" element={<OrgRollupPage />} />
            <Route path="admin/branches" element={<BranchesPage />} />
            <Route path="admin/audit-log" element={<AuditLogSearchPage />} />
            {/* Sub-system F: QAPI program */}
            <Route path="quality/qapi" element={<QapiDashboardPage />} />
            <Route path="quality/qapi/plan" element={<QapiPlanPage />} />
            <Route path="quality/qapi/pips" element={<QapiPipListPage />} />
            <Route path="quality/qapi/pips/:pipId" element={<QapiPipDetailPage />} />
            <Route path="quality/qapi/adverse-events" element={<AdverseEventListPage />} />
            <Route path="quality/qapi/adverse-events/:eventId" element={<AdverseEventDetailPage />} />
            <Route path="quality/qapi/reviews" element={<QapiReviewLogPage />} />
            <Route path="quality/qapi/audit-triggers" element={<QapiAuditTriggerConfigPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  );
}

function PortalRoutes() {
  return (
    <Routes>
      <Route path="login" element={<PortalLogin />} />
      <Route
        path="*"
        element={
          <PortalProtectedRoute>
            <PortalLayout />
          </PortalProtectedRoute>
        }
      >
        <Route index element={<PortalOverview />} />
        <Route path="statements" element={<PortalStatements />} />
        <Route path="statements/:runId" element={<PortalStatementDetail />} />
        <Route path="documents" element={<PortalDocuments />} />
        <Route path="payments" element={<PortalPayments />} />
      </Route>
    </Routes>
  );
}
