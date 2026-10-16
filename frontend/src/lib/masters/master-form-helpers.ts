import {
  ArticleMaster,
  ClientMaster,
  ContactMaster,
  FabricMaster,
  MasterName,
  ProviderMaster,
  SizeCurveMaster,
  SupplyMaster,
  UserMaster,
  WorkshopMaster,
} from "../api/masters.api";
import { DEFAULT_PROVINCE } from "../geo/argentina";

export type MasterItem =
  | ClientMaster
  | ProviderMaster
  | WorkshopMaster
  | ArticleMaster
  | FabricMaster
  | SupplyMaster
  | SizeCurveMaster
  | UserMaster;

export type FormState = Record<string, string>;

export const masterResources: {
  key: MasterName;
  label: string;
  singular: string;
  empty: string;
  description: string;
}[] = [
  { key: "clients", label: "Clientes", singular: "Cliente", empty: "Sin clientes cargados", description: "Razón social, CUIT y contactos comerciales." },
  { key: "providers", label: "Proveedores", singular: "Proveedor", empty: "Sin proveedores cargados", description: "Proveedor para ingresos de stock de telas y avíos." },
  { key: "workshops", label: "Talleres externos", singular: "Taller", empty: "Sin talleres cargados", description: "Talleres por especialidad productiva." },
  { key: "fabrics", label: "Telas", singular: "Tela", empty: "Sin telas cargadas", description: "Catálogo de telas disponibles para órdenes." },
  { key: "supplies", label: "Avíos", singular: "Avío", empty: "Sin avíos cargados", description: "Insumos de confección o terminación." },
  { key: "size-curves", label: "Curvas de talles", singular: "Curva", empty: "Sin curvas cargadas", description: "Secuencias de talles para cargar cantidades." },
  { key: "articles", label: "Artículos", singular: "Artículo", empty: "Sin artículos cargados", description: "Producto a cortar, con avíos y partes decorables." },
  { key: "users", label: "Usuarios y permisos", singular: "Usuario", empty: "Sin usuarios cargados", description: "Acceso, rol base y permisos por sector." },
];

export const resourceKeys = new Set<MasterName>(masterResources.map((resource) => resource.key));

export function initialForm(resource: MasterName, item: MasterItem | null): FormState {
  if (resource === "providers") {
    const provider = item as ProviderMaster | null;
    return {
      businessName: provider?.businessName ?? "",
      taxId: provider?.taxId ?? "",
      businessSector: provider?.businessSector ?? "",
      email: provider?.email ?? "",
      fixedPhone: provider?.fixedPhone ?? "",
      street: provider?.street ?? "",
      streetNumber: provider?.streetNumber ?? "",
      floorApartment: provider?.floorApartment ?? "",
      address: provider?.address ?? "",
      locality: provider?.locality ?? "",
      district: provider?.district ?? "",
      province: provider?.province ?? DEFAULT_PROVINCE,
      contacts: formatContactsInput(provider?.contacts),
    };
  }
  if (resource === "users") {
    const user = item as UserMaster | null;
    return {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "",
      permissions: formatPermissionsInput(user?.permissions),
    };
  }
  if (resource === "workshops") {
    const workshop = item as WorkshopMaster | null;
    return {
      name: workshop?.name ?? "",
      email: workshop?.email ?? "",
      fixedPhone: workshop?.fixedPhone ?? "",
      street: workshop?.street ?? "",
      streetNumber: workshop?.streetNumber ?? "",
      floorApartment: workshop?.floorApartment ?? "",
      address: workshop?.address ?? "",
      locality: workshop?.locality ?? "",
      district: workshop?.district ?? "",
      province: workshop?.province ?? DEFAULT_PROVINCE,
      specialties: workshop?.specialties.join(", ") ?? "",
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
      weaveType: fabric?.weaveType ?? "",
      formatType: fabric?.formatType ?? "",
    };
  }
  if (resource === "supplies") {
    const supply = item as SupplyMaster | null;
    return {
      code: supply?.code ?? "",
      name: supply?.name ?? "",
      description: supply?.description ?? "",
      color: supply?.color ?? "",
      category: supply?.category ?? "",
    };
  }
  if (resource === "size-curves") {
    const curve = item as SizeCurveMaster | null;
    return {
      name: curve?.name ?? "",
      sequenceType: curve?.sequenceType ?? "",
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
    businessSector: client?.businessSector ?? "",
    email: client?.email ?? "",
    fixedPhone: client?.fixedPhone ?? "",
    street: client?.street ?? "",
    streetNumber: client?.streetNumber ?? "",
    floorApartment: client?.floorApartment ?? "",
    address: client?.address ?? "",
    locality: client?.locality ?? "",
    district: client?.district ?? "",
    province: client?.province ?? "",
    contacts: formatContactsInput(client?.contacts),
  };
}

export function buildPayload(resource: MasterName, form: FormState, isEditing: boolean): Record<string, unknown> {
  if (resource === "providers") {
    return compact({
      businessName: form.businessName,
      taxId: form.taxId,
      businessSector: form.businessSector,
      email: form.email,
      fixedPhone: form.fixedPhone,
      street: form.street,
      streetNumber: form.streetNumber,
      floorApartment: form.floorApartment,
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
      email: form.email,
      fixedPhone: form.fixedPhone,
      street: form.street,
      streetNumber: form.streetNumber,
      floorApartment: form.floorApartment,
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
    businessSector: form.businessSector,
    email: form.email,
    fixedPhone: form.fixedPhone,
    street: form.street,
    streetNumber: form.streetNumber,
    floorApartment: form.floorApartment,
    address: form.address,
    locality: form.locality,
    district: form.district,
    province: form.province,
    contacts: parseContacts(form.contacts),
  });
}

export function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== undefined));
}

