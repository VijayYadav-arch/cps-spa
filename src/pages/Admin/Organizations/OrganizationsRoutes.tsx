import { Routes, Route, Navigate } from 'react-router-dom';
import { OrganizationsList } from './OrganizationsList';
import { NewOrganizationForm } from './NewOrganizationForm';
import { OrganizationDetail } from './OrganizationDetail';
import { EditOrganizationForm } from './EditOrganizationForm';
import { OrganizationClaimsTab } from './OrganizationClaimsTab';
import { OrganizationPatientsTab } from './OrganizationPatientsTab';
import { OrganizationEncountersTab } from './OrganizationEncountersTab';
import { OrganizationDocumentsTab } from './OrganizationDocumentsTab';
import { OrganizationReportsTab } from './OrganizationReportsTab';

/**
 * Nested routes for /admin/organizations/*.
 *
 *  index                → list
 *  new                  → create form
 *  :id/claims           → org-scoped claims tab (Phase B)
 *  :id/patients         → org-scoped patients tab (Phase C)
 *  :id/encounters       → org-scoped encounters tab (Phase C)
 *  :id/documents        → org-scoped documents tab (Phase C)
 *  :id/reports          → org-scoped reports tab (Phase C)
 *  :id/edit             → edit form
 *  :id                  → detail (read-only + actions)
 *  *                    → redirect back to list (404 fallback)
 *
 * Wired in App.tsx behind <RoleRoute required={PERMISSIONS.ADMIN_MANAGE_ORGS}>
 * and placed BEFORE the broader /admin/* route so the more-specific path wins.
 *
 * The more-specific `:id/<tab>` + `:id/edit` paths are declared BEFORE the
 * broader `:id` so explicit ordering reinforces React Router v6's
 * specificity ranking.
 */
export function OrganizationsRoutes() {
  return (
    <Routes>
      <Route index element={<OrganizationsList />} />
      <Route path="new" element={<NewOrganizationForm />} />
      <Route path=":id/claims" element={<OrganizationClaimsTab />} />
      <Route path=":id/patients" element={<OrganizationPatientsTab />} />
      <Route path=":id/encounters" element={<OrganizationEncountersTab />} />
      <Route path=":id/documents" element={<OrganizationDocumentsTab />} />
      <Route path=":id/reports" element={<OrganizationReportsTab />} />
      <Route path=":id/edit" element={<EditOrganizationForm />} />
      <Route path=":id" element={<OrganizationDetail />} />
      <Route path="*" element={<Navigate to="/admin/organizations" replace />} />
    </Routes>
  );
}
