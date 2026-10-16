"use client";

import Link from "next/link";
import { FormEvent, ReactNode } from "react";
import styles from "./AppTopBar.module.css";

export type AppTopBarSection = "orders" | "sectors" | "masters" | "stock";

export type AppTopBarProps = {
  activeSection: AppTopBarSection;
  canShowManagement?: boolean;
  canShowSectors?: boolean;
  canShowStock?: boolean;
  onNavigate?: (section: AppTopBarSection) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  searchLabel?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  actions?: ReactNode;
  userFullName?: string;
  userEmail?: string;
  onLogout?: () => void;
};

const navItems: { section: AppTopBarSection; label: string; href: string; iconClass: string }[] = [
  { section: "orders", label: "Órdenes", href: "/ordenes", iconClass: styles.iconOrders },
  { section: "sectors", label: "Sectores", href: "/sectores", iconClass: styles.iconSectors },
  { section: "masters", label: "Gestión", href: "/gestion", iconClass: styles.iconManagement },
  { section: "stock", label: "Stock", href: "/stock", iconClass: styles.iconStock },
];

export function AppTopBar({
  activeSection,
  canShowManagement = true,
  canShowSectors = true,
  canShowStock = true,
  onNavigate,
  searchValue,
  searchPlaceholder = "Buscar orden",
  searchLabel = "Buscar orden",
  onSearchChange,
  onSearchSubmit,
  actions,
  userFullName,
  userEmail,
  onLogout,
}: AppTopBarProps) {
  const visibleItems = navItems.filter((item) => {
    if (item.section === "masters") return canShowManagement;
    if (item.section === "sectors") return canShowSectors;
    if (item.section === "stock") return canShowStock;
    return true;
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit?.();
  }

  return (
    <header className={styles.topBar}>
      {onNavigate ? (
        <button className={styles.brandButton} type="button" onClick={() => onNavigate("orders")}>
          <span className={styles.brandMark} aria-hidden="true" />
          <strong>Control de producción</strong>
        </button>
      ) : (
        <Link className={styles.brandButton} href="/ordenes">
          <span className={styles.brandMark} aria-hidden="true" />
          <strong>Control de producción</strong>
        </Link>
      )}

      <nav className={styles.topNav} aria-label="Navegación principal">
        {visibleItems.map((item) =>
          onNavigate ? (
            <button
              key={item.section}
              className={activeSection === item.section ? styles.navActive : ""}
              type="button"
              onClick={() => onNavigate(item.section)}
            >
              <span className={`${styles.navIcon} ${item.iconClass}`} aria-hidden="true" />
              {item.label}
            </button>
          ) : (
            <Link
              key={item.section}
              className={activeSection === item.section ? styles.navActive : ""}
              href={item.href}
              aria-current={activeSection === item.section ? "page" : undefined}
            >
              <span className={`${styles.navIcon} ${item.iconClass}`} aria-hidden="true" />
              {item.label}
            </Link>
          ),
        )}
        <button className={styles.navMuted} type="button" disabled>
          <span className={`${styles.navIcon} ${styles.iconReports}`} aria-hidden="true" />
          Reportes
        </button>
      </nav>

      <div className={styles.topActions}>
        {onSearchChange ? (
          <form className={styles.topSearch} onSubmit={handleSubmit}>
            <label>
              <span>{searchLabel}</span>
              <span className={`${styles.inputIcon} ${styles.iconSearch}`} aria-hidden="true" />
              <input
                name="globalSearch"
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </label>
          </form>
        ) : null}
        {actions}
        {userFullName && onLogout ? (
          <div className={styles.profileBox}>
            <details>
              <summary className={styles.profileButton} title={userFullName}>
                {userInitials(userFullName)}
              </summary>
              <div className={styles.profilePanel}>
                <strong>{userFullName}</strong>
                {userEmail ? <span>{userEmail}</span> : null}
                <button type="button" onClick={onLogout}>Cerrar sesión</button>
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function userInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}
