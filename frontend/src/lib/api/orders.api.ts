import { apiRequest, PaginatedResponse } from "./client";
import { ArticleMaster, FabricMaster, SizeCurveMaster, WorkshopMaster } from "./masters.api";

export type PartSupply = {
  id: string;
  quantityNeeded?: number | null;
  quantityAvailable?: number | null;
  completeness: string;
  note?: string | null;
  updatedAt?: string | null;
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
    executionType?: "INTERNO" | "EXTERNO" | "AMBOS";
    note?: string | null;
    includesAtraque?: boolean | null;
  }[];
  supplies?: PartSupply[];
  children?: PartNode[];
};


export type StageOption = {
  id: number;
  code: string;
  name: string;
  executionType: "INTERNO" | "EXTERNO" | "AMBOS";
  isOptional: boolean;
};

export type StageEventResponse = {
  id: string;
  startedAt?: string | null;
  estimatedFinishAt?: string | null;
  finishedAt?: string | null;
  executionType: "INTERNO" | "EXTERNO";
  note?: string | null;
  stage: StageOption;
  orderPart: PartNode;
};

export type FinishStageResponse = {
  event: StageEventResponse;
  includedAtraqueEvent?: StageEventResponse | null;
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


export function listStages(token: string): Promise<StageOption[]> {
  return apiRequest<StageOption[]>("/stages", { token });
}

export function startStage(
  token: string,
  partId: string,
  body: Record<string, unknown>,
): Promise<StageEventResponse> {
  return apiRequest<StageEventResponse>(`/order-parts/${partId}/stage-events/start`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function finishStage(
  token: string,
  partId: string,
  body: Record<string, unknown>,
): Promise<FinishStageResponse> {
  return apiRequest<FinishStageResponse>(`/order-parts/${partId}/stage-events/finish`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function movePartToStage(
  token: string,
  partId: string,
  targetStage: StageOption,
): Promise<StageEventResponse> {
  if (targetStage.executionType === "EXTERNO") {
    throw new Error("Esta etapa requiere seleccionar taller desde el detalle de la orden");
  }
  await finishStage(token, partId, {
    note: "Movimiento desde tablero de sectores",
  });
  return startStage(token, partId, {
    stageId: targetStage.id,
    executionType: "INTERNO",
    note: "Movimiento desde tablero de sectores",
  });
}

export function updatePartSupply(
  token: string,
  partId: string,
  supplyId: string,
  body: Record<string, unknown>,
): Promise<PartSupply> {
  return apiRequest<PartSupply>(`/order-parts/${partId}/supplies/${supplyId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export function markOrderRepair(
  token: string,
  orderId: string,
  note: string,
): Promise<OrderSummary> {
  return apiRequest<OrderSummary>(`/orders/${orderId}/repair`, {
    method: "POST",
    token,
    body: JSON.stringify({ note }),
  });
}

export function resolveOrderRepair(
  token: string,
  orderId: string,
): Promise<OrderSummary> {
  return apiRequest<OrderSummary>(`/orders/${orderId}/repair/resolve`, {
    method: "POST",
    token,
  });
}