export function splitComma(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function parseContacts(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry, index) => {
    const [contactName, mobilePhone1, roleNote] = entry.split("|").map((part) => part.trim());
    return compact({ contactName, mobilePhone1, roleNote, isPrimary: index === 0 });
  });
}

export function parsePermissions(value: string) {
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

export function parseArticleSupplies(value: string) {
  const structured = parseJsonArray(value);
  if (structured) {
    return structured.map((entry) => compact({
      supplyId: stringValue(entry.supplyId),
      quantity: numberValue(entry.quantity),
      note: stringValue(entry.note),
    })).filter((entry) => entry.supplyId);
  }

  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [supplyId, quantity, note] = entry.split("|").map((part) => part.trim());
    return compact({ supplyId, quantity: quantity ? Number(quantity) : undefined, note });
  });
}

export function parseDecorationParts(value: string) {
  const structured = parseJsonArray(value);
  if (structured) {
    return structured.map((entry) => compact({
      garmentPart: stringValue(entry.garmentPart),
      decorationType: stringValue(entry.decorationType),
      placement: stringValue(entry.placement),
      decorationCode: stringValue(entry.decorationCode),
      imageUrl: stringValue(entry.imageUrl),
      notes: stringValue(entry.notes),
    })).filter((entry) => entry.garmentPart && entry.decorationType);
  }

  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [garmentPart, decorationType] = entry.split(":").map((part) => part.trim());
    return { garmentPart, decorationType };
  }).filter((part) => part.garmentPart && part.decorationType);
}

function parseJsonArray(value: string): Record<string, unknown>[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)) : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function formatContactsInput(contacts?: ContactMaster[]): string {
  return (contacts ?? []).map((contact) => [
    contact.contactName,
    contact.mobilePhone1 ?? "",
    contact.roleNote ?? "",
  ].join("|")).join("; ");
}

export function formatPermissionsInput(permissions?: { sectorCode: string | null; action: string; isAllowed: boolean }[]): string {
  const grouped = new Map<string, string[]>();
  for (const permission of permissions ?? []) {
    if (!permission.isAllowed) continue;
    const key = permission.sectorCode ?? "*";
    grouped.set(key, [...(grouped.get(key) ?? []), permission.action]);
  }
  return [...grouped.entries()].map(([sector, actions]) => `${sector}:${actions.join(",")}`).join("; ");
}

export function formatArticleSuppliesInput(supplies?: { quantity?: string | null; note?: string | null; supply?: SupplyMaster }[]): string {
  return (supplies ?? []).map((entry) => [entry.supply?.id ?? "", entry.quantity ?? "", entry.note ?? ""].join("|")).join("; ");
}

export function formatDecorationInput(parts?: { garmentPart: string; decorationType: string; placement?: string | null; decorationCode?: string | null; imageUrl?: string | null; notes?: string | null }[]): string {
  return JSON.stringify((parts ?? []).map((part) => ({
    garmentPart: part.garmentPart,
    decorationType: part.decorationType,
    placement: part.placement ?? "",
    decorationCode: part.decorationCode ?? "",
    imageUrl: part.imageUrl ?? "",
    notes: part.notes ?? "",
  })));
}
