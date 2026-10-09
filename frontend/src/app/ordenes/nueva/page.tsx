"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppTopBar } from "../../../components/layout/AppTopBar/AppTopBar";
import { isUnauthorizedError, LoginResponse } from "../../../lib/api/client";
import {
  ArticleMaster,
  ClientMaster,
  FabricMaster,
  listMasters,
  SizeCurveMaster,
} from "../../../lib/api/masters.api";
import { createOrder } from "../../../lib/api/orders.api";
import { formatList } from "../../../lib/formatters/master-formatters";
import styles from "./NewOrder.module.css";

type FabricUseType = "PRIMARIA" | "COMPLEMENTO";

type FabricLine = {
  id: string;
  fabricId: string;
  color: string;
  useType: FabricUseType;
};

type FormState = {
  externalCode: string;
  clientId: string;
  articleId: string;
  sizeCurveId: string;
};

const emptyForm: FormState = {
  externalCode: "",
  clientId: "",
  articleId: "",
  sizeCurveId: "",
};

function loadStoredSession(): LoginResponse | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem("proma-session");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LoginResponse;
  } catch {
    window.localStorage.removeItem("proma-session");
    return null;
  }
}

function createFabricLine(fabricId = "", useType: FabricUseType = "PRIMARIA"): FabricLine {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, fabricId, color: "", useType };
}

