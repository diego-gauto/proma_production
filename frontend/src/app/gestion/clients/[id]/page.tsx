"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppTopBar } from "../../../../components/layout/AppTopBar/AppTopBar";
import { isUnauthorizedError, LoginResponse } from "../../../../lib/api/client";
import { ClientMaster, ContactMaster, deleteMaster, getClient, updateMaster } from "../../../../lib/api/masters.api";
import styles from "./ClientDetail.module.css";

type ClientForm = {
  businessName: string;
  taxId: string;
  businessSector: string;
  email: string;
  fixedPhone: string;
  province: string;
  district: string;
  locality: string;
  street: string;
  streetNumber: string;
  floorApartment: string;
  notes: string;
};

type ContactForm = ContactMaster & { localId: string };

function loadSession(): LoginResponse | null {
  const stored = window.localStorage.getItem("proma-session");
  if (!stored) return null;
  try { return JSON.parse(stored) as LoginResponse; } catch { window.localStorage.removeItem("proma-session"); return null; }
}

function clientForm(client: ClientMaster): ClientForm {
  return {
    businessName: client.businessName,
    taxId: client.taxId,
    businessSector: client.businessSector ?? "",
    email: client.email ?? "",
    fixedPhone: client.fixedPhone ?? "",
    province: client.province ?? "",
    district: client.district ?? "",
    locality: client.locality ?? "",
    street: client.street ?? "",
    streetNumber: client.streetNumber ?? "",
    floorApartment: client.floorApartment ?? "",
    notes: client.notes ?? "",
  };
}

function contactForms(contacts: ContactMaster[] | undefined): ContactForm[] {
  return (contacts ?? []).map((contact) => ({ ...contact, localId: contact.id ?? `${contact.contactName}-${Math.random()}` }));
}

function addressLabel(client: ClientMaster): string {
  return [client.address, client.street && `${client.street} ${client.streetNumber ?? ""}`.trim(), client.floorApartment]
    .filter(Boolean).join(" · ") || "Sin dirección cargada";
}

