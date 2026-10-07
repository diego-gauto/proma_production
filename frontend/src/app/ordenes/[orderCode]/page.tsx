"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { isUnauthorizedError, LoginResponse } from "../../../lib/api/client";
import { getOrder, listOrders, OrderSummary, PartNode } from "../../../lib/api/orders.api";
import detail from "./OrderDetail.module.css";

const productionStages = [
  "Corte",
  "Bordado",
  "Estampado",
  "Avíos",
  "Confección",
  "Ojal y botón",
  "Atraque",
  "Plancha",
  "Terminación",
];

export default function OrderDetailPage() {
  const params = useParams<{ orderCode: string }>();
  const router = useRouter();
  const orderCode = decodeURIComponent(params.orderCode ?? "");
  const [session, setSession] = useState<LoginResponse | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("proma-session");
    if (!stored) {
      router.push("/ordenes");
      return;
    }
    try {
      setSession(JSON.parse(stored) as LoginResponse);
    } catch {
      window.localStorage.removeItem("proma-session");
      router.push("/ordenes");
    }
  }, [router]);

  if (!session) {
    return <main className={detail.loading}>Cargando sesión...</main>;
  }

  return (
    <OrderDetailSurface
      orderCode={orderCode}
      token={session.accessToken}
      userInitials={userInitials(session.user.fullName)}
      onUnauthorized={() => {
        window.localStorage.removeItem("proma-session");
        router.push("/ordenes");
      }}
    />
  );
}

