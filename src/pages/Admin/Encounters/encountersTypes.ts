/**
 * Type contracts for the /admin/encounters/* admin pages.
 *
 * Mirror of the cps-dotnet EncounterListDto envelope shipped in PR #191
 * (GET /api/v2/encounters returns the enriched join shape when called WITHOUT
 * a patientId query param). When called WITH patientId, the same endpoint
 * returns the raw Encounter shape used by the existing patient-detail
 * consumer — that path is NOT used by these admin pages.
 *
 * Keep in sync with:
 *   - cps-dotnet/src/CPS.Application/Encounters/EncounterListDto.cs
 *   - cps-dotnet/src/CPS.Api/Models/Requests/CreateEncounterRequest.cs
 */

export interface EncounterListItem {
  id: number;
  serviceDate: string;
  provider: string;
  diagnosisCodes: string;
  procedureCodes: string;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
  organizationId: number;
  organizationName: string;
  claimsCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EncountersListResponse {
  data: EncounterListItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface CreateEncounterRequest {
  patientId: number;
  serviceDate: string;
  provider: string;
  diagnosisCodes: string;
  procedureCodes: string;
  notes?: string;
}

export interface CodeSuggestion {
  code: string;
  description: string;
  /** "high" | "moderate" | "low" — normalised by the server. */
  confidence: 'high' | 'moderate' | 'low';
  rationale: string;
}

export interface CodeSuggestions {
  cptSuggestions: CodeSuggestion[];
  icd10Suggestions: CodeSuggestion[];
}

/**
 * Subset of the PatientResponseDto used by the typeahead. The backend
 * envelope is `{ data: PatientResponseDto[], pagination }`; we only pick the
 * fields needed to render a "FirstName LastName (Organization)" row. The
 * PatientResponseDto does not currently expose organizationName — only
 * organizationId — so we surface the org name as optional and the UI
 * falls back to just the patient name when it's absent.
 */
export interface PatientSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
}

export const initialEncounterForm: CreateEncounterRequest = {
  patientId: 0,
  serviceDate: new Date().toISOString().split('T')[0],
  provider: '',
  diagnosisCodes: '',
  procedureCodes: '',
  notes: '',
};
