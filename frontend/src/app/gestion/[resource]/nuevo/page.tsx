"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppTopBar } from "../../../../components/layout/AppTopBar/AppTopBar";
import { isUnauthorizedError, LoginResponse } from "../../../../lib/api/client";
import { createMaster, listMasters, MasterName, SupplyMaster } from "../../../../lib/api/masters.api";
import {
  buildPayload,
  FormState,
  initialForm,
  masterResources,
  resourceKeys,
} from "../../../../lib/masters/master-form-helpers";
import {
  ARGENTINA_PROVINCES,
  fetchDepartments,
  fetchLocalities,
  GeoOption,
  validateStreetAddress,
} from "../../../../lib/geo/argentina";
import styles from "../../../ordenes/nueva/NewOrder.module.css";

type FieldKind = "input" | "select" | "textarea";

type FieldConfig = {
  name: string;
  label: string;
  kind?: FieldKind;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  span?: "full";
  disabled?: boolean;
  loadingLabel?: string;
};

type ContactRow = {
  id: string;
  contactName: string;
  mobilePhone1: string;
  roleNote: string;
};

type ArticleSupplyRow = {
  id: string;
  supplyId: string;
  quantity: string;
  note: string;
};

type DecorationRow = {
  id: string;
  garmentPart: string;
  placement: string;
  decorationCode: string;
  imageUrl: string;
  notes: string;
};

type DecorationType = "BORDADO" | "ESTAMPADO";

const fieldConfigs: Record<MasterName, FieldConfig[]> = {
  clients: [
    { name: "businessName", label: "Razón social", required: true, span: "full" },
    { name: "taxId", label: "CUIT/CUIL", required: true },
    { name: "businessSector", label: "Rubro" },
    { name: "email", label: "Email", type: "email" },
    { name: "fixedPhone", label: "Teléfono fijo" },
    { name: "province", label: "Provincia", kind: "select" },
    { name: "district", label: "Partido", kind: "select" },
    { name: "locality", label: "Localidad", kind: "select" },
    { name: "street", label: "Calle" },
    { name: "streetNumber", label: "Número" },
    { name: "floorApartment", label: "Piso / departamento" },
  ],
  providers: [
    { name: "businessName", label: "Proveedor", required: true, span: "full" },
    { name: "taxId", label: "CUIT/CUIL" },
    { name: "businessSector", label: "Rubro" },
    { name: "email", label: "Email", type: "email" },
    { name: "fixedPhone", label: "Teléfono fijo" },
    { name: "province", label: "Provincia", kind: "select" },
    { name: "district", label: "Partido", kind: "select" },
    { name: "locality", label: "Localidad", kind: "select" },
    { name: "street", label: "Calle" },
    { name: "streetNumber", label: "Número" },
    { name: "floorApartment", label: "Piso / departamento" },
  ],
  workshops: [
    { name: "name", label: "Nombre", required: true, span: "full" },
    { name: "specialties", label: "Tipo de taller", kind: "select", options: [
      { label: "Seleccionar tipo", value: "" },
      { label: "Confección", value: "CONFECCION" },
      { label: "Ojal y botón", value: "OJAL_BOTON" },
      { label: "Plancha", value: "PLANCHA" },
      { label: "Terminación", value: "TERMINACION" },
    ] },
    { name: "specialtyDetail", label: "Especialidad", placeholder: "Pantalones, remeras, camperas" },
    { name: "email", label: "Email", type: "email" },
    { name: "fixedPhone", label: "Teléfono fijo" },
    { name: "province", label: "Provincia", kind: "select" },
    { name: "district", label: "Partido", kind: "select" },
    { name: "locality", label: "Localidad", kind: "select" },
    { name: "street", label: "Calle" },
    { name: "streetNumber", label: "Número" },
    { name: "floorApartment", label: "Piso / departamento" },
  ],
  fabrics: [
    { name: "code", label: "Artículo / código", required: true },
    { name: "name", label: "Nombre", required: true },
    { name: "color", label: "Color" },
    { name: "weightOz", label: "Onzaje", type: "number" },
    { name: "weaveType", label: "Tipo", kind: "select", options: [{ label: "Seleccionar tipo", value: "" }, { label: "Punto", value: "PUNTO" }, { label: "Plano", value: "PLANO" }] },
    { name: "formatType", label: "Formato", kind: "select", options: [{ label: "Seleccionar formato", value: "" }, { label: "Abierto", value: "ABIERTO" }, { label: "Tubular", value: "TUBULAR" }] },
  ],
  supplies: [
    { name: "code", label: "Artículo / código", required: true },
    { name: "name", label: "Nombre", required: true },
    { name: "description", label: "Descripción" },
    { name: "color", label: "Color" },
    { name: "category", label: "Categoría", kind: "select", options: [{ label: "Seleccionar categoría", value: "" }, { label: "Confección", value: "CONFECCION" }, { label: "Terminación", value: "TERMINACION" }] },
  ],
  "size-curves": [
    { name: "name", label: "Nombre", required: true },
    { name: "sequenceType", label: "Tipo", kind: "select", options: [{ label: "Seleccionar tipo", value: "" }, { label: "Alfabética", value: "ALFABETICA" }, { label: "Numérica", value: "NUMERICA" }, { label: "Doble", value: "DOBLE" }, { label: "Mixta", value: "MIXTA" }] },
    { name: "values", label: "Talles separados por coma", required: true, span: "full", placeholder: "S, M, L, XL" },
  ],
  articles: [
    { name: "code", label: "Artículo / código", required: true },
    { name: "name", label: "Nombre", required: true },
    { name: "description", label: "Descripción", span: "full" },
  ],
  users: [
    { name: "fullName", label: "Nombre", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "password", label: "Password", type: "password", required: true },
    { name: "role", label: "Rol", kind: "select", options: [{ label: "Seleccionar rol", value: "" }, { label: "Admin", value: "ADMIN" }, { label: "Usuario", value: "USER" }] },
    { name: "permissions", label: "Permisos", kind: "textarea", span: "full", placeholder: "BORDADO:VER,INICIAR_ETAPA; *:ADMINISTRAR" },
  ],
};

