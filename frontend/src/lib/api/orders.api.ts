import { apiRequest, PaginatedResponse } from "./client";

export type OrderSummary = {
  id: string;
  internalCode: string;
  externalCode: string;
  status: string;
  client: { id: string; businessName: string; name?: string };
  article: { id: string; name: string };
  requestedItems: {
    id: string;
    color?: string | null;
    quantityRequested: number;
    sizeCurveValue: { id: number; label: string };
  }[];
  parts: {
    id: string;
    partCode: string;
    quantity: number;
    status: string;
    currentStage?: { id: number; code: string; name: string } | null;
    events?: {
      id: string;
      startedAt?: string | null;
      estimatedFinishAt?: string | null;
      finishedAt?: string | null;
      stage?: { id: number; code: string; name: string } | null;
      workshop?: { id: string; name: string } | null;
    }[];
  }[];
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
