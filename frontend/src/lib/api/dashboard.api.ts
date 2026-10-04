import { apiRequest } from "./client";
import { PartNode, StageOption } from "./orders.api";

export type DashboardRow = {
  orderId: string;
  partId: string;
  parentPartId: string | null;
  internalCode: string;
  externalCode: string;
  clientName: string;
  articleName: string;
  fabricName: string;
  quantity: number;
  partCode: string;
  orderStatus: string;
  partStatus: string;
  statusLabel: string;
  rowType: "SIMPLE" | "SPLIT_PARENT" | "SPLIT_CHILD";
  stage: StageOption | null;
  location: string;
  startedAt: string | null;
  daysInStage: number | null;
  semaphore: "OK" | "WARNING" | "OVERDUE" | "FINALIZED";
};

export type DashboardOrdersResponse = {
  items: DashboardRow[];
  total: number;
};

export type DashboardKanbanPart = PartNode & { order?: { id: string } };

export type DashboardKanbanResponse = {
  stages: { stage: StageOption; parts: DashboardKanbanPart[] }[];
};

export type DashboardSummary = {
  activeOrders: number;
  inRepair: number;
  bottlenecks: number;
  overdue: number;
  finalized: number;
};

function searchQuery(search: string): string {
  return search ? `?search=${encodeURIComponent(search)}` : "";
}

export function listDashboardOrders(token: string, search: string): Promise<DashboardOrdersResponse> {
  return apiRequest<DashboardOrdersResponse>(`/dashboard/orders-list${searchQuery(search)}`, { token });
}

export function getDashboardKanban(token: string, search: string): Promise<DashboardKanbanResponse> {
  return apiRequest<DashboardKanbanResponse>(`/dashboard/kanban${searchQuery(search)}`, { token });
}

export function getDashboardSummary(token: string, search: string): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>(`/dashboard/summary${searchQuery(search)}`, { token });
}
