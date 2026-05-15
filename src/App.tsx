import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
