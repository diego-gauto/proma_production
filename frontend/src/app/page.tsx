"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/Button/Button";
import { Input } from "../components/ui/Input/Input";
import { Modal } from "../components/ui/Modal/Modal";
import { Select } from "../components/ui/Select/Select";
import { Table } from "../components/ui/Table/Table";
import { isUnauthorizedError, login, LoginResponse } from "../lib/api/client";
import {
  ArticleMaster,
  ClientMaster,
  createMaster,
  deleteMaster,
  FabricMaster,
  listMasters,
  MasterName,
  SizeCurveMaster,
  SupplyMaster,
  updateMaster,
  UserMaster,
  WorkshopMaster,
} from "../lib/api/masters.api";
import {
  createOrder,
  finishStage,
  getOrder,
  listOrders,
  listStages,
  markOrderRepair,
  OrderSummary,
  PartNode,
  recombineParts,
  resolveOrderRepair,
  splitPart,
  StageOption,
  startStage,
  updatePartSupply,
} from "../lib/api/orders.api";
import { formatList } from "../lib/formatters/master-formatters";
import styles from "./page.module.css";

type MasterItem =
  | ClientMaster
  | WorkshopMaster
  | ArticleMaster
  | FabricMaster
  | SupplyMaster
  | SizeCurveMaster
  | UserMaster;
type FormState = Record<string, string>;
type MainView = "orders" | "masters";
type OrderRow = {
  id: string;
  orderCode: string;
  createdDate: string;
  client: string;
  product: string;
  quantity: number;
  stage: string;
  stageEnteredAt: string;
  daysInStage: string;
  location: string;
  trafficLabel: string;
  trafficTone: "red" | "yellow" | "green";
  kind: "single" | "splitParent" | "splitChild";
  orderId: string;
};

const resources: {
  key: MasterName;
  label: string;
  singular: string;
  empty: string;
}[] = [
  { key: "clients", label: "Clientes", singular: "Cliente", empty: "Sin clientes cargados" },
  { key: "workshops", label: "Talleres", singular: "Taller", empty: "Sin talleres cargados" },
  { key: "fabrics", label: "Telas", singular: "Tela", empty: "Sin telas cargadas" },
  { key: "supplies", label: "Avios", singular: "Avio", empty: "Sin avios cargados" },
  { key: "size-curves", label: "Curvas", singular: "Curva", empty: "Sin curvas cargadas" },
  { key: "articles", label: "Articulos", singular: "Articulo", empty: "Sin articulos cargados" },
  { key: "users", label: "Usuarios", singular: "Usuario", empty: "Sin usuarios cargados" },
];


export default function Home() {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [mainView, setMainView] = useState<MainView>("orders");
  const [active, setActive] = useState<MasterName>("clients");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalItem, setModalItem] = useState<MasterItem | "new" | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const clearStoredSession = useCallback((message?: string) => {
    window.localStorage.removeItem("proma-session");
    setSession(null);
    setItems([]);
    setOrders([]);
    setModalItem(null);
    setIsOrderModalOpen(false);
    setSelectedOrderId(null);
    setError(message ?? "");
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("proma-session");
    if (!stored) {
      return;
    }

    try {
      setSession(JSON.parse(stored) as LoginResponse);
    } catch {
      clearStoredSession("La sesion guardada no es valida. Ingresá nuevamente.");
    }
  }, [clearStoredSession]);

  const activeResource = useMemo(
    () => resources.find((resource) => resource.key === active) ?? resources[0],
    [active],
  );

  const loadItems = useCallback(async (nextSearch = search) => {
    if (!session) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await listMasters<MasterItem>(
        active,
        session.accessToken,
        nextSearch,
      );
      setItems(result.items);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearStoredSession("La sesion vencio. Ingresá nuevamente.");
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudo cargar");
    } finally {
      setIsLoading(false);
    }
  }, [active, clearStoredSession, search, session]);

  useEffect(() => {
    if (session && mainView === "masters") {
      void loadItems();
    }
  }, [loadItems, mainView, session]);

  const loadOrders = useCallback(async (nextSearch = search) => {
    if (!session) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await listOrders(session.accessToken, nextSearch);
      setOrders(result.items);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearStoredSession("La sesion vencio. Ingresá nuevamente.");
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudieron cargar ordenes");
    } finally {
      setIsLoading(false);
    }
  }, [clearStoredSession, search, session]);

  useEffect(() => {
    if (session && mainView === "orders") {
      void loadOrders();
    }
  }, [loadOrders, mainView, session]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      const nextSession = await login(
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
      );
      setSession(nextSession);
      window.localStorage.setItem("proma-session", JSON.stringify(nextSession));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login invalido");
    }
  }

  function handleLogout() {
    clearStoredSession();
  }

  if (!session) {
    return (
      <main className={styles.loginPage}>
        <section className={styles.loginPanel}>
          <h1>Proma Production</h1>
          <p>Seguimiento de ordenes de corte y avance de produccion.</p>
          <form className={styles.form} onSubmit={handleLogin}>
            <Input label="Email" name="email" type="email" required />
            <Input label="Password" name="password" type="password" required />
            {error ? <p className={styles.error}>{error}</p> : null}
            <Button type="submit">Ingresar</Button>
          </form>
        </section>
      </main>
    );
  }

  const canManageCatalogs = session.user.role === "ADMIN" || Boolean(session.user.permissions?.some((permission) => permission.isAllowed && permission.action === "ADMINISTRAR"));
  const visibleResources = canManageCatalogs ? resources : [];

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>⚡</span>
          <span>Proma Produccion</span>
        </div>
        <button
          className={mainView === "orders" ? styles.navActive : ""}
          type="button"
          onClick={() => {
            setMainView("orders");
            setSearch("");
            setError("");
          }}
        >
          <span>▦</span>
          Ordenes de corte
        </button>
        {visibleResources.map((resource) => (
          <button
            key={resource.key}
            className={mainView === "masters" && active === resource.key ? styles.navActive : ""}
            type="button"
            onClick={() => {
              setMainView("masters");
              setActive(resource.key);
              setItems([]);
              setSearch("");
              setError("");
              setModalItem(null);
            }}
          >
            <span>{resourceIcon(resource.key)}</span>
            {resource.label}
          </button>
        ))}
        <div className={styles.sidebarFooter}>v0.3.0</div>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>{mainView === "orders" ? "Ordenes de corte" : activeResource.label}</h1>
            <p>
              {mainView === "orders"
                ? "Listado y alta de ordenes de corte."
                : "Configuracion disponible segun permisos del usuario."}
            </p>
          </div>
          <div className={styles.userBox}>
            <span>{session.user.fullName}</span>
            <small>{session.user.role}</small>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              Salir
            </Button>
          </div>
        </header>

        <section className={styles.toolbar}>
          <form
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              if (mainView === "orders") {
                void loadOrders();
              } else {
                void loadItems();
              }
            }}
          >
            <Input
              label="Buscar"
              name="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </form>
          <Button
            type="button"
            onClick={() => {
              if (mainView === "orders") {
                setIsOrderModalOpen(true);
              } else {
                setModalItem("new");
              }
            }}
          >
            {mainView === "orders"
              ? "Nueva orden de corte"
              : `Nuevo ${activeResource.singular}`}
          </Button>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {isLoading ? <p className={styles.status}>Cargando datos...</p> : null}

        {mainView === "orders" ? (
          <OrdersView orders={orders} onOpen={setSelectedOrderId} />
        ) : (
          <Table
            columns={buildColumns(
              active,
              setModalItem,
              session.accessToken,
              loadItems,
              setError,
            )}
            items={items}
            emptyText={activeResource.empty}
          />
        )}
      </section>

      {isOrderModalOpen ? (
        <OrderModal
          token={session.accessToken}
          onClose={() => setIsOrderModalOpen(false)}
          onSaved={() => {
            setIsOrderModalOpen(false);
            void loadOrders();
          }}
        />
      ) : null}

      {selectedOrderId ? (
        <OrderDetailModal
          orderId={selectedOrderId}
          token={session.accessToken}
          onClose={() => setSelectedOrderId(null)}
          onChanged={() => void loadOrders()}
        />
      ) : null}

      {modalItem ? (
        <MasterModal
          resource={active}
          item={modalItem === "new" ? null : modalItem}
          token={session.accessToken}
          onClose={() => setModalItem(null)}
          onSaved={() => {
            setModalItem(null);
            void loadItems();
          }}
        />
      ) : null}
    </main>
  );
}

