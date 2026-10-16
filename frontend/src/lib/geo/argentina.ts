export type GeoOption = {
  id: string;
  name: string;
};

type GeoRefNamedItem = {
  id?: string | number;
  nombre: string;
};

type GeoRefDepartmentsResponse = {
  departamentos?: GeoRefNamedItem[];
};

type GeoRefLocalitiesResponse = {
  localidades?: GeoRefNamedItem[];
};

type GeoRefStreetHeightSide = {
  derecha?: number | null;
  izquierda?: number | null;
};

type GeoRefStreetHeight = {
  inicio?: GeoRefStreetHeightSide | null;
  fin?: GeoRefStreetHeightSide | null;
};

export type GeoRefStreet = {
  id?: string | number;
  nombre: string;
  altura?: GeoRefStreetHeight | null;
  localidad_censal?: GeoRefNamedItem | null;
};

type GeoRefStreetsResponse = {
  calles?: GeoRefStreet[];
};

export type AddressValidationResult = {
  status: "valid" | "warning" | "invalid";
  message?: string;
};

export type StreetAddressInput = {
  province: string;
  department: string;
  locality: string;
  street: string;
  streetNumber: string;
};

const GEOREF_BASE_URL = "https://apis.datos.gob.ar/georef/api";

export const DEFAULT_PROVINCE = "Buenos Aires";
export const CABA_PROVINCE = "Ciudad Autónoma de Buenos Aires";

export const CABA_NEIGHBORHOODS: GeoOption[] = [
  "Agronomía",
  "Almagro",
  "Balvanera",
  "Barracas",
  "Belgrano",
  "Boedo",
  "Caballito",
  "Chacarita",
  "Coghlan",
  "Colegiales",
  "Constitución",
  "Flores",
  "Floresta",
  "La Boca",
  "La Paternal",
  "Liniers",
  "Mataderos",
  "Monte Castro",
  "Montserrat",
  "Nueva Pompeya",
  "Núñez",
  "Palermo",
  "Parque Avellaneda",
  "Parque Chacabuco",
  "Parque Chas",
  "Parque Patricios",
  "Puerto Madero",
  "Recoleta",
  "Retiro",
  "Saavedra",
  "San Cristóbal",
  "San Nicolás",
  "San Telmo",
  "Vélez Sarsfield",
  "Versalles",
  "Villa Crespo",
  "Villa del Parque",
  "Villa Devoto",
  "Villa General Mitre",
  "Villa Lugano",
  "Villa Luro",
  "Villa Ortúzar",
  "Villa Pueyrredón",
  "Villa Real",
  "Villa Riachuelo",
  "Villa Santa Rita",
  "Villa Soldati",
  "Villa Urquiza",
].map((name) => ({ id: name, name }));

export const ARGENTINA_PROVINCES: GeoOption[] = [
  { id: "06", name: "Buenos Aires" },
  { id: "10", name: "Catamarca" },
  { id: "22", name: "Chaco" },
  { id: "26", name: "Chubut" },
  { id: "02", name: "Ciudad Autónoma de Buenos Aires" },
  { id: "14", name: "Córdoba" },
  { id: "18", name: "Corrientes" },
  { id: "30", name: "Entre Ríos" },
  { id: "34", name: "Formosa" },
  { id: "38", name: "Jujuy" },
  { id: "42", name: "La Pampa" },
  { id: "46", name: "La Rioja" },
  { id: "50", name: "Mendoza" },
  { id: "54", name: "Misiones" },
  { id: "58", name: "Neuquén" },
  { id: "62", name: "Río Negro" },
  { id: "66", name: "Salta" },
  { id: "70", name: "San Juan" },
  { id: "74", name: "San Luis" },
  { id: "78", name: "Santa Cruz" },
  { id: "82", name: "Santa Fe" },
  { id: "86", name: "Santiago del Estero" },
  { id: "94", name: "Tierra del Fuego" },
  { id: "90", name: "Tucumán" },
];

