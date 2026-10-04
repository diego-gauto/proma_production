import { apiRequest, PaginatedResponse } from "./client";

export type ContactMaster = {
  id?: string;
  contactName: string;
  email?: string | null;
  fixedPhone?: string | null;
  mobilePhone1?: string | null;
  mobilePhone2?: string | null;
  roleNote?: string | null;
  isPrimary?: boolean;
};

export type ClientMaster = {
  id: string;
  businessName: string;
  taxId: string;
  address?: string | null;
  locality?: string | null;
  district?: string | null;
  province?: string | null;
  contacts?: ContactMaster[];
  isActive: boolean;
};

export type WorkshopMaster = {
  id: string;
  name: string;
  address?: string | null;
  locality?: string | null;
  district?: string | null;
  province?: string | null;
  specialties: string[];
  contacts?: ContactMaster[];
  isActive: boolean;
};

export type ArticleMaster = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  supplies?: { id: string; quantity?: string | null; note?: string | null; supply?: SupplyMaster }[];
  decorationParts: { id: string; garmentPart: string; decorationType: string }[];
};

export type FabricMaster = {
  id: string;
  code: string;
  name: string;
  color?: string | null;
  weightOz?: string | null;
  supplier?: string | null;
  weaveType: "PUNTO" | "PLANO";
  formatType: "ABIERTO" | "TUBULAR";
  isActive: boolean;
};

export type SupplyMaster = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  color?: string | null;
  supplier?: string | null;
  category: "CONFECCION" | "TERMINACION";
  isActive: boolean;
};

export type SizeCurveMaster = {
  id: number;
  name: string;
  sequenceType: "ALFABETICA" | "NUMERICA" | "DOBLE" | "MIXTA";
  values: { id: number; label: string; sortOrder: number }[];
};

export type UserMaster = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "USER";
  permissions?: {
    sectorCode: string | null;
    action: string;
    isAllowed: boolean;
  }[];
  isActive: boolean;
};

export type MasterName =
  | "clients"
  | "workshops"
  | "fabrics"
  | "supplies"
  | "size-curves"
  | "articles"
  | "users";

export function listMasters<T>(
  resource: MasterName,
  token: string,
  search: string,
): Promise<PaginatedResponse<T>> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest<PaginatedResponse<T>>(`/${resource}${query}`, { token });
}

export function createMaster<T>(
  resource: MasterName,
  token: string,
  body: Record<string, unknown>,
): Promise<T> {
  return apiRequest<T>(`/${resource}`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function updateMaster<T>(
  resource: MasterName,
  token: string,
  id: string | number,
  body: Record<string, unknown>,
): Promise<T> {
  return apiRequest<T>(`/${resource}/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export function deleteMaster<T>(
  resource: MasterName,
  token: string,
  id: string | number,
): Promise<T> {
  return apiRequest<T>(`/${resource}/${id}`, {
    method: "DELETE",
    token,
  });
}
