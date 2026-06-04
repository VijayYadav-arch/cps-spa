import { Routes, Route, Navigate } from 'react-router-dom';
import { BillingDashboard } from './BillingDashboard';
import { DenialQueuePage } from './DenialQueuePage';
import { DenialsList } from './DenialsList';
import { DenialDetail } from './DenialDetail';
import { ArDashboardPage } from './ArDashboardPage';
import { ArTicklerPage } from './ArTicklerPage';
import { EraPostingsPage } from './EraPostingsPage';
import { SuperbillsPage } from './SuperbillsPage';
import { SecondaryClaimsPage } from './SecondaryClaimsPage';
import { StatementsPage } from './StatementsPage';
import { EligibilityPage } from './EligibilityPage';
import { PriorAuthPage } from './PriorAuthPage';
import { PriorAuthDetailPage } from './PriorAuthDetailPage';
import { ChargeEntryPage } from './ChargeEntryPage';
import { BillingCodesPage } from './BillingCodesPage';

export function BillingRoutes() {
  return (
    <Routes>
      <Route index element={<BillingDashboard />} />
      <Route path="denials" element={<DenialsList />} />
      <Route path="denials/queue" element={<DenialQueuePage />} />
      <Route path="denials/:id" element={<DenialDetail />} />
      <Route path="ar" element={<ArDashboardPage />} />
      <Route path="ar/ticklers" element={<ArTicklerPage />} />
      <Route path="era" element={<EraPostingsPage />} />
      <Route path="superbills" element={<SuperbillsPage />} />
      <Route path="secondary" element={<SecondaryClaimsPage />} />
      <Route path="statements" element={<StatementsPage />} />
      <Route path="eligibility" element={<EligibilityPage />} />
      <Route path="prior-auth" element={<PriorAuthPage />} />
      <Route path="prior-auth/:id" element={<PriorAuthDetailPage />} />
      <Route path="charges" element={<ChargeEntryPage />} />
      <Route path="codes" element={<BillingCodesPage />} />
      <Route path="*" element={<Navigate to="/billing" replace />} />
    </Routes>
  );
}