function resourceIcon(resource: MasterName): string {
  const icons: Record<MasterName, string> = {
    clients: "▣",
    workshops: "▤",
    fabrics: "▥",
    supplies: "▧",
    "size-curves": "▨",
    articles: "▩",
    users: "●●",
  };
  return icons[resource];
}

function OrdersView({ orders, onOpen }: { orders: OrderSummary[]; onOpen: (orderId: string) => void }) {
  const rows = orders.flatMap((order) => buildOrderRows(order));

  return (
    <div className={styles.ordersTableWrap}>
      <table className={styles.ordersTable}>
        <colgroup>
          <col className={styles.colOrderCode} />
          <col className={styles.colDate} />
          <col className={styles.colClient} />
          <col className={styles.colProduct} />
          <col className={styles.colQuantity} />
          <col className={styles.colStage} />
          <col className={styles.colDate} />
          <col className={styles.colDays} />
          <col className={styles.colLocation} />
          <col className={styles.colStatus} />
        </colgroup>
        <thead>
          <tr>
            <th>OC</th>
            <th>Alta</th>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Sector</th>
            <th>Ingreso</th>
            <th>Dias</th>
            <th>Ubicacion</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className={styles.emptyState}>
                No hay ordenes de corte cargadas
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className={rowClassName(row.kind)} onClick={() => onOpen(row.orderId)} tabIndex={0}>
                <td>
                  <span className={styles.orderCode}>{row.orderCode}</span>
                </td>
                <td>{row.createdDate}</td>
                <td>{row.client}</td>
                <td>{row.product}</td>
                <td>{row.quantity}</td>
                <td>{row.stage}</td>
                <td>{row.stageEnteredAt}</td>
                <td>{row.daysInStage}</td>
                <td>{row.location}</td>
                <td>
                  <span
                    className={`${styles.statusPill} ${styles[`status${capitalize(row.trafficTone)}`]}`}
                  >
                    {row.trafficLabel}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function buildOrderRows(order: OrderSummary): OrderRow[] {
  const createdDate = formatDate(order.createdAt);
  const activeParts = order.parts.filter((part) => !partIsHistorical(part.status));
  const trackedParts = activeParts.length > 0 ? activeParts : order.parts;
  const rootPart = order.parts.find((part) => part.partCode === "P1") ?? order.parts[0];
  const visibleChildParts = activeParts.filter((part) => part.id !== rootPart?.id);
  const hasSplitParts = Boolean(rootPart && visibleChildParts.length > 0);

  if (hasSplitParts && rootPart) {
    return [
      {
        id: `${order.id}-split-parent`,
        orderCode: order.internalCode,
        createdDate,
        client: (order.client.businessName ?? order.client.name ?? "Sin cliente"),
        product: order.article.name,
        quantity: rootPart.quantity,
        stage: "Corte dividido",
        stageEnteredAt: `${visibleChildParts.length} partes`,
        daysInStage: "ramas",
        location: `${visibleChildParts.length} ubicaciones`,
        trafficLabel: "Dividida",
        trafficTone: "yellow",
        kind: "splitParent",
        orderId: order.id,
      },
      ...visibleChildParts.map((part, index) =>
        buildTrackedOrderRow(order, part, index, createdDate, "splitChild"),
      ),
    ];
  }

  return trackedParts.map((part, index) =>
    buildTrackedOrderRow(order, part, index, createdDate, "single"),
  );
}

function buildTrackedOrderRow(
  order: OrderSummary,
  part: OrderSummary["parts"][number],
  index: number,
  createdDate: string,
  kind: OrderRow["kind"],
): OrderRow {
  const tracking = buildPartTracking(part, order.status, order.createdAt);
  return {
    id: part.id,
    orderCode: kind === "splitChild"
      ? `${order.internalCode}-${String.fromCharCode(65 + index)}`
      : order.internalCode,
    createdDate,
    client: (order.client.businessName ?? order.client.name ?? "Sin cliente"),
    product: order.article.name,
    quantity: part.quantity,
    stage: tracking.stage,
    stageEnteredAt: tracking.stageEnteredAt,
    daysInStage: tracking.daysInStage,
    location: tracking.location,
    trafficLabel: tracking.trafficLabel,
    trafficTone: tracking.trafficTone,
    kind,
    orderId: order.id,
  };
}

function buildPartTracking(
  part: OrderSummary["parts"][number],
  orderStatus: string,
  orderCreatedAt: string,
): Omit<OrderRow, "id" | "orderCode" | "createdDate" | "client" | "product" | "quantity" | "kind" | "orderId"> {
  const events = [...(part.events ?? [])].sort((a, b) =>
    new Date(a.startedAt ?? a.finishedAt ?? 0).getTime() -
    new Date(b.startedAt ?? b.finishedAt ?? 0).getTime(),
  );
  const activeEvent =
    events.find((event) => !event.finishedAt) ?? events[events.length - 1] ?? null;
  const enteredAt = activeEvent?.startedAt ?? orderCreatedAt;
  const stageCode = activeEvent?.stage?.code ?? part.currentStage?.code ?? "CORTE";
  const stageName = activeEvent
    ? activeEvent.stage?.name ?? part.currentStage?.name ?? stageNameFromCode(stageCode)
    : "Esperando tela";
  const traffic = getTrafficStatus(orderStatus, part.status, activeEvent);

  return {
    stage: stageName,
    stageEnteredAt: formatDate(enteredAt),
    daysInStage: String(daysSince(enteredAt)),
    location: locationLabel(stageCode, activeEvent?.workshop?.name),
    trafficLabel: traffic.label ?? stateLabel(stageCode, Boolean(activeEvent)),
    trafficTone: traffic.tone,
  };
}

function getTrafficStatus(
  orderStatus: string,
  partStatus: string,
  activeEvent: NonNullable<OrderSummary["parts"][number]["events"]>[number] | null,
): { label?: string; tone: OrderRow["trafficTone"] } {
  if (orderStatus === "FINALIZADA" || partStatus === "FINALIZADA") {
    return { label: "Finalizada", tone: "green" };
  }
  if (!activeEvent) {
    return { label: "En espera", tone: "red" };
  }
  if (
    activeEvent.estimatedFinishAt &&
    new Date(activeEvent.estimatedFinishAt).getTime() < Date.now()
  ) {
    return { tone: "red" };
  }
  return { tone: "yellow" };
}

function partIsHistorical(status: string): boolean {
  return status === "DIVIDIDA" || status === "REINTEGRADA";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function daysSince(value: string): number {
  const elapsed = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(elapsed / 86_400_000));
}

function stageNameFromCode(code: string): string {
  const names: Record<string, string> = {
    CORTE: "Corte",
    BORDADO: "Bordado",
    ESTAMPADO: "Estampado",
    AVIOS_CONFECCION: "Avios confección",
    CONFECCION: "Confección",
    ATRAQUE: "Atraque",
    OJAL_BOTON: "Ojal y botón",
    AVIOS_TERMINACION: "Avios terminación",
    PLANCHA: "Plancha",
    TERMINACION: "Terminación",
  };
  return names[code] ?? code;
}

function stateLabel(code: string, hasStarted: boolean): string {
  if (!hasStarted) {
    return "En espera";
  }
  const labels: Record<string, string> = {
    CORTE: "Cortándose",
    BORDADO: "Bordándose",
    ESTAMPADO: "Estampándose",
    AVIOS_CONFECCION: "Preparando avíos",
    CONFECCION: "En confección",
    ATRAQUE: "En atraque",
    OJAL_BOTON: "En ojal y botón",
    AVIOS_TERMINACION: "Avíos terminación",
    PLANCHA: "En plancha",
    TERMINACION: "En depósito",
  };
  return labels[code] ?? "En curso";
}

function locationLabel(code: string, workshopName?: string): string {
  if (workshopName) {
    return workshopName;
  }
  const locations: Record<string, string> = {
    CORTE: "Galpón corte",
    BORDADO: "Sector bordado",
    ESTAMPADO: "Sector estampado",
    AVIOS_CONFECCION: "Depósito avíos",
    CONFECCION: "Taller interno",
    ATRAQUE: "Sector atraque",
    OJAL_BOTON: "Sector ojal/botón",
    AVIOS_TERMINACION: "Depósito avíos",
    PLANCHA: "Sector plancha",
    TERMINACION: "Depósito final",
  };
  return locations[code] ?? "Planta Promatex";
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("es-AR") + value.slice(1);
}

function rowClassName(kind: OrderRow["kind"]): string {
  if (kind === "splitParent") {
    return styles.splitParentRow;
  }
  if (kind === "splitChild") {
    return styles.childOrderRow;
  }
  return "";
}

function OrderModal({
  token,
  onClose,
  onSaved,
}: {
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clients, setClients] = useState<ClientMaster[]>([]);
  const [articles, setArticles] = useState<ArticleMaster[]>([]);
  const [curves, setCurves] = useState<SizeCurveMaster[]>([]);
  const [fabrics, setFabrics] = useState<FabricMaster[]>([]);
  const [form, setForm] = useState<FormState>({
    externalCode: "",
    clientId: "",
    articleId: "",
    sizeCurveId: "",
    fabricId: "",
    color: "",
  });
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      const [clientsResult, articlesResult, curvesResult, fabricsResult] =
        await Promise.all([
          listMasters<ClientMaster>("clients", token, ""),
          listMasters<ArticleMaster>("articles", token, ""),
          listMasters<SizeCurveMaster>("size-curves", token, ""),
          listMasters<FabricMaster>("fabrics", token, ""),
        ]);
      setClients(clientsResult.items);
      setArticles(articlesResult.items);
      setCurves(curvesResult.items);
      setFabrics(fabricsResult.items);
      const firstCurve = curvesResult.items[0];
      setForm((current) => ({
        ...current,
        clientId: current.clientId || clientsResult.items[0]?.id || "",
        articleId: current.articleId || articlesResult.items[0]?.id || "",
        sizeCurveId: current.sizeCurveId || String(firstCurve?.id ?? ""),
        fabricId: current.fabricId || fabricsResult.items[0]?.id || "",
      }));
    }

    void loadOptions().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar opciones");
    });
  }, [token]);

  function setValue(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setQuantity(sizeId: number, value: string) {
    setQuantities((current) => ({ ...current, [String(sizeId)]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const requestedItems = selectedCurve.values
      .map((value) => ({
        sizeCurveValueId: value.id,
        color: form.color || undefined,
        quantityRequested: Number(quantities[String(value.id)] || 0),
      }))
      .filter((item) => item.quantityRequested > 0);
    if (requestedItems.length === 0) {
      setError("Cargá al menos un talle con cantidad mayor a cero.");
      return;
    }
    if (!form.fabricId || !form.sizeCurveId) {
      setError("La tela y la curva son obligatorias.");
      return;
    }
    try {
      await createOrder(token, {
        externalCode: form.externalCode,
        clientId: form.clientId,
        articleId: form.articleId,
        fabricId: form.fabricId,
        sizeCurveId: Number(form.sizeCurveId),
        requestedItems,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la orden");
    }
  }

  const selectedCurve = curves.find((curve) => String(curve.id) === form.sizeCurveId) ?? curves[0] ?? { id: 0, name: "", sequenceType: "ALFABETICA", values: [] };
  const selectedArticle = articles.find((article) => article.id === form.articleId);

  return (
    <Modal title="Nueva orden de corte" onClose={onClose}>
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <div className={styles.compactGrid}>
          <Input label="Codigo externo" value={form.externalCode} onChange={(event) => setValue("externalCode", event.target.value)} required />
          <Select label="Cliente" value={form.clientId} onChange={(event) => setValue("clientId", event.target.value)} options={clients.map((client) => ({ label: client.businessName, value: client.id }))} />
          <Select label="Articulo" value={form.articleId} onChange={(event) => setValue("articleId", event.target.value)} options={articles.map((article) => ({ label: article.name, value: article.id }))} />
          <Select label="Tela" value={form.fabricId} onChange={(event) => setValue("fabricId", event.target.value)} options={fabrics.map((fabric) => ({ label: `${fabric.name}${fabric.color ? ` - ${fabric.color}` : ""}`, value: fabric.id }))} />
          <Select label="Curva" value={form.sizeCurveId} onChange={(event) => setValue("sizeCurveId", event.target.value)} options={curves.map((curve) => ({ label: curve.name, value: String(curve.id) }))} />
          <Input label="Color operativo" value={form.color} onChange={(event) => setValue("color", event.target.value)} />
        </div>
        <section className={styles.referencePanel}>
          <strong>Referencia del articulo</strong>
          <span>{formatList(selectedArticle?.supplies ?? [], (supply) => supply.supply?.name ?? supply.id, "Sin avios cargados")}</span>
          <span>{formatList(selectedArticle?.decorationParts ?? [], (part) => `${part.garmentPart}: ${part.decorationType}`, "Sin partes decorables")}</span>
        </section>
        <div className={styles.sizeGrid}>
          {selectedCurve.values.map((value) => (
            <Input
              key={value.id}
              label={value.label}
              type="number"
              min="0"
              value={quantities[String(value.id)] ?? ""}
              onChange={(event) => setQuantity(value.id, event.target.value)}
            />
          ))}
        </div>
        {clients.length === 0 || articles.length === 0 || selectedCurve.values.length === 0 || fabrics.length === 0 ? (
          <p className={styles.error}>
            Para crear una orden primero debe existir cliente, articulo, tela y curva con talles.
          </p>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={clients.length === 0 || articles.length === 0 || selectedCurve.values.length === 0 || fabrics.length === 0}
          >
            Crear orden
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function OrderDetailModal({
  orderId,
  token,
  onClose,
  onChanged,
}: {
  orderId: string;
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState("");
  const [splitPartId, setSplitPartId] = useState("");
  const [splitMode, setSplitMode] = useState<"LOTE" | "COMPONENTE">("LOTE");
  const [splitRows, setSplitRows] = useState("5|Lote A\n5|Lote B");
  const [componentIds, setComponentIds] = useState("");
  const [recombineQuantity, setRecombineQuantity] = useState("1");
  const [stages, setStages] = useState<StageOption[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopMaster[]>([]);
  const [stagePartId, setStagePartId] = useState("");
  const [stageId, setStageId] = useState("");
  const [executionType, setExecutionType] = useState<"INTERNO" | "EXTERNO">("INTERNO");
  const [stageWorkshopId, setStageWorkshopId] = useState("");
  const [estimatedFinishAt, setEstimatedFinishAt] = useState("");
  const [stageNote, setStageNote] = useState("");
  const [finishIncludesAtraque, setFinishIncludesAtraque] = useState(false);
  const [supplyPartId, setSupplyPartId] = useState("");
  const [supplyId, setSupplyId] = useState("");
  const [supplyCompleteness, setSupplyCompleteness] = useState("FALTANTE");
  const [supplyQuantity, setSupplyQuantity] = useState("");
  const [supplyNote, setSupplyNote] = useState("");
  const [repairNote, setRepairNote] = useState("");

  const loadOrder = useCallback(async () => {
    setError("");
    try {
      const detail = await getOrder(token, orderId);
      setOrder(detail);
      const activePart = firstActivePart(detail.parts);
      setSplitPartId((current) => current || activePart?.id || "");
      setStagePartId((current) => current || activePart?.id || "");
      setSupplyPartId((current) => current || activePart?.id || "");
      const firstSupply = activePart?.supplies?.[0];
      setSupplyId((current) => current || firstSupply?.supply?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la orden");
    }
  }, [orderId, token]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    async function loadOperationOptions() {
      const [stageList, workshopList] = await Promise.all([
        listStages(token),
        listMasters<WorkshopMaster>("workshops", token, ""),
      ]);
      setStages(stageList);
      setWorkshops(workshopList.items);
      setStageId((current) => current || String(stageList[0]?.id ?? ""));
      setStageWorkshopId((current) => current || workshopList.items[0]?.id || "");
    }

    void loadOperationOptions().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar opciones de etapa");
    });
  }, [token]);

  async function handleSplit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const subParts = splitRows
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [quantity, splitReason] = line.split("|").map((part) => part.trim());
        return { quantity: Number(quantity), splitReason };
      })
      .filter((part) => part.quantity > 0);
    try {
      await splitPart(token, splitPartId, { splitMode, subParts });
      await loadOrder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo dividir la parte");
    }
  }

  async function handleRecombine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await recombineParts(token, {
        componentPartIds: componentIds.split(",").map((id) => id.trim()).filter(Boolean),
        quantity: Number(recombineQuantity),
      });
      await loadOrder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reunificar");
    }
  }



  async function handleStartStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await startStage(token, stagePartId, {
        stageId: Number(stageId),
        executionType,
        workshopId: executionType === "EXTERNO" ? stageWorkshopId : undefined,
        estimatedFinishAt: estimatedFinishAt ? new Date(estimatedFinishAt).toISOString() : undefined,
        note: stageNote || undefined,
      });
      setStageNote("");
      await loadOrder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la etapa");
    }
  }

  async function handleFinishStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await finishStage(token, stagePartId, {
        note: stageNote || undefined,
        includesAtraque: finishIncludesAtraque,
      });
      setStageNote("");
      setFinishIncludesAtraque(false);
      await loadOrder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo finalizar la etapa");
    }
  }

  async function handleSupplyUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await updatePartSupply(token, supplyPartId, supplyId, {
        completeness: supplyCompleteness,
        quantityAvailable: supplyQuantity ? Number(supplyQuantity) : undefined,
        note: supplyNote || undefined,
      });
      await loadOrder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el avio");
    }
  }

  async function handleRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (!order) {
        return;
      }
      await markOrderRepair(token, order.id, repairNote);
      setRepairNote("");
      await loadOrder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar arreglo");
    }
  }

  async function handleResolveRepair() {
    setError("");
    try {
      if (!order) {
        return;
      }
      await resolveOrderRepair(token, order.id);
      await loadOrder();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver arreglo");
    }
  }

  return (
    <Modal title={order ? `${order.internalCode} / ${order.externalCode}` : "Orden"} onClose={onClose}>
      {order ? (
        <div className={styles.detailPanel}>
          <section className={styles.orderSummaryGrid}>
            <span><strong>Cliente</strong>{order.client.businessName}</span>
            <span><strong>Articulo</strong>{order.article.name}</span>
            <span><strong>Tela</strong>{order.fabric?.name ?? "Sin tela"}</span>
            <span><strong>Curva</strong>{order.sizeCurve?.name ?? "Sin curva"}</span>
          </section>
          <section>
            <h2>Partes</h2>
            <div className={styles.partTree}>{buildPartForest(order.parts).map((part) => <PartTreeItem key={part.id} part={part} />)}</div>
          </section>
          <form className={styles.actionPanel} onSubmit={handleStartStage}>
            <h2>Operar etapa</h2>
            <div className={styles.compactGrid}>
              <Select label="Parte" value={stagePartId} onChange={(event) => setStagePartId(event.target.value)} options={order.parts.filter((part) => !partIsHistorical(part.status)).map((part) => ({ label: `${part.partCode} - ${part.quantity} u.`, value: part.id }))} />
              <Select label="Etapa" value={stageId} onChange={(event) => setStageId(event.target.value)} options={stages.map((stage) => ({ label: stage.name, value: String(stage.id) }))} />
              <Select label="Ejecucion" value={executionType} onChange={(event) => setExecutionType(event.target.value as "INTERNO" | "EXTERNO")} options={[{ label: "Interna", value: "INTERNO" }, { label: "Externa", value: "EXTERNO" }]} />
              {executionType === "EXTERNO" ? <Select label="Taller" value={stageWorkshopId} onChange={(event) => setStageWorkshopId(event.target.value)} options={workshops.map((workshop) => ({ label: workshop.name, value: workshop.id }))} /> : null}
              <Input label="Fecha estimada" type="datetime-local" value={estimatedFinishAt} onChange={(event) => setEstimatedFinishAt(event.target.value)} />
              <Input label="Nota" value={stageNote} onChange={(event) => setStageNote(event.target.value)} />
            </div>
            <label className={styles.checkboxLine}>
              <input type="checkbox" checked={finishIncludesAtraque} onChange={(event) => setFinishIncludesAtraque(event.target.checked)} />
              Atraque incluido en confeccion externa
            </label>
            <div className={styles.formActions}>
              <Button type="submit">Iniciar etapa</Button>
              <Button type="button" variant="secondary" onClick={(event) => void handleFinishStage(event as unknown as FormEvent<HTMLFormElement>)}>Finalizar etapa</Button>
            </div>
          </form>
          <form className={styles.actionPanel} onSubmit={handleSupplyUpdate}>
            <h2>Avios de la parte</h2>
            <div className={styles.compactGrid}>
              <Select label="Parte" value={supplyPartId} onChange={(event) => {
                setSupplyPartId(event.target.value);
                const nextPart = order.parts.find((part) => part.id === event.target.value);
                setSupplyId(nextPart?.supplies?.[0]?.supply?.id ?? "");
              }} options={order.parts.filter((part) => !partIsHistorical(part.status)).map((part) => ({ label: `${part.partCode} - ${part.quantity} u.`, value: part.id }))} />
              <Select label="Avio" value={supplyId} onChange={(event) => setSupplyId(event.target.value)} options={(order.parts.find((part) => part.id === supplyPartId)?.supplies ?? []).map((supply) => ({ label: supply.supply?.name ?? supply.id, value: supply.supply?.id ?? supply.id }))} />
              <Select label="Estado" value={supplyCompleteness} onChange={(event) => setSupplyCompleteness(event.target.value)} options={[{ label: "Faltante", value: "FALTANTE" }, { label: "Parcial", value: "PARCIAL" }, { label: "Completo", value: "COMPLETO" }]} />
              <Input label="Cantidad disponible" type="number" min="0" value={supplyQuantity} onChange={(event) => setSupplyQuantity(event.target.value)} />
              <Input label="Nota" value={supplyNote} onChange={(event) => setSupplyNote(event.target.value)} />
            </div>
            <Button type="submit" variant="secondary">Actualizar avios</Button>
          </form>
          <form className={styles.actionPanel} onSubmit={handleRepair}>
            <h2>Arreglo</h2>
            <Input label="Nota de arreglo" value={repairNote} onChange={(event) => setRepairNote(event.target.value)} />
            <div className={styles.formActions}>
              <Button type="submit" variant="danger">Marcar arreglo</Button>
              <Button type="button" variant="secondary" onClick={() => void handleResolveRepair()}>Resolver arreglo</Button>
            </div>
          </form>
          <form className={styles.actionPanel} onSubmit={handleSplit}>
            <h2>Dividir parte</h2>
            <Select label="Parte" value={splitPartId} onChange={(event) => setSplitPartId(event.target.value)} options={order.parts.filter((part) => !partIsHistorical(part.status)).map((part) => ({ label: `${part.partCode} - ${part.quantity} u.`, value: part.id }))} />
            <Select label="Modo" value={splitMode} onChange={(event) => setSplitMode(event.target.value as "LOTE" | "COMPONENTE")} options={[{ label: "Lote", value: "LOTE" }, { label: "Componente", value: "COMPONENTE" }]} />
            <label className={styles.textAreaLabel}>Ramas: cantidad|motivo<textarea value={splitRows} onChange={(event) => setSplitRows(event.target.value)} /></label>
            <Button type="submit">Dividir</Button>
          </form>
          <form className={styles.actionPanel} onSubmit={handleRecombine}>
            <h2>Reunificar componentes</h2>
            <Input label="IDs de ramas componente" value={componentIds} onChange={(event) => setComponentIds(event.target.value)} placeholder="id-1, id-2" />
            <Input label="Cantidad reunificada" type="number" min="1" value={recombineQuantity} onChange={(event) => setRecombineQuantity(event.target.value)} />
            <Button type="submit" variant="secondary">Reunificar</Button>
          </form>
        </div>
      ) : (
        <p className={styles.status}>Cargando detalle...</p>
      )}
      {error ? <p className={styles.error}>{error}</p> : null}
    </Modal>
  );
}