function createRowId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createContactRow(): ContactRow {
  return {
    id: createRowId(),
    contactName: "",
    mobilePhone1: "",
    roleNote: "",
  };
}

function createArticleSupplyRow(): ArticleSupplyRow {
  return { id: createRowId(), supplyId: "", quantity: "", note: "" };
}

function createDecorationRow(): DecorationRow {
  return { id: createRowId(), garmentPart: "", placement: "", decorationCode: "", imageUrl: "", notes: "" };
}

function encodeContacts(rows: ContactRow[]): string {
  return rows
    .filter((row) => Object.entries(row).some(([key, value]) => key !== "id" && value.trim()))
    .map((row) => [row.contactName, row.mobilePhone1, row.roleNote].join("|"))
    .join("; ");
}

function encodeArticleSupplies(rows: ArticleSupplyRow[]): string {
  return JSON.stringify(rows
    .filter((row) => row.supplyId)
    .map((row) => ({ supplyId: row.supplyId, quantity: row.quantity ? Number(row.quantity) : undefined, note: row.note })));
}

function encodeDecorations(rows: DecorationRow[], decorationType: DecorationType): string {
  return JSON.stringify(rows
    .filter((row) => row.garmentPart.trim() || row.placement.trim() || row.decorationCode.trim() || row.imageUrl.trim() || row.notes.trim())
    .map((row) => ({
      decorationType,
      garmentPart: row.garmentPart,
      placement: row.placement,
      decorationCode: row.decorationCode,
      imageUrl: row.imageUrl,
      notes: row.notes,
    })));
}

function loadStoredSession(): LoginResponse | null {
  const stored = window.localStorage.getItem("proma-session");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LoginResponse;
  } catch {
    window.localStorage.removeItem("proma-session");
    return null;
  }
}

