"use client";

import { Fragment, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../components/ui/Button/Button";
import { Input } from "../components/ui/Input/Input";
import { Modal } from "../components/ui/Modal/Modal";
import { Select } from "../components/ui/Select/Select";
import { Table } from "../components/ui/Table/Table";
import { isUnauthorizedError, login, LoginResponse } from "../lib/api/client";
import {
  DashboardKanbanResponse,
  DashboardKanbanPart,
  DashboardRow,
  DashboardSummary,
  getDashboardKanban,
  getDashboardSummary,
  listDashboardOrders,
} from "../lib/api/dashboard.api";
import {
  ArticleMaster,
  ClientMaster,
  createMaster,
  deleteMaster,
  FabricMaster,
  ProviderMaster,
  listMasters,
  MasterName,
  SizeCurveMaster,
  SupplyMaster,
  updateMaster,
  UserMaster,
  WorkshopMaster,
} from "../lib/api/masters.api";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem,
} from "../lib/api/notifications.api";
import {
  adjustFabricRollStock,
  adjustSupplyStock,
  createFabricStockEntry,
  createSupplyStockEntry,
  FabricStockDetail,
  FabricStockRow,
  getFabricStockDetail,
  getSupplyStockDetail,
  listFabricStock,
  listSupplyStock,
  StockAdjustmentReason,
  SupplyStockDetail,
  SupplyStockRow,
} from "../lib/api/inventory.api";
import {
  createOrder,
  movePartToStage,
  StageOption,
} from "../lib/api/orders.api";
import { formatList } from "../lib/formatters/master-formatters";
import styles from "./page.module.css";

type MasterItem =
  | ClientMaster
  | ProviderMaster
  | WorkshopMaster
  | ArticleMaster
  | FabricMaster
  | SupplyMaster
  | SizeCurveMaster
  | UserMaster;
type FormState = Record<string, string>;
type MainView = "orders" | "sectors" | "masters" | "stock";
const resources: {
  key: MasterName;
  label: string;
  singular: string;
  empty: string;
}[] = [
  { key: "clients", label: "Clientes", singular: "Cliente", empty: "Sin clientes cargados" },
  { key: "providers", label: "Proveedores", singular: "Proveedor", empty: "Sin proveedores cargados" },
  { key: "workshops", label: "Talleres externos", singular: "Taller", empty: "Sin talleres cargados" },
  { key: "fabrics", label: "Telas", singular: "Tela", empty: "Sin telas cargadas" },
  { key: "supplies", label: "Avíos", singular: "Avío", empty: "Sin avíos cargados" },
  { key: "size-curves", label: "Curvas de talles", singular: "Curva", empty: "Sin curvas cargadas" },
  { key: "articles", label: "Artículos", singular: "Artículo", empty: "Sin artículos cargados" },
  { key: "users", label: "Usuarios y permisos", singular: "Usuario", empty: "Sin usuarios cargados" },
];

const resourceKeys = new Set<MasterName>(resources.map((resource) => resource.key));

function pathForView(view: MainView, resource: MasterName): string {
  if (view === "sectors") return "/sectores";
  if (view === "stock") return "/stock";
  if (view === "masters") return `/gestion/${resource}`;
  return "/ordenes";
}

function viewStateFromPath(pathname: string): { view: MainView; resource?: MasterName } {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "sectores") {
    return { view: "sectors" };
  }
  if (segments[0] === "stock") {
    return { view: "stock" };
  }
  if (segments[0] === "gestion") {
    const resource = segments[1] as MasterName | undefined;
    return {
      view: "masters",
      resource: resource && resourceKeys.has(resource) ? resource : resources[0].key,
    };
  }
  return { view: "orders" };
}