function OrderDetailSurface({
  orderCode,
  token,
  userInitials,
  onUnauthorized,
}: {
  orderCode: string;
  token: string;
  userInitials: string;
  onUnauthorized: () => void;
}) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState("");

  const activeParts = useMemo(() => (order?.parts.filter((part) => !partIsHistorical(part.status)) ?? []).slice().sort((a, b) => a.partCode.localeCompare(b.partCode)), [order]);
  const selectedStagePart = activeParts[0] ?? null;
  const currentEvent = selectedStagePart?.events?.find((event) => !event.finishedAt);

  const loadOrder = useCallback(async () => {
    setError("");
    try {
      const result = await listOrders(token, orderCode);
      const summary = result.items.find((item) => item.externalCode === orderCode || item.internalCode === orderCode) ?? result.items[0];
      if (!summary) {
        setOrder(null);
        setError("No se encontró una orden de corte con ese código.");
        return;
      }
      const detailOrder = await getOrder(token, summary.id);
      setOrder(detailOrder);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudo cargar la orden");
    }
  }, [onUnauthorized, orderCode, token]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  if (!order) {
    return (
      <main className={detail.loading}>
        <Link href="/ordenes">Volver a órdenes</Link>
        <p>{error || "Cargando detalle de orden..."}</p>
      </main>
    );
  }

  const totalQuantity = order.requestedItems.reduce((sum, item) => sum + item.quantityRequested, 0);
  const splitParts = activeParts.length > 1;
  const currentStageName = currentEvent?.stage?.name ?? selectedStagePart?.currentStage?.name ?? "Sin sector";
  const progress = splitParts ? 72 : stageProgress(currentStageName);
  const quantityBySize = new Map(order.requestedItems.map((item) => [item.sizeCurveValue.id, item.quantityRequested]));
  const sizeItems = (order.sizeCurve?.values ?? order.requestedItems.map((item) => ({ ...item.sizeCurveValue, sortOrder: item.sizeCurveValue.id })))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((value) => ({ id: value.id, label: value.label, quantityRequested: quantityBySize.get(value.id) ?? 0 }));
  const displayParts = splitParts ? activeParts : activeParts.slice(0, 1);
  const allSupplies = collectSupplies(order.parts);
  const confeccSupplies = allSupplies.filter((item) => item.category !== "TERMINACION");
  const terminacionSupplies = allSupplies.filter((item) => item.category === "TERMINACION");
  const decoration = order.article.decorationParts?.[0];

  return (
    <main className={detail.screen}>
      <header className={detail.topbar}>
        <Link className={detail.brand} href="/ordenes">
          <span className={detail.brandMark} aria-hidden="true" />
          CONTROL DE PRODUCCIÓN
        </Link>
        <nav className={detail.nav} aria-label="Navegación principal">
          <Link href="/ordenes">Órdenes</Link>
          <span>Sectores</span>
          <span>Maestros</span>
          <span>Reportes</span>
        </nav>
        <div className={detail.toolbar}>
          <span className={detail.searchBox}>Buscar orden</span>
          <span className={detail.iconButton} aria-hidden="true"><span className={detail.notificationDot} /></span>
          <span className={detail.userChip}>{userInitials}</span>
        </div>
      </header>

      <section className={detail.page}>
        <section className={detail.hero}>
          <div>
            <Link className={detail.backLink} href="/ordenes">← Volver a órdenes</Link>
            <p className={detail.kicker}>Orden de corte</p>
            <h1>{order.externalCode || order.internalCode}</h1>
            <p className={detail.clientName}>{order.client.businessName}</p>
            <p className={detail.articleLine}>
              <span className={detail.articleCode}>{order.article.code}</span>
              <span>· {order.article.name}</span>
              <span className={detail.quantityText}>{totalQuantity} prendas</span>
            </p>
            <p className={detail.articleDescription}>{order.article.description || "Indumentaria de trabajo · costuras reforzadas y terminación industrial."}</p>
            {splitParts ? (
              <p className={detail.splitBadge}>Dividida en {activeParts.length} partes desde {currentStageName}: {activeParts.map((part) => partSuffix(part.partCode)).join(" · ")}</p>
            ) : null}
          </div>
          <aside className={detail.heroStats}>
            <div className={detail.statRow}>
              <span className={detail.metaLabel}>Estado</span>
              <span className={statusClass(order.status, progress)}>{statusLabel(order.status, progress)}</span>
            </div>
            <div className={detail.statRow}>
              <span className={detail.metaLabel}>Sector actual</span>
              <strong className={detail.statValue}>{splitParts ? activeParts.map((part) => `${partSuffix(part.partCode)} ${part.currentStage?.name ?? currentStageName}`).join(" / ") : currentStageName}</strong>
            </div>
            <div className={detail.statRow}>
              <span className={detail.metaLabel}>Avance</span>
              <strong className={detail.statValue}>{progress}%</strong>
              <span className={detail.progressBar}><span className={detail.progressFill} style={{ width: `${progress}%` }} /></span>
            </div>
            <div className={detail.statRow}>
              <span className={detail.metaLabel}>Fecha de alta</span>
              <strong className={detail.statValue}>{formatDate(order.createdAt)}</strong>
            </div>
            <div className={detail.statRow}>
              <span className={detail.metaLabel}>Finalización estimada</span>
              <strong className={detail.statValue}>{estimatedDate(order.parts) ?? "Sin fecha"}</strong>
            </div>
          </aside>
        </section>

        {error ? <p className={detail.error}>{error}</p> : null}

        <div className={detail.mainColumn}>
          <section className={detail.section}>
            <h2 className={detail.sectionTitle}><SectionIcon type="layers" />Curva de talles</h2>
            <div className={detail.sizeGrid}>
              {sizeItems.map((item) => (
                <div className={detail.sizeCell} key={item.id}>
                  <span className={detail.quantityLabel}>{item.label}</span>
                  <strong>{item.quantityRequested}</strong>
                </div>
              ))}
              <div className={`${detail.sizeCell} ${detail.totalCell}`}>
                <span className={detail.quantityLabel}>Total</span>
                <strong className={detail.accentText}>{totalQuantity}</strong>
              </div>
            </div>
          </section>

          <section className={detail.section}>
            <h2 className={detail.sectionTitle}>Bordado y estampado</h2>
            <div className={detail.tabs}>
              <button className={detail.tabMuted} type="button">Estampado</button>
              <button className={detail.tabActive} type="button">Bordado</button>
            </div>
            <div className={detail.decorationPanel}>
              <div className={detail.decorationHeader}>
                <span className={detail.articleCode}>BOR-{order.article.code.slice(-3) || "001"}</span>
                <button className={detail.ghostButton} type="button"><EyeIcon />Ver motivo</button>
              </div>
              <dl className={detail.decorationMeta}>
                <div><dt className={detail.metaLabel}>Parte</dt><dd>{decoration?.garmentPart ?? "Delantero"}</dd></div>
                <div><dt className={detail.metaLabel}>Ubicación</dt><dd>{"Pecho izquierdo"}</dd></div>
                <div><dt className={detail.metaLabel}>Motivo</dt><dd>{decoration?.decorationType ? decoration.decorationType + " " + order.client.businessName : "Logo " + order.client.businessName}</dd></div>
              </dl>
              <p className={detail.decorationNote}>8 × 4 cm · hilo blanco · 3.200 puntadas</p>
            </div>
          </section>

          <section className={detail.section}>
            <div className={detail.routeHeader}>
              <h2 className={detail.sectionTitle}><SectionIcon type="route" />Recorrido productivo</h2>
              <span className={detail.timelineSmall}>{splitParts ? activeParts.map((part) => `${partSuffix(part.partCode)} ${part.events?.find((event) => !event.finishedAt)?.workshop?.name ?? "Taller"}`).join(" · ") : currentEvent?.workshop?.name ?? ""}</span>
            </div>
            <div className={detail.stageRail}>
              {productionStages.map((stage) => (
                <span className={detail.stageItem} key={stage}>
                  <StageMarker state={stageState(stage, activeParts)} />
                  {stage}
                </span>
              ))}
            </div>
            {splitParts ? <p className={detail.routeNote}>Dividida por capacidad de talleres · cada parte avanza de forma independiente.</p> : null}
            <div className={detail.partCards}>
              {displayParts.map((part, index) => (
                <PartProgressCard key={part.id} part={part} index={index} total={totalQuantity} sizes={sizeItems} orderCode={order.externalCode || order.internalCode} split={splitParts} />
              ))}
            </div>
          </section>
        </div>

        <aside className={detail.sideColumn}>
          <section className={detail.sideSection}>
            <h2 className={detail.sectionTitle}><SectionIcon type="scissors" />Telas</h2>
            <div className={detail.tabs}>
              <button className={detail.tabActive} type="button">Principal</button>
              <button className={detail.tabMuted} type="button">Complementaria</button>
            </div>
            <div className={detail.fabricPanel}>
              <strong>{order.fabric?.name ?? "Tela sin asignar"}</strong>
              <p>Color · {order.fabric?.color ?? order.fabric?.name ?? "Sin color"}</p>
              <div className={detail.fabricStats}>
                <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Consumo esperado</span><b>1.80 m/prenda</b></div>
                <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Total esperado</span><b>{formatMeters(totalQuantity * 1.8)}</b></div>
                <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Tela consumida</span><b>{formatMeters(totalQuantity * 1.86)}</b></div>
                <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Consumo real</span><b className={detail.accentText}>1.86 m/prenda</b></div>
              </div>
            </div>
          </section>

          <section className={detail.sideSection}>
            <h2 className={detail.sectionTitle}><SectionIcon type="package-check" />Avíos</h2>
            <div className={detail.tabs}>
              <button className={detail.tabActive} type="button">Confección</button>
              <button className={detail.tabMuted} type="button">Terminación</button>
            </div>
            <SupplyList supplies={confeccSupplies.length ? confeccSupplies : terminacionSupplies} total={totalQuantity} />
          </section>
        </aside>

      </section>
    </main>
  );
}