export function NewManagementResourcePage({ resourceOverride }: { resourceOverride?: MasterName }) {
  const router = useRouter();
  const params = useParams<{ resource: string }>();
  const resource = resourceOverride ?? (params.resource as MasterName);
  const isValidResource = resourceKeys.has(resource);
  const resourceMeta = masterResources.find((entry) => entry.key === resource) ?? masterResources[0];
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [form, setForm] = useState<FormState>(() => initialForm(isValidResource ? resource : "clients", null));
  const [contactRows, setContactRows] = useState<ContactRow[]>([createContactRow()]);
  const [articleSupplyRows, setArticleSupplyRows] = useState<ArticleSupplyRow[]>([createArticleSupplyRow()]);
  const [embroideryRows, setEmbroideryRows] = useState<DecorationRow[]>([createDecorationRow()]);
  const [printingRows, setPrintingRows] = useState<DecorationRow[]>([createDecorationRow()]);
  const [supplyOptions, setSupplyOptions] = useState<SupplyMaster[]>([]);
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressWarning, setAddressWarning] = useState("");
  const [districtOptions, setDistrictOptions] = useState<GeoOption[]>([]);
  const [localityOptions, setLocalityOptions] = useState<GeoOption[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingLocalities, setIsLoadingLocalities] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    setSession(loadStoredSession());
  }, []);

  useEffect(() => {
    if (isValidResource) {
      setForm(initialForm(resource, null));
      setContactRows([createContactRow()]);
      setArticleSupplyRows([createArticleSupplyRow()]);
      setEmbroideryRows([createDecorationRow()]);
      setPrintingRows([createDecorationRow()]);
    }
  }, [isValidResource, resource]);

  const fields = useMemo(() => fieldConfigs[isValidResource ? resource : "clients"], [isValidResource, resource]);
  const usesContacts = resource === "clients" || resource === "providers" || resource === "workshops";

  const loadDistricts = useCallback(async (province: string) => {
    if (!province) {
      setDistrictOptions([]);
      return;
    }
    setGeoError("");
    setIsLoadingDistricts(true);
    try {
      setDistrictOptions(await fetchDepartments(province));
    } catch (err) {
      setDistrictOptions([]);
      setGeoError(err instanceof Error ? err.message : "No se pudieron cargar los partidos.");
    } finally {
      setIsLoadingDistricts(false);
    }
  }, []);

  const loadLocalities = useCallback(async (province: string, district: string) => {
    if (!province || !district) {
      setLocalityOptions([]);
      return;
    }
    setGeoError("");
    setIsLoadingLocalities(true);
    try {
      setLocalityOptions(await fetchLocalities(province, district));
    } catch (err) {
      setLocalityOptions([]);
      setGeoError(err instanceof Error ? err.message : "No se pudieron cargar las localidades.");
    } finally {
      setIsLoadingLocalities(false);
    }
  }, []);

  useEffect(() => {
    if (usesContacts) {
      void loadDistricts(form.province ?? "");
    }
  }, [form.province, loadDistricts, usesContacts]);

  useEffect(() => {
    if (usesContacts) {
      void loadLocalities(form.province ?? "", form.district ?? "");
    }
  }, [form.district, form.province, loadLocalities, usesContacts]);

  useEffect(() => {
    if (resource !== "articles" || !session) {
      return;
    }
    setIsLoadingSupplies(true);
    listMasters<SupplyMaster>("supplies", session.accessToken, "", 1, 100)
      .then((response) => setSupplyOptions(response.items))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los avíos."))
      .finally(() => setIsLoadingSupplies(false));
  }, [resource, session]);

  function getGeoField(field: FieldConfig): FieldConfig {
    if (field.name === "province") {
      return { ...field, options: [{ label: "Seleccionar provincia", value: "" }, ...ARGENTINA_PROVINCES.map((province) => ({ label: province.name, value: province.name }))] };
    }
    if (field.name === "district") {
      return {
        ...field,
        disabled: !form.province || isLoadingDistricts,
        loadingLabel: isLoadingDistricts ? "Cargando partidos" : "Seleccionar partido",
        options: [{ label: isLoadingDistricts ? "Cargando partidos" : "Seleccionar partido", value: "" }, ...districtOptions.map((district) => ({ label: district.name, value: district.name }))],
      };
    }
    if (field.name === "locality") {
      return {
        ...field,
        disabled: !form.province || !form.district || isLoadingLocalities,
        loadingLabel: isLoadingLocalities ? "Cargando localidades" : "Seleccionar localidad",
        options: [{ label: isLoadingLocalities ? "Cargando localidades" : "Seleccionar localidad", value: "" }, ...localityOptions.map((locality) => ({ label: locality.name, value: locality.name }))],
      };
    }
    return field;
  }

  function setValue(name: string, value: string) {
    if (["province", "district", "locality", "street", "streetNumber"].includes(name)) {
      setAddressWarning("");
    }
    setForm((current) => {
      if (name === "province") {
        return { ...current, province: value, district: "", locality: "" };
      }
      if (name === "district") {
        return { ...current, district: value, locality: "" };
      }
      return { ...current, [name]: value };
    });
  }

  function setContactValue(id: string, name: keyof Omit<ContactRow, "id">, value: string) {
    setContactRows((current) => current.map((row) => (row.id === id ? { ...row, [name]: value } : row)));
  }

  function addContact() {
    setContactRows((current) => [...current, createContactRow()]);
  }

  function removeContact(id: string) {
    setContactRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }


  function setArticleSupplyValue(id: string, name: keyof Omit<ArticleSupplyRow, "id">, value: string) {
    setArticleSupplyRows((current) => current.map((row) => (row.id === id ? { ...row, [name]: value } : row)));
  }

  function addArticleSupply() {
    setArticleSupplyRows((current) => [...current, createArticleSupplyRow()]);
  }

  function removeArticleSupply(id: string) {
    setArticleSupplyRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }

  function setDecorationValue(kind: DecorationType, id: string, name: keyof Omit<DecorationRow, "id">, value: string) {
    const setter = kind === "BORDADO" ? setEmbroideryRows : setPrintingRows;
    setter((current) => current.map((row) => (row.id === id ? { ...row, [name]: value } : row)));
  }

  function addDecoration(kind: DecorationType) {
    const setter = kind === "BORDADO" ? setEmbroideryRows : setPrintingRows;
    setter((current) => [...current, createDecorationRow()]);
  }

  function removeDecoration(kind: DecorationType, id: string) {
    const setter = kind === "BORDADO" ? setEmbroideryRows : setPrintingRows;
    setter((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isValidResource) {
      setError("El recurso solicitado no existe.");
      return;
    }
    if (!session) {
      setError("Ingresá al sistema para crear registros.");
      return;
    }
    setIsSaving(true);
    try {
      if (usesContacts) {
        setIsValidatingAddress(true);
        const validation = await validateStreetAddress({
          province: form.province ?? "",
          department: form.district ?? "",
          locality: form.locality ?? "",
          street: form.street ?? "",
          streetNumber: form.streetNumber ?? "",
        });
        setIsValidatingAddress(false);

        if (validation.status === "invalid") {
          setError(validation.message ?? "No se pudo validar la dirección.");
          return;
        }
        setAddressWarning(validation.status === "warning" ? validation.message ?? "La dirección se guardará sin validar la altura." : "");
      }

      const payloadForm = resource === "articles"
        ? {
            ...form,
            supplies: encodeArticleSupplies(articleSupplyRows),
            decorationParts: JSON.stringify([
              ...JSON.parse(encodeDecorations(embroideryRows, "BORDADO")),
              ...JSON.parse(encodeDecorations(printingRows, "ESTAMPADO")),
            ]),
          }
        : usesContacts ? { ...form, contacts: encodeContacts(contactRows) } : form;
      await createMaster(resource, session.accessToken, buildPayload(resource, payloadForm, false));
      router.push(`/gestion/${resource}`);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        window.localStorage.removeItem("proma-session");
        setSession(null);
        setError("La sesión venció. Ingresá nuevamente.");
      } else {
        setError(err instanceof Error ? err.message : "No se pudo crear el registro.");
      }
    } finally {
      setIsSaving(false);
      setIsValidatingAddress(false);
    }
  }

  return (
    <main className={styles.page}>
      <AppTopBar activeSection="masters" />

      <section className={styles.hero}>
        <Link className={styles.backLink} href={`/gestion/${resourceMeta.key}`}>Volver</Link>
        <h1>{`Nuevo ${resourceMeta.singular}`}</h1>
      </section>

      <form className={styles.managementWorkspace} onSubmit={handleSubmit}>
        <section className={styles.formPanel} aria-label={`Alta de ${resourceMeta.singular}`}>
          <div className={styles.fieldsGrid}>
            {fields.map((field) => (
              <Field key={field.name} field={getGeoField(field)} value={form[field.name] ?? ""} onChange={setValue} />
            ))}
          </div>

          {resource === "articles" ? (
            <ArticleDetails
              supplyRows={articleSupplyRows}
              supplyOptions={supplyOptions}
              isLoadingSupplies={isLoadingSupplies}
              embroideryRows={embroideryRows}
              printingRows={printingRows}
              onSupplyChange={setArticleSupplyValue}
              onAddSupply={addArticleSupply}
              onRemoveSupply={removeArticleSupply}
              onDecorationChange={setDecorationValue}
              onAddDecoration={addDecoration}
              onRemoveDecoration={removeDecoration}
            />
          ) : null}

          {usesContacts ? (
            <section className={styles.contactSection}>
              <h2>Contactos</h2>
              <div className={styles.contactStack}>
                {contactRows.map((contact, index) => (
                  <div className={styles.contactGroup} key={contact.id}>
                    <div className={styles.contactHeader}>
                      <span>{`Contacto ${index + 1}`}</span>
                      {index > 0 ? <button type="button" onClick={() => removeContact(contact.id)}>Quitar</button> : null}
                    </div>
                    <div className={resource === "clients" || resource === "providers" ? styles.contactFieldsGrid : styles.contactFieldsGridCompact}>
                      <ContactField label="Nombre" value={contact.contactName} onChange={(value) => setContactValue(contact.id, "contactName", value)} />
                      {resource === "clients" || resource === "providers" ? (
                        <ContactField label="Puesto" value={contact.roleNote} onChange={(value) => setContactValue(contact.id, "roleNote", value)} />
                      ) : null}
                      <ContactField label="Celular" value={contact.mobilePhone1} onChange={(value) => setContactValue(contact.id, "mobilePhone1", value)} />
                    </div>
                  </div>
                ))}
              </div>
              <button className={styles.linkAction} type="button" onClick={addContact}>+ Contacto</button>
            </section>
          ) : null}

          {addressWarning ? <p className={styles.warning}>{addressWarning}</p> : null}
          {geoError ? <p className={styles.error}>{geoError}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <Link className={styles.secondaryAction} href={`/gestion/${resourceMeta.key}`}>Cancelar</Link>
            <button className={styles.primaryAction} type="submit" disabled={isSaving || isValidatingAddress || !isValidResource}>
              {isValidatingAddress ? "Validando dirección..." : isSaving ? "Guardando..." : `Crear ${resourceMeta.singular.toLowerCase()}`}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}


export default NewManagementResourcePage;

function ArticleDetails({
  supplyRows,
  supplyOptions,
  isLoadingSupplies,
  embroideryRows,
  printingRows,
  onSupplyChange,
  onAddSupply,
  onRemoveSupply,
  onDecorationChange,
  onAddDecoration,
  onRemoveDecoration,
}: {
  supplyRows: ArticleSupplyRow[];
  supplyOptions: SupplyMaster[];
  isLoadingSupplies: boolean;
  embroideryRows: DecorationRow[];
  printingRows: DecorationRow[];
  onSupplyChange: (id: string, name: keyof Omit<ArticleSupplyRow, "id">, value: string) => void;
  onAddSupply: () => void;
  onRemoveSupply: (id: string) => void;
  onDecorationChange: (kind: DecorationType, id: string, name: keyof Omit<DecorationRow, "id">, value: string) => void;
  onAddDecoration: (kind: DecorationType) => void;
  onRemoveDecoration: (kind: DecorationType, id: string) => void;
}) {
  return (
    <section className={styles.articleSection}>
      <div className={styles.articleBlockHeader}>
        <h2>Avíos</h2>
        <button className={styles.linkAction} type="button" onClick={onAddSupply}>+ Avío</button>
      </div>
      <div className={styles.articleRows}>
        {supplyRows.map((row, index) => (
          <div className={styles.supplyRow} key={row.id}>
            <label className={styles.field}>
              <span>{`Avío ${index + 1}`}</span>
              <select value={row.supplyId} onChange={(event) => onSupplyChange(row.id, "supplyId", event.target.value)} disabled={isLoadingSupplies}>
                <option value="">{isLoadingSupplies ? "Cargando avíos" : "Seleccionar avío"}</option>
                {supplyOptions.map((supply) => (
                  <option key={supply.id} value={supply.id}>{`${supply.code} - ${supply.name}`}</option>
                ))}
              </select>
            </label>
            <ContactField label="Cantidad" type="number" value={row.quantity} onChange={(value) => onSupplyChange(row.id, "quantity", value)} />
            <ContactField label="Aclaración" value={row.note} onChange={(value) => onSupplyChange(row.id, "note", value)} />
            <button className={styles.rowRemoveAction} type="button" onClick={() => onRemoveSupply(row.id)} disabled={supplyRows.length === 1}>Quitar</button>
          </div>
        ))}
      </div>

      <DecorationSection
        title="Bordado"
        kind="BORDADO"
        rows={embroideryRows}
        onChange={onDecorationChange}
        onAdd={onAddDecoration}
        onRemove={onRemoveDecoration}
      />
      <DecorationSection
        title="Estampado"
        kind="ESTAMPADO"
        rows={printingRows}
        onChange={onDecorationChange}
        onAdd={onAddDecoration}
        onRemove={onRemoveDecoration}
      />
    </section>
  );
}

function DecorationSection({
  title,
  kind,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  kind: DecorationType;
  rows: DecorationRow[];
  onChange: (kind: DecorationType, id: string, name: keyof Omit<DecorationRow, "id">, value: string) => void;
  onAdd: (kind: DecorationType) => void;
  onRemove: (kind: DecorationType, id: string) => void;
}) {
  return (
    <section className={styles.decorationSection}>
      <div className={styles.articleBlockHeader}>
        <h2>{title}</h2>
        <button className={styles.linkAction} type="button" onClick={() => onAdd(kind)}>{`+ ${title}`}</button>
      </div>
      <div className={styles.articleRows}>
        {rows.map((row, index) => (
          <div className={styles.decorationRow} key={row.id}>
            <ContactField label={`Pieza ${index + 1}`} value={row.garmentPart} onChange={(value) => onChange(kind, row.id, "garmentPart", value)} />
            <ContactField label="Ubicación" value={row.placement} onChange={(value) => onChange(kind, row.id, "placement", value)} />
            <ContactField label="Código" value={row.decorationCode} onChange={(value) => onChange(kind, row.id, "decorationCode", value)} />
            <ContactField label="Link imagen" type="url" value={row.imageUrl} onChange={(value) => onChange(kind, row.id, "imageUrl", value)} />
            <label className={`${styles.field} ${styles.fullField}`}>
              <span>Aclaraciones</span>
              <input value={row.notes} onChange={(event) => onChange(kind, row.id, "notes", event.target.value)} />
            </label>
            <button className={styles.rowRemoveAction} type="button" onClick={() => onRemove(kind, row.id)} disabled={rows.length === 1}>Quitar</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (name: string, value: string) => void }) {
  const className = field.span === "full" ? `${styles.field} ${styles.fullField}` : styles.field;
  if (field.kind === "select") {
    return (
      <label className={className}>
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(field.name, event.target.value)} required={field.required} disabled={field.disabled}>
          {(field.options ?? []).map((option) => <option key={option.value || option.label} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  if (field.kind === "textarea") {
    return (
      <label className={className}>
        <span>{field.label}</span>
        <textarea value={value} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} required={field.required} rows={4} />
      </label>
    );
  }
  return (
    <label className={className}>
      <span>{field.label}</span>
      <input type={field.type ?? "text"} value={value} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} required={field.required} />
    </label>
  );
}

function ContactField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
