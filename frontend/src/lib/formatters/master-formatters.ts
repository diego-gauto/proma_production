export function formatList<T>(
  values: T[] | null | undefined,
  render: (value: T) => string = (value) => String(value),
  emptyText = "Sin datos",
): string {
  if (!Array.isArray(values) || values.length === 0) {
    return emptyText;
  }

  const formatted = values.map(render).filter(Boolean).join(", ");
  return formatted || emptyText;
}