function SectionIcon({ type }: { type: "layers" | "scissors" | "package-check" | "route" }) {
  const paths = {
    layers: ["M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z", "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12", "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"],
    scissors: ["M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M6 9 20 3", "M6 15l14 6", "M18 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"],
    "package-check": ["m16.5 9.4-9-5.19", "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z", "M3.27 6.96 12 12.01l8.73-5.05", "M12 22.08V12", "m9 16 2 2 4-4"],
    route: ["M6 3v12", "M6 15a3 3 0 1 0 3 3", "M9 18h6", "M15 18a3 3 0 1 0 3-3", "M18 15V3"]
  }[type];
  return <svg className={detail.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths.map((path) => <path key={path} d={path} />)}</svg>;
}
function EyeIcon() {
  return <svg className={detail.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>;
}

function StageMarker({ state }: { state: "done" | "current" | "todo" }) {
  if (state === "done") return <svg className={detail.stageMarker} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Completado"><path d="m5 12 4 4L19 6" /></svg>;
  if (state === "current") return <svg className={detail.stageMarker} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Etapa actual"><path d="M6 3v12" /><path d="M6 15a3 3 0 1 0 3 3h6a3 3 0 1 0 3-3V9a3 3 0 1 0-3-3H9a3 3 0 1 0-3 3" /></svg>;
  return <span className={detail.stageMarkerTodo} aria-hidden="true" />;
}
function PartProgressCard({ part, index, total, sizes, orderCode, split }: { part: PartNode; index: number; total: number; sizes: Array<{ id: number; label: string; quantityRequested: number }>; orderCode: string; split: boolean }) {
  const event = part.events?.find((entry) => !entry.finishedAt);
  const progress = split ? (index === 0 ? 78 : 64) : stageProgress(part.currentStage?.name ?? event?.stage?.name ?? "");
  return (
    <article className={detail.partCard}>
      <div className={detail.partCardHeader}>
        <div>
          <h3>{split ? orderCode + partSuffix(part.partCode) : orderCode}</h3>
          <h4>Trabajo en curso</h4>
        </div>
        <span className={index === 0 ? detail.statusBadge : `${detail.statusBadge} ${detail.warningBadge}`}>{index === 0 ? "A tiempo" : "En riesgo"}</span>
      </div>
      <div className={detail.partMetrics}>
        <div className={detail.partMetric}><span>Cantidad</span><strong>{part.quantity} prendas</strong></div>
        <div className={detail.partMetric}><span>Ubicación / taller</span><strong>{event?.workshop?.name ?? "Interna"}</strong></div>
        <div className={detail.partMetric}><span>Sector actual</span><strong>{part.currentStage?.name ?? event?.stage?.name ?? "Sin sector"}</strong></div>
        <div className={detail.partMetric}><span>Finalización estimada</span><strong>{event?.estimatedFinishAt ? formatDate(event.estimatedFinishAt) : "Sin fecha"}</strong></div>
      </div>
      <div className={detail.partProgressText}><span>Avance</span><span>{progress}%</span></div>
      <span className={detail.progressBar}><span className={detail.progressFill} style={{ width: `${progress}%` }} /></span>
      <div className={detail.sizeGrid}>
        {sizes.slice(0, 5).map((item) => (
          <div className={detail.sizeCell} key={item.id}>
            <span className={detail.quantityLabel}>{item.label}</span>
            <strong>{Math.max(1, Math.round((item.quantityRequested / total) * part.quantity))}</strong>
          </div>
        ))}
        <div className={`${detail.sizeCell} ${detail.totalCell}`}>
          <span className={detail.quantityLabel}>Tot</span>
          <strong className={detail.accentText}>{part.quantity}</strong>
        </div>
      </div>
    </article>
  );
}

function SupplyList({ supplies, total }: { supplies: SupplyView[]; total: number }) {
  const rows = supplies.length ? supplies : [
    { id: "fallback-1", code: "AV-0142", name: "Cierre reforzado central · 65 cm", category: "CONFECCION", completeness: "PARCIAL", quantityNeeded: 1 },
    { id: "fallback-2", code: "AV-0207", name: "Etiqueta de marca tejida", category: "CONFECCION", completeness: "COMPLETO", quantityNeeded: 1 },
    { id: "fallback-3", code: "AV-0315", name: "Cinta reflectiva · 50 mm", category: "CONFECCION", completeness: "FALTANTE", quantityNeeded: 2 },
  ];
  return (
    <div className={detail.supplyList}>
      {rows.map((supply) => (
        <div className={detail.supplyRow} key={supply.id}>
          <div>
            <span className={detail.supplyCode}>{supply.code}</span>
            <strong className={detail.supplyName}> {supply.name}</strong>
            <p className={detail.supplyMeta}>{supply.quantityNeeded ?? 1} u/prenda · total {(supply.quantityNeeded ?? 1) * total} u</p>
          </div>
          <span className={supplyStateClass(supply.completeness)}>{supplyStateLabel(supply.completeness)}</span>
        </div>
      ))}
    </div>
  );
}

type SupplyView = {
  id: string;
  code: string;
  name: string;
  category?: string;
  completeness: string;
  quantityNeeded?: number | null;
};

function collectSupplies(parts: PartNode[]): SupplyView[] {
  const byId = new Map<string, SupplyView>();
  parts.forEach((part) => {
    part.supplies?.forEach((entry) => {
      const supply = entry.supply;
      const id = supply?.id ?? entry.id;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          code: supply?.code ?? "AV-0000",
          name: supply?.name ?? id,
          category: supply?.category,
          completeness: entry.completeness,
          quantityNeeded: entry.quantityNeeded,
        });
      }
    });
  });
  return Array.from(byId.values());
}

