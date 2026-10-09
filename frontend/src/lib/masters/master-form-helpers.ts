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
      role: user?.role ?? "",
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

export function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== undefined));
}

export function splitComma(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function parseContacts(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry, index) => {
    const [contactName, email, fixedPhone, mobilePhone1, mobilePhone2, roleNote] = entry.split("|").map((part) => part.trim());
    return compact({ contactName, email, fixedPhone, mobilePhone1, mobilePhone2, roleNote, isPrimary: index === 0 });
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
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [supplyId, quantity, note] = entry.split("|").map((part) => part.trim());
    return compact({ supplyId, quantity: quantity ? Number(quantity) : undefined, note });
  });
}

export function parseDecorationParts(value: string) {
  return value.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [garmentPart, decorationType] = entry.split(":").map((part) => part.trim());
    return { garmentPart, decorationType };
  }).filter((part) => part.garmentPart && part.decorationType);
}

export function formatContactsInput(contacts?: ContactMaster[]): string {
  return (contacts ?? []).map((contact) => [
    contact.contactName,
    contact.email ?? "",
    contact.fixedPhone ?? "",
    contact.mobilePhone1 ?? "",
    contact.mobilePhone2 ?? "",
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

export function formatDecorationInput(parts?: { garmentPart: string; decorationType: string }[]): string {
  return (parts ?? []).map((part) => `${part.garmentPart}:${part.decorationType}`).join("; ");
}
