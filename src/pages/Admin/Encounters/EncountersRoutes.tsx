import { Routes, Route, Navigate } from 'react-router-dom';
import { EncountersList } from './EncountersList';
import { NewEncounterForm } from './NewEncounterForm';

/**
 * Nested routes for /admin/encounters/*.
 *
 *  index → list
 *  new   → create form
 *  *     → redirect back to list (404 fallback)
 *
 * Wired in App.tsx behind <RoleRoute required={PERMISSIONS.CLINICAL_VISIT_NOTES}>
 * and placed BEFORE the broader /admin/* route so the more-specific path wins.
 *
 * The encounters.css entry is intentionally NOT imported here — each leaf
 * component imports it directly (mirroring the OrganizationsRoutes pattern).
 */
export function EncountersRoutes() {
  return (
    <Routes>
      <Route index element={<EncountersList />} />
      <Route path="new" element={<NewEncounterForm />} />
      <Route path="*" element={<Navigate to="/admin/encounters" replace />} />
    </Routes>
  );
}
