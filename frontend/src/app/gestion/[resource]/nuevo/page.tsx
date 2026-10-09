"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppTopBar } from "../../../../components/layout/AppTopBar/AppTopBar";
import { isUnauthorizedError, LoginResponse } from "../../../../lib/api/client";
import { createMaster, MasterName } from "../../../../lib/api/masters.api";
import {
  buildPayload,
  FormState,
  initialForm,
  masterResources,
  resourceKeys,
} from "../../../../lib/masters/master-form-helpers";
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
};

type ContactRow = {
  id: string;
  contactName: string;
  email: string;
  fixedPhone: string;
  mobilePhone1: string;
  mobilePhone2: string;
  roleNote: string;
};

const fieldConfigs: Record<MasterName, FieldConfig[]> = {
  clients: [
    { name: "businessName", label: "Razón social", required: true, span: "full" },
    { name: "taxId", label: "CUIT/CUIL", required: true },
    { name: "address", label: "Dirección" },
    { name: "locality", label: "Localidad" },
    { name: "district", label: "Partido" },
    { name: "province", label: "Provincia" },
  ],
  providers: [
    { name: "businessName", label: "Proveedor", required: true, span: "full" },
    { name: "taxId", label: "CUIT/CUIL" },
    { name: "address", label: "Dirección" },
    { name: "locality", label: "Localidad" },
    { name: "district", label: "Partido" },
    { name: "province", label: "Provincia" },
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
    { name: "address", label: "Dirección" },
    { name: "locality", label: "Localidad" },
    { name: "district", label: "Partido" },
    { name: "province", label: "Provincia" },
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
    { name: "supplies", label: "Avíos", kind: "textarea", span: "full", placeholder: "uuid-avio|4|Puños; uuid-avio-2|1" },
    { name: "decorationParts", label: "Partes decorables", kind: "textarea", span: "full", placeholder: "Pecho:BORDADO; Espalda:ESTAMPADO" },
  ],
  users: [
    { name: "fullName", label: "Nombre", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "password", label: "Password", type: "password", required: true },
    { name: "role", label: "Rol", kind: "select", options: [{ label: "Seleccionar rol", value: "" }, { label: "Admin", value: "ADMIN" }, { label: "Usuario", value: "USER" }] },
    { name: "permissions", label: "Permisos", kind: "textarea", span: "full", placeholder: "BORDADO:VER,INICIAR_ETAPA; *:ADMINISTRAR" },
  ],
};

function createContactRow(): ContactRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    contactName: "",
    email: "",
    fixedPhone: "",
    mobilePhone1: "",
    mobilePhone2: "",
    roleNote: "",
  };
}

function encodeContacts(rows: ContactRow[]): string {
  return rows
    .filter((row) => Object.entries(row).some(([key, value]) => key !== "id" && value.trim()))
    .map((row) => [row.contactName, row.email, row.fixedPhone, row.mobilePhone1, row.mobilePhone2, row.roleNote].join("|"))
    .join("; ");
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

export default function NewManagementResourcePage() {
  const router = useRouter();
  const params = useParams<{ resource: string }>();
  const resource = params.resource as MasterName;
  const isValidResource = resourceKeys.has(resource);
  const resourceMeta = masterResources.find((entry) => entry.key === resource) ?? masterResources[0];
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [form, setForm] = useState<FormState>(() => initialForm(isValidResource ? resource : "clients", null));
  const [contactRows, setContactRows] = useState<ContactRow[]>([createContactRow()]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSession(loadStoredSession());
  }, []);

  useEffect(() => {
    if (isValidResource) {
      setForm(initialForm(resource, null));
      setContactRows([createContactRow()]);
    }
  }, [isValidResource, resource]);

  const fields = useMemo(() => fieldConfigs[isValidResource ? resource : "clients"], [isValidResource, resource]);
  const usesContacts = resource === "clients" || resource === "providers" || resource === "workshops";

  function setValue(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
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
      const payloadForm = usesContacts ? { ...form, contacts: encodeContacts(contactRows) } : form;
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
              <Field key={field.name} field={field} value={form[field.name] ?? ""} onChange={setValue} />
            ))}
          </div>

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
                    <div className={styles.fieldsGrid}>
                      <ContactField label="Nombre" value={contact.contactName} onChange={(value) => setContactValue(contact.id, "contactName", value)} />
                      <ContactField label="Email" type="email" value={contact.email} onChange={(value) => setContactValue(contact.id, "email", value)} />
                      <ContactField label="Teléfono fijo" value={contact.fixedPhone} onChange={(value) => setContactValue(contact.id, "fixedPhone", value)} />
                      <ContactField label="Celular 1" value={contact.mobilePhone1} onChange={(value) => setContactValue(contact.id, "mobilePhone1", value)} />
                      <ContactField label="Celular 2" value={contact.mobilePhone2} onChange={(value) => setContactValue(contact.id, "mobilePhone2", value)} />
                      <ContactField label="Nota" value={contact.roleNote} onChange={(value) => setContactValue(contact.id, "roleNote", value)} />
                    </div>
                  </div>
                ))}
              </div>
              <button className={styles.linkAction} type="button" onClick={addContact}>+ Contacto</button>
            </section>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <Link className={styles.secondaryAction} href={`/gestion/${resourceMeta.key}`}>Cancelar</Link>
            <button className={styles.primaryAction} type="submit" disabled={isSaving || !isValidResource}>
              {isSaving ? "Guardando..." : `Crear ${resourceMeta.singular.toLowerCase()}`}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}

function Field({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (name: string, value: string) => void }) {
  const className = field.span === "full" ? `${styles.field} ${styles.fullField}` : styles.field;
  if (field.kind === "select") {
    return (
      <label className={className}>
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(field.name, event.target.value)} required={field.required}>
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
