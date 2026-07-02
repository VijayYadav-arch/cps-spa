/**
 * Type contracts for the /admin/organizations/* admin pages.
 *
 * Mirror of the cps-dotnet OrganizationListDto + Organization entity DTOs
 * (camelCased by the JSON serializer). Keep in sync with:
 *   - cps-dotnet/src/CPS.Application/Organizations/OrganizationListDto.cs
 *   - cps-dotnet/src/CPS.Application/Organizations/UpdateOrganizationRequest.cs
 *   - cps-dotnet/src/CPS.Core/Entities/Organization.cs
 */

// Re-export the shared Claim list-row + pagination shapes from the canonical
// claims API module so the OrganizationClaimsTab can reuse them without
// declaring a parallel type. Import-site uses `import type` for tree-shaking.
export type { ClaimSummary, PagedResponse, PaginationMeta } from '@/api/claims';

/**
 * Org-scoped Document list-row shape returned by GET /api/v2/documents.
 *
 * cps-dotnet/src/CPS.Api/Controllers/DocumentsController.cs serializes the
 * Document entity passthrough (no DTO projection), so this mirrors
 * cps-dotnet/src/CPS.Core/Entities/Document.cs. UpdatedAt / audit columns
 * exist on the entity but are not used by the OrganizationDocumentsTab UI.
 */
export interface DocumentSummary {
  id: number;
  organizationId: number;
  uploadedById: number | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  /** "contract" | "eob" | "supporting" | "other" */
  category: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

/**
 * Org-scoped Report list-row shape returned by GET /api/v2/reports.
 *
 * Mirrors cps-dotnet/src/CPS.Core/Entities/Report.cs (entity passthrough).
 * The aggregate endpoints (claims-summary / aging / denials) return different
 * shapes and stay tenant-scoped — they are NOT consumed by this tab.
 */
export interface ReportSummary {
  id: number;
  organizationId: number;
  title: string;
  /** "monthly" | "ar-aging" | "denials" | "custom" */
  type: string;
  /** Period covered, e.g. "2026-04" or "Q1-2026" */
  period: string;
  url: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface OrganizationListItem {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  isDeleted: boolean;
  parentOrganizationId: number | null;
  claimsCount: number;
  patientsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDetail extends OrganizationListItem {
  address: string | null;
  taxId: string | null;
}

export interface CreateOrgRequest {
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  active: boolean;
  parentOrganizationId?: number | null;
  /** Service-line modules to entitle the new org to (see permissions/modules.ts). */
  modules?: string[];
}

/** Response of GET/PUT /api/v2/admin/organizations/{orgId}/modules. */
export interface OrgModulesResponse {
  enabled: string[];
  all: string[];
}

export type UpdateOrgRequest = CreateOrgRequest;

export interface OrgListResponse {
  data: OrganizationListItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export const initialOrgForm: CreateOrgRequest = {
  name: '',
  slug: '',
  email: null,
  phone: null,
  address: null,
  taxId: null,
  active: true,
  parentOrganizationId: null,
  // Default to the full platform; the provisioning UI lets the admin narrow via bundle presets
  // or à-la-carte toggles before submitting.
  modules: ['hospice', 'home_health', 'clinical', 'billing', 'ai'],
};
