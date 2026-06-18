import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import { FamilyLayout } from './FamilyLayout';
import { FamilyLoginPage } from './FamilyLoginPage';
import { FamilyDashboard } from './FamilyDashboard';
import { FamilyBilling } from './FamilyBilling';
import { FamilyCarePlan } from './FamilyCarePlan';
import { FamilyChat } from './FamilyChat';
import { FamilyDocuments } from './FamilyDocuments';
import { FamilyMedications } from './FamilyMedications';
import { FamilyPayments } from './FamilyPayments';
import { FamilyPreferences } from './FamilyPreferences';
import { FamilyVisits } from './FamilyVisits';

function RequireFamilyAuth({ children }: { children: ReactNode }) {
  const { session } = usePortalAuth();
  if (!session || session.kind !== 'family-member') {
    return <Navigate to="/family/login" replace />;
  }
  return <>{children}</>;
}

export function FamilyRoutes() {
  return (
    <Routes>
      <Route path="login" element={<FamilyLoginPage />} />
      {/* Authenticated portal: gated once, then wrapped in the shared nav shell. */}
      <Route
        element={
          <RequireFamilyAuth>
            <FamilyLayout />
          </RequireFamilyAuth>
        }
      >
        <Route path="dashboard" element={<FamilyDashboard />} />
        <Route path="visits" element={<FamilyVisits />} />
        <Route path="medications" element={<FamilyMedications />} />
        <Route path="care-plan" element={<FamilyCarePlan />} />
        <Route path="documents" element={<FamilyDocuments />} />
        <Route path="billing" element={<FamilyBilling />} />
        <Route path="payments" element={<FamilyPayments />} />
        <Route path="preferences" element={<FamilyPreferences />} />
        <Route path="chat" element={<FamilyChat />} />
      </Route>
      <Route path="*" element={<Navigate to="/family/login" replace />} />
    </Routes>
  );
}
