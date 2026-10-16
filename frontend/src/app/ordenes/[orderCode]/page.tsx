"use client";

import { DecorationWorkPanel } from "@/components/ordenes/DecorationWorkPanel/DecorationWorkPanel";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "../../../components/layout/AppLayout/AppLayout";
import { getFabricStockDetail, FabricStockDetail } from "../../../lib/api/inventory.api";
import { isUnauthorizedError, LoginResponse } from "../../../lib/api/client";
import { createCutLoad, createDecorationLoad, getOrder, listOrders, OrderSummary, PartNode, recordStageProgress } from "../../../lib/api/orders.api";
import detail from "./OrderDetail.module.css";
import cutStyles from "../CorteSector.module.css";

type CutDraft = {
  id: string;
  lotCode: string;
  fabricId: string;
  fabricRollId: string;
  fabricQuantity: string;
  fabricUseType: 'PRIMARIA' | 'COMPLEMENTO';
  quantities: Record<number, string>;
};

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
      userFullName={session.user.fullName}
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
  userFullName,
  onUnauthorized,
}: {
  orderCode: string;
  token: string;
  userFullName: string;
  onUnauthorized: () => void;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState("");
  const [selectedStage, setSelectedStage] = useState(productionStages[0]);
  const [topSearch, setTopSearch] = useState("");
  const [fabricStock, setFabricStock] = useState<Record<string, FabricStockDetail>>( {} );

  const activeParts = useMemo(() => (order?.parts.filter((part) => !partIsHistorical(part.status)) ?? []).slice().sort((a, b) => a.partCode.localeCompare(b.partCode)), [order]);
  const selectedStagePart = activeParts[0] ?? null;
  const currentEvent = selectedStagePart?.events?.find((event) => !event.finishedAt);
  const currentStageName = currentEvent?.stage?.name ?? selectedStagePart?.currentStage?.name ?? "Sin sector";

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

  useEffect(() => {
    setSelectedStage(currentStageName === "Sin sector" ? productionStages[0] : matchingStageName(currentStageName));
  }, [currentStageName]);

  useEffect(() => {
    if (!order) return;
    const fabricIds = orderFabrics(order).map((item) => item.fabric.id);
    const missing = fabricIds.filter((id) => !fabricStock[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(async (id) => [id, await getFabricStockDetail(token, id)] as const))
      .then((rows) => {
        if (cancelled) return;
        setFabricStock((current) => ({ ...current, ...Object.fromEntries(rows) }));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [fabricStock, order, token]);


  if (!order) {
    return (
      <main className={detail.loading}>
        <Link href="/ordenes">Volver a órdenes</Link>
        <p>{error || "Cargando detalle de orden..."}</p>
      </main>
    );
  }

  const primaryRequestedItems = order.requestedItems.filter((item) => (item.useType ?? "PRIMARIA") === "PRIMARIA");
  const totalQuantity = primaryRequestedItems.reduce((sum, item) => sum + item.quantityRequested, 0);
  const splitParts = activeParts.length > 1;
  const progress = splitParts ? 72 : stageProgress(currentStageName);
  const quantityBySize = new Map(primaryRequestedItems.map((item) => [item.sizeCurveValue.id, item.quantityRequested]));
  const sizeItems = (order.sizeCurve?.values ?? primaryRequestedItems.map((item) => ({ ...item.sizeCurveValue, sortOrder: item.sizeCurveValue.id })))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((value) => ({ id: value.id, label: value.label, quantityRequested: quantityBySize.get(value.id) ?? 0 }));
  const selectedStageParts = stagePartsForDisplay(selectedStage, order.parts, activeParts);
  const selectedStageSplitParts = selectedStageParts.length > 1 && selectedStageParts.every((part) => activeParts.some((active) => active.id === part.id));
  const displayParts = selectedStageSplitParts ? selectedStageParts : [];
  const allSupplies = collectSupplies(order.parts);
  const confeccSupplies = allSupplies.filter((item) => item.category !== "TERMINACION");
  const terminacionSupplies = allSupplies.filter((item) => item.category === "TERMINACION");
  const decoration = order.article.decorationParts?.[0];
  const cutFabrics = orderFabrics(order);
  const fabricConsumption = cutFabrics.map((fabric) => cutFabricConsumption(order.parts, fabric));
  const sectorStage = sectorStageForCurrentSession();

  if (sectorStage === "Corte" || sectorStage === "Bordado" || sectorStage === "Estampado") {
    return (
      <SectorOrderDetail
        order={order}
        stageName={sectorStage}
        sizes={sizeItems}
        token={token}
        userFullName={userFullName}
        topSearch={topSearch}
        setTopSearch={setTopSearch}
        onSearchSubmit={(target) => router.push(`/ordenes/${encodeURIComponent(target)}`)}
        onSaved={loadOrder}
        fabricStock={fabricStock}
      />
    );
  }

  return (
    <AppLayout
      className={detail.screen}
      activeSection="orders"
      searchValue={topSearch}
      onSearchChange={setTopSearch}
      onSearchSubmit={() => {
        const target = topSearch.trim();
        if (target) router.push(`/ordenes/${encodeURIComponent(target)}`);
      }}
      actions={(
        <>
          <span className={detail.topIconButton} aria-hidden="true"><span className={detail.notificationDot} /></span>
          <span className={detail.topUserChip} title={userFullName}>{userInitials(userFullName)}</span>
        </>
      )}
    >

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
                <div><dt className={detail.metaLabel}>Ubicación</dt><dd>{decorationLocation(order.article.code, decoration?.garmentPart)}</dd></div>
                <div><dt className={detail.metaLabel}>Motivo</dt><dd>{decoration?.decorationType ? decoration.decorationType + " " + order.client.businessName : "Logo " + order.client.businessName}</dd></div>
              </dl>
              <p className={detail.decorationNote}>8 × 4 cm · hilo blanco · 3.200 puntadas</p>
            </div>
          </section>

          <section className={detail.section}>
            <div className={detail.routeHeader}>
              <h2 className={detail.sectionTitle}><SectionIcon type="route" />Recorrido productivo</h2>
              <span className={detail.timelineSmall}>{selectedStageSplitParts ? selectedStageParts.map((part) => `${partSuffix(part.partCode)} ${part.events?.find((event) => !event.finishedAt)?.workshop?.name ?? "Taller"}`).join(" · ") : currentEvent?.workshop?.name ?? ""}</span>
            </div>
            <div className={detail.stageRail}>
              {productionStages.map((stage) => {
                const access = stageAccess(stage, order.parts);
                return (
                  <button
                    className={`${detail.stageItem} ${selectedStage === stage ? detail.stageItemSelected : ""}`}
                    key={stage}
                    type="button"
                    disabled={!access.canOpen}
                    onClick={() => setSelectedStage(stage)}
                    title={access.canOpen ? stage : "La etapa todavia no inicio"}
                  >
                    <StageMarker state={access.state} />
                    {stage}
                  </button>
                );
              })}
            </div>
            {selectedStageSplitParts ? <p className={detail.routeNote}>Dividida por capacidad de talleres · cada parte avanza de forma independiente.</p> : null}
            <StageWorkPanel
              stageName={selectedStage}
              parts={selectedStageParts}
              sizes={sizeItems}
              token={token}
              onSaved={loadOrder}
              order={order}
              fabricStock={fabricStock}
            />
            {selectedStageSplitParts ? (
              <div className={detail.partCards}>
                {displayParts.map((part, index) => (
                  <PartProgressCard key={part.id} part={part} index={index} total={totalQuantity} sizes={sizeItems} orderCode={order.externalCode || order.internalCode} split={selectedStageSplitParts} />
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className={detail.sideColumn}>
          <section className={detail.sideSection}>
            <h2 className={detail.sectionTitle}><SectionIcon type="scissors" />Telas</h2>
            <div className={detail.fabricPanelStack}>
              {fabricConsumption.map((item) => (
                <div className={detail.fabricPanel} key={`${item.fabric.useType}-${item.fabric.fabric.id}`}>
                  <span className={detail.stageKicker}>{item.fabric.kind}</span>
                  <strong>{item.fabric.fabric.name}</strong>
                  <p>Color · {item.fabric.fabric.color ?? item.fabric.fabric.name}</p>
                  <div className={detail.fabricStats}>
                    <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Consumo esperado</span><b>{formatUnitQuantity(item.expectedPerGarment, item.unit)}/prenda</b></div>
                    <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Total esperado</span><b>{formatUnitQuantity(item.expectedTotal, item.unit)}</b></div>
                    <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Tela consumida</span><b>{formatUnitQuantity(item.consumedTotal, item.unit)}</b></div>
                    <div className={detail.fabricLine}><span className={detail.sideMetaLabel}>Consumo real</span><b className={detail.accentText}>{formatUnitQuantity(item.actualPerGarment, item.unit)}/prenda</b></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={detail.sideSection}>
            <h2 className={detail.sectionTitle}><SectionIcon type="package-check" />Avíos</h2>
            <Link className={cutStyles.backLink} href={`/avios/${order.id}`}>Preparar avíos →</Link>
            <SupplyList title="Confección" supplies={confeccSupplies} total={totalQuantity} />
            <SupplyList title="Terminación" supplies={terminacionSupplies} total={totalQuantity} />
          </section>
        </aside>

      </section>
    </AppLayout>
  );
}


function CutSectorOrderDetail({
  order,
  stageName = "Corte",
  sizes,
  token,
  userFullName,
  topSearch,
  setTopSearch,
  onSearchSubmit,
  onSaved,
  fabricStock,
}: {
  order: OrderSummary;
  stageName?: "Corte" | "Bordado" | "Estampado";
  sizes: Array<{ id: number; label: string; quantityRequested: number }>;
  token: string;
  userFullName: string;
  topSearch: string;
  setTopSearch: (value: string) => void;
  onSearchSubmit: (target: string) => void;
  onSaved: () => Promise<void>;
  fabricStock: Record<string, FabricStockDetail>;
}) {
  const activeParts = order.parts.filter((part) => !partIsHistorical(part.status));
  const parts = stagePartsForDisplay(stageName, order.parts, activeParts);
  const part = parts[0] ?? activeParts[0];
  const totalQuantity = sizes.reduce((sum, item) => sum + item.quantityRequested, 0);
  const fabrics = orderFabrics(order);
  const [showWorkPanel, setShowWorkPanel] = useState(false);
  const cutLoads = part?.cutLoads ?? [];
  const cutTotal = totalCutQuantity(cutLoads.filter((load) => load.fabricUseType !== "COMPLEMENTO"));
  const isStarted = cutLoads.length > 0 || matchingStageName(part?.currentStage?.name ?? "") === "Corte";
  const listLabel = stageName === "Corte" ? "Mis cortes" : stageName === "Bordado" ? "Mis bordados" : "Mis estampados";
  const statusLabel = cutTotal >= totalQuantity && totalQuantity > 0 ? "Corte finalizado" : isStarted ? "En corte" : "Listo para cortar";
  const statusClass = cutTotal >= totalQuantity && totalQuantity > 0 ? cutStyles.statusCutting : cutStyles.statusReady;
  const hasDecorationLoads = stageName === "Corte" || parts.some((item) => (item.decorationLoads ?? []).some((load) => matchingStageName(load.stageEvent?.stage?.name ?? "") === stageName));

  return (
    <main className={cutStyles.screen}>
      <header className={cutStyles.topBar}>
        <Link className={cutStyles.brand} href="/ordenes" aria-label={`Ir a ${listLabel}`}>
          <span className={cutStyles.brandMark} aria-hidden="true" />
          <strong>Control de Producción</strong>
        </Link>
        <Link className={cutStyles.navPill} href="/ordenes">{listLabel}</Link>
        <form
          className={cutStyles.topActions}
          onSubmit={(event) => {
            event.preventDefault();
            const target = topSearch.trim();
            if (target) onSearchSubmit(target);
          }}
        >
          <label className={cutStyles.searchBox}>
            <span className={cutStyles.searchIcon} aria-hidden="true" />
            <input type="search" placeholder="Buscar orden" aria-label="Buscar orden" value={topSearch} onChange={(event) => setTopSearch(event.target.value)} />
          </label>
          <span className={cutStyles.userChip}><span className={cutStyles.userIcon} aria-hidden="true" />{userFullName} · {stageName}</span>
          <button className={cutStyles.avatar} type="button" title="Abrir perfil" onClick={() => { window.localStorage.removeItem("proma-session"); window.location.assign("/ordenes"); }}>{userInitials(userFullName)}</button>
        </form>
      </header>
      <section className={cutStyles.content}>
        <Link className={cutStyles.backLink} href="/ordenes">← Volver a {listLabel.toLowerCase()}</Link>
        <header className={cutStyles.detailHero}>
          <div>
            <span className={cutStyles.eyebrow}>Orden de corte</span>
            <h1 className={cutStyles.detailTitle}>{order.externalCode || order.internalCode}</h1>
            <div className={cutStyles.detailClient}>{order.client.businessName}</div>
            <div className={cutStyles.detailArticle}><span className={cutStyles.articleCode}>{order.article.code}</span> · {order.article.name} · <span className={cutStyles.quantity}>{totalQuantity}</span> prendas</div>
          </div>
          <aside className={cutStyles.statusBox}>
            <span className={cutStyles.statusCaption}>Estado de {stageName.toLowerCase()}</span>
            <strong className={`${cutStyles.statusLabel} ${statusClass}`}>{stageName === "Corte" ? statusLabel : parts.some(item => item.events?.some(event => event.stage?.name === stageName && !event.finishedAt)) ? `En ${stageName.toLowerCase()}` : parts.length > 0 && parts.every(item => item.events?.some(event => event.stage?.name === stageName && event.finishedAt)) ? `${stageName} finalizado` : "Pendiente"}</strong>
            <span className={cutStyles.statusNote}>{part?.events?.find((event) => !event.finishedAt)?.workshop?.name ?? "Planta central"}</span>
          </aside>
        </header>
        {hasDecorationLoads ? <section className={cutStyles.section}>
          <h2 className={cutStyles.sectionTitle}>{stageName === "Corte" ? "Curva a cortar" : `Curva a ${stageName === "Bordado" ? "bordar" : "estampar"}`}</h2>
          <div className={cutStyles.sizeGrid}>
            {sizes.map((size) => (
              <div className={cutStyles.sizeCell} key={size.id}>
                <span className={cutStyles.sizeLabel}>{size.label}</span>
                <strong className={cutStyles.sizeValue}>{size.quantityRequested}</strong>
              </div>
            ))}
            <div className={`${cutStyles.sizeCell} ${cutStyles.totalCell}`}>
              <span className={cutStyles.sizeLabel}>Total</span>
              <strong className={`${cutStyles.sizeValue} ${cutStyles.totalValue}`}>{totalQuantity}</strong>
            </div>
          </div>
        </section> : null}
        {stageName !== "Corte" ? <DecorationWorkPanel order={order} parts={parts.filter(item => !partIsHistorical(item.status))} stageName={stageName} sizes={sizes} token={token} onSaved={onSaved} onFinished={() => window.location.assign("/ordenes")} /> : <section className={cutStyles.fabricList} aria-label="Telas a cortar">
          {fabrics.map((fabric) => {
            const fabricLoads = cutLoads.filter((load) => loadMatchesFabric(load, fabric));
            const fabricTotal = totalCutQuantity(fabricLoads);
            return (
              <article className={cutStyles.fabricRow} key={`${fabric.useType}-${fabric.fabric.id}`}>
                <div>
                  <span className={cutStyles.fabricKind}>Tela {fabric.useType === "PRIMARIA" ? "principal" : "complementaria"}</span>
                  <div className={cutStyles.fabricName}>{fabric.fabric.name}</div>
                  <div className={cutStyles.fabricMeta}>{fabric.fabric.color ?? fabric.fabric.code} · {fabricTotal} / {part?.quantity ?? totalQuantity} prendas</div>
                </div>
                <button className={cutStyles.actionButton} type="button" onClick={() => setShowWorkPanel(true)}>
                  <span className={cutStyles.scissorIcon} aria-hidden="true" />
                  {fabricLoads.length > 0 ? "+ Lote" : "Cargar lotes"}
                </button>
              </article>
            );
          })}
        </section>}
        {showWorkPanel && part && stageName === "Corte" ? (
          <section className={detail.sectorWorkBody}>
            <StageWorkPanel stageName="Corte" parts={parts} sizes={sizes} token={token} onSaved={onSaved} order={order} fabricStock={fabricStock} sectorMode />
          </section>
        ) : null}
      </section>
    </main>
  );
}

function SectorOrderDetail({
  order,
  stageName,
  sizes,
  token,
  userFullName,
  topSearch,
  setTopSearch,
  onSearchSubmit,
  onSaved,
  fabricStock,
}: {
  order: OrderSummary;
  stageName: "Corte" | "Bordado" | "Estampado";
  sizes: Array<{ id: number; label: string; quantityRequested: number }>;
  token: string;
  userFullName: string;
  topSearch: string;
  setTopSearch: (value: string) => void;
  onSearchSubmit: (target: string) => void;
  onSaved: () => Promise<void>;
  fabricStock: Record<string, FabricStockDetail>;
}) {
  return <CutSectorOrderDetail order={order} stageName={stageName} sizes={sizes} token={token} userFullName={userFullName} topSearch={topSearch} setTopSearch={setTopSearch} onSearchSubmit={onSearchSubmit} onSaved={onSaved} fabricStock={fabricStock} />;
}

function StageWorkPanel({
  stageName,
  parts,
  sizes,
  token,
  onSaved,
  order,
  fabricStock,
  sectorMode = false,
}: {
  stageName: string;
  parts: PartNode[];
  sizes: Array<{ id: number; label: string; quantityRequested: number }>;
  token: string;
  onSaved: () => Promise<void>;
  order: OrderSummary;
  fabricStock: Record<string, FabricStockDetail>;
  sectorMode?: boolean;
}) {
  const stageInfo = stageSelectionInfo(stageName, parts);
  const selectedParts = parts.filter((part) => stageInfo.state !== "todo" || partHasStage(part, stageName));
  const [openPartId, setOpenPartId] = useState<string | null>(null);
  const [curveQuantity, setCurveQuantity] = useState<Record<string, Record<number, string>>>({});
  const [cutDrafts, setCutDrafts] = useState<Record<string, CutDraft[]>>({});
  const [decorationWorkDate, setDecorationWorkDate] = useState<Record<string, string>>({});
  const [supplyQuantity, setSupplyQuantity] = useState<Record<string, string>>({});
  const [shortageReason, setShortageReason] = useState<Record<string, string>>({});
  const [confirmCompletion, setConfirmCompletion] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOpenPartId(null);
    setConfirmCompletion(false);
    setMessage("");
  }, [stageName]);

  if (stageName === "Bordado" || stageName === "Estampado") {
    return <DecorationWorkPanel order={order} parts={parts.filter(item => !partIsHistorical(item.status))} stageName={stageName} sizes={sizes} token={token} onSaved={onSaved} />;
  }

  if (!stageInfo.canOpen) {
    return null;
  }

  if (selectedParts.length > 1 && selectedParts.some((part) => activeEventForStage(part, stageName))) {
    return null;
  }

  const part = selectedParts.find((item) => activeEventForStage(item, stageName)) ?? selectedParts[0];
  if (!part) return null;

  const active = activeEventForStage(part, stageName);
  const completed = completedEventsForStage(part, stageName);
  const latestCompleted = completed[completed.length - 1];
  const referenceEvent = active ?? latestCompleted ?? part.events?.find((event) => event.stage?.name && stageOrderIndex(event.stage.name) > productionStages.indexOf(stageName));
  const isActive = Boolean(active);
  const isDecorationStage = isDecorationStageName(stageName);
  const isCompleted = !isActive && (stageInfo.state === "done" || completed.length > 0 || (isDecorationStage && decorationStageComplete(part, stageName)));
  const canLoadCurve = isActive && curveLoadStages.has(stageName);
  const canLoadSupplies = isActive && isSupplyStageName(stageName);
  const allocation = stageName === 'Corte' ? cutAllocation(part, sizes) : isDecorationStage ? decorationAllocation(part, stageName, sizes) : allocatePartSizes(sizes, part.quantity);
  const targetTotal = allocation.reduce((sum, item) => sum + item.maxQuantity, 0);
  const cutFabrics = orderFabrics(order);
  const primaryFabric = cutFabrics.find((item) => item.useType === 'PRIMARIA') ?? cutFabrics[0];
  const values = curveQuantity[part.id] ?? {};
  const drafts = stageName === "Corte" ? currentCutDrafts(part, cutDrafts, primaryFabric) : [];
  const loadedTotal = stageName === "Corte" ? drafts.filter((draft) => draft.fabricUseType === 'PRIMARIA').reduce((sum, draft) => sum + draftTotal(draft), 0) : allocation.reduce((sum, item) => sum + Number(values[item.id] || 0), 0);
  const completeLoad = loadedTotal === targetTotal && targetTotal > 0;
  const partialLoad = loadedTotal > 0 && loadedTotal < targetTotal;
  const hasCutLoads = (part.cutLoads ?? []).length > 0;
  const hasDecorationLoads = isDecorationStage && (part.decorationLoads ?? []).some((load) => matchingStageName(load.stageEvent?.stage?.name ?? '') === stageName);
  const curveActionLabel = stageName === "Corte"
    ? hasCutLoads ? "+ Lote" : "Cargar lotes"
    : hasDecorationLoads ? "+ Carga" : `Cargar ${stageName.toLowerCase()}`;

  async function submitCurve(confirmedCompletion = false) {
    if (completeLoad && !confirmedCompletion) {
      setConfirmCompletion(true);
      return;
    }
    if (loadedTotal <= 0) {
      setMessage("Cargá al menos una cantidad por talle.");
      return;
    }
    if (loadedTotal > targetTotal) {
      setMessage(`La carga supera las ${targetTotal} prendas permitidas para esta etapa.`);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      let stageFinished = false;
      if (stageName === "Corte") {
        for (const draft of drafts.filter((item) => draftTotal(item) > 0)) {
          const draftAllocation = draft.fabricUseType === 'PRIMARIA' ? allocation : allocatePartSizes(sizes, part.quantity);
          const overSize = draftAllocation.find((item) => Number(draft.quantities[item.id] || 0) > item.maxQuantity);
          if (overSize) throw new Error(`No podés cargar más de ${overSize.maxQuantity} en talle ${overSize.label}.`);
          const selectedRoll = selectedFabricRoll(draft, fabricStock);
          if (draft.fabricQuantity && selectedRoll && Number(draft.fabricQuantity) > selectedRoll.currentQuantity) {
            throw new Error(`El consumo supera lo disponible en el rollo ${selectedRoll.code}.`);
          }
          const response = await createCutLoad(token, part.id, {
            lotCode: draft.lotCode.trim() || `Lote ${(part.cutLoads?.length ?? 0) + 1}`,
            fabricRollId: draft.fabricRollId || undefined,
            fabricQuantity: draft.fabricQuantity ? Number(draft.fabricQuantity) : undefined,
            fabricUseType: draft.fabricUseType,
            items: draftAllocation.map((item) => ({ sizeCurveValueId: item.id, quantity: Number(draft.quantities[item.id] || 0) })),
          });
          stageFinished = response.stageFinished;
        }
      } else {
        const overSize = allocation.find((item) => Number(values[item.id] || 0) > item.maxQuantity);
        if (overSize) throw new Error(`No podés cargar más de ${overSize.maxQuantity} en talle ${overSize.label}.`);
        const items = allocation.map((item) => ({ sizeCurveValueId: item.id, quantity: Number(values[item.id] || 0) }));
        const result = isDecorationStage
          ? await createDecorationLoad(token, part.id, {
            workDate: decorationWorkDate[part.id] || todayInputValue(),
            items,
          })
          : await recordStageProgress(token, part.id, {
            quantityDone: loadedTotal,
            note: allocation.map((item) => `${item.label}: ${Number(values[item.id] || 0)}`).join(" · "),
          });
        stageFinished = result.stageFinished;
      }
      setCurveQuantity((current) => ({ ...current, [part.id]: {} }));
      setCutDrafts((current) => ({ ...current, [part.id]: [] }));
      setDecorationWorkDate((current) => ({ ...current, [part.id]: todayInputValue() }));
      setOpenPartId(null);
      setConfirmCompletion(false);
      setMessage(stageFinished ? "Etapa finalizada." : `Carga parcial registrada (${loadedTotal}/${targetTotal}).`);
      await onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo registrar la carga");
    } finally {
      setSaving(false);
    }
  }

  async function submitSupplies() {
    const supplies = (part.supplies ?? []).map((item) => ({
      partSupplyId: item.id,
      quantityPrepared: Number(supplyQuantity[item.id] ?? 0),
      shortageReason: shortageReason[item.id] || undefined,
      note: item.note ?? undefined,
    })).filter((item) => item.quantityPrepared > 0 || item.shortageReason);
    if (supplies.length === 0) {
      setMessage("Cargá al menos un avío o marcá un motivo de faltante.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await recordStageProgress(token, part.id, { supplies });
      setSupplyQuantity({});
      setShortageReason({});
      setOpenPartId(null);
      setMessage(result.stageFinished ? "Avíos completos. Etapa finalizada." : "Avíos actualizados.");
      await onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo registrar avíos");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={detail.stageInfoPanel}>
      <div className={detail.stageInfoHeader}>
        <div>
          <span className={detail.stageKicker}>{stageName}</span>
          <h3>{isActive ? "Trabajo en curso" : isCompleted ? "Etapa completada" : "Etapa seleccionada"}</h3>
        </div>
        <span className={stageBadgeClass(stageName, isActive, isCompleted)}>{stageBadgeLabel(stageName, isActive, isCompleted)}</span>
      </div>

      <div className={detail.stageInfoGrid}>
        <div>
          <span>Inicio</span>
          <strong>{referenceEvent?.startedAt ? formatDate(referenceEvent.startedAt) : isCompleted ? "Completado" : "Sin fecha"}</strong>
        </div>
        <div>
          <span>{isCompleted ? "Finalización" : "Finalización estimada"}</span>
          <strong>{isCompleted && referenceEvent?.finishedAt ? formatDate(referenceEvent.finishedAt) : referenceEvent?.estimatedFinishAt ? formatDate(referenceEvent.estimatedFinishAt) : "Sin fecha"}</strong>
        </div>
        <div>
          <span>Ubicación / taller</span>
          <strong>{referenceEvent?.workshop?.name ?? "Planta central"}</strong>
        </div>
      </div>


      {stageName === "Corte" ? (
        <CutLoadsSummary part={part} sizes={sizes} fabrics={orderFabrics(order)} />
      ) : isDecorationStage ? (
        <>
          {sectorMode ? <CutQuantitySummary part={part} sizes={sizes} /> : null}
          <DecorationLoadsSummary part={part} stageName={stageName} sizes={sizes} />
        </>
      ) : null}

      {message ? <p className={detail.stageMessage}>{message}</p> : null}

      {isActive && canLoadCurve ? (
        <button className={detail.inlineAddButton} type="button" onClick={() => setOpenPartId(openPartId === part.id ? null : part.id)}>
          {curveActionLabel}
        </button>
      ) : null}

      {isActive && canLoadSupplies ? (
        <button className={detail.stageActionButton} type="button" onClick={() => setOpenPartId(openPartId === part.id ? null : part.id)}>
          Cargar trabajo
        </button>
      ) : null}

      {openPartId === part.id && canLoadCurve ? (
        <div className={detail.modalBackdrop} role="presentation" onMouseDown={() => setOpenPartId(null)}>
          <div className={detail.workModal} role="dialog" aria-modal="true" aria-labelledby="stage-load-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={detail.curveLoadHeader}>
              <div>
                <span className={detail.modalKicker}>{order.externalCode || order.internalCode} / {stageName}</span>
                <strong id="stage-load-title">{stageName === "Corte" ? "Cargar corte" : `Cargar ${stageName.toLowerCase()}`}</strong>
                <p>{stageName === "Corte" ? "Registrá lotes, rollos y consumo." : "Registrá la carga por fecha y talle."}</p>
              </div>
              <span>{stageName === 'Corte' ? `Prendas faltantes de corte: ${Math.max(0, targetTotal - loadedTotal)}` : `${loadedTotal}/${targetTotal} prendas`}</span>
            </div>
            {stageName === "Corte" ? (
              <div className={detail.cutLotStack}>
                <CutFabricLotGroup
                  title="Lotes de corte"
                  fabric={primaryFabric}
                  drafts={drafts.filter((draft) => draft.fabricUseType === 'PRIMARIA')}
                  sizes={allocation}
                  fabricStock={fabricStock}
                  onChange={(draftId, next) => setCutDrafts((current) => ({
                    ...current,
                    [part.id]: drafts.map((item) => item.id === draftId ? { ...item, ...next } : item),
                  }))}
                  onQuantityChange={(draftId, sizeId, value) => setCutDrafts((current) => ({
                    ...current,
                    [part.id]: drafts.map((item) => item.id === draftId ? { ...item, quantities: { ...item.quantities, [sizeId]: value } } : item),
                  }))}
                  onAddLot={() => primaryFabric ? setCutDrafts((current) => ({ ...current, [part.id]: [...drafts, createCutDraft(nextCutDraftIndex(part, drafts, primaryFabric), primaryFabric)] })) : undefined}
                  onRemove={(draftId) => setCutDrafts((current) => ({ ...current, [part.id]: drafts.filter((item) => item.id !== draftId) }))}
                />
                {cutFabrics.some((item) => item.useType === 'COMPLEMENTO') ? (
                  <details className={detail.complementaryFabrics}>
                    <summary>Telas complementarias</summary>
                    {cutFabrics.filter((item) => item.useType === 'COMPLEMENTO').map((fabric) => (
                      <CutFabricLotGroup
                        key={fabric.fabric.id}
                        title={`${fabric.fabric.code} · ${fabric.fabric.name}`}
                        fabric={fabric}
                        drafts={drafts.filter((draft) => draft.fabricId === fabric.fabric.id)}
                        sizes={allocatePartSizes(sizes, part.quantity)}
                        fabricStock={fabricStock}
                        onChange={(draftId, next) => setCutDrafts((current) => ({
                          ...current,
                          [part.id]: drafts.map((item) => item.id === draftId ? { ...item, ...next } : item),
                        }))}
                        onQuantityChange={(draftId, sizeId, value) => setCutDrafts((current) => ({
                          ...current,
                          [part.id]: drafts.map((item) => item.id === draftId ? { ...item, quantities: { ...item.quantities, [sizeId]: value } } : item),
                        }))}
                        onAddLot={() => setCutDrafts((current) => ({ ...current, [part.id]: [...drafts, createCutDraft(nextCutDraftIndex(part, drafts, fabric), fabric)] }))}
                        onRemove={(draftId) => setCutDrafts((current) => ({ ...current, [part.id]: drafts.filter((item) => item.id !== draftId) }))}
                      />
                    ))}
                  </details>
                ) : null}
              </div>
            ) : isDecorationStage ? (
              <DecorationLoadEditor
                stageName={stageName}
                sizes={allocation}
                dateValue={decorationWorkDate[part.id] ?? todayInputValue()}
                values={values}
                onDateChange={(value) => setDecorationWorkDate((current) => ({ ...current, [part.id]: value }))}
                onQuantityChange={(sizeId, value) => setCurveQuantity((current) => ({
                  ...current,
                  [part.id]: { ...(current[part.id] ?? {}), [sizeId]: value },
                }))}
              />
            ) : null}
            {stageName !== "Corte" && !isDecorationStage ? (
              <div className={detail.curveLoadGrid}>
                {allocation.map((item) => (
                <label className={detail.curveLoadCell} key={item.id}>
                  <span>{item.label}</span>
                  <small>Máx. {item.maxQuantity}</small>
                  <input
                    type="number"
                    min="0"
                    max={item.maxQuantity}
                    value={values[item.id] ?? ""}
                    onChange={(event) => setCurveQuantity((current) => ({
                      ...current,
                      [part.id]: { ...(current[part.id] ?? {}), [item.id]: event.target.value },
                    }))}
                  />
                </label>
                ))}
              </div>
            ) : null}
            {isDecorationStage && targetTotal === 0 ? <p className={detail.stageNotice}>No hay corte cargado para tomar como base de esta etapa.</p> : null}
            {completeLoad ? <p className={detail.stageNotice}>Completaste {stageName}. Esta carga finaliza la etapa.</p> : null}
            {partialLoad ? <p className={detail.stageNotice}>La carga es parcial. Quedará registrada y la etapa seguirá abierta.</p> : null}
            <div className={detail.modalActions}>
              <button className={detail.secondaryButton} type="button" onClick={() => setOpenPartId(null)}>Cancelar</button>
              <button className={detail.stageActionButton} type="button" disabled={saving} onClick={() => void submitCurve()}>
                {completeLoad ? "Finalizar etapa" : "Cargar parcial"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmCompletion ? (
        <div className={detail.modalBackdrop} role="presentation" onMouseDown={() => setConfirmCompletion(false)}>
          <div className={detail.confirmModal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <span className={detail.stageKicker}>{stageName}</span>
            <h3>{stageName} completo</h3>
            <p>La carga cubre el total requerido. Podés cancelar y revisar, o finalizar la etapa ahora.</p>
            <div className={detail.modalActions}>
              <button className={detail.secondaryButton} type="button" onClick={() => setConfirmCompletion(false)}>Cancelar</button>
              <button className={detail.stageActionButton} type="button" disabled={saving} onClick={() => void submitCurve(true)}>Finalizar {stageName.toLowerCase()}</button>
            </div>
          </div>
        </div>
      ) : null}

      {openPartId === part.id && canLoadSupplies ? (
        <div className={detail.supplyLoadList}>
          {(part.supplies ?? []).map((item) => (
            <label className={detail.supplyLoadRow} key={item.id}>
              <span>{item.supply?.code ?? "AV"} · {item.supply?.name ?? "Avío"}</span>
              <input
                type="number"
                min="0"
                value={supplyQuantity[item.id] ?? ""}
                onChange={(event) => setSupplyQuantity((current) => ({ ...current, [item.id]: event.target.value }))}
                placeholder={`${item.quantityAvailable ?? 0}/${item.quantityNeeded ?? part.quantity}`}
              />
              <select
                value={shortageReason[item.id] ?? ""}
                onChange={(event) => setShortageReason((current) => ({ ...current, [item.id]: event.target.value }))}
              >
                <option value="">Sin faltante</option>
                <option value="PREPARACION_PENDIENTE">Preparación pendiente</option>
                <option value="STOCK_FALTANTE">Falta stock</option>
              </select>
            </label>
          ))}
          <button className={detail.stageActionButton} type="button" disabled={saving} onClick={() => void submitSupplies()}>Guardar avíos</button>
        </div>
      ) : null}
    </section>
  );
}




function CutFabricLotGroup({
  title,
  fabric,
  drafts,
  sizes,
  fabricStock,
  onChange,
  onQuantityChange,
  onAddLot,
  onRemove,
}: {
  title: string;
  fabric?: OrderFabricOption;
  drafts: CutDraft[];
  sizes: SizeAllocation[];
  fabricStock: Record<string, FabricStockDetail>;
  onChange: (draftId: string, next: Partial<CutDraft>) => void;
  onQuantityChange: (draftId: string, sizeId: number, value: string) => void;
  onAddLot: () => void;
  onRemove: (draftId: string) => void;
}) {
  if (!fabric) return null;
  return (
    <section className={detail.cutFabricGroup}>
      <div className={detail.cutFabricGroupHeader}>
        <strong>{title}</strong>
        <span>{fabric.fabric.code} · {fabric.fabric.name}</span>
      </div>
      <div className={detail.cutLotSheetWrap}>
        <table className={detail.cutLotSheet}>
          <thead>
            <tr>
              <th>Lote</th>
              {sizes.map((size) => <th key={size.id}>{size.label}</th>)}
              <th>Total</th>
              <th>Rollo</th>
              <th>Consumo · {fabric.fabric.consumptionUnit ?? fabricStock[fabric.fabric.id]?.fabric.consumptionUnit ?? 'm'}</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft, index) => (
              <CutLotRow
                key={draft.id}
                draft={draft}
                index={index}
                sizes={sizes}
                fabric={fabric}
                fabricStock={fabricStock}
                onChange={(next) => onChange(draft.id, next)}
                onQuantityChange={(sizeId, value) => onQuantityChange(draft.id, sizeId, value)}
                onRemove={drafts.length > 1 || fabric.useType === 'COMPLEMENTO' ? () => onRemove(draft.id) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>
      <button className={detail.linkActionButton} type="button" onClick={onAddLot}>+ Lote</button>
    </section>
  );
}

function CutLotRow({
  draft,
  index,
  sizes,
  fabric,
  fabricStock,
  onChange,
  onQuantityChange,
  onRemove,
}: {
  draft: CutDraft;
  index: number;
  sizes: SizeAllocation[];
  fabric: OrderFabricOption;
  fabricStock: Record<string, FabricStockDetail>;
  onChange: (next: Partial<CutDraft>) => void;
  onQuantityChange: (sizeId: number, value: string) => void;
  onRemove?: () => void;
}) {
  const rolls = fabricStock[fabric.fabric.id]?.rolls ?? [];
  const selectedRoll = rolls.find((roll) => roll.id === draft.fabricRollId);
  const unit = fabric.fabric.consumptionUnit ?? fabricStock[fabric.fabric.id]?.fabric.consumptionUnit ?? 'm';
  const total = draftTotal(draft);
  return (
    <tr>
      <td className={detail.cutLotNumberCell}>
        <input value={draft.lotCode} onChange={(event) => onChange({ lotCode: event.target.value })} placeholder={`Lote ${index + 1}`} aria-label={`Lote ${index + 1}`} />
      </td>
      {sizes.map((size) => (
        <td className={detail.cutLotQuantityCell} key={size.id}>
          <input type="number" min="0" max={size.maxQuantity} value={draft.quantities[size.id] ?? ""} onChange={(event) => onQuantityChange(size.id, event.target.value)} aria-label={`${size.label} lote ${index + 1}`} />
        </td>
      ))}
      <td className={detail.cutLotTotalCell}><strong>{total}</strong></td>
      <td className={detail.cutLotRollCell}>
        <select value={draft.fabricRollId} onChange={(event) => onChange({ fabricRollId: event.target.value, fabricQuantity: "" })} aria-label={`Rollo lote ${index + 1}`}>
          <option value="">Seleccionar rollo</option>
          {rolls.map((roll) => (
            <option key={roll.id} value={roll.id}>{roll.code} · {roll.lot} · queda {formatQuantity(roll.currentQuantity)} {unit}</option>
          ))}
        </select>
      </td>
      <td className={detail.cutLotConsumptionCell}>
        <div className={detail.consumptionInputWrap}>
          <input type="number" min="0" max={selectedRoll?.currentQuantity ?? undefined} value={draft.fabricQuantity} onChange={(event) => onChange({ fabricQuantity: event.target.value })} placeholder="0,00" aria-label={`Consumo lote ${index + 1}`} />
          <b>{unit}</b>
        </div>
      </td>
      <td className={detail.cutLotActionCell}>
        {onRemove ? <button className={detail.iconButton} type="button" onClick={onRemove} aria-label="Quitar lote">×</button> : null}
      </td>
    </tr>
  );
}

function DecorationLoadEditor({
  stageName,
  sizes,
  dateValue,
  values,
  onDateChange,
  onQuantityChange,
}: {
  stageName: string;
  sizes: SizeAllocation[];
  dateValue: string;
  values: Record<number, string>;
  onDateChange: (value: string) => void;
  onQuantityChange: (sizeId: number, value: string) => void;
}) {
  const total = sizes.reduce((sum, size) => sum + Number(values[size.id] || 0), 0);
  return (
    <section className={detail.loadEditorBlock}>
      <div className={detail.loadEditorTitle}>Cargas de {stageName.toLowerCase()}</div>
      <div className={detail.decorationLotLine}>
        <label className={detail.dateCell}>
          <span>Fecha</span>
          <input type="date" value={dateValue} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <div className={detail.cutCurveLine}>
          {sizes.map((size) => (
            <label className={detail.cutCurveLineCell} key={size.id}>
              <span>{size.label}</span>
              <input type="number" min="0" max={size.maxQuantity} value={values[size.id] ?? ""} onChange={(event) => onQuantityChange(size.id, event.target.value)} />
            </label>
          ))}
          <div className={`${detail.cutCurveLineCell} ${detail.cutCurveLineTotal}`}>
            <span>TOTAL</span>
            <strong>{total}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function CutQuantitySummary({ part, sizes }: { part: PartNode; sizes: Array<{ id: number; label: string; quantityRequested: number }> }) {
  const loads = (part.cutLoads ?? []).filter((load) => load.fabricUseType !== "COMPLEMENTO");
  if (loads.length === 0) return null;
  const totals = new Map<number, number>();
  loads.forEach((load) => {
    load.items?.forEach((item) => totals.set(item.sizeCurveValue.id, (totals.get(item.sizeCurveValue.id) ?? 0) + item.quantity));
  });
  const total = totalCutQuantity(loads);
  return (
    <div className={detail.cutSummary}>
      <div className={detail.loadsTitleRow}>
        <strong>Lotes de corte</strong>
        <span>Total cortado {total} prendas</span>
      </div>
      <div className={detail.cutSummarySheetWrap}>
        <table className={`${detail.cutSummarySheet} ${detail.quantityOnlySheet}`}>
          <thead>
            <tr>
              <th>Lote</th>
              {sizes.map((size) => <th key={size.id}>{size.label}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load, index) => {
              const bySize = new Map(load.items?.map((item) => [item.sizeCurveValue.id, item.quantity]) ?? []);
              const loadTotal = Array.from(bySize.values()).reduce((sum, value) => sum + value, 0);
              return (
                <tr key={load.id}>
                  <th scope="row">{String(index + 1).padStart(2, "0")}</th>
                  {sizes.map((size) => <td key={size.id}>{bySize.get(size.id) ?? 0}</td>)}
                  <td className={detail.cutSummaryTotalCell}>{loadTotal}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {sizes.map((size) => <td key={size.id}>{totals.get(size.id) ?? 0}</td>)}
              <td className={detail.cutSummaryTotalCell}>{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DecorationLoadsSummary({ part, stageName, sizes }: { part: PartNode; stageName: string; sizes: Array<{ id: number; label: string; quantityRequested: number }> }) {
  const loads = (part.decorationLoads ?? []).filter((load) => matchingStageName(load.stageEvent?.stage?.name ?? '') === stageName);
  if (loads.length === 0) return null;
  const totals = new Map<number, number>();
  loads.forEach((load) => {
    load.items?.forEach((item) => totals.set(item.sizeCurveValue.id, (totals.get(item.sizeCurveValue.id) ?? 0) + item.quantity));
  });
  const cutTotals = cutTotalsBySize(part);
  const cutTotal = Array.from(cutTotals.values()).reduce((sum, value) => sum + value, 0);
  const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  return (
    <div className={detail.cutSummary}>
      <div className={detail.loadsTitleRow}>
        <strong>Cargas de {stageName.toLowerCase()}</strong>
        <span>Pendientes {Math.max(0, cutTotal - total)} prendas</span>
      </div>
      <div className={detail.cutSummarySheetWrap}>
        <table className={detail.cutSummarySheet}>
          <thead>
            <tr>
              <th>Fecha</th>
              {sizes.map((size) => <th key={size.id}>{size.label}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => {
              const bySize = new Map(load.items?.map((item) => [item.sizeCurveValue.id, item.quantity]) ?? []);
              const loadTotal = Array.from(bySize.values()).reduce((sum, value) => sum + value, 0);
              return (
                <tr key={load.id}>
                  <th scope="row">{formatDate(load.workDate)}</th>
                  {sizes.map((size) => <td key={size.id}>{bySize.get(size.id) ?? 0}</td>)}
                  <td className={detail.cutSummaryTotalCell}>{loadTotal}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {sizes.map((size) => <td key={size.id}>{totals.get(size.id) ?? 0}</td>)}
              <td className={detail.cutSummaryTotalCell}>{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CutLoadsSummary({ part, sizes, fabrics }: { part: PartNode; sizes: Array<{ id: number; label: string; quantityRequested: number }>; fabrics: OrderFabricOption[] }) {
  const loads = part.cutLoads ?? [];
  if (loads.length === 0) return null;
  const primaryTotal = totalCutQuantity(loads.filter((load) => load.fabricUseType !== "COMPLEMENTO"));
  return (
    <div className={detail.cutSummary}>
      <div className={detail.loadsTitleRow}>
        <strong>Lotes de corte</strong>
        <span>Pendientes {Math.max(0, part.quantity - primaryTotal)} prendas</span>
      </div>
      {fabrics.map((fabric) => {
        const fabricLoads = loads.filter((load) => loadMatchesFabric(load, fabric));
        if (fabricLoads.length === 0) return null;
        const fabricTotal = totalCutQuantity(fabricLoads);
        const finished = fabricTotal >= part.quantity;
        const lotCount = fabricLoads.length;
        return (
          <section className={detail.cutFabricSummaryGroup} key={`${fabric.useType}-${fabric.fabric.id}`}>
            <div className={detail.cutFabricSummaryHeader}>
              <div>
                <span>{fabric.useType === "PRIMARIA" ? "Tela principal" : "Tela complementaria"}</span>
                <strong>{fabric.fabric.name}</strong>
                <small>{fabric.fabric.color ?? fabric.fabric.code} · {fabricTotal} / {part.quantity} prendas</small>
              </div>
              <b>{finished ? "Corte finalizado" : "Corte parcial"} · {lotCount} {lotCount === 1 ? "lote" : "lotes"}</b>
            </div>
            <CutLoadSheet loads={fabricLoads} sizes={sizes} unit={fabric.fabric.consumptionUnit ?? "m"} />
          </section>
        );
      })}
    </div>
  );
}

function CutLoadSheet({ loads, sizes, unit }: { loads: NonNullable<PartNode["cutLoads"]>; sizes: Array<{ id: number; label: string; quantityRequested: number }>; unit: string }) {
  const totals = new Map<number, number>();
  loads.forEach((load) => {
    load.items?.forEach((item) => totals.set(item.sizeCurveValue.id, (totals.get(item.sizeCurveValue.id) ?? 0) + item.quantity));
  });
  const total = totalCutQuantity(loads);
  const totalConsumption = loads.reduce((sum, load) => sum + Number(load.fabricQuantity ?? 0), 0);
  return (
    <div className={detail.cutSummarySheetWrap}>
      <table className={detail.cutSummarySheet}>
        <thead>
          <tr>
            <th>Lote</th>
            {sizes.map((size) => <th key={size.id}>{size.label}</th>)}
            <th>Total</th>
            <th>Rollo</th>
            <th>Consumo</th>
          </tr>
        </thead>
        <tbody>
          {loads.map((load, index) => {
            const bySize = new Map(load.items?.map((item) => [item.sizeCurveValue.id, item.quantity]) ?? []);
            const loadTotal = Array.from(bySize.values()).reduce((sum, value) => sum + value, 0);
            return (
              <tr key={load.id}>
                <th scope="row">{String(index + 1).padStart(2, "0")}</th>
                {sizes.map((size) => <td key={size.id}>{bySize.get(size.id) ?? 0}</td>)}
                <td className={detail.cutSummaryTotalCell}>{loadTotal}</td>
                <td className={detail.cutSummaryRollCell}>{formatRollLabel(load)}</td>
                <td className={detail.cutSummaryConsumptionCell}>{formatUnitQuantity(Number(load.fabricQuantity ?? 0), load.fabricUnit ?? unit)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {sizes.map((size) => <td key={size.id}>{totals.get(size.id) ?? 0}</td>)}
            <td className={detail.cutSummaryTotalCell}>{total}</td>
            <td>--</td>
            <td className={detail.cutSummaryConsumptionCell}>{formatUnitQuantity(totalConsumption, unit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

type SizeAllocation = { id: number; label: string; maxQuantity: number };

const curveLoadStages = new Set(["Corte", "Bordado", "Estampado", "Atraque"]);

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

function SupplyList({ title, supplies, total }: { title: string; supplies: SupplyView[]; total: number }) {
  return (
    <div className={detail.supplyGroup}>
      <h3 className={detail.supplyGroupTitle}>{title}</h3>
      {supplies.length === 0 ? (
        <p className={detail.emptySupplyText}>Sin avíos cargados.</p>
      ) : (
        <div className={detail.supplyList}>
          {supplies.map((supply) => (
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
      )}
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


type OrderFabricOption = { kind: "Principal" | "Complementaria"; useType: "PRIMARIA" | "COMPLEMENTO"; fabric: NonNullable<OrderSummary["fabric"]> };

function orderFabrics(order: OrderSummary): OrderFabricOption[] {
  const items: OrderFabricOption[] = [];
  const seen = new Set<string>();
  if (order.fabric) {
    items.push({ kind: "Principal", useType: "PRIMARIA", fabric: order.fabric });
    seen.add(order.fabric.id);
  }
  order.requestedItems.forEach((item) => {
    if (item.fabric && !seen.has(item.fabric.id)) {
      const useType = item.useType ?? (items.length === 0 ? "PRIMARIA" : "COMPLEMENTO");
      items.push({ kind: useType === "PRIMARIA" ? "Principal" : "Complementaria", useType, fabric: item.fabric });
      seen.add(item.fabric.id);
    }
  });
  return items;
}

function createCutDraft(index: number, fabric?: OrderFabricOption): CutDraft {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    lotCode: `Lote ${index + 1}`,
    fabricId: fabric?.fabric.id ?? "",
    fabricUseType: fabric?.useType ?? "PRIMARIA",
    fabricRollId: "",
    fabricQuantity: "",
    quantities: {},
  };
}

function nextCutDraftIndex(part: PartNode, drafts: CutDraft[], fabric: OrderFabricOption): number {
  const savedLots = (part.cutLoads ?? []).filter((load) => {
    const sameUseType = load.fabricUseType === fabric.useType;
    const sameFabric = cutLoadFabricId(load) ? cutLoadFabricId(load) === fabric.fabric.id : true;
    return sameUseType && sameFabric;
  }).length;
  const draftLots = drafts.filter((draft) => draft.fabricId === fabric.fabric.id && draft.fabricUseType === fabric.useType).length;
  return savedLots + draftLots;
}

function currentCutDrafts(part: PartNode, drafts: Record<string, CutDraft[]>, primaryFabric?: OrderFabricOption): CutDraft[] {
  const current = drafts[part.id];
  return current && current.length > 0 ? current : [createCutDraft((part.cutLoads?.filter((load) => load.fabricUseType !== "COMPLEMENTO").length ?? 0), primaryFabric)];
}

function draftTotal(draft: CutDraft): number {
  return Object.values(draft.quantities).reduce((sum, value) => sum + Number(value || 0), 0);
}

function selectedFabricRoll(draft: CutDraft, fabricStock: Record<string, FabricStockDetail>) {
  return fabricStock[draft.fabricId]?.rolls.find((roll) => roll.id === draft.fabricRollId);
}

function cutLoadFabricId(load: NonNullable<PartNode["cutLoads"]>[number]): string | undefined {
  return load.fabricRoll?.fabric?.id ?? load.fabricRoll?.entry?.fabric?.id;
}

function loadMatchesFabric(load: NonNullable<PartNode["cutLoads"]>[number], fabric: OrderFabricOption): boolean {
  const fabricId = cutLoadFabricId(load);
  if (fabricId) return fabricId === fabric.fabric.id;
  return (load.fabricUseType ?? "PRIMARIA") === fabric.useType;
}

function totalCutQuantity(loads: NonNullable<PartNode["cutLoads"]>): number {
  return loads.reduce((sum, load) => sum + (load.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) ?? 0), 0);
}

function formatRollLabel(load: NonNullable<PartNode["cutLoads"]>[number]): string {
  if (!load.fabricRoll) return "Rollo pendiente";
  return [load.fabricRoll.code, load.fabricRoll.lot].filter(Boolean).join(" · ");
}

function cutFabricConsumption(parts: PartNode[], fabric: OrderFabricOption) {
  const loads = parts.flatMap((part) => part.cutLoads ?? []).filter((load) => loadMatchesFabric(load, fabric));
  const consumedTotal = loads.reduce((sum, load) => sum + Number(load.fabricQuantity ?? 0), 0);
  const garmentTotal = parts.filter((part) => !partIsHistorical(part.status)).reduce((sum, part) => sum + part.quantity, 0);
  const unit = fabric.fabric.consumptionUnit ?? "m";
  const expectedPerGarment = consumedTotal > 0 && garmentTotal > 0 ? consumedTotal / garmentTotal : 0;
  return {
    fabric,
    unit,
    consumedTotal,
    expectedTotal: consumedTotal,
    expectedPerGarment,
    actualPerGarment: expectedPerGarment,
  };
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

function matchingStageName(value: string): string {
  return productionStages.find((stage) => value.toLowerCase().includes(stage.toLowerCase())) ?? value;
}

function activeEventForStage(part: PartNode, stageName: string) {
  return part.events?.find((event) => !event.finishedAt && event.stage?.name && matchingStageName(event.stage.name) === stageName);
}

function completedEventsForStage(part: PartNode, stageName: string) {
  return part.events?.filter((event) => event.finishedAt && event.stage?.name && matchingStageName(event.stage.name) === stageName) ?? [];
}

function partHasStage(part: PartNode, stageName: string): boolean {
  return Boolean(activeEventForStage(part, stageName)) || completedEventsForStage(part, stageName).length > 0 || matchingStageName(part.currentStage?.name ?? "") === stageName;
}

function sectorStageForCurrentSession(): "Corte" | "Bordado" | "Estampado" | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("proma-session");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LoginResponse;
    if (parsed.user.role === "ADMIN") return null;
    const visibleSectors = (parsed.user.permissions ?? [])
      .filter((permission) => permission.isAllowed && permission.action === "VER" && permission.sectorCode)
      .map((permission) => permission.sectorCode);
    if (visibleSectors.length !== 1) return null;
    if (visibleSectors[0] === "CORTE") return "Corte";
    if (visibleSectors[0] === "BORDADO") return "Bordado";
    if (visibleSectors[0] === "ESTAMPADO") return "Estampado";
    return null;
  } catch {
    return null;
  }
}

function stagePartsForDisplay(stage: string, allParts: PartNode[], activeParts: PartNode[]): PartNode[] {
  const withHistory = allParts
    .filter((part) => partHasStage(part, stage))
    .sort((a, b) => a.partCode.localeCompare(b.partCode));
  if (withHistory.length > 0) return withHistory;
  return activeParts;
}

function decorationLocation(articleCode: string, garmentPart?: string): string {
  if (garmentPart) return garmentPart;
  if (articleCode.toUpperCase().includes('PANTALON')) return 'Pierna';
  return 'Delantero';
}

function stageSelectionInfo(stage: string, parts: PartNode[]): { state: "done" | "current" | "todo"; canOpen: boolean } {
  const state = stageState(stage, parts);
  const hasHistory = parts.some((part) => partHasStage(part, stage));
  return { state, canOpen: state !== "todo" || hasHistory };
}

function stageAccess(stage: string, parts: PartNode[]): { state: "done" | "current" | "todo"; canOpen: boolean } {
  return stageSelectionInfo(stage, parts);
}

function stageOrderIndex(value: string): number {
  const matched = matchingStageName(value);
  const index = productionStages.indexOf(matched);
  return index < 0 ? Number.POSITIVE_INFINITY : index;
}

function stageBadgeLabel(stageName: string, isActive: boolean, isCompleted: boolean): string {
  if (isCompleted) return "Completo";
  if (!isActive) return "Pendiente";
  if (stageName === "Bordado") return "Atrasada";
  if (stageName === "Estampado") return "En riesgo";
  return "A tiempo";
}

function stageBadgeClass(stageName: string, isActive: boolean, isCompleted: boolean): string {
  if (isCompleted) return `${detail.statusBadge}`;
  if (!isActive) return `${detail.statusBadge} ${detail.warningBadge}`;
  if (stageName === "Bordado") return `${detail.statusBadge} ${detail.dangerBadge}`;
  if (stageName === "Estampado") return `${detail.statusBadge} ${detail.warningBadge}`;
  return detail.statusBadge;
}

function isSupplyStageName(stageName: string): boolean {
  return stageName.toLowerCase().includes("avíos") || stageName.toLowerCase().includes("avios");
}


function isDecorationStageName(stageName: string): boolean {
  return stageName === "Bordado" || stageName === "Estampado";
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function cutTotalsBySize(part: PartNode): Map<number, number> {
  const totals = new Map<number, number>();
  part.cutLoads?.filter((load) => load.fabricUseType !== "COMPLEMENTO").forEach((load) => {
    load.items?.forEach((item) => totals.set(item.sizeCurveValue.id, (totals.get(item.sizeCurveValue.id) ?? 0) + item.quantity));
  });
  return totals;
}

function cutAllocation(part: PartNode, sizes: Array<{ id: number; label: string; quantityRequested: number }>): SizeAllocation[] {
  const expected = allocatePartSizes(sizes, part.quantity);
  const cutTotals = cutTotalsBySize(part);
  return expected.map((size) => ({
    ...size,
    maxQuantity: Math.max(0, size.maxQuantity - (cutTotals.get(size.id) ?? 0)),
  }));
}

function decorationTotalsByStage(part: PartNode, stageName: string): Map<number, number> {
  const totals = new Map<number, number>();
  part.decorationLoads?.filter((load) => matchingStageName(load.stageEvent?.stage?.name ?? '') === stageName).forEach((load) => {
    load.items?.forEach((item) => totals.set(item.sizeCurveValue.id, (totals.get(item.sizeCurveValue.id) ?? 0) + item.quantity));
  });
  return totals;
}

function decorationAllocation(part: PartNode, stageName: string, sizes: Array<{ id: number; label: string; quantityRequested: number }>): SizeAllocation[] {
  const cutTotals = cutTotalsBySize(part);
  const doneTotals = decorationTotalsByStage(part, stageName);
  return sizes.map((size) => ({
    id: size.id,
    label: size.label,
    maxQuantity: Math.max(0, (cutTotals.get(size.id) ?? 0) - (doneTotals.get(size.id) ?? 0)),
  }));
}

function decorationStageComplete(part: PartNode, stageName: string): boolean {
  const cutTotals = cutTotalsBySize(part);
  const cutTotal = Array.from(cutTotals.values()).reduce((sum, value) => sum + value, 0);
  if (cutTotal <= 0) return false;
  const doneTotals = decorationTotalsByStage(part, stageName);
  const doneTotal = Array.from(doneTotals.values()).reduce((sum, value) => sum + value, 0);
  return doneTotal >= cutTotal;
}

function allocatePartSizes(sizes: Array<{ id: number; label: string; quantityRequested: number }>, partQuantity: number): SizeAllocation[] {
  const total = sizes.reduce((sum, item) => sum + item.quantityRequested, 0);
  if (total <= 0) return sizes.map((item) => ({ id: item.id, label: item.label, maxQuantity: 0 }));
  const base = sizes.map((item) => {
    const exact = (item.quantityRequested / total) * partQuantity;
    return { id: item.id, label: item.label, maxQuantity: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = partQuantity - base.reduce((sum, item) => sum + item.maxQuantity, 0);
  base.slice().sort((a, b) => b.remainder - a.remainder).forEach((item) => {
    if (remaining > 0) {
      const target = base.find((entry) => entry.id === item.id);
      if (target) target.maxQuantity += 1;
      remaining -= 1;
    }
  });
  return base.map(({ id, label, maxQuantity }) => ({ id, label, maxQuantity }));
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
  const relevantParts = parts.filter((part) => partHasStage(part, stage));
  if (relevantParts.length > 0 && relevantParts.every((part) => completedEventsForStage(part, stage).length > 0 || stageOrderIndex(part.currentStage?.name ?? '') > stageIndex)) {
    if (isDecorationStageName(stage) && !relevantParts.every((part) => decorationStageComplete(part, stage))) return "todo";
    return "done";
  }
  const currentIndexes = parts.map((part) => {
    const current = part.events?.find((event) => !event.finishedAt)?.stage?.name ?? part.currentStage?.name ?? "";
    return productionStages.findIndex((item) => current.toLowerCase().includes(item.toLowerCase()));
  });
  if (currentIndexes.some((index) => index === stageIndex)) return "current";
  if (currentIndexes.length > 0 && currentIndexes.every((index) => index > stageIndex)) return "done";
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

function formatUnitQuantity(value: number, unit: string): string {
  return `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(value)} ${unit}`;
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
