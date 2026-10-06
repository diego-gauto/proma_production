import { apiRequest } from "./client";

export type FabricRollInput = {
  code: string;
  lot: string;
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
