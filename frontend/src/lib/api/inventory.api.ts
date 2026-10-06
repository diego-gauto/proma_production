import { apiRequest, PaginatedResponse } from "./client";

export type FabricRollInput = {
  code: string;
  lot: string;
  quantity: number;
};

export type FabricStockEntryInput = {
  providerId: string;
  fabricId: string;
  entryDate: string;
  documentNumber?: string;
  note?: string;
  rolls: FabricRollInput[];
};

export type SupplyStockEntryInput = {
  providerId: string;
  supplyId: string;
  entryDate: string;
  documentNumber?: string;
  note?: string;
  quantity: number;
};

export function createFabricStockEntry(token: string, body: FabricStockEntryInput) {
  return apiRequest("/fabric-stock-entries", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function createSupplyStockEntry(token: string, body: SupplyStockEntryInput) {
  return apiRequest("/supply-stock-entries", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}


export type StockAdjustmentReason = "USO" | "CORRECCION" | "ROTURA" | "DEVOLUCION";

export type StockAdjustmentInput = {
  quantityDelta: number;
  reason: StockAdjustmentReason;
  note?: string;
};

export type FabricStockRow = {
  fabric: { id: string; code: string; name: string; color?: string | null };
  rollCount: number;
  originalQuantity: number;
  currentQuantity: number;
};

export type SupplyStockRow = {
  supply: { id: string; code: string; name: string; color?: string | null; category: string };
  currentQuantity: number;
};

export type FabricStockDetail = FabricStockRow & {
  rolls: {
    id: string;
    code: string;
    lot: string;
    originalQuantity: number;
    currentQuantity: number;
    entryDate: string;
    providerName: string;
    movements: { id: string; quantityDelta: number; reason: StockAdjustmentReason; note?: string | null; createdAt: string }[];
  }[];
};

export type SupplyStockDetail = SupplyStockRow & {
  entries: { id: string; entryDate: string; providerName: string; quantity: number; documentNumber?: string | null }[];
  movements: { id: string; quantityDelta: number; reason: StockAdjustmentReason; note?: string | null; createdAt: string }[];
};

function stockQuery(page: number, limit: number, search?: string): string {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set("search", search);
  return query.toString();
}

export function listFabricStock(token: string, search = "", page = 1, limit = 20) {
  return apiRequest<PaginatedResponse<FabricStockRow>>('/stock/fabrics?' + stockQuery(page, limit, search), { token });
}

export function getFabricStockDetail(token: string, fabricId: string) {
  return apiRequest<FabricStockDetail>('/stock/fabrics/' + fabricId, { token });
}

export function listSupplyStock(token: string, search = "", page = 1, limit = 20) {
  return apiRequest<PaginatedResponse<SupplyStockRow>>('/stock/supplies?' + stockQuery(page, limit, search), { token });
}

export function getSupplyStockDetail(token: string, supplyId: string) {
  return apiRequest<SupplyStockDetail>('/stock/supplies/' + supplyId, { token });
}

export function adjustFabricRollStock(token: string, rollId: string, body: StockAdjustmentInput) {
  return apiRequest('/stock/fabric-rolls/' + rollId + '/adjustments', {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function adjustSupplyStock(token: string, supplyId: string, body: StockAdjustmentInput) {
  return apiRequest('/stock/supplies/' + supplyId + '/adjustments', {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}
