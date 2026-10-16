"use client";

import { useState } from "react";
import { createDecorationLoad, listStages, startStage, type OrderSummary, type PartNode } from "@/lib/api/orders.api";
import detail from "@/app/ordenes/[orderCode]/OrderDetail.module.css";
import styles from "./DecorationWorkPanel.module.css";

type Size = { id: number; label: string; quantityRequested: number };
type Draft = { id: string; lotCode: string; workDate: string; quantities: Record<number, string> };
type Props = { order: OrderSummary; parts: PartNode[]; stageName: "Bordado" | "Estampado"; sizes: Size[]; token: string; onSaved: () => Promise<void>; onFinished?: () => void };

export function DecorationWorkPanel({ order, parts, stageName, sizes, token, onSaved, onFinished }: Props) {
  const code = stageName === "Bordado" ? "BORDADO" : "ESTAMPADO";
  const decorationParts = [...new Set((order.article.decorationParts ?? []).filter(item => item.decorationType === code).map(item => item.garmentPart))];
  const [drafts, setDrafts] = useState<Record<string, Draft[]>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function key(partId: string, garmentPart: string) { return `${partId}:${garmentPart}`; }
  function addLot(partId: string, garmentPart: string) {
    const k = key(partId, garmentPart);
    setDrafts(current => ({ ...current, [k]: [...(current[k] ?? []), { id: crypto.randomUUID(), lotCode: `Lote ${(current[k]?.length ?? 0) + 1}`, workDate: localDate(), quantities: {} }] }));
  }
  function updateDraft(k: string, id: string, patch: Partial<Draft>) { setDrafts(current => ({ ...current, [k]: (current[k] ?? []).map(draft => draft.id === id ? { ...draft, ...patch } : draft) })); }
  function updateQuantity(k: string, id: string, sizeId: number, value: string) { setDrafts(current => ({ ...current, [k]: (current[k] ?? []).map(draft => draft.id === id ? { ...draft, quantities: { ...draft.quantities, [sizeId]: value } } : draft) })); }
  function removeDraft(k: string, id: string) { setDrafts(current => ({ ...current, [k]: (current[k] ?? []).filter(draft => draft.id !== id) })); }

  async function save(part: PartNode, garmentPart: string, available: Map<number, number>) {
    const k = key(part.id, garmentPart);
    const rows = (drafts[k] ?? []).filter(draft => Object.values(draft.quantities).some(value => Number(value) > 0));
    if (!rows.length) { setMessage("Cargá al menos un lote con cantidades."); return; }
    const used = new Map<number, number>();
    for (const row of rows) for (const size of sizes) { const quantity = Number(row.quantities[size.id] || 0); used.set(size.id, (used.get(size.id) ?? 0) + quantity); }
    if ([...used].some(([sizeId, quantity]) => !Number.isInteger(quantity) || quantity > (available.get(sizeId) ?? 0))) { setMessage("La suma de los lotes supera lo pendiente para un talle."); return; }
    setSaving(true); setMessage("");
    try {
      if (!part.events?.some(event => !event.finishedAt && event.stage?.code === code)) { const stage = (await listStages(token)).find(item => item.code === code); if (!stage) throw new Error("No se encontró el sector."); await startStage(token, part.id, { stageId: stage.id, executionType: "INTERNO" }); }
      let finished = false;
      for (const row of rows) { const result = await createDecorationLoad(token, part.id, { garmentPart, lotCode: row.lotCode.trim(), workDate: row.workDate, items: sizes.map(size => ({ sizeCurveValueId: size.id, quantity: Number(row.quantities[size.id] || 0) })) }); finished = result.stageFinished; }
setDrafts(current => ({ ...current, [k]: [] })); setMessage(finished ? `${stageName} finalizado: todas las partes completas.` : "Lotes registrados."); if (finished && onFinished) onFinished(); else await onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudieron guardar los lotes."); } finally { setSaving(false); }
  }

  if (!decorationParts.length) return <p className={styles.notice}>Este artículo no lleva {stageName.toLowerCase()}.</p>;
  if (!parts.length) return <p className={styles.notice}>No hay partes disponibles para {stageName.toLowerCase()}.</p>;
  return <section className={styles.panel} aria-label={`Carga de ${stageName.toLowerCase()}`}>
    <div className={detail.curveLoadHeader}><div><span className={detail.modalKicker}>{stageName.toUpperCase()}</span><strong>Cargar {stageName.toLowerCase()}</strong><p>Registrá lotes y cantidades por talle.</p></div><span className={styles.panelStatus}>{message || "Carga por parte de prenda"}</span></div>
    {parts.map(part => {
      const cutBySize = new Map<number, number>(); for (const load of part.cutLoads ?? []) for (const item of load.items ?? []) if (load.fabricUseType !== "COMPLEMENTO") cutBySize.set(item.sizeCurveValue.id, (cutBySize.get(item.sizeCurveValue.id) ?? 0) + item.quantity);
      return <div className={detail.cutLotStack} key={part.id}>{parts.length > 1 ? <h3 className={styles.partTitle}>{part.partCode} · {part.quantity} prendas</h3> : null}
        {decorationParts.map(garmentPart => {
          const k=key(part.id,garmentPart); const loads=(part.decorationLoads ?? []).filter(load => load.stageEvent?.stage?.code === code && load.garmentPart === garmentPart); const done=new Map<number,number>(); for(const load of loads) for(const item of load.items ?? []) done.set(item.sizeCurveValue.id,(done.get(item.sizeCurveValue.id)??0)+item.quantity); const available=new Map(sizes.map(size=>[size.id,Math.max(0,(cutBySize.get(size.id)??0)-(done.get(size.id)??0))])); const complete=[...available.values()].every(value=>value===0) && cutBySize.size>0; const rows=drafts[k]??[];
          return <section className={detail.cutFabricGroup} key={k}><div className={detail.cutFabricGroupHeader}><strong>{garmentPart}</strong><span>{done.size ? `${[...done.values()].reduce((a,b)=>a+b,0)} / ${[...cutBySize.values()].reduce((a,b)=>a+b,0)} prendas` : "Sin lotes registrados"}</span></div>{rows.length ? <><div className={detail.cutLotSheetWrap}><table className={detail.cutLotSheet}><thead><tr><th>Lote</th>{sizes.map(size=><th key={size.id}>{size.label}</th>)}<th>Total</th><th>Fecha</th><th aria-label="Acciones" /></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th className={detail.cutLotNumberCell}><input value={row.lotCode} onChange={e=>updateDraft(k,row.id,{lotCode:e.target.value})} aria-label="Nombre del lote" /></th>{sizes.map(size=><td className={detail.cutLotQuantityCell} key={size.id}><input type="number" min="0" max={available.get(size.id)??0} value={row.quantities[size.id]??""} onChange={e=>updateQuantity(k,row.id,size.id,e.target.value)} /></td>)}<td className={detail.cutLotTotalCell}><strong>{sizes.reduce((sum,size)=>sum+Number(row.quantities[size.id]||0),0)}</strong></td><td className={detail.dateCell}><input type="date" value={row.workDate} onChange={e=>updateDraft(k,row.id,{workDate:e.target.value})} /></td><td className={detail.cutLotActionCell}><button type="button" onClick={()=>removeDraft(k,row.id)} aria-label="Eliminar lote">×</button></td></tr>)}</tbody></table></div><div className={detail.modalActions}><button className={detail.secondaryButton} type="button" disabled={saving} onClick={()=>setDrafts(current=>({...current,[k]:[]}))}>Cancelar</button><button className={detail.stageActionButton} type="button" disabled={saving} onClick={()=>void save(part,garmentPart,available)}>{complete ? "Completo" : "Guardar lotes"}</button></div></> : null}<button className={styles.addLotButton} type="button" disabled={saving || complete || !cutBySize.size} onClick={()=>addLot(part.id,garmentPart)}>{loads.length ? "+ Lote" : "Cargar lotes"}</button></section>;
        })}</div>;
    })}
  </section>;
}
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