export default function NewOrderPage() {
  const router = useRouter();
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [clients, setClients] = useState<ClientMaster[]>([]);
  const [articles, setArticles] = useState<ArticleMaster[]>([]);
  const [fabrics, setFabrics] = useState<FabricMaster[]>([]);
  const [curves, setCurves] = useState<SizeCurveMaster[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fabricLines, setFabricLines] = useState<FabricLine[]>([createFabricLine()]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedSession = loadStoredSession();
    setSession(storedSession);
    if (!storedSession) {
      setIsLoading(false);
      setError("Ingresá al sistema para crear una orden.");
      return;
    }

    async function loadOptions(token: string) {
      setIsLoading(true);
      setError("");
      try {
        const [clientsResult, articlesResult, fabricsResult, curvesResult] = await Promise.all([
          listMasters<ClientMaster>("clients", token, "", 1, 100),
          listMasters<ArticleMaster>("articles", token, "", 1, 100),
          listMasters<FabricMaster>("fabrics", token, "", 1, 100),
          listMasters<SizeCurveMaster>("size-curves", token, "", 1, 100),
        ]);
        setClients(clientsResult.items);
        setArticles(articlesResult.items);
        setFabrics(fabricsResult.items);
        setCurves(curvesResult.items);
        setForm((current) => ({ ...current }));
        setFabricLines((current) => current.map((line) => ({ ...line, fabricId: line.fabricId, color: line.color })));
      } catch (err) {
        if (isUnauthorizedError(err)) {
          window.localStorage.removeItem("proma-session");
          setSession(null);
          setError("La sesión venció. Ingresá nuevamente.");
          return;
        }
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos para crear la orden.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadOptions(storedSession.accessToken);
  }, []);

  const selectedCurve = useMemo(
    () => curves.find((curve) => String(curve.id) === form.sizeCurveId),
    [curves, form.sizeCurveId],
  );
  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === form.articleId),
    [articles, form.articleId],
  );
  const colorOptions = useMemo(
    () => Array.from(new Set(fabrics.map((fabric) => fabric.color).filter((color): color is string => Boolean(color)))).sort(),
    [fabrics],
  );
  const primaryFabric = fabricLines.find((line) => line.useType === "PRIMARIA" && line.fabricId) ?? fabricLines.find((line) => line.fabricId);

  const requestedItems = useMemo(
    () =>
      (selectedCurve?.values ?? [])
        .map((value) => ({
          sizeCurveValueId: value.id,
          label: value.label,
          color: primaryFabric?.color || undefined,
          quantityRequested: Number(quantities[String(value.id)] || 0),
        }))
        .filter((item) => item.quantityRequested > 0),
    [primaryFabric?.color, quantities, selectedCurve],
  );

  const totalQuantity = requestedItems.reduce((total, item) => total + item.quantityRequested, 0);
  const canSubmit =
    !!session &&
    !!form.externalCode.trim() &&
    !!form.clientId &&
    !!form.articleId &&
    !!primaryFabric?.fabricId &&
    !!form.sizeCurveId &&
    totalQuantity > 0 &&
    !isSaving;

  function setValue(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "sizeCurveId") setQuantities({});
  }

  function setFabricLine(id: string, patch: Partial<FabricLine>) {
    setFabricLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function setFabric(id: string, fabricId: string) {
    const selectedFabric = fabrics.find((fabric) => fabric.id === fabricId);
    setFabricLine(id, { fabricId, color: selectedFabric?.color ?? "" });
  }

  function addFabricLine(useType: FabricUseType) {
    setFabricLines((current) => [...current, createFabricLine("", useType)]);
  }

  function removeFabricLine(id: string) {
    setFabricLines((current) => current.length > 1 ? current.filter((line) => line.id !== id) : current);
  }

  function setQuantity(sizeId: number, value: string) {
    setQuantities((current) => ({ ...current, [String(sizeId)]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!session) {
      setError("Ingresá al sistema para crear una orden.");
      return;
    }
    if (totalQuantity <= 0) {
      setError("Cargá al menos un talle con cantidad mayor a cero.");
      return;
    }
    if (!primaryFabric?.fabricId || !form.sizeCurveId) {
      setError("La tela primaria y la curva son obligatorias.");
      return;
    }

    setIsSaving(true);
    try {
      const created = await createOrder(session.accessToken, {
        externalCode: form.externalCode.trim(),
        clientId: form.clientId,
        articleId: form.articleId,
        fabricId: primaryFabric.fabricId,
        sizeCurveId: Number(form.sizeCurveId),
        requestedItems: requestedItems.map((item) => ({
          sizeCurveValueId: item.sizeCurveValueId,
          color: item.color,
          quantityRequested: item.quantityRequested,
        })),
      });
      router.push(`/ordenes/${encodeURIComponent(created.internalCode)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la orden.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <AppTopBar activeSection="orders" />

      <section className={styles.hero}>
        <Link className={styles.backLink} href="/ordenes">Volver</Link>
        <h1>Nueva orden de corte</h1>
      </section>

      <form className={styles.workspace} onSubmit={handleSubmit}>
        <section className={styles.formPanel} aria-label="Datos de la orden">
          <div className={styles.sectionHeadingCompact}>
            <h2>Datos de la orden</h2>
          </div>

          <div className={styles.fieldsGrid}>
            <label className={styles.field}>
              <span>Código externo</span>
              <input value={form.externalCode} onChange={(event) => setValue("externalCode", event.target.value)} placeholder="OC legado o referencia" required />
            </label>
            <label className={styles.field}>
              <span>Cliente</span>
              <select value={form.clientId} onChange={(event) => setValue("clientId", event.target.value)} required>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Artículo</span>
              <select value={form.articleId} onChange={(event) => setValue("articleId", event.target.value)} required>
                <option value="">Seleccionar artículo</option>
                {articles.map((article) => <option key={article.id} value={article.id}>{article.code} · {article.name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Curva de talles</span>
              <select value={form.sizeCurveId} onChange={(event) => setValue("sizeCurveId", event.target.value)} required>
                <option value="">Seleccionar curva</option>
                {curves.map((curve) => <option key={curve.id} value={curve.id}>{curve.name}</option>)}
              </select>
            </label>
          </div>

          <div className={styles.sectionDivider} />
          <div className={styles.sectionHeadingCompact}>
            <h2>Telas y colores</h2>
          </div>
          <div className={styles.fabricStack}>
            {fabricLines.map((line, index) => (
              <div className={styles.fabricLine} key={line.id}>
                <label className={styles.field}>
                  <span>{index === 0 ? "Tela" : line.useType === "PRIMARIA" ? "Tela primaria" : "Tela complemento"}</span>
                  <select value={line.fabricId} onChange={(event) => setFabric(line.id, event.target.value)} required={index === 0}>
                    <option value="">Seleccionar tela</option>
                    {fabrics.map((fabric) => (
                      <option key={fabric.id} value={fabric.id}>{fabric.code} · {fabric.name}{fabric.color ? ` · ${fabric.color}` : ""}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Color</span>
                  <select value={line.color} onChange={(event) => setFabricLine(line.id, { color: event.target.value })}>
                    <option value="">Seleccionar color</option>
                    {colorOptions.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </label>
                {index === 0 ? <span className={styles.lineSpacer} aria-hidden="true" /> : (
                  <button className={styles.iconButton} type="button" onClick={() => removeFabricLine(line.id)} aria-label="Quitar tela">×</button>
                )}
              </div>
            ))}
          </div>
          <div className={styles.fabricLinks}>
            <button type="button" onClick={() => addFabricLine("PRIMARIA")}>+ Tela primaria</button>
            <button type="button" onClick={() => addFabricLine("COMPLEMENTO")}>+ Tela complemento</button>
          </div>

          <div className={styles.sectionDivider} />
          <div className={styles.sectionHeadingCompact}>
            <h2>Cantidades por talle</h2>
            <p>{selectedCurve ? `${selectedCurve.name} · ${selectedCurve.sequenceType}` : "Seleccioná una curva para cargar talles."}</p>
          </div>
          <div className={styles.sizeGrid}>
            {(selectedCurve?.values ?? []).map((value) => (
              <label key={value.id} className={styles.sizeField}>
                <span>{value.label}</span>
                <input type="number" min="0" inputMode="numeric" value={quantities[String(value.id)] ?? ""} onChange={(event) => setQuantity(value.id, event.target.value)} placeholder="0" />
              </label>
            ))}
          </div>

          {!isLoading && (clients.length === 0 || articles.length === 0 || fabrics.length === 0 || !selectedCurve?.values.length) ? (
            <p className={styles.error}>Para crear una orden primero debe existir cliente, artículo, tela y curva con talles.</p>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <Link className={styles.secondaryAction} href="/ordenes">Cancelar</Link>
            <button className={styles.primaryAction} type="submit" disabled={!canSubmit}>{isSaving ? "Creando..." : "Crear orden"}</button>
          </div>
        </section>
        <aside className={styles.sidePanel} aria-label="Referencias del artículo">
          <section className={styles.referenceCard}>
            <h2>Avíos requeridos</h2>
            <p>{selectedArticle ? formatList(selectedArticle.supplies ?? [], (supply) => supply.supply?.name ?? supply.id, "Sin avíos cargados") : "Seleccioná un artículo"}</p>
          </section>
          <section className={styles.referenceCard}>
            <h2>Partes decorables</h2>
            <p>{selectedArticle ? formatList(selectedArticle.decorationParts ?? [], (part) => `${part.garmentPart}: ${part.decorationType}`, "Sin partes decorables") : "Seleccioná un artículo"}</p>
          </section>
        </aside>
      </form>
    </main>
  );
}