function uniqueSortedOptions(items: GeoRefNamedItem[] | undefined): GeoOption[] {
  const byName = new Map<string, GeoOption>();
  for (const item of items ?? []) {
    const name = item.nombre.trim();
    if (!name) continue;
    byName.set(name, { id: String(item.id ?? name), name });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}


function provinceQueryValue(province: string): string {
  const normalizedProvince = normalizeText(province);
  return ARGENTINA_PROVINCES.find((item) => normalizeText(item.name) === normalizedProvince)?.id ?? province;
}

function isCabaProvince(province: string): boolean {
  return normalizeText(province) === normalizeText(CABA_PROVINCE);
}

function toPositiveInteger(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function getUsableHeightRanges(street: GeoRefStreet): Array<{ start: number; end: number }> {
  const startValues = [street.altura?.inicio?.derecha, street.altura?.inicio?.izquierda];
  const endValues = [street.altura?.fin?.derecha, street.altura?.fin?.izquierda];
  const ranges: Array<{ start: number; end: number }> = [];

  for (let index = 0; index < startValues.length; index += 1) {
    const start = startValues[index];
    const end = endValues[index];
    if (typeof start !== "number" || typeof end !== "number") continue;
    if (start <= 0 || end <= 0 || end < start) continue;
    ranges.push({ start, end });
  }

  return ranges;
}

function filterByLocality(streets: GeoRefStreet[], locality: string): GeoRefStreet[] {
  const normalizedLocality = normalizeText(locality);
  if (!normalizedLocality) return streets;
  const localityMatches = streets.filter((street) => normalizeText(street.localidad_censal?.nombre ?? "") === normalizedLocality);
  return localityMatches.length > 0 ? localityMatches : streets;
}

export function evaluateStreetAddress(streetNumber: string, streets: GeoRefStreet[]): AddressValidationResult {
  if (streets.length === 0) {
    return {
      status: "invalid",
      message: "No encontré esa calle en el partido/localidad seleccionados. Revisá provincia, partido, localidad y nombre de calle.",
    };
  }

  const number = toPositiveInteger(streetNumber);
  if (!number) {
    return { status: "invalid", message: "Ingresá un número de calle válido para verificar la dirección." };
  }

  const ranges = streets.flatMap(getUsableHeightRanges);
  if (ranges.length === 0) {
    return {
      status: "warning",
      message: "La calle existe en GeoRef, pero GeoRef no informa rangos de altura confiables para confirmar el número.",
    };
  }

  const isInsideRange = ranges.some((range) => number >= range.start && number <= range.end);
  if (!isInsideRange) {
    return {
      status: "invalid",
      message: "La calle existe, pero ese número no aparece dentro de los rangos de altura informados por GeoRef.",
    };
  }

  return { status: "valid" };
}

export async function fetchDepartments(province: string): Promise<GeoOption[]> {
  if (isCabaProvince(province)) return CABA_NEIGHBORHOODS;

  const query = new URLSearchParams({ provincia: provinceQueryValue(province), campos: "id,nombre", max: "5000", orden: "nombre" });
  const response = await fetch(`${GEOREF_BASE_URL}/departamentos?${query.toString()}`);
  if (!response.ok) {
    throw new Error("No se pudieron cargar los partidos.");
  }
  const data = (await response.json()) as GeoRefDepartmentsResponse;
  return uniqueSortedOptions(data.departamentos);
}

export async function fetchLocalities(province: string, department: string): Promise<GeoOption[]> {
  if (isCabaProvince(province)) return department ? [{ id: department, name: department }] : [];

  const query = new URLSearchParams({ provincia: provinceQueryValue(province), departamento: department, campos: "id,nombre", max: "5000", orden: "nombre" });
  const response = await fetch(`${GEOREF_BASE_URL}/localidades?${query.toString()}`);
  if (!response.ok) {
    throw new Error("No se pudieron cargar las localidades.");
  }
  const data = (await response.json()) as GeoRefLocalitiesResponse;
  return uniqueSortedOptions(data.localidades);
}

export async function validateStreetAddress(input: StreetAddressInput): Promise<AddressValidationResult> {
  if (!input.province.trim() || !input.department.trim() || !input.locality.trim() || !input.street.trim() || !input.streetNumber.trim()) {
    return { status: "valid" };
  }

  const query = new URLSearchParams({
    provincia: provinceQueryValue(input.province),
    nombre: input.street,
    campos: "id,nombre,altura,localidad_censal",
    max: "50",
  });
  if (!isCabaProvince(input.province)) {
    query.set("departamento", input.department);
  }
  const response = await fetch(`${GEOREF_BASE_URL}/calles?${query.toString()}`);
  if (!response.ok) {
    throw new Error("No se pudo verificar la calle con GeoRef. Probá nuevamente.");
  }

  const data = (await response.json()) as GeoRefStreetsResponse;
  const streets = data.calles ?? [];
  return evaluateStreetAddress(input.streetNumber, isCabaProvince(input.province) ? streets : filterByLocality(streets, input.locality));
}
