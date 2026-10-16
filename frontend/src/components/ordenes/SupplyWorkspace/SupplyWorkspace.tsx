'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginResponse, isUnauthorizedError } from '@/lib/api/client';
import { getSupplyPreparation, listSupplyPreparations, PreparationPart, PreparationStatus, saveSupplyPreparation, SupplyCategory, SupplyPreparation } from '@/lib/api/supply-preparations.api';
import cut from '@/app/ordenes/CorteSector.module.css';
import detail from '@/app/ordenes/[orderCode]/OrderDetail.module.css';
import styles from './SupplyWorkspace.module.css';

const categories: { value: SupplyCategory; label: string }[] = [
  { value: 'CONFECCION', label: 'Avíos de confección' }, { value: 'TERMINACION', label: 'Avíos de terminación' },
];
const states: { value: PreparationStatus; label: string; tone: string }[] = [
  { value: 'PARA_PREPARAR', label: 'Para preparar', tone: styles.pending },
  { value: 'EN_PREPARACION', label: 'En preparación', tone: styles.preparing },
  { value: 'INCOMPLETO', label: 'Incompletos', tone: styles.incomplete },
  { value: 'TERMINADO', label: 'Terminados', tone: styles.complete },
];
const number = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
function allowed(session: LoginResponse, category: SupplyCategory, action: string) {
  return session.user.role === 'ADMIN' || !!session.user.permissions?.some(p => p.isAllowed && p.action === action && (p.sectorCode === null || p.sectorCode === `AVIOS_${category}`));
}
export function isSupplySectorUser(session: LoginResponse) {
  const sectors = (session.user.permissions ?? []).filter(p => p.isAllowed && p.action === 'VER').map(p => p.sectorCode);
  return session.user.role !== 'ADMIN' && sectors.length > 0 && sectors.every(s => s === 'AVIOS_CONFECCION' || s === 'AVIOS_TERMINACION');
}

