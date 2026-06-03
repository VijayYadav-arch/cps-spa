/**
 * Type contracts for the /admin/organizations/* admin pages.
 *
 * Mirror of the cps-dotnet OrganizationListDto + Organization entity DTOs
 * (camelCased by the JSON serializer). Keep in sync with:
 *   - cps-dotnet/src/CPS.Application/Organizations/OrganizationListDto.cs
 *   - cps-dotnet/src/CPS.Application/Organizations/UpdateOrganizationRequest.cs
 *   - cps-dotnet/src/CPS.Core/Entities/Organization.cs
 */

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
};