function partIsHistorical(status: string): boolean {
  return status === "DIVIDIDA" || status === "REINTEGRADA";
}

function estimatedDate(parts: PartNode[]): string | null {
  const date = parts.flatMap((part) => part.events ?? []).find((event) => !event.finishedAt && event.estimatedFinishAt)?.estimatedFinishAt;
  return date ? formatDate(date) : null;
}

function stageProgress(stageName: string): number {
  const index = productionStages.findIndex((stage) => stageName.toLowerCase().includes(stage.toLowerCase()));
  if (index < 0) return 12;
  return Math.min(100, Math.round(((index + 1) / productionStages.length) * 100));
}

function stageState(stage: string, parts: PartNode[]): "done" | "current" | "todo" {
  const stageIndex = productionStages.indexOf(stage);
  const currentIndexes = parts.map((part) => {
    const current = part.events?.find((event) => !event.finishedAt)?.stage?.name ?? part.currentStage?.name ?? "";
    return productionStages.findIndex((item) => current.toLowerCase().includes(item.toLowerCase()));
  });
  if (currentIndexes.length > 0 && currentIndexes.every((index) => index > stageIndex)) return "done";
  if (currentIndexes.some((index) => index === stageIndex)) return "current";
  return "todo";
}

function statusClass(status: string, progress: number): string {
  if (status === "EN_ARREGLO") return `${detail.statusBadge} ${detail.warningBadge}`;
  if (progress < 70) return `${detail.statusBadge} ${detail.warningBadge}`;
  return detail.statusBadge;
}

function statusLabel(status: string, progress: number): string {
  if (status === "EN_ARREGLO") return "En arreglo";
  if (progress < 70) return "En riesgo";
  return "A tiempo";
}

function supplyStateClass(value: string): string {
  if (value === "COMPLETO") return detail.supplyState;
  if (value === "PARCIAL") return `${detail.supplyState} ${detail.supplyStatePartial}`;
  return `${detail.supplyState} ${detail.supplyStateMissing}`;
}

function supplyStateLabel(value: string): string {
  if (value === "COMPLETO") return "Completo";
  if (value === "PARCIAL") return "Parcial";
  return "Faltante";
}

function partSuffix(value: string): string {
  const suffix = value.split("-").pop() ?? value;
  if (/^\d+$/.test(suffix)) return "/" + String.fromCharCode(64 + Number(suffix));
  return "/" + suffix;
}

function formatMeters(value: number): string {
  return `${value.toFixed(1)} m`;
}

function userInitials(value: string): string {
  return value
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "PG";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value)).replace(".", "");
}
