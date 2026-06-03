import { Routes, Route, Navigate } from 'react-router-dom';
import { OrganizationsList } from './OrganizationsList';
import { NewOrganizationForm } from './NewOrganizationForm';
import { OrganizationDetail } from './OrganizationDetail';
import { EditOrganizationForm } from './EditOrganizationForm';

/**
 * Nested routes for /admin/organizations/*.
 *
 *  index                → list
 *  new                  → create form
 *  :id                  → detail (read-only + actions)
 *  :id/edit             → edit form
 *  *                    → redirect back to list (404 fallback)
 *
 * Wired in App.tsx behind <RoleRoute required={PERMISSIONS.ADMIN_MANAGE_ORGS}>
 * and placed BEFORE the broader /admin/* route so the more-specific path wins.
 */
export function OrganizationsRoutes() {
  return (
    <Routes>
      <Route index element={<OrganizationsList />} />
      <Route path="new" element={<NewOrganizationForm />} />
      <Route path=":id" element={<OrganizationDetail />} />
      <Route path=":id/edit" element={<EditOrganizationForm />} />
      <Route path="*" element={<Navigate to="/admin/organizations" replace />} />
    </Routes>
  );
}