export function SupplyWorkspace({ session: suppliedSession, orderId }: { session?: LoginResponse; orderId?: string }) {
  const router = useRouter();
  const [session, setSession] = useState<LoginResponse | null>(suppliedSession ?? null);
  const [category, setCategory] = useState<SupplyCategory>('CONFECCION');
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState<SupplyPreparation[]>([]);
  const [order, setOrder] = useState<SupplyPreparation | null>(null);
  const [mode, setMode] = useState<'cards' | 'list'>('cards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const saved = suppliedSession ?? JSON.parse(localStorage.getItem('proma-session') ?? 'null') as LoginResponse | null;
      if (!saved) { router.replace('/ordenes'); return; }
      setSession(saved);
      const requested = new URLSearchParams(window.location.search).get('category');
      const firstAllowed = categories.find(c => allowed(saved, c.value, 'VER'))?.value;
      setCategory(requested === 'TERMINACION' && allowed(saved, 'TERMINACION', 'VER') ? 'TERMINACION' : firstAllowed ?? 'CONFECCION');
      setReady(true);
    } catch { router.replace('/ordenes'); }
  }, [suppliedSession, router]);
  useEffect(() => {
    if (!session || !ready) return;
    let cancelled = false;
    setLoading(true); setError(''); setOrders([]);
    const request = orderId ? getSupplyPreparation(session.accessToken, orderId, category).then(result => { if (!cancelled) setOrder(result); })
      : listSupplyPreparations(session.accessToken, category, query, page).then(result => { if (!cancelled) { setOrders(result.items); setTotal(result.total); } });
    request.catch(err => {
      if (cancelled) return;
      if (isUnauthorizedError(err)) { localStorage.removeItem('proma-session'); router.replace('/ordenes'); }
      else setError(err instanceof Error ? err.message : 'No se pudieron cargar los avíos.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session, ready, category, query, page, orderId, revision, router]);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const onSaved = useCallback(() => { setSaved(true); setRevision(value => value + 1); }, []);
  if (!session || !ready) return <main className={cut.screen}><p className={styles.notice}>Cargando Avíos…</p></main>;
  const categoryLabel = categories.find(c => c.value === category)!.label;
  const status = states.find(s => s.value === order?.status);
  function switchCategory(next: SupplyCategory) {
    if (next === category) return;
    setCategory(next); setPage(1); setSaved(false);
    window.history.replaceState(null, '', `${window.location.pathname}?category=${next}`);
  }
  return <main className={`${cut.screen} ${styles.screen}`}>
    <header className={cut.topBar}>
      <Link href="/ordenes" className={cut.brand}><span className={cut.brandMark} aria-hidden="true" /><strong>Control de Producción</strong></Link>
      <Link className={cut.navPill} href={`/avios?category=${category}`}>Mis avíos</Link>
      <div className={cut.topActions}>
        <span className={cut.userChip}>{session.user.fullName} · Avíos</span>
        <button className={cut.avatar} type="button" aria-label="Cerrar sesión" onClick={() => { localStorage.removeItem('proma-session'); window.location.assign('/ordenes'); }}>{session.user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}</button>
      </div>
    </header>
    <section className={cut.content}>
      {orderId ? <Link className={cut.backLink} href={`/avios?category=${category}`}>← Volver a mis avíos</Link> : <div className={cut.boardHero}><h1>Mis avíos</h1><p>Preparación de avíos por orden de corte.</p></div>}
      <div className={styles.categories} aria-label="Tipo de avíos">
        {categories.map(c => <button key={c.value} type="button" aria-pressed={category === c.value} disabled={!allowed(session, c.value, 'VER')} onClick={() => switchCategory(c.value)}>{c.label}</button>)}
      </div>
      {!orderId && <div className={styles.toolbar}>
        <form onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }} className={styles.searchForm}>
          <label className={cut.searchBox}><span className={cut.searchIcon} aria-hidden="true" /><input aria-label="Buscar orden, cliente o artículo" placeholder="Orden, cliente o artículo" type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <button className={styles.secondary} type="submit">Buscar</button>
        </form>
        <div className={cut.viewSwitch} aria-label="Modo de visualización">
          <button className={mode === 'cards' ? cut.viewSwitchActive : ''} aria-pressed={mode === 'cards'} onClick={() => setMode('cards')}><span className={cut.gridIcon} aria-hidden="true" />Tarjetas</button>
          <button className={mode === 'list' ? cut.viewSwitchActive : ''} aria-pressed={mode === 'list'} onClick={() => setMode('list')}><span className={cut.listIcon} aria-hidden="true" />Lista</button>
        </div>
      </div>}
      {saved && !loading && <p role="status" className={styles.complete}>Preparación guardada.</p>}
      {error && <div role="alert" className={styles.error}>{error} <button className={styles.secondary} onClick={reload}>Reintentar</button></div>}
      {loading && (!orderId || order?.id !== orderId || order?.category !== category) ? <p role="status" className={styles.notice}>Cargando órdenes…</p> : !error && (orderId ? order && <>
        <header className={cut.detailHero}>
          <div><h1 className={cut.detailTitle}>{order.externalCode || order.internalCode}</h1><div className={cut.detailClient}>{order.clientName}</div><div className={cut.detailArticle}><span className={cut.articleCode}>{order.articleCode}</span> · {order.articleName}</div><p className={cut.fabricMeta}>{order.fabricName} · {number(order.parts.reduce((sum, part) => sum + part.quantity, 0))} prendas</p>{order.splitGroups.length > 0 && <p className={detail.splitBadge}>Dividida en {order.splitGroups.reduce((sum, group) => sum + group.children.length, 0)} partes desde Corte: {order.splitGroups.flatMap(group => group.children.map(child => `${child.partCode} ${number(child.quantity)} prendas`)).join(' · ')}</p>}</div>
          <aside className={cut.statusBox}><span className={cut.statusCaption}>{categoryLabel}</span><strong className={`${cut.statusLabel} ${status?.tone}`}>{order.status === 'INCOMPLETO' ? 'Incompleto' : order.status === 'TERMINADO' ? 'Terminado' : status?.label}</strong><span className={cut.statusNote}>Preparación en paralelo</span></aside>
        </header>
        <p className={styles.help}>Total necesario = cantidad por prenda × prendas. Si preparás de más, el avío queda completo.</p>
        {order.parts.map(part => <SupplyPartForm key={`${category}-${part.id}-${part.supplies.map(s => s.updatedAt).join()}`} orderCode={order.externalCode || order.internalCode} part={part} category={category} token={session.accessToken} editable={allowed(session, category, 'EDITAR')} onSaved={onSaved} />)}
      </> : <>
        <div className={mode === 'cards' ? styles.board : styles.list}>
          {states.map(state => {
            const rows = orders.filter(o => o.status === state.value);
            return <section className={cut.column} key={state.value} aria-label={state.label}>
              <header className={cut.columnHeader}><h2 className={`${cut.columnTitle} ${state.tone}`}>{state.label}</h2><span className={cut.columnCount}>{rows.length}</span></header>
              {!rows.length ? <p className={styles.empty}>Sin órdenes {state.value === 'PARA_PREPARAR' ? 'para preparar' : state.value === 'EN_PREPARACION' ? 'en preparación' : state.label.toLowerCase()}.</p> : <div className={cut.orderList}>{rows.map(item => <Link key={item.id} href={`/avios/${item.id}?category=${category}`} className={`${cut.orderCard} ${mode === 'list' ? styles.listRow : ''}`}>
                <div><strong className={cut.orderCode}>{item.externalCode || item.internalCode}</strong><div className={cut.clientName}>{item.clientName}</div><div className={cut.orderMeta}>{item.articleCode} · {item.articleName}</div><div className={cut.orderNote}>{number(item.parts.reduce((sum, part) => sum + part.quantity, 0))} prendas · {item.parts.reduce((sum, p) => sum + p.supplies.filter(s => s.completeness === 'COMPLETO').length, 0)} de {item.parts.reduce((sum, p) => sum + p.supplies.length, 0)} avíos completos</div></div><span className={cut.chevron} aria-hidden="true">›</span>
              </Link>)}</div>}
            </section>;
          })}
        </div>
        <nav className={styles.pagination} aria-label="Paginación de órdenes"><span>{total} órdenes · página {page} de {Math.max(1, Math.ceil(total / 20))}</span><button className={styles.secondary} disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><button className={styles.secondary} disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Siguiente</button></nav>
      </>)}
    </section>
  </main>;
}

function SupplyPartForm({ orderCode, part, category, token, editable, onSaved }: { orderCode: string; part: PreparationPart; category: SupplyCategory; token: string; editable: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(part.supplies.map(s => [s.id, s.quantityAvailable === null ? '' : String(s.quantityAvailable)])));
  const [shortages, setShortages] = useState<Record<string, string>>(() => Object.fromEntries(part.supplies.map(s => [s.id, s.quantityAvailable !== null && s.completeness !== 'COMPLETO' ? s.completeness : ''])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const started = part.supplies.some(s => s.started || s.quantityAvailable !== null);

  async function save(action: 'START' | 'SAVE' = 'SAVE') {
    setError('');
    const items = action === 'START' ? [] : part.supplies.filter(s => values[s.id] !== '').map(s => ({ supplyId: s.id, quantityAvailable: Number(values[s.id]), completeness: s.total !== null && Number(values[s.id]) >= s.total ? 'COMPLETO' : shortages[s.id] }));
    if (action === 'SAVE' && !items.length) { setError('Cargá al menos una cantidad preparada.'); return; }
    if (items.some(item => !Number.isSafeInteger(item.quantityAvailable) || item.quantityAvailable < 0 || !item.completeness)) { setError('Revisá las cantidades e indicá Parcial o Faltante para cada avío incompleto.'); return; }
    setSaving(true);
    try { await saveSupplyPreparation(token, part.id, category, action, items); setOpen(false); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar. Tus cantidades siguen en pantalla.'); }
    finally { setSaving(false); }
  }

  return <section className={styles.partBlock} aria-labelledby={`part-${part.id}`}>
    <header className={styles.partHeader}>
      <div><h2 id={`part-${part.id}`} className={cut.sectionTitle}>{part.partCode}</h2><span className={cut.fabricMeta}>{number(part.quantity)} prendas</span></div>
      {editable && <button type="button" className={cut.actionButton} disabled={saving} onClick={() => { setError(''); setOpen(true); }}>{started ? 'Editar avíos' : 'Cargar avíos'}</button>}
    </header>
    <div className={styles.tableHead} aria-hidden="true"><span>Avío</span><span>Por prenda</span><span>Total necesario</span><span>Preparado</span><span>Estado</span></div>
    {part.supplies.map(supply => <div key={supply.id} className={styles.supplyRow}>
      <div className={styles.supplyName}><span className={cut.articleCode}>{supply.code}</span><strong>{supply.name}</strong>{supply.color && <span className={cut.fabricMeta}>{supply.color}</span>}</div>
      <div className={styles.metric}><span>Por prenda</span><strong>{supply.perUnit === null ? 'Sin definir' : number(supply.perUnit)}</strong></div>
      <div className={styles.metric}><span>Total necesario</span><strong>{supply.total === null ? 'Sin definir' : number(supply.total)}</strong></div>
      <div className={styles.metric}><span>Preparado</span><strong>{supply.quantityAvailable === null ? 'Sin preparar' : number(supply.quantityAvailable)}</strong></div>
      <div className={styles.supplyState}>{supply.completeness === 'COMPLETO' ? <strong className={styles.complete}>Completo</strong> : supply.quantityAvailable === null ? <span>Sin preparar</span> : <span>{supply.completeness === 'PARCIAL' ? 'Parcial' : 'Faltante'}</span>}</div>
    </div>)}
    {open && <div className={detail.modalBackdrop} role="presentation" onMouseDown={() => setOpen(false)}>
      <div className={detail.workModal} role="dialog" aria-modal="true" aria-labelledby={`supply-load-${part.id}`} onMouseDown={event => event.stopPropagation()}>
        <div className={detail.curveLoadHeader}><div><span className={detail.modalKicker}>{orderCode} / {part.partCode}</span><strong id={`supply-load-${part.id}`}>Cargar avíos</strong><p>{category === 'CONFECCION' ? 'Avíos de confección' : 'Avíos de terminación'} · {number(part.quantity)} prendas</p></div><span>Lista de avíos</span></div>
        <div className={styles.modalSupplyList}>
          {part.supplies.map(supply => {
            const entered = values[supply.id] !== '';
            const complete = entered && supply.total !== null && Number(values[supply.id]) >= supply.total;
            return <div key={supply.id} className={styles.modalSupplyRow}>
              <div className={styles.supplyName}><span className={cut.articleCode}>{supply.code}</span><strong>{supply.name}</strong>{supply.color && <span className={cut.fabricMeta}>{supply.color}</span>}</div>
              <div className={styles.modalSupplyNeed}><span>Necesario</span><strong>{supply.total === null ? 'Sin definir' : number(supply.total)}</strong></div>
              <label className={styles.quantityInput}><span>Preparado</span><input aria-label={`Cantidad preparada de ${supply.name}`} type="number" min="0" step="1" placeholder="0" disabled={!editable || saving || supply.total === null} value={values[supply.id]} onChange={event => setValues(current => ({ ...current, [supply.id]: event.target.value }))} /></label>
              <div className={styles.supplyState}>{complete ? <strong className={styles.complete}>Completo</strong> : supply.total === null ? <span>Definir cantidad en el artículo</span> : entered ? <fieldset disabled={!editable || saving}><legend>Estado de {supply.name}</legend>{['PARCIAL', 'FALTANTE'].map(value => <label key={value}><input required type="radio" name={`shortage-${part.id}-${supply.id}`} value={value} checked={shortages[supply.id] === value} onChange={() => setShortages(current => ({ ...current, [supply.id]: value }))} />{value === 'PARCIAL' ? 'Parcial' : 'Faltante'}</label>)}</fieldset> : <span>Sin preparar</span>}</div>
            </div>;
          })}
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={detail.modalActions}><button className={detail.secondaryButton} type="button" disabled={saving} onClick={() => setOpen(false)}>Cancelar</button><button className={detail.stageActionButton} type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Cargando…' : 'Cargar avíos'}</button></div>
      </div>
    </div>}
  </section>;
}
