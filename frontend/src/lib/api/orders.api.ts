import { apiRequest, PaginatedResponse } from "./client";
import { ArticleMaster, FabricMaster, SizeCurveMaster, WorkshopMaster } from "./masters.api";

export type PartSupply = {
  id: string;
  quantityNeeded?: number | null;
  completeness: string;
  supply?: { id: string; name: string; code?: string } | null;
};

export type PartNode = {
  id: string;
  parentPartId?: string | null;
  recombinedIntoPartId?: string | null;
  partCode: string;
  quantity: number;
  status: string;
  splitMode?: "LOTE" | "COMPONENTE" | null;
  isSplit?: boolean;
  isComponentBranch?: boolean;
  splitReason?: string | null;
  currentStage?: { id: number; code: string; name: string } | null;
  events?: {
    id: string;
    startedAt?: string | null;
    estimatedFinishAt?: string | null;
    finishedAt?: string | null;
    stage?: { id: number; code: string; name: string } | null;
    workshop?: { id: string; name: string } | null;
  }[];
  supplies?: PartSupply[];
  children?: PartNode[];
};

export type OrderSummary = {
  id: string;
  internalCode: string;
  externalCode: string;
  status: string;
  client: { id: string; businessName: string; name?: string };
  article: ArticleMaster;
  fabric?: FabricMaster;
  sizeCurve?: SizeCurveMaster;
  initialWorkshop?: WorkshopMaster | null;
  requestedItems: {
    id: string;
    color?: string | null;
    quantityRequested: number;
    sizeCurveValue: { id: number; label: string };
    fabric?: FabricMaster | null;
  }[];
  parts: PartNode[];
  createdAt: string;
};

export function listOrders(
  token: string,
  search: string,
): Promise<PaginatedResponse<OrderSummary>> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest<PaginatedResponse<OrderSummary>>(`/orders${query}`, {
    token,
  });
}

export function getOrder(token: string, id: string): Promise<OrderSummary> {
  return apiRequest<OrderSummary>(`/orders/${id}`, { token });
}

export function listOrderParts(
  token: string,
  orderId: string,
  stageId?: number,
): Promise<PartNode[]> {
  const query = stageId ? `?stageId=${stageId}` : "";
  return apiRequest<PartNode[]>(`/orders/${orderId}/parts${query}`, { token });
}

export function createOrder(
  token: string,
  body: Record<string, unknown>,
): Promise<OrderSummary> {
  return apiRequest<OrderSummary>("/orders", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function splitPart(
  token: string,
  partId: string,
  body: Record<string, unknown>,
): Promise<PartNode[]> {
  return apiRequest<PartNode[]>(`/order-parts/${partId}/split`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function recombineParts(
  token: string,
  body: Record<string, unknown>,
): Promise<PartNode> {
  return apiRequest<PartNode>("/order-parts/recombine", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}