export default function Home() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [mainView, setMainView] = useState<MainView>("orders");
  const [active, setActive] = useState<MasterName>("clients");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsLimit] = useState(20);
  const [orders, setOrders] = useState<DashboardRow[]>([]);
  const [kanban, setKanban] = useState<DashboardKanbanResponse>({ stages: [] });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalItem, setModalItem] = useState<MasterItem | "new" | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockKind, setStockKind] = useState<"fabric" | "supply">("fabric");
  const [fabricStock, setFabricStock] = useState<FabricStockRow[]>([]);
  const [supplyStock, setSupplyStock] = useState<SupplyStockRow[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit] = useState(20);
  const [stockDetail, setStockDetail] = useState<FabricStockDetail | SupplyStockDetail | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [movingPartId, setMovingPartId] = useState<string | null>(null);
  const [sectorDisplayMode, setSectorDisplayMode] = useState<"list" | "cards">("cards");

  const clearStoredSession = useCallback((message?: string) => {
    window.localStorage.removeItem("proma-session");
    setSession(null);
    setItems([]);
    setItemsTotal(0);
    setItemsPage(1);
    setOrders([]);
    setKanban({ stages: [] });
    setSummary(null);
    setModalItem(null);
    setIsStockModalOpen(false);
    setStockDetail(null);
    setIsOrderModalOpen(false);
    setNotifications([]);
    setUnreadCount(0);
    setIsNotificationsOpen(false);
    setIsProfileOpen(false);
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

  useEffect(() => {
    const routeState = viewStateFromPath(pathname);
    setMainView(routeState.view);
    if (routeState.resource) {
      setActive(routeState.resource);
    }
    setSearch("");
    setError("");
    setModalItem(null);
  }, [pathname]);

  const navigateToView = useCallback((view: MainView, resource: MasterName = active) => {
    router.push(pathForView(view, resource));
  }, [active, router]);

  const loadItems = useCallback(async (nextSearch = search, nextPage = itemsPage) => {
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
        nextPage,
        itemsLimit,
      );
      setItems(result.items);
      setItemsTotal(result.total);
      setItemsPage(result.page);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearStoredSession("La sesion vencio. Ingresá nuevamente.");
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudo cargar");
    } finally {
      setIsLoading(false);
    }
  }, [active, clearStoredSession, itemsLimit, itemsPage, search, session]);

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
      const [rows, board, totals] = await Promise.all([
        listDashboardOrders(session.accessToken, nextSearch),
        getDashboardKanban(session.accessToken, nextSearch),
        getDashboardSummary(session.accessToken, nextSearch),
      ]);
      setOrders(rows.items);
      setKanban(board);
      setSummary(totals);
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
    if (session && (mainView === "orders" || mainView === "sectors")) {
      void loadOrders();
    }
  }, [loadOrders, mainView, session]);

  const loadStock = useCallback(async (nextSearch = search, nextPage = stockPage, nextKind = stockKind) => {
    if (!session) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      if (nextKind === "fabric") {
        const result = await listFabricStock(session.accessToken, nextSearch, nextPage, stockLimit);
        setFabricStock(result.items);
        setStockTotal(result.total);
        setStockPage(result.page);
      } else {
        const result = await listSupplyStock(session.accessToken, nextSearch, nextPage, stockLimit);
        setSupplyStock(result.items);
        setStockTotal(result.total);
        setStockPage(result.page);
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearStoredSession("La sesion vencio. Ingresá nuevamente.");
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudo cargar stock");
    } finally {
      setIsLoading(false);
    }
  }, [clearStoredSession, search, session, stockKind, stockLimit, stockPage]);

  useEffect(() => {
    if (session && mainView === "stock") {
      void loadStock();
    }
  }, [loadStock, mainView, session]);

  const loadNotifications = useCallback(async () => {
    if (!session) {
      return;
    }
    try {
      const result = await listNotifications(session.accessToken);
      setNotifications(result.items);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearStoredSession("La sesion vencio. Ingresá nuevamente.");
      }
    }
  }, [clearStoredSession, session]);

  useEffect(() => {
    if (!session) {
      return;
    }
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications, session]);

  async function handleMarkNotificationRead(id: string) {
    if (!session) {
      return;
    }
    await markNotificationRead(session.accessToken, id);
    await loadNotifications();
  }

  async function handleMarkAllNotificationsRead() {
    if (!session) {
      return;
    }
    await markAllNotificationsRead(session.accessToken);
    await loadNotifications();
  }

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

  async function handleMovePart(partId: string, targetStage: StageOption) {
    if (!session || movingPartId) {
      return;
    }
    setMovingPartId(partId);
    setError("");
    try {
      await movePartToStage(session.accessToken, partId, targetStage);
      await loadOrders();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearStoredSession("La sesion vencio. Ingresá nuevamente.");
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudo mover la orden de sector");
      await loadOrders();
    } finally {
      setMovingPartId(null);
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
      <header className={styles.topBar}>
        <button
          className={styles.brandButton}
          type="button"
          onClick={() => {
            navigateToView("orders");
          }}
        >
          <span className={styles.brandMark} aria-hidden="true" />
          <strong>Control de producción</strong>
        </button>
        <nav className={styles.topNav} aria-label="Navegacion principal">
          <button
            className={mainView === "orders" ? styles.navActive : ""}
            type="button"
            onClick={() => {
              navigateToView("orders");
            }}
          >
            <span className={`${styles.navIcon} ${styles.iconOrders}`} aria-hidden="true" />
            Órdenes
          </button>
          <button
            className={mainView === "sectors" ? styles.navActive : ""}
            type="button"
            onClick={() => {
              navigateToView("sectors");
            }}
          >
            <span className={`${styles.navIcon} ${styles.iconSectors}`} aria-hidden="true" />
            Sectores
          </button>
          {visibleResources.length > 0 ? (
            <button
              className={mainView === "masters" ? styles.navActive : ""}
              type="button"
              onClick={() => {
                navigateToView("masters", active);
              }}
            >
              <span className={`${styles.navIcon} ${styles.iconManagement}`} aria-hidden="true" />
              Gestión
            </button>
          ) : null}
          <button
            className={mainView === "stock" ? styles.navActive : ""}
            type="button"
            onClick={() => {
              navigateToView("stock");
            }}
          >
            <span className={`${styles.navIcon} ${styles.iconStock}`} aria-hidden="true" />
            Stock
          </button>
          <button className={styles.navMuted} type="button" disabled>
            <span className={`${styles.navIcon} ${styles.iconReports}`} aria-hidden="true" />
            Reportes
          </button>
        </nav>
        <div className={styles.topActions}>
          <form
            className={styles.topSearch}
            onSubmit={(event) => {
              event.preventDefault();
              if (mainView === "orders" || mainView === "sectors") {
                void loadOrders();
              } else if (mainView === "stock") {
                void loadStock(search, 1);
              } else {
                void loadItems();
              }
            }}
          >
            <label>
              <span>Buscar orden</span>
              <span className={`${styles.inputIcon} ${styles.iconSearch}`} aria-hidden="true" />
              <input
                name="globalSearch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar orden"
              />
            </label>
          </form>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            isOpen={isNotificationsOpen}
            onToggle={() => setIsNotificationsOpen((current) => !current)}
            onMarkRead={(id) => void handleMarkNotificationRead(id)}
            onMarkAllRead={() => void handleMarkAllNotificationsRead()}
          />
          <div className={styles.profileBox}>
            <button
              type="button"
              className={styles.userChip}
              title={session.user.fullName}
              onClick={() => setIsProfileOpen((current) => !current)}
            >
              {userInitials(session.user.fullName)}
            </button>
            {isProfileOpen ? (
              <div className={styles.profilePanel}>
                <strong>{session.user.fullName}</strong>
                <span>{session.user.email}</span>
                <button type="button" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <header className={styles.heroHeader}>
          <div>
            <p className={styles.breadcrumb}>Producción / {mainView === "masters" ? "Gestión" : mainView === "stock" ? "Stock" : mainView === "sectors" ? "Sectores" : "Vista general"} · {formatTodayLabel()}</p>
            <h1>{mainView === "masters" ? "Gestión" : mainView === "stock" ? "Stock" : mainView === "sectors" ? "Sectores" : "Órdenes de corte"}</h1>
          </div>
          {mainView === "sectors" ? (
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={sectorDisplayMode === "list" ? styles.toggleActive : ""}
                onClick={() => setSectorDisplayMode("list")}
              >
                <span className={`${styles.navIcon} ${styles.iconOrders}`} aria-hidden="true" />
                Lista
              </button>
              <button
                type="button"
                className={sectorDisplayMode === "cards" ? styles.toggleActive : ""}
                onClick={() => setSectorDisplayMode("cards")}
              >
                <span className={`${styles.navIcon} ${styles.iconSectors}`} aria-hidden="true" />
                Tarjetas
              </button>
            </div>
          ) : null}
        </header>

        {mainView === "masters" && visibleResources.length > 0 ? (
          <nav className={styles.managementTabs} aria-label="Gestión de datos maestros">
            {visibleResources.map((resource) => (
              <button
                key={resource.key}
                type="button"
                className={resource.key === active ? styles.managementTabActive : ""}
                onClick={() => {
                  setItems([]);
                  setItemsTotal(0);
                  setItemsPage(1);
                  navigateToView("masters", resource.key);
                }}
              >
                {resource.label}
              </button>
            ))}
          </nav>
        ) : null}

        <section className={styles.toolbar}>
          <form
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              if (mainView === "orders" || mainView === "sectors") {
                void loadOrders();
              } else if (mainView === "stock") {
                void loadStock(search, 1);
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
              if (mainView === "masters") {
                setModalItem("new");
              } else if (mainView === "stock") {
                setIsStockModalOpen(true);
              } else {
                setIsOrderModalOpen(true);
              }
            }}
          >
            {mainView === "masters" ? `Nuevo ${activeResource.singular}` : mainView === "stock" ? "Nuevo ingreso" : "Nueva orden de corte"}
          </Button>

        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {isLoading ? <p className={styles.status}>Cargando datos...</p> : null}

        {mainView === "orders" || mainView === "sectors" ? (
          <OrdersView
            mode={mainView}
            orders={orders}
            kanban={kanban}
            summary={summary}
            onOpen={(orderCode) => router.push(`/ordenes/${encodeURIComponent(orderCode)}`)}
            onMove={(partId, stage) => void handleMovePart(partId, stage)}
            movingPartId={movingPartId}
            sectorDisplayMode={sectorDisplayMode}
            onNewOrder={() => setIsOrderModalOpen(true)}
          />
        ) : mainView === "stock" ? (
          <StockView
            kind={stockKind}
            fabricRows={fabricStock}
            supplyRows={supplyStock}
            total={stockTotal}
            page={stockPage}
            limit={stockLimit}
            onKindChange={(nextKind) => {
              setStockKind(nextKind);
              setStockPage(1);
              setStockDetail(null);
              void loadStock(search, 1, nextKind);
            }}
            onOpenFabric={async (fabricId) => setStockDetail(await getFabricStockDetail(session.accessToken, fabricId))}
            onOpenSupply={async (supplyId) => setStockDetail(await getSupplyStockDetail(session.accessToken, supplyId))}
            onNewEntry={() => setIsStockModalOpen(true)}
            onPageChange={(nextPage) => void loadStock(search, nextPage)}
          />
        ) : (
          <section className={styles.managementPanel}>
            <header className={styles.sectionTitleRow}>
              <div>
                <p className={styles.catalogEyebrow}>Catálogo</p>
                <h2>{activeResource.label}</h2>
                <p>{itemsTotal} registros en esta vista</p>
              </div>
              <div className={styles.sectionActions}>
                <Button type="button" onClick={() => setModalItem("new")}>
                  <span className={`${styles.buttonIcon} ${styles.iconPlus}`} aria-hidden="true" />
                  {`Nuevo ${activeResource.singular}`}
                </Button>

              </div>
            </header>
            <Table
              columns={buildColumns(active)}
              items={items}
              emptyText={activeResource.empty}
              onRowClick={setModalItem}
            />
            <Pagination
              page={itemsPage}
              limit={itemsLimit}
              total={itemsTotal}
              onPageChange={(nextPage) => void loadItems(search, nextPage)}
            />
          </section>
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

      {isStockModalOpen ? (
        <StockEntryModal
          token={session.accessToken}
          initialKind={stockKind}
          onClose={() => setIsStockModalOpen(false)}
          onSaved={() => {
            setIsStockModalOpen(false);
            setError("");
            if (mainView === "stock") {
              void loadStock(search, stockPage);
            }
          }}
        />
      ) : null}

      {stockDetail ? (
        <StockDetailModal
          detail={stockDetail}
          kind={"rolls" in stockDetail ? "fabric" : "supply"}
          token={session.accessToken}
          onClose={() => setStockDetail(null)}
          onChanged={async () => {
            if ("rolls" in stockDetail) {
              setStockDetail(await getFabricStockDetail(session.accessToken, stockDetail.fabric.id));
            } else {
              setStockDetail(await getSupplyStockDetail(session.accessToken, stockDetail.supply.id));
            }
            await loadStock(search, stockPage);
          }}
        />
      ) : null}
    </main>
  );
}


function StockView({
  kind,
  fabricRows,
  supplyRows,
  total,
  page,
  limit,
  onKindChange,
  onOpenFabric,
  onOpenSupply,
  onNewEntry,
  onPageChange,
}: {
  kind: "fabric" | "supply";
  fabricRows: FabricStockRow[];
  supplyRows: SupplyStockRow[];
  total: number;
  page: number;
  limit: number;
  onKindChange: (kind: "fabric" | "supply") => void;
  onOpenFabric: (fabricId: string) => void;
  onOpenSupply: (supplyId: string) => void;
  onNewEntry: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className={styles.managementPanel}>
      <header className={styles.sectionTitleRow}>
        <div>
          <h2>{kind === "fabric" ? "Telas" : "Avíos"}</h2>
          <p>
            {kind === "fabric"
              ? `${total} tipos de tela con stock por rollo`
              : `${total} avíos con stock actual`}
          </p>
        </div>
        <div className={styles.sectionActions}>
          <div className={styles.stockTypeSwitch} role="group" aria-label="Sector de stock">
            <button type="button" className={kind === "fabric" ? styles.stockTypeActive : ""} onClick={() => onKindChange("fabric")}>
              Telas
            </button>
            <button type="button" className={kind === "supply" ? styles.stockTypeActive : ""} onClick={() => onKindChange("supply")}>
              Avíos
            </button>
          </div>
          <Button type="button" onClick={onNewEntry}>
            <span className={`${styles.buttonIcon} ${styles.iconPlus}`} aria-hidden="true" />
            Nuevo ingreso
          </Button>
        </div>
      </header>

      {kind === "fabric" ? (
        <div className={styles.ordersTableWrap}>
          <table className={styles.ordersTable}>
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Descripción</th>
                <th>Color</th>
                <th>Disponible</th>
              </tr>
            </thead>
            <tbody>
              {fabricRows.length === 0 ? (
                <tr><td colSpan={4} className={styles.emptyState}>Sin telas para mostrar</td></tr>
              ) : fabricRows.map((row) => (
                <tr key={row.fabric.id} onClick={() => onOpenFabric(row.fabric.id)} tabIndex={0}>
                  <td><span className={styles.orderCode}>{row.fabric.code}</span></td>
                  <td>{row.fabric.name}</td>
                  <td>{row.fabric.color ?? "Sin color"}</td>
                  <td>
                    <span className={styles.orderCode}>{formatQuantity(row.currentQuantity)}</span>
                    <span className={styles.orderMeta}>{row.rollCount} {row.rollCount === 1 ? "rollo" : "rollos"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.ordersTableWrap}>
          <table className={styles.ordersTable}>
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Descripción</th>
                <th>Color</th>
                <th>Disponible</th>
              </tr>
            </thead>
            <tbody>
              {supplyRows.length === 0 ? (
                <tr><td colSpan={4} className={styles.emptyState}>Sin avíos para mostrar</td></tr>
              ) : supplyRows.map((row) => (
                <tr key={row.supply.id} onClick={() => onOpenSupply(row.supply.id)} tabIndex={0}>
                  <td><span className={styles.orderCode}>{row.supply.code}</span></td>
                  <td>
                    {row.supply.name}
                    <span className={styles.orderMeta}>{row.supply.category}</span>
                  </td>
                  <td>{row.supply.color ?? "Sin color"}</td>
                  <td><span className={styles.orderCode}>{formatQuantity(row.currentQuantity)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} limit={limit} total={total} onPageChange={onPageChange} />
    </section>
  );
}


function StockDetailModal({
  detail,
  kind,
  token,
  onClose,
  onChanged,
}: {
  detail: FabricStockDetail | SupplyStockDetail;
  kind: "fabric" | "supply";
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState("");
  const [reason, setReason] = useState<StockAdjustmentReason>("CORRECCION");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [expandedRollId, setExpandedRollId] = useState<string | null>(null);
  const isFabric = kind === "fabric" && "rolls" in detail;
  const supplyDetail = detail as SupplyStockDetail;
  const title = isFabric ? detail.fabric.name : supplyDetail.supply.name;

  useEffect(() => {
    setTargetId(isFabric ? detail.rolls[0]?.id ?? "" : supplyDetail.supply.id);
  }, [detail, isFabric, supplyDetail.supply.id]);

  async function handleAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const delta = Number(quantityDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      setError("Cargá una cantidad distinta de cero.");
      return;
    }
    try {
      if (isFabric) {
        await adjustFabricRollStock(token, targetId, { quantityDelta: delta, reason, note: note || undefined });
      } else {
        await adjustSupplyStock(token, targetId, { quantityDelta: delta, reason, note: note || undefined });
      }
      setQuantityDelta("");
      setNote("");
      setError("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ajustar stock");
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className={styles.detailPanel}>
        <section className={styles.orderSummaryGrid}>
          <span><strong>Artículo</strong>{isFabric ? detail.fabric.code : supplyDetail.supply.code}</span>
          <span><strong>Color</strong>{(isFabric ? detail.fabric.color : supplyDetail.supply.color) ?? "Sin color"}</span>
          <span><strong>Disponible</strong>{formatQuantity(detail.currentQuantity)}</span>
          <span><strong>{isFabric ? "Rollos" : "Compras"}</strong>{isFabric ? detail.rollCount : supplyDetail.entries.length}</span>
        </section>
        <div className={styles.ordersTableWrap}>
          <table className={styles.ordersTable}>
            {isFabric ? (
              <>
                <thead><tr><th>Rollo</th><th>Partida</th><th>Proveedor</th><th>Original</th><th>Actual</th></tr></thead>
                <tbody>{detail.rolls.map((roll) => {
                  const isExpanded = expandedRollId === roll.id;
                  const useMovements = roll.movements.filter((movement) => movement.reason === "USO");
                  return (
                    <Fragment key={roll.id}>
                      <tr
                        onClick={() => setExpandedRollId(isExpanded ? null : roll.id)}
                        tabIndex={0}
                        aria-expanded={isExpanded}
                      >
                        <td>
                          <span className={isExpanded ? styles.collapseIconOpen : styles.collapseIconClosed} aria-hidden="true" />
                          {roll.code}
                        </td>
                        <td>{roll.lot}</td>
                        <td>{roll.providerName}</td>
                        <td>{formatQuantity(roll.originalQuantity)}</td>
                        <td>{formatQuantity(roll.currentQuantity)}</td>
                      </tr>
                      {isExpanded ? (
                        <tr className={styles.expandedDetailRow}>
                          <td colSpan={5}>
                            <div className={styles.rollUsagePanel}>
                              <strong>Órdenes de corte donde se usó este rollo</strong>
                              {useMovements.length === 0 ? (
                                <p>No hay usos cargados para este rollo.</p>
                              ) : (
                                <table className={styles.nestedTable}>
                                  <thead>
                                    <tr>
                                      <th>Orden</th>
                                      <th>Cliente</th>
                                      <th>Producto</th>
                                      <th>Usado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {useMovements.map((movement) => (
                                      <tr key={movement.id}>
                                        <td>{movement.note || "Uso manual"}</td>
                                        <td>Sin vincular</td>
                                        <td>Sin vincular</td>
                                        <td>{formatQuantity(Math.abs(movement.quantityDelta))}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}</tbody>
              </>
            ) : (
              <>
                <thead><tr><th>Fecha</th><th>Proveedor</th><th>Comprobante</th><th>Cantidad</th></tr></thead>
                <tbody>{supplyDetail.entries.map((entry) => <tr key={entry.id}><td>{formatDate(entry.entryDate)}</td><td>{entry.providerName}</td><td>{entry.documentNumber ?? "Sin comprobante"}</td><td>{formatQuantity(entry.quantity)}</td></tr>)}</tbody>
              </>
            )}
          </table>
        </div>
        {isFabric ? (
          <form className={styles.actionPanel} onSubmit={handleAdjustment}>
            <h2>Ajuste / uso manual</h2>
            <Select label="Rollo" value={targetId} onChange={(event) => setTargetId(event.target.value)} options={detail.rolls.map((roll) => ({ value: roll.id, label: roll.code + " - queda " + formatQuantity(roll.currentQuantity) }))} />
            <Input label="Cantidad +/-" type="number" step="0.01" value={quantityDelta} onChange={(event) => setQuantityDelta(event.target.value)} required />
            <Select label="Motivo" value={reason} onChange={(event) => setReason(event.target.value as StockAdjustmentReason)} options={["CORRECCION", "USO", "ROTURA", "DEVOLUCION"].map((value) => ({ value, label: value }))} />
            <Input label="Nota" value={note} onChange={(event) => setNote(event.target.value)} />
            <Button type="submit">Guardar ajuste</Button>
          </form>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </Modal>
  );
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

function OrdersView({
  mode,
  orders,
  kanban,
  summary,
  onOpen,
  onMove,
  movingPartId,
  sectorDisplayMode,
  onNewOrder,
}: {
  mode: "orders" | "sectors";
  orders: DashboardRow[];
  kanban: DashboardKanbanResponse;
  summary: DashboardSummary | null;
  onOpen: (orderCode: string) => void;
  onMove: (partId: string, stage: StageOption) => void;
  movingPartId: string | null;
  sectorDisplayMode: "list" | "cards";
  onNewOrder: () => void;
}) {
  const [expandedSectors, setExpandedSectors] = useState<Record<number, boolean>>({});

  return (
    <div className={styles.dashboardStack}>
      <section className={styles.summaryGrid}>
        <SummaryTile label="Órdenes activas" value={summary?.activeOrders ?? 0} />
        <SummaryTile label="En riesgo" value={summary?.bottlenecks ?? 0} tone="warning" />
        <SummaryTile label="A tiempo" value={onTimeOrders(summary)} tone="success" />
        <SummaryTile label="Atrasadas" value={summary?.overdue ?? 0} tone="danger" />
      </section>

      <section className={styles.productionPanel}>
        <header className={styles.sectionTitleRow}>
          <div>
            <h2>{mode === "orders" ? "Listado de órdenes" : "Órdenes por sector"}</h2>
            <p>{mode === "orders" ? `${orders.length} órdenes visibles · prioridades del día` : `${kanban.stages.length} sectores operativos`}</p>
          </div>
          {mode === "orders" ? (
            <Button type="button" onClick={onNewOrder}>
              <span className={`${styles.buttonIcon} ${styles.iconPlus}`} aria-hidden="true" />
              Nueva orden
            </Button>
          ) : null}
        </header>

        {mode === "orders" ? (
          <div className={styles.ordersTableWrap}>
            <table className={styles.ordersTable}>
              <colgroup>
                <col className={styles.colOrderCode} />
                <col className={styles.colCreated} />
                <col className={styles.colAge} />
                <col className={styles.colQuantity} />
                <col className={styles.colFabric} />
                <col className={styles.colStage} />
                <col className={styles.colEstimated} />
                <col className={styles.colProgress} />
                <col className={styles.colStatus} />
              </colgroup>
              <thead>
                <tr>
                  <th>Orden / Cliente / Producto</th>
                  <th>Alta</th>
                  <th>Tiempo</th>
                  <th>Cantidad</th>
                  <th>Tela</th>
                  <th>Etapa actual</th>
                  <th>Estimado</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyState}>
                      No hay ordenes de corte para mostrar
                    </td>
                  </tr>
                ) : (
                  orders.map((row) => (
                    <tr key={row.partId} className={rowClassName(row.rowType)} onClick={() => onOpen(row.externalCode || row.internalCode || row.orderId)} tabIndex={0}>
                      <td>
                        <span className={styles.orderCode}>{rowCode(row)}</span>
                        <span className={styles.orderMeta}>{row.clientName}</span>
                        <span className={styles.orderProduct}>{row.articleName}</span>
                      </td>
                      <td>{formatDate(row.createdAt)}</td>
                      <td>{daysSince(row.createdAt)} d</td>
                      <td>{row.quantity} u</td>
                      <td>{row.fabricName}</td>
                      <td>{row.stage?.name ?? row.statusLabel}</td>
                      <td>{row.estimatedFinishAt ? formatDate(row.estimatedFinishAt) : "Sin fecha"}</td>
                      <td>
                        <ProgressMeter value={progressFor(row)} />
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${styles[`status${semaphoreTone(row.semaphore)}`]}`}>
                          {statusText(row)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : sectorDisplayMode === "list" ? (
          <section className={styles.sectorList}>
            {kanban.stages.map((column) => {
              const isExpanded = expandedSectors[column.stage.id] !== false;
              return (
                <article className={styles.sectorListGroup} key={column.stage.id}>
                  <button
                    type="button"
                    className={styles.sectorListHeader}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      setExpandedSectors((current) => ({
                        ...current,
                        [column.stage.id]: !isExpanded,
                      }));
                    }}
                  >
                    <span className={isExpanded ? styles.collapseIconOpen : styles.collapseIconClosed} aria-hidden="true" />
                    <strong>{column.stage.name}</strong>
                    <small>{column.parts.length} {column.parts.length === 1 ? "orden" : "órdenes"}</small>
                  </button>
                  {isExpanded ? (
                    <SectorOrdersTable
                      stage={column.stage}
                      parts={column.parts}
                      movingPartId={movingPartId}
                      onOpen={onOpen}
                    />
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : (
          <section className={styles.kanbanBoard}>
            {kanban.stages.map((column) => (
              <div
                className={styles.kanbanColumn}
                key={column.stage.id}
                data-stage-id={column.stage.id}
                data-stage-name={column.stage.name}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const partId = event.dataTransfer.getData("text/plain");
                  const currentStageId = Number(event.dataTransfer.getData("application/x-proma-stage"));
                  if (partId && currentStageId !== column.stage.id) {
                    onMove(partId, column.stage);
                  }
                }}
              >
                <header>
                  <strong>{column.stage.name}</strong>
                  <span>{column.parts.length}</span>
                </header>
                <div className={styles.kanbanCards}>
                  {column.parts.length === 0 ? <p>Sin ordenes</p> : null}
                  {column.parts.map((part) => (
                    <button
                      type="button"
                      key={part.id}
                      data-part-id={part.id}
                      className={part.id === movingPartId ? styles.kanbanCardMoving : ""}
                      draggable={part.id !== movingPartId}
                      disabled={part.id === movingPartId}
                      onClick={() => part.order && onOpen(part.order.externalCode || part.order.internalCode || part.order.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", part.id);
                        event.dataTransfer.setData("application/x-proma-stage", String(column.stage.id));
                      }}
                      onDragEnd={(event) => {
                        event.dataTransfer.clearData();
                      }}
                    >
                      <strong>{part.order?.externalCode ?? part.order?.internalCode ?? part.partCode}</strong>
                      <span>{part.order?.article?.name ?? part.partCode}</span>
                      <small>{part.id === movingPartId ? "Moviendo..." : `${part.order?.client?.businessName ?? "Cliente"} - ${part.quantity} u`}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </section>
    </div>
  );
}


function SectorOrdersTable({
  stage,
  parts,
  movingPartId,
  onOpen,
}: {
  stage: StageOption;
  parts: DashboardKanbanPart[];
  movingPartId: string | null;
  onOpen: (orderCode: string) => void;
}) {
  const contextLabel = sectorContextLabel(stage.code);
  return (
    <div className={styles.sectorOrdersTableWrap}>
      <table className={`${styles.ordersTable} ${styles.sectorOrdersTable}`}>
        <colgroup>
          <col className={styles.colOrderCode} />
          <col className={styles.colQuantity} />
          <col className={styles.colSectorContext} />
          <col className={styles.colSectorIngress} />
          <col className={styles.colSectorDays} />
          <col className={styles.colEstimated} />
          <col className={styles.colStatus} />
        </colgroup>
        <thead>
          <tr>
            <th>Orden / Cliente / Producto</th>
            <th>Cantidad</th>
            <th>{contextLabel}</th>
            <th>Ingreso</th>
            <th>Días</th>
            <th>Estimado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 ? (
            <tr>
              <td colSpan={7} className={styles.emptyState}>
                Sin órdenes
              </td>
            </tr>
          ) : (
            parts.map((part) => (
              <tr
                key={part.id}
                className={part.id === movingPartId ? styles.sectorListMovingRow : ""}
                onClick={() => part.order && onOpen(part.order.externalCode || part.order.internalCode || part.order.id)}
                tabIndex={part.order?.id ? 0 : -1}
              >
                <td>
                  <span className={styles.orderCode}>{part.order?.externalCode ?? part.order?.internalCode ?? part.partCode}</span>
                  <span className={styles.orderMeta}>{part.order?.client?.businessName ?? "Cliente"}</span>
                  <span className={styles.orderProduct}>{part.order?.article?.name ?? part.partCode}</span>
                </td>
                <td>{part.quantity} u</td>
                <td>{sectorContextValue(stage.code, part)}</td>
                <td>{partStartedAt(part) ? formatDate(partStartedAt(part) as string) : "Sin ingreso"}</td>
                <td>{partStartedAt(part) ? `${daysSince(partStartedAt(part) as string)} d` : "-"}</td>
                <td>{partEstimatedFinish(part) ? formatDate(partEstimatedFinish(part) as string) : "Sin fecha"}</td>
                <td>
                  <span className={`${styles.statusPill} ${styles.statusGreen}`}>
                    {part.id === movingPartId ? "Moviendo" : partStatusText(part.status)}
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


function Pagination({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const [draft, setDraft] = useState(String(page));
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setDraft(String(page));
  }, [page]);

  function go(nextPage: number) {
    onPageChange(Math.min(totalPages, Math.max(1, nextPage)));
  }

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <button type="button" onClick={() => go(1)} disabled={page <= 1} aria-label="Primera página">
        «
      </button>
      <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Página anterior">
        ‹
      </button>
      <div className={styles.paginationControl}>
        <span>Página</span>
        <input
          value={draft}
          inputMode="numeric"
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              go(Number(draft || page));
            }
          }}
        />
        <span>de {totalPages}</span>
        <button type="button" onClick={() => go(Number(draft || page))} disabled={Number(draft || page) === page}>
          Ir
        </button>
      </div>
      <button type="button" onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Página siguiente">
        ›
      </button>
      <button type="button" onClick={() => go(totalPages)} disabled={page >= totalPages} aria-label="Última página">
        »
      </button>
    </nav>
  );
}


function formatTwoDigits(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function onTimeOrders(summary: DashboardSummary | null): number {
  if (!summary) return 0;
  return Math.max(0, summary.activeOrders - summary.bottlenecks - summary.overdue - summary.inRepair);
}

function SummaryTile({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warning" | "success" | "danger" }) {
  return (
    <div className={`${styles.summaryTile} ${styles[`summary${tone}`]}`}>
      <span>{label}</span>
      <strong>{formatTwoDigits(value)}</strong>
    </div>
  );
}

function ProgressMeter({ value }: { value: number }) {
  return (
    <span className={styles.progressMeter} aria-label={`Avance ${value}%`}>
      <span className={styles.progressTrack}>
        <span style={{ width: `${value}%` }} />
      </span>
      <small>{value}%</small>
    </span>
  );
}

const stageProgress: Record<string, number> = {
  CORTE: 12,
  BORDADO: 34,
  ESTAMPADO: 42,
  AVIOS_CONFECCION: 50,
  CONFECCION: 66,
  ATRAQUE: 74,
  OJAL_BOTON: 82,
  AVIOS_TERMINACION: 88,
  PLANCHA: 94,
  TERMINACION: 100,
};

function progressFor(row: DashboardRow): number {
  if (row.semaphore === "FINALIZED" || row.partStatus === "FINALIZADA") {
    return 100;
  }
  const stageCode = row.stage?.code;
  if (stageCode && stageCode in stageProgress) {
    return stageProgress[stageCode];
  }
  return 8;
}

function statusText(row: DashboardRow): string {
  if (row.semaphore === "OVERDUE") return "Atrasada";
  if (row.semaphore === "WARNING") return "En riesgo";
  if (row.semaphore === "FINALIZED") return "Finalizada";
  if (row.orderStatus === "EN_ARREGLO") return "Arreglo";
  return "A tiempo";
}

function partStatusText(status: string): string {
  if (status === "EN_PROCESO") return "En proceso";
  if (status === "PENDIENTE") return "Pendiente";
  if (status === "FINALIZADA") return "Finalizada";
  if (status === "DIVIDIDA") return "Dividida";
  if (status === "REINTEGRADA") return "Reintegrada";
  return status;
}

function partEstimatedFinish(part: DashboardKanbanPart): string | null {
  return activePartEvent(part)?.estimatedFinishAt ?? null;
}

function partStartedAt(part: DashboardKanbanPart): string | null {
  return activePartEvent(part)?.startedAt ?? null;
}

function activePartEvent(part: DashboardKanbanPart): NonNullable<DashboardKanbanPart["events"]>[number] | null {
  return part.events?.find((event) => !event.finishedAt) ?? null;
}

function sectorContextLabel(stageCode: string): string {
  const labels: Record<string, string> = {
    CORTE: "Tela",
    BORDADO: "Parte a bordar",
    ESTAMPADO: "Parte a estampar",
    AVIOS_CONFECCION: "Avíos",
    CONFECCION: "Taller",
    ATRAQUE: "Detalle",
    OJAL_BOTON: "Ojal y botón",
    AVIOS_TERMINACION: "Detalle",
    PLANCHA: "Plancha",
    TERMINACION: "Terminación",
  };
  return labels[stageCode] ?? "Detalle";
}

function sectorContextValue(stageCode: string, part: DashboardKanbanPart): string {
  const event = activePartEvent(part);
  if (stageCode === "CORTE") {
    return part.order?.fabric?.name ?? "Sin tela";
  }
  if (stageCode === "BORDADO" || stageCode === "ESTAMPADO") {
    return decorationContext(part, stageCode === "BORDADO" ? "BORDADO" : "ESTAMPADO");
  }
  if (stageCode === "AVIOS_CONFECCION") {
    return suppliesContext(part, "CONFECCION") || "Avíos de confección";
  }
  if (stageCode === "CONFECCION") {
    return event?.workshop?.name ?? "Interna";
  }
  if (stageCode === "ATRAQUE") {
    return "Sin detalle";
  }
  if (stageCode === "OJAL_BOTON") {
    const base = event?.note || "Ojal y botón según artículo";
    return event?.workshop?.name ? `${base} · ${event.workshop.name}` : base;
  }
  if (stageCode === "AVIOS_TERMINACION") {
    return "Sin detalle";
  }
  if (stageCode === "PLANCHA") {
    if (event?.executionType === "EXTERNO") {
      return event.workshop?.name ?? "Taller externo";
    }
    if (event?.executionType === "INTERNO") {
      return "Interna";
    }
    return "No lleva";
  }
  if (stageCode === "TERMINACION") {
    return suppliesContext(part, "TERMINACION") || "Embolsado final / etiquetado";
  }
  return event?.note || "Sin detalle";
}

function decorationContext(part: DashboardKanbanPart, decorationType: string): string {
  if (part.splitReason) {
    return part.splitReason;
  }
  const parts = part.order?.article?.decorationParts
    ?.filter((decorationPart) => decorationPart.decorationType === decorationType)
    .map((decorationPart) => decorationPart.garmentPart)
    .filter(Boolean);
  return parts && parts.length > 0 ? parts.join(", ") : "Parte a definir";
}

function suppliesContext(part: DashboardKanbanPart, category: string): string {
  const supplies = part.supplies
    ?.filter((entry) => !entry.supply?.category || entry.supply.category === category)
    .map((entry) => {
      const name = entry.supply?.name ?? entry.supply?.code;
      if (!name) {
        return "";
      }
      return entry.quantityNeeded ? `${name} x ${entry.quantityNeeded}` : name;
    })
    .filter(Boolean);
  return supplies && supplies.length > 0 ? supplies.join(", ") : "";
}

function userInitials(value: string): string {
  return value
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

function rowCode(row: DashboardRow): string {
  if (row.rowType === "SPLIT_CHILD") {
    return `${row.internalCode}-${row.partCode}`;
  }
  return row.externalCode || row.internalCode;
}

function semaphoreTone(value: DashboardRow["semaphore"]): "Red" | "Yellow" | "Green" {
  if (value === "OVERDUE") return "Red";
  if (value === "WARNING") return "Yellow";
  return "Green";
}

function daysSince(value: string): number {
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - created) / (24 * 60 * 60 * 1000)));
}


function formatTodayLabel(): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date())
    .replace(".", "")
    .toUpperCase();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function rowClassName(kind: DashboardRow["rowType"]): string {
  if (kind === "SPLIT_PARENT") {
    return styles.splitParentRow;
  }
  if (kind === "SPLIT_CHILD") {
    return styles.childOrderRow;
  }
  return "";
}

function NotificationBell({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <div className={styles.notificationBox}>
      <button
        type="button"
        className={styles.notificationButton}
        onClick={onToggle}
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <span>!</span>
        {unreadCount > 0 ? <strong>{unreadCount}</strong> : null}
      </button>
      {isOpen ? (
        <div className={styles.notificationPanel}>
          <div className={styles.notificationHeader}>
            <strong>Notificaciones</strong>
            <button type="button" onClick={onMarkAllRead} disabled={unreadCount === 0}>
              Leer todas
            </button>
          </div>
          <div className={styles.notificationList}>
            {notifications.length === 0 ? (
              <p>Sin notificaciones</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={notification.isRead ? styles.notificationItem : styles.notificationItemUnread}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <span>{notification.message}</span>
                  <small>{notification.stage?.name ?? notification.type} · {formatDate(notification.createdAt)}</small>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
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

function buildColumns(resource: MasterName) {
  const chevron = {
    key: "open",
    label: "",
    render: () => <span className={styles.rowChevron} aria-hidden="true">›</span>,
  };

  if (resource === "users") {
    return [
      { key: "name", label: "Nombre", render: (item: MasterItem) => (item as UserMaster).fullName },
      { key: "sector", label: "Sector", render: (item: MasterItem) => formatUserSector(item as UserMaster) },
      { key: "email", label: "Email", render: (item: MasterItem) => (item as UserMaster).email },
      { key: "status", label: "Estado", render: (item: MasterItem) => statusBadge((item as UserMaster).isActive) },
      chevron,
    ];
  }

  if (resource === "providers") {
    return [
      { key: "businessName", label: "Proveedor", render: (item: MasterItem) => (item as ProviderMaster).businessName },
      { key: "tax", label: "CUIT/CUIL", render: (item: MasterItem) => (item as ProviderMaster).taxId ?? "Sin dato" },
      { key: "address", label: "Dirección", render: (item: MasterItem) => formatFullAddress(item as ProviderMaster) },
      { key: "contacts", label: "Contacto", render: (item: MasterItem) => formatContacts((item as ProviderMaster).contacts) },
      { key: "status", label: "Estado", render: (item: MasterItem) => statusBadge((item as ProviderMaster).isActive) },
      chevron,
    ];
  }

  if (resource === "fabrics") {
    return [
      { key: "description", label: "Descripción", render: (item: MasterItem) => (item as FabricMaster).name },
      { key: "color", label: "Color", render: (item: MasterItem) => (item as FabricMaster).color ?? "Sin color" },
      { key: "weight", label: "Onzaje", render: (item: MasterItem) => (item as FabricMaster).weightOz ?? "Sin dato" },
      { key: "type", label: "Tipo", render: (item: MasterItem) => (item as FabricMaster).weaveType },
      { key: "format", label: "Formato", render: (item: MasterItem) => (item as FabricMaster).formatType },
      chevron,
    ];
  }

  if (resource === "supplies") {
    return [
      { key: "code", label: "Código", render: (item: MasterItem) => (item as SupplyMaster).code },
      { key: "description", label: "Descripción", render: (item: MasterItem) => (item as SupplyMaster).description || (item as SupplyMaster).name },
      { key: "category", label: "Categoría", render: (item: MasterItem) => (item as SupplyMaster).category },
      { key: "color", label: "Color", render: (item: MasterItem) => (item as SupplyMaster).color ?? "Sin color" },
      chevron,
    ];
  }

  if (resource === "size-curves") {
    return [
      { key: "name", label: "Curva", render: (item: MasterItem) => (item as SizeCurveMaster).name },
      { key: "type", label: "Tipo", render: (item: MasterItem) => (item as SizeCurveMaster).sequenceType },
      { key: "values", label: "Curva entera", render: (item: MasterItem) => formatList((item as SizeCurveMaster).values, (value) => value.label) },
      chevron,
    ];
  }

  if (resource === "workshops") {
    return [
      { key: "name", label: "Taller", render: (item: MasterItem) => (item as WorkshopMaster).name },
      { key: "type", label: "Tipo", render: (item: MasterItem) => formatList((item as WorkshopMaster).specialties) },
      { key: "specialty", label: "Especialidad", render: (item: MasterItem) => (item as WorkshopMaster).specialtyDetail ?? "Sin especificar" },
      { key: "address", label: "Dirección", render: (item: MasterItem) => formatFullAddress(item as WorkshopMaster) },
      { key: "contacts", label: "Contacto", render: (item: MasterItem) => formatContacts((item as WorkshopMaster).contacts) },
      chevron,
    ];
  }

  if (resource === "articles") {
    return [
      { key: "code", label: "Código", render: (item: MasterItem) => (item as ArticleMaster).code },
      { key: "description", label: "Descripción", render: (item: MasterItem) => (item as ArticleMaster).description || (item as ArticleMaster).name },
      chevron,
    ];
  }

  return [
    { key: "businessName", label: "Cliente", render: (item: MasterItem) => (item as ClientMaster).businessName },
    { key: "tax", label: "CUIT/CUIL", render: (item: MasterItem) => (item as ClientMaster).taxId },
    { key: "address", label: "Dirección", render: (item: MasterItem) => formatFullAddress(item as ClientMaster) },
    { key: "contacts", label: "Contacto", render: (item: MasterItem) => formatContacts((item as ClientMaster).contacts) },
    chevron,
  ];
}


function StockEntryModal({
  token,
  initialKind = "fabric",
  onClose,
  onSaved,
}: {
  token: string;
  initialKind?: "fabric" | "supply";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [providers, setProviders] = useState<ProviderMaster[]>([]);
  const [fabrics, setFabrics] = useState<FabricMaster[]>([]);
  const [supplies, setSupplies] = useState<SupplyMaster[]>([]);
  const [kind, setKind] = useState<"fabric" | "supply">(initialKind);
  const [form, setForm] = useState<FormState>({
    providerId: "",
    fabricId: "",
    supplyId: "",
    entryDate: todayInputDate(),
    documentNumber: "",
    quantity: "",
    rolls: "",
    note: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      const [providerResult, fabricResult, supplyResult] = await Promise.all([
        listMasters<ProviderMaster>("providers", token, "", 1, 100),
        listMasters<FabricMaster>("fabrics", token, "", 1, 100),
        listMasters<SupplyMaster>("supplies", token, "", 1, 100),
      ]);
      setProviders(providerResult.items);
      setFabrics(fabricResult.items);
      setSupplies(supplyResult.items);
      setForm((current) => ({
        ...current,
        providerId: current.providerId || providerResult.items[0]?.id || "",
        fabricId: current.fabricId || fabricResult.items[0]?.id || "",
        supplyId: current.supplyId || supplyResult.items[0]?.id || "",
      }));
    }

    void loadOptions().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar opciones de stock");
    });
  }, [token]);

  function setValue(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (!form.providerId) {
        setError("Seleccioná un proveedor.");
        return;
      }
      if (kind === "fabric") {
        const rolls = parseRolls(form.rolls);
        if (!form.fabricId || rolls.length === 0) {
          setError("Seleccioná una tela y cargá al menos un rollo con código y lote.");
          return;
        }
        await createFabricStockEntry(token, {
          providerId: form.providerId,
          fabricId: form.fabricId,
          entryDate: new Date(`${form.entryDate}T00:00:00`).toISOString(),
          documentNumber: form.documentNumber || undefined,
          note: form.note || undefined,
          rolls,
        });
      } else {
        const quantity = Number(form.quantity);
        if (!form.supplyId || !Number.isFinite(quantity) || quantity <= 0) {
          setError("Seleccioná un avío y cargá una cantidad mayor a cero.");
          return;
        }
        await createSupplyStockEntry(token, {
          providerId: form.providerId,
          supplyId: form.supplyId,
          entryDate: new Date(`${form.entryDate}T00:00:00`).toISOString(),
          documentNumber: form.documentNumber || undefined,
          note: form.note || undefined,
          quantity,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el ingreso");
    }
  }

  const missingOptions = providers.length === 0 || (kind === "fabric" ? fabrics.length === 0 : supplies.length === 0);

  return (
    <Modal title="Nuevo ingreso de stock" onClose={onClose}>
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <div className={styles.stockTypeSwitch} role="group" aria-label="Tipo de ingreso">
          <button type="button" className={kind === "fabric" ? styles.stockTypeActive : ""} onClick={() => setKind("fabric")}>
            Tela por rollos
          </button>
          <button type="button" className={kind === "supply" ? styles.stockTypeActive : ""} onClick={() => setKind("supply")}>
            Avíos por cantidad
          </button>
        </div>
        <div className={styles.compactGrid}>
          <Select label="Proveedor" value={form.providerId} onChange={(event) => setValue("providerId", event.target.value)} options={providers.map((provider) => ({ label: provider.businessName, value: provider.id }))} />
          <Input label="Fecha" type="date" value={form.entryDate} onChange={(event) => setValue("entryDate", event.target.value)} required />
          <Input label="Comprobante" value={form.documentNumber} onChange={(event) => setValue("documentNumber", event.target.value)} />
          {kind === "fabric" ? (
            <Select label="Tela" value={form.fabricId} onChange={(event) => setValue("fabricId", event.target.value)} options={fabrics.map((fabric) => ({ label: `${fabric.code} - ${fabric.name}${fabric.color ? ` / ${fabric.color}` : ""}`, value: fabric.id }))} />
          ) : (
            <Select label="Avío" value={form.supplyId} onChange={(event) => setValue("supplyId", event.target.value)} options={supplies.map((supply) => ({ label: `${supply.code} - ${supply.name}`, value: supply.id }))} />
          )}
          {kind === "supply" ? (
            <Input label="Cantidad" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setValue("quantity", event.target.value)} required />
          ) : null}
        </div>
        {kind === "fabric" ? (
          <label className={styles.textAreaLabel}>
            Rollos: código|lote|cantidad
            <textarea value={form.rolls} onChange={(event) => setValue("rolls", event.target.value)} placeholder={"R001|Lote A|25\nR002|Lote A|30"} required />
          </label>
        ) : null}
        <label className={styles.textAreaLabel}>
          Nota
          <textarea value={form.note} onChange={(event) => setValue("note", event.target.value)} />
        </label>
        {missingOptions ? (
          <p className={styles.error}>
            Para cargar ingresos debe existir al menos un proveedor y {kind === "fabric" ? "una tela" : "un avío"}.
          </p>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={missingOptions}>Registrar ingreso</Button>
        </div>
      </form>
    </Modal>
  );
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

  async function handleDeactivate() {
    if (!item) return;
    setError("");
    try {
      await deleteMaster(resource, token, item.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar");
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
          {item ? (
            <Button type="button" variant="danger" onClick={() => void handleDeactivate()}>
              Desactivar
            </Button>
          ) : null}
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
  if (resource === "providers") {
    return (
      <div className={styles.compactGrid}>
        <Input label="Proveedor" value={form.businessName} onChange={(event) => setValue("businessName", event.target.value)} required />
        <Input label="CUIT/CUIL" value={form.taxId} onChange={(event) => setValue("taxId", event.target.value)} />
        <Input label="Dirección" value={form.address} onChange={(event) => setValue("address", event.target.value)} />
        <Input label="Localidad" value={form.locality} onChange={(event) => setValue("locality", event.target.value)} />
        <Input label="Partido" value={form.district} onChange={(event) => setValue("district", event.target.value)} />
        <Input label="Provincia" value={form.province} onChange={(event) => setValue("province", event.target.value)} />
        <Input label="Contactos" value={form.contacts} onChange={(event) => setValue("contacts", event.target.value)} placeholder="Nombre|email|fijo|cel1|cel2; Otro|email" />
      </div>
    );
  }

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
        <Input label="Tipo de taller" value={form.specialties} onChange={(event) => setValue("specialties", event.target.value)} placeholder="CONFECCION, PLANCHA" />
        <Input label="Especialidad" value={form.specialtyDetail} onChange={(event) => setValue("specialtyDetail", event.target.value)} placeholder="Pantalones, remeras, camperas" />
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
  if (resource === "providers") {
    const provider = item as ProviderMaster | null;
    return {
      businessName: provider?.businessName ?? "",
      taxId: provider?.taxId ?? "",
      address: provider?.address ?? "",
      locality: provider?.locality ?? "",
      district: provider?.district ?? "",
      province: provider?.province ?? "",
      contacts: formatContactsInput(provider?.contacts),
    };
  }
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
      specialtyDetail: workshop?.specialtyDetail ?? "",
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
  if (resource === "providers") {
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
      specialtyDetail: form.specialtyDetail,
      contacts: parseContacts(form.contacts),
    });
  }
  if (resource === "fabrics") {
    return compact({
      code: form.code,
      name: form.name,
      color: form.color,
      weightOz: form.weightOz ? Number(form.weightOz) : undefined,
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


function parseRolls(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [code, lot, quantity] = entry.split("|").map((part) => part.trim());
      return { code, lot, quantity: Number(quantity) };
    })
    .filter((roll) => roll.code && roll.lot && Number.isFinite(roll.quantity) && roll.quantity > 0);
}

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusBadge(isActive: boolean) {
  return <span className={isActive ? styles.masterStatusActive : styles.masterStatusInactive}>{isActive ? "Activo" : "Inactivo"}</span>;
}

function formatFullAddress(item: { address?: string | null; locality?: string | null; district?: string | null; province?: string | null }): string {
  return [item.address, item.locality, item.district, item.province].filter(Boolean).join(" / ") || "Sin dirección";
}

function formatContacts(contacts?: { contactName: string; mobilePhone1?: string | null; fixedPhone?: string | null }[]): string {
  return formatList(contacts, (contact) => `${contact.contactName}${contact.mobilePhone1 ? ` ${contact.mobilePhone1}` : contact.fixedPhone ? ` ${contact.fixedPhone}` : ""}`, "Sin contactos");
}

function formatContactsInput(contacts?: { contactName: string; email?: string | null; fixedPhone?: string | null; mobilePhone1?: string | null; mobilePhone2?: string | null; roleNote?: string | null }[]): string {
  return (contacts ?? []).map((contact) => [contact.contactName, contact.email ?? "", contact.fixedPhone ?? "", contact.mobilePhone1 ?? "", contact.mobilePhone2 ?? "", contact.roleNote ?? ""].join("|")).join("; ");
}

function formatUserSector(user: UserMaster): string {
  if (user.role === "ADMIN") return "Admin";
  const sectors = [...new Set((user.permissions ?? []).filter((permission) => permission.isAllowed && permission.sectorCode).map((permission) => permission.sectorCode))];
  return sectors.join(", ") || "Sin sector";
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