function PartTreeItem({ part }: { part: PartNode }) {
  return (
    <div className={styles.partNode}>
      <div>
        <strong>{part.partCode}</strong>
        <span>{part.quantity} u. / {part.status}{part.isComponentBranch ? " / componente" : ""}</span>
        {part.splitReason ? <small>{part.splitReason}</small> : null}
        {part.supplies?.length ? <small>Avios: {formatList(part.supplies, (supply) => supply.supply?.name ?? supply.id)}</small> : null}
      </div>
      {part.children?.length ? (
        <div className={styles.partChildren}>{part.children.map((child) => <PartTreeItem key={child.id} part={child} />)}</div>
      ) : null}
    </div>
  );
}

function firstActivePart(parts: PartNode[]): PartNode | null {
  return parts.find((part) => !partIsHistorical(part.status)) ?? parts[0] ?? null;
}

function buildPartForest(parts: PartNode[]): PartNode[] {
  const map = new Map(parts.map((part) => [part.id, { ...part, children: [] as PartNode[] }]));
  const roots: PartNode[] = [];
  map.forEach((part) => {
    if (part.parentPartId && map.has(part.parentPartId)) {
      map.get(part.parentPartId)?.children?.push(part);
    } else {
      roots.push(part);
    }
  });
  return roots;
}

