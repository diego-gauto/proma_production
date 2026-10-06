import { ReactNode } from "react";
import styles from "./Table.module.css";

type TableProps<T> = {
  columns: { key: string; label: string; render: (item: T) => ReactNode }[];
  items: T[];
  emptyText: string;
  onRowClick?: (item: T) => void;
};

export function Table<T>({ columns, items, emptyText, onRowClick }: TableProps<T>) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyText}
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={index}
                className={onRowClick ? styles.clickableRow : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(event) => {
                  if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {columns.map((column) => (
                  <td key={column.key}>{column.render(item)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
