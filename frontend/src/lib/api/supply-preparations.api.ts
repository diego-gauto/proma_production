import { apiRequest, PaginatedResponse } from './client';

export type SupplyCategory = 'CONFECCION' | 'TERMINACION';
export type PreparationStatus = 'PARA_PREPARAR' | 'EN_PREPARACION' | 'INCOMPLETO' | 'TERMINADO';
export type PreparedSupply = {
  id: string; code: string; name: string; color?: string | null;
  perUnit: number | null; total: number | null; quantityAvailable: number | null;
  completeness: 'COMPLETO' | 'PARCIAL' | 'FALTANTE'; started: boolean; updatedAt: string;
};
export type PreparationPart = { id: string; partCode: string; quantity: number; supplies: PreparedSupply[] };
export type SplitPreparationGroup = { parentPartCode: string; parentQuantity: number; children: { partCode: string; quantity: number }[] };
export type SupplyPreparation = {
  id: string; externalCode: string; internalCode: string; clientName: string;
  articleCode: string; articleName: string; fabricName?: string; createdAt: string;
  category: SupplyCategory; status: PreparationStatus; splitGroups: SplitPreparationGroup[]; parts: PreparationPart[];
};
export function listSupplyPreparations(token: string, category: SupplyCategory, search = '', page = 1) {
  const query = new URLSearchParams({ category, search, page: String(page), limit: '20' });
  return apiRequest<PaginatedResponse<SupplyPreparation>>(`/supply-preparations?${query}`, { token });
}
export function getSupplyPreparation(token: string, id: string, category: SupplyCategory) {
  return apiRequest<SupplyPreparation>(`/supply-preparations/${id}?category=${category}`, { token });
}
export function saveSupplyPreparation(token: string, partId: string, category: SupplyCategory, action: 'START' | 'SAVE', items: { supplyId: string; quantityAvailable: number; completeness: string }[] = []) {
  return apiRequest<{ saved: number }>(`/supply-preparations/${partId}`, { token, method: 'PATCH', body: JSON.stringify({ category, action, items }) });
}