function buildColumns(
  resource: MasterName,
  edit: (item: MasterItem) => void,
  token: string,
  reload: () => Promise<void>,
  setError: (message: string) => void,
) {
  const actions = {
    key: "actions",
    label: "",
    render: (item: MasterItem) => (
      <div className={styles.rowActions}>
        <Button type="button" variant="secondary" onClick={() => edit(item)}>
          Editar
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={async () => {
            setError("");
            try {
              await deleteMaster(resource, token, item.id);
              await reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo dar de baja");
            }
          }}
        >
          Baja
        </Button>
      </div>
    ),
  };

  if (resource === "users") {
    return [
      { key: "name", label: "Nombre", render: (item: MasterItem) => (item as UserMaster).fullName },
      { key: "email", label: "Email", render: (item: MasterItem) => (item as UserMaster).email },
      { key: "role", label: "Rol", render: (item: MasterItem) => (item as UserMaster).role },
      { key: "permissions", label: "Permisos", render: (item: MasterItem) => formatPermissions((item as UserMaster).permissions) },
      actions,
    ];
  }

  if (resource === "fabrics") {
    return [
      { key: "code", label: "Articulo", render: (item: MasterItem) => (item as FabricMaster).code },
      { key: "name", label: "Nombre", render: (item: MasterItem) => (item as FabricMaster).name },
      { key: "color", label: "Color", render: (item: MasterItem) => (item as FabricMaster).color ?? "Sin color" },
      { key: "weight", label: "Onz.", render: (item: MasterItem) => (item as FabricMaster).weightOz ?? "Sin dato" },
      { key: "type", label: "Tipo", render: (item: MasterItem) => `${(item as FabricMaster).weaveType}/${(item as FabricMaster).formatType}` },
      actions,
    ];
  }

  if (resource === "supplies") {
    return [
      { key: "code", label: "Articulo", render: (item: MasterItem) => (item as SupplyMaster).code },
      { key: "name", label: "Nombre", render: (item: MasterItem) => (item as SupplyMaster).name },
      { key: "color", label: "Color", render: (item: MasterItem) => (item as SupplyMaster).color ?? "Sin color" },
      { key: "supplier", label: "Proveedor", render: (item: MasterItem) => (item as SupplyMaster).supplier ?? "Sin proveedor" },
      { key: "category", label: "Categoria", render: (item: MasterItem) => (item as SupplyMaster).category },
      actions,
    ];
  }

  if (resource === "size-curves") {
    return [
      { key: "name", label: "Nombre", render: (item: MasterItem) => (item as SizeCurveMaster).name },
      { key: "type", label: "Tipo", render: (item: MasterItem) => (item as SizeCurveMaster).sequenceType },
      { key: "values", label: "Talles", render: (item: MasterItem) => formatList((item as SizeCurveMaster).values, (value) => value.label) },
      actions,
    ];
  }

  if (resource === "workshops") {
    return [
      { key: "name", label: "Taller", render: (item: MasterItem) => (item as WorkshopMaster).name },
      { key: "location", label: "Localidad", render: (item: MasterItem) => formatAddress(item as WorkshopMaster) },
      { key: "specialties", label: "Especialidades", render: (item: MasterItem) => formatList((item as WorkshopMaster).specialties) },
      { key: "contacts", label: "Contactos", render: (item: MasterItem) => formatContacts((item as WorkshopMaster).contacts) },
      actions,
    ];
  }

  if (resource === "articles") {
    return [
      { key: "code", label: "Articulo", render: (item: MasterItem) => (item as ArticleMaster).code },
      { key: "name", label: "Producto", render: (item: MasterItem) => (item as ArticleMaster).name },
      { key: "supplies", label: "Avios", render: (item: MasterItem) => formatList((item as ArticleMaster).supplies, (supply) => supply.supply?.name ?? supply.id, "Sin avios") },
      { key: "decorations", label: "Partes", render: (item: MasterItem) => formatList((item as ArticleMaster).decorationParts, (part) => `${part.garmentPart}: ${part.decorationType}`, "Sin partes") },
      actions,
    ];
  }

  return [
    { key: "businessName", label: "Razon social", render: (item: MasterItem) => (item as ClientMaster).businessName },
    { key: "tax", label: "CUIT/CUIL", render: (item: MasterItem) => (item as ClientMaster).taxId },
    { key: "location", label: "Localidad", render: (item: MasterItem) => formatAddress(item as ClientMaster) },
    { key: "contacts", label: "Contactos", render: (item: MasterItem) => formatContacts((item as ClientMaster).contacts) },
    actions,
  ];
}

