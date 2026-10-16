'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiRequest, LoginResponse } from '@/lib/api/client';
import { listOrders, OrderSummary } from '@/lib/api/orders.api';
import { WorkshopMaster } from '@/lib/api/masters.api';
import styles from './Confeccion.module.css';

type Row = { order: OrderSummary; part: OrderSummary['parts'][number] };

export default function ConfeccionPage() {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopMaster[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('proma-session') ?? 'null') as LoginResponse | null;
    if (!stored) return;
    setSession(stored);
    Promise.all([listOrders(stored.accessToken, ''), apiRequest<{ items: WorkshopMaster[] }>('/workshops?specialty=CONFECCION', { token: stored.accessToken })])
      .then(([orderResult, workshopResult]) => { setOrders(orderResult.items); setWorkshops(workshopResult.items); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar Confección.'));
  }, []);

  const rows = useMemo<Row[]>(() => orders.flatMap(order => order.parts.filter(part => (part.cutLoads ?? []).some(load => (load.items ?? []).some(item => item.quantity > 0))).map(part => ({ order, part }))), [orders]);

  async function assign(row: Row) {
    if (!session || !selectedWorkshop[row.part.id]) return;
    setMessage(''); setError('');
    try {
      await apiRequest(`/confection/parts/${row.part.id}/assign`, { method: 'POST', token: session.accessToken, body: JSON.stringify({ workshopId: selectedWorkshop[row.part.id] }) });
      setMessage(`Parte ${row.part.partCode} asignada correctamente.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo asignar el taller.'); }
  }

  return <main className={styles.screen}><header className={styles.header}><Link href="/ordenes">Control de producción</Link><strong>Confección</strong></header><section className={styles.content}><h1>Confección externa</h1><p className={styles.intro}>Cortes terminados listos para asignar a un taller. Bordado, estampado y avíos pueden continuar en paralelo.</p>{message && <p className={styles.success}>{message}</p>}{error && <p className={styles.error}>{error}</p>}<div className={styles.table}><div className={styles.rowHeader}><span>Orden</span><span>Parte</span><span>Artículo</span><span>Cantidad</span><span>Asignar taller</span></div>{rows.length === 0 ? <p className={styles.empty}>No hay cortes terminados pendientes de asignación.</p> : rows.map(row => <div className={styles.row} key={row.part.id}><strong>{row.order.externalCode || row.order.internalCode}</strong><span>{row.part.partCode}</span><span>{row.order.article.name}</span><span>{(row.part.cutLoads ?? []).flatMap(load => load.items ?? []).reduce((total, item) => total + item.quantity, 0)}</span><span className={styles.actions}><select aria-label={`Taller para ${row.part.partCode}`} value={selectedWorkshop[row.part.id] ?? ''} onChange={event => setSelectedWorkshop(current => ({ ...current, [row.part.id]: event.target.value }))}><option value="">Seleccionar</option>{workshops.map(workshop => <option key={workshop.id} value={workshop.id}>{workshop.name}</option>)}</select><button type="button" disabled={!selectedWorkshop[row.part.id]} onClick={() => void assign(row)}>Asignar</button></span></div>)}</div></section></main>;
}
