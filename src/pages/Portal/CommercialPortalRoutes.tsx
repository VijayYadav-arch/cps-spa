import { Routes, Route, Navigate } from 'react-router-dom';
import { CommercialApiKeysPage } from './CommercialApiKeysPage';
import { CommercialClaimsPage } from './CommercialClaimsPage';
import { CommercialDashboardPage } from './CommercialDashboardPage';
import { CommercialDocumentsPage } from './CommercialDocumentsPage';
import { CommercialReportsPage } from './CommercialReportsPage';
import { CommercialSettingsPage } from './CommercialSettingsPage';
import { CommercialSettingsBrandingPage } from './CommercialSettingsBrandingPage';
import { CommercialSettingsSSOPage } from './CommercialSettingsSSOPage';

export function CommercialPortalRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<CommercialDashboardPage />} />
      <Route path="api-keys" element={<CommercialApiKeysPage />} />
      <Route path="claims" element={<CommercialClaimsPage />} />
      <Route path="documents" element={<CommercialDocumentsPage />} />
      <Route path="reports" element={<CommercialReportsPage />} />
      <Route path="settings" element={<CommercialSettingsPage />} />
      <Route path="settings/branding" element={<CommercialSettingsBrandingPage />} />
      <Route path="settings/sso" element={<CommercialSettingsSSOPage />} />
      <Route path="login" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