function MasterModal({
  resource,
  item,
  token,
  onClose,
  onSaved,
}: {
  resource: MasterName;
  item: MasterItem | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(() => initialForm(resource, item));
  const isEditing = Boolean(item);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const payload = buildPayload(resource, form, isEditing);
      if (item) {
        await updateMaster(resource, token, item.id, payload);
      } else {
        await createMaster(resource, token, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  function setValue(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <Modal title={isEditing ? "Editar registro" : "Nuevo registro"} onClose={onClose}>
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <MasterFields resource={resource} form={form} setValue={setValue} isEditing={isEditing} />
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function MasterFields({
  resource,
  form,
  setValue,
  isEditing,
}: {
  resource: MasterName;
  form: FormState;
  setValue: (name: string, value: string) => void;
  isEditing: boolean;
}) {
  if (resource === "users") {
    return (
      <div className={styles.compactGrid}>
        <Input label="Nombre" value={form.fullName} onChange={(event) => setValue("fullName", event.target.value)} required />
        <Input label="Email" type="email" value={form.email} onChange={(event) => setValue("email", event.target.value)} required />
        <Input label={isEditing ? "Nueva password" : "Password"} type="password" value={form.password} onChange={(event) => setValue("password", event.target.value)} required={!isEditing} />
        <Select label="Rol" value={form.role} onChange={(event) => setValue("role", event.target.value)} options={[{ label: "Admin", value: "ADMIN" }, { label: "Usuario", value: "USER" }]} />
        <Input label="Permisos" value={form.permissions} onChange={(event) => setValue("permissions", event.target.value)} placeholder="BORDADO:VER,INICIAR_ETAPA; *:ADMINISTRAR" />
      </div>
    );
  }

  if (resource === "workshops") {
    return (
      <div className={styles.compactGrid}>
        <Input label="Nombre" value={form.name} onChange={(event) => setValue("name", event.target.value)} required />
        <Input label="Direccion" value={form.address} onChange={(event) => setValue("address", event.target.value)} />
        <Input label="Localidad" value={form.locality} onChange={(event) => setValue("locality", event.target.value)} />
        <Input label="Partido" value={form.district} onChange={(event) => setValue("district", event.target.value)} />
        <Input label="Provincia" value={form.province} onChange={(event) => setValue("province", event.target.value)} />
        <Input label="Especialidades" value={form.specialties} onChange={(event) => setValue("specialties", event.target.value)} placeholder="CONFECCION, PLANCHA" />
        <Input label="Contactos" value={form.contacts} onChange={(event) => setValue("contacts", event.target.value)} placeholder="Nombre|email|fijo|cel1|cel2; Otro|email" />
      </div>
    );
  }

  if (resource === "fabrics") {
    return (
      <div className={styles.compactGrid}>
        <Input label="Articulo" value={form.code} onChange={(event) => setValue("code", event.target.value)} required />
        <Input label="Nombre" value={form.name} onChange={(event) => setValue("name", event.target.value)} required />
        <Input label="Color" value={form.color} onChange={(event) => setValue("color", event.target.value)} />
        <Input label="Onzaje" type="number" step="0.01" value={form.weightOz} onChange={(event) => setValue("weightOz", event.target.value)} />
        <Input label="Proveedor" value={form.supplier} onChange={(event) => setValue("supplier", event.target.value)} />
        <Select label="Tipo" value={form.weaveType} onChange={(event) => setValue("weaveType", event.target.value)} options={[{ label: "Punto", value: "PUNTO" }, { label: "Plano", value: "PLANO" }]} />
        <Select label="Formato" value={form.formatType} onChange={(event) => setValue("formatType", event.target.value)} options={[{ label: "Abierto", value: "ABIERTO" }, { label: "Tubular", value: "TUBULAR" }]} />
      </div>
    );
  }

  if (resource === "supplies") {
    return (
      <div className={styles.compactGrid}>
        <Input label="Articulo" value={form.code} onChange={(event) => setValue("code", event.target.value)} required />
        <Input label="Nombre" value={form.name} onChange={(event) => setValue("name", event.target.value)} required />
        <Input label="Descripcion" value={form.description} onChange={(event) => setValue("description", event.target.value)} />
        <Input label="Color" value={form.color} onChange={(event) => setValue("color", event.target.value)} />
        <Input label="Proveedor" value={form.supplier} onChange={(event) => setValue("supplier", event.target.value)} />
        <Select label="Categoria" value={form.category} onChange={(event) => setValue("category", event.target.value)} options={[{ label: "Confeccion", value: "CONFECCION" }, { label: "Terminacion", value: "TERMINACION" }]} />
      </div>
    );
  }

  if (resource === "size-curves") {
    return (
      <div className={styles.compactGrid}>
        <Input label="Nombre" value={form.name} onChange={(event) => setValue("name", event.target.value)} required />
        <Select label="Tipo" value={form.sequenceType} onChange={(event) => setValue("sequenceType", event.target.value)} options={[{ label: "Alfabetica", value: "ALFABETICA" }, { label: "Numerica", value: "NUMERICA" }, { label: "Doble", value: "DOBLE" }, { label: "Mixta", value: "MIXTA" }]} />
        <Input label="Talles separados por coma" value={form.values} onChange={(event) => setValue("values", event.target.value)} placeholder="S, M, Especial" required />
      </div>
    );
  }

  if (resource === "articles") {
    return (
      <div className={styles.compactGrid}>
        <Input label="Articulo" value={form.code} onChange={(event) => setValue("code", event.target.value)} required />
        <Input label="Nombre" value={form.name} onChange={(event) => setValue("name", event.target.value)} required />
        <Input label="Descripcion" value={form.description} onChange={(event) => setValue("description", event.target.value)} />
        <Input label="Avios" value={form.supplies} onChange={(event) => setValue("supplies", event.target.value)} placeholder="uuid-avio|4|Puños; uuid-avio-2|1" />
        <Input label="Partes decorables" value={form.decorationParts} onChange={(event) => setValue("decorationParts", event.target.value)} placeholder="Pecho:BORDADO; Espalda:ESTAMPADO" />
      </div>
    );
  }

  return (
    <div className={styles.compactGrid}>
      <Input label="Razon social" value={form.businessName} onChange={(event) => setValue("businessName", event.target.value)} required />
      <Input label="CUIT/CUIL" value={form.taxId} onChange={(event) => setValue("taxId", event.target.value)} required />
      <Input label="Direccion" value={form.address} onChange={(event) => setValue("address", event.target.value)} />
      <Input label="Localidad" value={form.locality} onChange={(event) => setValue("locality", event.target.value)} />
      <Input label="Partido" value={form.district} onChange={(event) => setValue("district", event.target.value)} />
      <Input label="Provincia" value={form.province} onChange={(event) => setValue("province", event.target.value)} />
      <Input label="Contactos" value={form.contacts} onChange={(event) => setValue("contacts", event.target.value)} placeholder="Nombre|email|fijo|cel1|cel2; Otro|email" />
    </div>
  );
}

function initialForm(resource: MasterName, item: MasterItem | null): FormState {
  if (resource === "users") {
    const user = item as UserMaster | null;
    return {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "USER",
      permissions: formatPermissionsInput(user?.permissions),
    };
  }
  if (resource === "workshops") {
    const workshop = item as WorkshopMaster | null;
    return {
      name: workshop?.name ?? "",
      address: workshop?.address ?? "",
      locality: workshop?.locality ?? "",
      district: workshop?.district ?? "",
      province: workshop?.province ?? "",
      specialties: workshop?.specialties.join(", ") ?? "CONFECCION",
      contacts: formatContactsInput(workshop?.contacts),
    };
  }
  if (resource === "fabrics") {
    const fabric = item as FabricMaster | null;
    return {
      code: fabric?.code ?? "",
      name: fabric?.name ?? "",
      color: fabric?.color ?? "",
      weightOz: fabric?.weightOz ?? "",
      supplier: fabric?.supplier ?? "",
      weaveType: fabric?.weaveType ?? "PUNTO",
      formatType: fabric?.formatType ?? "ABIERTO",
    };
  }
  if (resource === "supplies") {
    const supply = item as SupplyMaster | null;
    return {
      code: supply?.code ?? "",
      name: supply?.name ?? "",
      description: supply?.description ?? "",
      color: supply?.color ?? "",
      supplier: supply?.supplier ?? "",
      category: supply?.category ?? "CONFECCION",
    };
  }
  if (resource === "size-curves") {
    const curve = item as SizeCurveMaster | null;
    return {
      name: curve?.name ?? "",
      sequenceType: curve?.sequenceType ?? "ALFABETICA",
      values: curve?.values.map((value) => value.label).join(", ") ?? "",
    };
  }
  if (resource === "articles") {
    const article = item as ArticleMaster | null;
    return {
      code: article?.code ?? "",
      name: article?.name ?? "",
      description: article?.description ?? "",
      supplies: formatArticleSuppliesInput(article?.supplies),
      decorationParts: formatDecorationInput(article?.decorationParts),
    };
  }
  const client = item as ClientMaster | null;
  return {
    businessName: client?.businessName ?? "",
    taxId: client?.taxId ?? "",
    address: client?.address ?? "",
    locality: client?.locality ?? "",
    district: client?.district ?? "",
    province: client?.province ?? "",
    contacts: formatContactsInput(client?.contacts),
  };
}

function buildPayload(
  resource: MasterName,
  form: FormState,
  isEditing: boolean,
): Record<string, unknown> {
  if (resource === "users") {
    return compact({
      fullName: form.fullName,
      email: form.email,
      password: form.password || (isEditing ? undefined : form.password),
      role: form.role,
      permissions: parsePermissions(form.permissions),
    });
  }
  if (resource === "workshops") {
    return compact({
      name: form.name,
      address: form.address,
      locality: form.locality,
      district: form.district,
      province: form.province,
      specialties: splitComma(form.specialties),
      contacts: parseContacts(form.contacts),
    });
  }
  if (resource === "fabrics") {
    return compact({
      code: form.code,
      name: form.name,
      color: form.color,
      weightOz: form.weightOz ? Number(form.weightOz) : undefined,
      supplier: form.supplier,
      weaveType: form.weaveType,
      formatType: form.formatType,
    });
  }
  if (resource === "supplies") {
    return compact({
      code: form.code,
      name: form.name,
      description: form.description,
      color: form.color,
      supplier: form.supplier,
      category: form.category,
    });
  }
  if (resource === "size-curves") {
    return compact({
      name: form.name,
      sequenceType: form.sequenceType,
      values: splitComma(form.values).map((label, index) => ({ label, sortOrder: index + 1 })),
    });
  }
  if (resource === "articles") {
    return compact({
      code: form.code,
      name: form.name,
      description: form.description,
      supplies: parseArticleSupplies(form.supplies),
      decorationParts: parseDecorationParts(form.decorationParts),
    });
  }
  return compact({
    businessName: form.businessName,
    taxId: form.taxId,
    address: form.address,
    locality: form.locality,
    district: form.district,
    province: form.province,
    contacts: parseContacts(form.contacts),
  });
}

function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value !== undefined),
  );
}

function splitComma(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function parseContacts(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry, index) => {
    const [contactName, email, fixedPhone, mobilePhone1, mobilePhone2, roleNote] = entry.split("|").map((part) => part.trim());
    return compact({ contactName, email, fixedPhone, mobilePhone1, mobilePhone2, roleNote, isPrimary: index === 0 });
  });
}

function parsePermissions(value: string) {
  return value.split(";").flatMap((entry) => {
    const [sector, actions] = entry.split(":").map((part) => part.trim());
    if (!actions) return [];
    return actions.split(",").map((action) => action.trim()).filter(Boolean).map((action) => ({
      sectorCode: sector && sector !== "*" ? sector : null,
      action,
      isAllowed: true,
    }));
  });
}

function parseArticleSupplies(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [supplyId, quantity, note] = entry.split("|").map((part) => part.trim());
    return compact({ supplyId, quantity: quantity ? Number(quantity) : undefined, note });
  });
}

