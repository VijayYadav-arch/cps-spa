import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePortalAuth } from '@/portal/PortalAuthContext';
import { FamilyLoginPage } from './FamilyLoginPage';
import { FamilyDashboard } from './FamilyDashboard';
import { FamilyBilling } from './FamilyBilling';
import { FamilyCarePlan } from './FamilyCarePlan';
import { FamilyChat } from './FamilyChat';
import { FamilyDocuments } from './FamilyDocuments';
import { FamilyMedications } from './FamilyMedications';
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
      <Route
        path="dashboard"
        element={
          <RequireFamilyAuth>
            <FamilyDashboard />
          </RequireFamilyAuth>
        }
      />
      <Route
        path="billing"
        element={
          <RequireFamilyAuth>
            <FamilyBilling />
          </RequireFamilyAuth>
        }
      />
      <Route
        path="care-plan"
        element={
          <RequireFamilyAuth>
            <FamilyCarePlan />
          </RequireFamilyAuth>
        }
      />
      <Route
        path="documents"
        element={
          <RequireFamilyAuth>
            <FamilyDocuments />
          </RequireFamilyAuth>
        }
      />
      <Route
        path="medications"
        element={
          <RequireFamilyAuth>
            <FamilyMedications />
          </RequireFamilyAuth>
        }
      />
      <Route
        path="preferences"
        element={
          <RequireFamilyAuth>
            <FamilyPreferences />
          </RequireFamilyAuth>
        }
      />
      <Route
        path="visits"
        element={
          <RequireFamilyAuth>
            <FamilyVisits />
          </RequireFamilyAuth>
        }
      />
      <Route
        path="chat"
        element={
          <RequireFamilyAuth>
            <FamilyChat />
          </RequireFamilyAuth>
        }
      />
      <Route path="*" element={<Navigate to="/family/login" replace />} />
    </Routes>
  );
}