function fieldLabel(value: string | null | undefined): string {
  return value || "Sin dato";
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [client, setClient] = useState<ClientMaster | null>(null);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentSession = loadSession();
    setSession(currentSession);
    if (!currentSession) { setError("Ingresá al sistema para ver el cliente."); setIsLoading(false); return; }
    if (!clientId) { setError("No se indicó un cliente válido."); setIsLoading(false); return; }
    void getClient(currentSession.accessToken, clientId)
      .then((loaded) => { setClient(loaded); setForm(clientForm(loaded)); setContacts(contactForms(loaded.contacts)); })
      .catch((reason: unknown) => { if (isUnauthorizedError(reason)) setError("La sesión venció. Ingresá nuevamente."); else setError(reason instanceof Error ? reason.message : "No se pudo cargar el cliente."); })
      .finally(() => setIsLoading(false));
  }, [clientId]);

  function setValue(name: keyof ClientForm, value: string) { setForm((current) => current ? { ...current, [name]: value } : current); }
  function updateContact(localId: string, patch: Partial<ContactForm>) { setContacts((current) => current.map((contact) => contact.localId === localId ? { ...contact, ...patch } : contact)); }
  function setPrimary(localId: string) { setContacts((current) => current.map((contact) => ({ ...contact, isPrimary: contact.localId === localId }))); }
  function addContact() { setContacts((current) => [...current, { localId: `new-${Date.now()}`, contactName: "", roleNote: "", email: "", fixedPhone: "", mobilePhone1: "", mobilePhone2: "", isPrimary: current.length === 0 }]); }
  function removeContact(localId: string) { setContacts((current) => current.filter((contact) => contact.localId !== localId)); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !client || !form) return;
    setIsSaving(true); setError("");
    try {
      const updated = await updateMaster<ClientMaster>("clients", session.accessToken, client.id, {
        ...form,
        contacts: contacts.map((contact) => ({ contactName: contact.contactName, roleNote: contact.roleNote, email: contact.email, fixedPhone: contact.fixedPhone, mobilePhone1: contact.mobilePhone1, mobilePhone2: contact.mobilePhone2, isPrimary: Boolean(contact.isPrimary) })),
      });
      setClient(updated); setForm(clientForm(updated)); setContacts(contactForms(updated.contacts)); setIsEditing(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar el cliente."); }
    finally { setIsSaving(false); }
  }

  async function deactivate() {
    if (!session || !client || !window.confirm("¿Desactivar este cliente?")) return;
    setError("");
    try { const updated = await deleteMaster<ClientMaster>("clients", session.accessToken, client.id); setClient(updated); setIsEditing(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo desactivar el cliente."); }
  }

  return (
    <main className={styles.page}>
      <AppTopBar activeSection="masters" />
      <section className={styles.content}>
        <Link className={styles.backLink} href="/gestion/clients">← Volver a clientes</Link>
        {isLoading ? <p className={styles.feedback}>Cargando cliente...</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        {client ? (
          <>
            <header className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>Catálogo / Clientes / Detalle</p>
                <div className={styles.titleRow}><div><h1>{client.businessName}</h1><p className={styles.subtitle}>{client.taxId || "Sin CUIT/CUIL"}</p></div><span className={client.isActive ? styles.active : styles.inactive}>{client.isActive ? "Activo" : "Inactivo"}</span></div>
              </div>
              <div className={styles.actions}><button className={styles.secondaryButton} type="button" onClick={() => { setForm(clientForm(client)); setContacts(contactForms(client.contacts)); setIsEditing(true); }}>Editar cliente</button>{client.isActive ? <button className={styles.dangerButton} type="button" onClick={() => void deactivate()}>Desactivar</button> : null}</div>
            </header>
            {isEditing && form ? (
              <form className={styles.editPanel} onSubmit={save}>
                <h2>Editar datos del cliente</h2>
                <div className={styles.formGrid}>
                  {([ ["businessName", "Razón social"], ["taxId", "CUIT/CUIL"], ["businessSector", "Rubro"], ["email", "Email"], ["fixedPhone", "Teléfono fijo"], ["street", "Calle"], ["streetNumber", "Número"], ["floorApartment", "Piso / departamento"], ["province", "Provincia"], ["district", "Partido"], ["locality", "Localidad"] ] as [keyof ClientForm, string][]).map(([name, label]) => <label className={styles.field} key={name}><span>{label}</span><input value={form[name]} onChange={(event) => setValue(name, event.target.value)} /></label>)}
                  <label className={`${styles.field} ${styles.fullField}`}><span>Notas</span><textarea value={form.notes} onChange={(event) => setValue("notes", event.target.value)} /></label>
                </div>
                <div className={styles.editSection}><div className={styles.sectionTitle}><h2>Contactos</h2><button className={styles.linkButton} type="button" onClick={addContact}>+ Agregar contacto</button></div>{contacts.map((contact) => <div className={styles.contactEditor} key={contact.localId}><label className={styles.field}><span>Nombre</span><input value={contact.contactName} onChange={(event) => updateContact(contact.localId, { contactName: event.target.value })} /></label><label className={styles.field}><span>Rol o cargo</span><input value={contact.roleNote ?? ""} onChange={(event) => updateContact(contact.localId, { roleNote: event.target.value })} /></label><label className={styles.field}><span>Celular / teléfono</span><input value={contact.mobilePhone1 ?? contact.fixedPhone ?? ""} onChange={(event) => updateContact(contact.localId, { mobilePhone1: event.target.value })} /></label><label className={styles.field}><span>Email</span><input value={contact.email ?? ""} onChange={(event) => updateContact(contact.localId, { email: event.target.value })} /></label><label className={styles.primaryToggle}><input type="radio" name="primaryContact" checked={Boolean(contact.isPrimary)} onChange={() => setPrimary(contact.localId)} /> Principal</label><button className={styles.removeButton} type="button" onClick={() => removeContact(contact.localId)}>Eliminar</button></div>)}</div>
                <div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={() => setIsEditing(false)}>Cancelar</button><button className={styles.primaryButton} type="submit" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar cambios"}</button></div>
              </form>
            ) : (
              <div className={styles.grid}>
                <section className={styles.card}><h2 className={styles.cardTitle}>Datos fiscales y comerciales</h2><dl className={styles.details}><div><dt>Razón social</dt><dd>{client.businessName}</dd></div><div><dt>CUIT/CUIL</dt><dd>{fieldLabel(client.taxId)}</dd></div><div><dt>Rubro</dt><dd>{fieldLabel(client.businessSector)}</dd></div><div><dt>Email general</dt><dd>{fieldLabel(client.email)}</dd></div><div><dt>Teléfono fijo</dt><dd>{fieldLabel(client.fixedPhone)}</dd></div></dl></section>
                <section className={styles.card}><h2 className={styles.cardTitle}>Ubicación</h2><dl className={styles.details}><div><dt>Dirección</dt><dd>{addressLabel(client)}</dd></div><div><dt>Provincia</dt><dd>{fieldLabel(client.province)}</dd></div><div><dt>Partido</dt><dd>{fieldLabel(client.district)}</dd></div><div><dt>Localidad</dt><dd>{fieldLabel(client.locality)}</dd></div></dl></section>
                <section className={`${styles.card} ${styles.contactsCard}`}><div className={styles.cardHeading}><h2 className={styles.cardTitle}>Contactos</h2><span className={styles.count}>{client.contacts?.length ?? 0}</span></div>{client.contacts && client.contacts.length > 0 ? <div className={styles.contacts}>{client.contacts.map((contact) => <article className={styles.contact} key={contact.id ?? contact.contactName}><div className={styles.contactRow}><strong>{contact.contactName}</strong><span>{contact.roleNote || "Sin cargo"}</span><span>{contact.mobilePhone1 || contact.fixedPhone || "Sin teléfono"}</span></div>{contact.isPrimary ? <small className={styles.primary}>Principal</small> : null}</article>)}</div> : <p className={styles.empty}>Este cliente no tiene contactos cargados.</p>}</section>
                {client.notes ? <section className={styles.card}><h2 className={styles.cardTitle}>Notas</h2><p className={styles.notes}>{client.notes}</p></section> : null}
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