function parseDecorationParts(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [garmentPart, decorationType] = entry.split(":").map((part) => part.trim());
    return { garmentPart, decorationType };
  }).filter((part) => part.garmentPart && part.decorationType);
}

function formatAddress(item: { address?: string | null; locality?: string | null; district?: string | null; province?: string | null }): string {
  return [item.locality, item.district, item.province].filter(Boolean).join(" / ") || item.address || "Sin direccion";
}

function formatContacts(contacts?: { contactName: string; mobilePhone1?: string | null; fixedPhone?: string | null }[]): string {
  return formatList(contacts, (contact) => `${contact.contactName}${contact.mobilePhone1 ? ` ${contact.mobilePhone1}` : contact.fixedPhone ? ` ${contact.fixedPhone}` : ""}`, "Sin contactos");
}

function formatContactsInput(contacts?: { contactName: string; email?: string | null; fixedPhone?: string | null; mobilePhone1?: string | null; mobilePhone2?: string | null; roleNote?: string | null }[]): string {
  return (contacts ?? []).map((contact) => [contact.contactName, contact.email ?? "", contact.fixedPhone ?? "", contact.mobilePhone1 ?? "", contact.mobilePhone2 ?? "", contact.roleNote ?? ""].join("|")).join("; ");
}

function formatPermissions(permissions?: { sectorCode: string | null; action: string; isAllowed: boolean }[]): string {
  return formatList(permissions?.filter((permission) => permission.isAllowed), (permission) => `${permission.sectorCode ?? "*"}:${permission.action}`, "Sin permisos");
}

function formatPermissionsInput(permissions?: { sectorCode: string | null; action: string; isAllowed: boolean }[]): string {
  const grouped = new Map<string, string[]>();
  for (const permission of permissions ?? []) {
    if (!permission.isAllowed) continue;
    const key = permission.sectorCode ?? "*";
    grouped.set(key, [...(grouped.get(key) ?? []), permission.action]);
  }
  return [...grouped.entries()].map(([sector, actions]) => `${sector}:${actions.join(",")}`).join("; ");
}

function formatArticleSuppliesInput(supplies?: { quantity?: string | null; note?: string | null; supply?: SupplyMaster }[]): string {
  return (supplies ?? []).map((entry) => [entry.supply?.id ?? "", entry.quantity ?? "", entry.note ?? ""].join("|")).join("; ");
}

function formatDecorationInput(parts?: { garmentPart: string; decorationType: string }[]): string {
  return (parts ?? []).map((part) => `${part.garmentPart}:${part.decorationType}`).join("; ");
}
