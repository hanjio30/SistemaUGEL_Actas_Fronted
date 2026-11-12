/** @jsxImportSource preact */
import { useState, useEffect, useMemo, useRef } from 'preact/hooks';

const API_URL = 'https://sistemaugel-actas-backend.onrender.com/api';
const PLAZO = 10; // días hábiles de atención
const TTL_CACHE = 45_000; // ms: las consultas repetidas no vuelven al servidor
const FILAS_PAG = 10;

const COLOR_ESTADO = {
  'RECEPCIONADO': '#6366f1',
  'EN PROCESO': '#f59e0b',
  'OBSERVADO': '#e11d48',
  'LISTO PARA ENTREGA': '#0ea5d7',
  'ENTREGADO': '#10b981',
};
const ESTADOS = Object.keys(COLOR_ESTADO);
const PALETA = ['#083f8f', '#0ea5d7', '#10b981', '#f59e0b', '#e11d48', '#6366f1', '#ec4899', '#14b8a6'];

const REPORTES = [
  { id: 'expedientes-periodo', icono: '▦', forma: 'sq', titulo: 'Expedientes por período', desc: 'Volumen recibido, atendido y plazos', color: '#083f8f', fechas: true, excel: 'expedientes' },
  { id: 'estados-actuales', icono: '◔', forma: 'ci', titulo: 'Estados actuales', desc: 'Dónde está cada expediente hoy', color: '#0ea5d7' },
  { id: 'por-colaborador', icono: '◉', forma: 'ci', titulo: 'Por colaborador', desc: 'Atenciones realizadas por persona', color: '#10b981', fechas: true, excel: 'colaboradores' },
  { id: 'por-asunto', icono: '◆', forma: 'di', titulo: 'Por asunto', desc: 'Qué trámites se piden y cómo avanzan', color: '#ec4899', fechas: true, excel: 'asuntos' },
  { id: 'tiempos-atencion', icono: '◷', forma: 'ci', titulo: 'Tiempos de atención', desc: 'Cumplimiento del plazo por asunto', color: '#6366f1', fechas: true, excel: 'tiempos' },
  { id: 'expedientes-observados', icono: '▲', forma: 'tr', titulo: 'Observados', desc: 'Expedientes detenidos por observación', color: '#e11d48', excel: 'observados' },
  { id: 'entregas', icono: '✔', forma: 'sq', titulo: 'Entregas', desc: 'Documentos entregados y a quién', color: '#f59e0b', fechas: true, excel: 'entregas' },
];

const aISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ---------- consultas optimizadas: caché + cancelación ---------- */

const CACHE = new Map();
async function pedir(url, { signal, forzar } = {}) {
  const hit = CACHE.get(url);
  if (!forzar && hit && Date.now() - hit.t < TTL_CACHE) return { data: hit.data, cache: true };
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || 'No se pudo generar el reporte');
  }
  const data = await res.json();
  CACHE.set(url, { t: Date.now(), data });
  return { data, cache: false };
}

function useDebounced(valor, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}

/* ---------- estilos ---------- */

const CSS = `
.rp{--ink:#12203b;--mute:#5b6577;--line:#dbe1ec;--paper:#eaf0f9;--surf:#fff;--brand:#083f8f;--sky:#0ea5d7;--ok:#10b981;--warn:#f59e0b;--bad:#e11d48;--vio:#6366f1;--pink:#ec4899;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);
  background:radial-gradient(900px 400px at 100% -10%,#d6e6fb 0,transparent 60%),radial-gradient(700px 380px at -10% 110%,#fde4f0 0,transparent 55%),var(--paper);
  min-height:100vh;padding:26px;font-variant-numeric:tabular-nums}
.rp *{box-sizing:border-box}
/* cabecera */
.rp-top{position:relative;overflow:hidden;border-radius:18px;padding:26px 30px;margin-bottom:24px;color:#fff;
  background:linear-gradient(120deg,#062c66 0%,#083f8f 45%,#0ea5d7 100%);display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;
  box-shadow:0 10px 30px -12px rgba(8,63,143,.55)}
.rp-top::before,.rp-top::after{content:"";position:absolute;border-radius:50%;pointer-events:none}
.rp-top::before{width:240px;height:240px;right:-60px;top:-110px;background:rgba(255,255,255,.12)}
.rp-top::after{width:140px;height:140px;right:150px;bottom:-80px;background:rgba(236,72,153,.35)}
.rp-top h1{margin:0;font-size:29px;letter-spacing:-.02em;font-weight:800;position:relative}
.rp-top p{margin:6px 0 0;opacity:.9;font-size:14px;max-width:60ch;position:relative}
.rp-user{font-size:13px;background:rgba(255,255,255,.16);padding:8px 14px;border-radius:999px;position:relative;backdrop-filter:blur(4px)}
.rp-grid{display:grid;grid-template-columns:285px 1fr;gap:24px;align-items:start}
/* menú */
.rp-rail{display:grid;gap:10px;position:sticky;top:16px}
.rp-rail button{all:unset;box-sizing:border-box;display:flex;gap:12px;align-items:center;width:100%;padding:12px 14px;cursor:pointer;
  background:var(--surf);border:1px solid var(--line);border-radius:14px;transition:transform .15s,box-shadow .15s,border-color .15s}
.rp-rail button:hover{transform:translateX(3px);box-shadow:0 6px 16px -8px rgba(18,32,59,.35)}
.rp-rail button:focus-visible{outline:3px solid var(--sky);outline-offset:2px}
.rp-rail button[aria-pressed=true]{border-color:var(--c);background:linear-gradient(90deg,color-mix(in srgb,var(--c) 14%,#fff),#fff);box-shadow:0 8px 20px -10px var(--c)}
.rp-ico{flex:none;width:40px;height:40px;display:grid;place-items:center;color:#fff;font-size:18px;background:var(--c)}
.rp-ico.sq{border-radius:10px}.rp-ico.ci{border-radius:50%}
.rp-ico.di{border-radius:8px;transform:rotate(45deg)}.rp-ico.di>i{transform:rotate(-45deg);font-style:normal}
.rp-ico.tr{border-radius:10px 10px 22px 22px}
.rp-rail b{display:block;font-size:14.5px;font-weight:700}
.rp-rail span.d{display:block;font-size:12px;color:var(--mute);margin-top:2px;line-height:1.3}
.rp-main{min-width:0}
/* filtros */
.rp-bar{background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin-bottom:18px;
  border-top:5px solid var(--c,var(--brand));box-shadow:0 6px 18px -12px rgba(18,32,59,.4)}
.rp-bar h4{margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);display:flex;align-items:center;gap:8px}
.rp-bar h4 s{width:8px;height:8px;border-radius:50%;background:var(--c,var(--brand));text-decoration:none}
.rp-filtros{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end}
.rp-bar label{display:grid;gap:5px;font-size:12.5px;font-weight:600;color:var(--mute)}
.rp-bar input,.rp-bar select{padding:9px 11px;border:1px solid #b9c2d1;border-radius:10px;font:inherit;font-size:14px;color:var(--ink);background:#fff;min-width:150px}
.rp-bar input:focus,.rp-bar select:focus{outline:2px solid var(--sky);border-color:var(--sky)}
.rp-chk{display:flex!important;grid-auto-flow:column;align-items:center;gap:8px!important;padding:9px 12px;border:1px solid #b9c2d1;border-radius:10px;background:#fff;cursor:pointer}
.rp-chk input{min-width:0!important;width:16px;height:16px;accent-color:var(--brand)}
.rp-sp{flex:1}
.rp-acc{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px dashed var(--line);align-items:center}
.rp-btn{padding:10px 18px;border:0;border-radius:999px;font:inherit;font-size:14px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--brand),#1565c0);cursor:pointer;
  box-shadow:0 6px 14px -6px var(--brand);transition:transform .12s}
.rp-btn:hover:not(:disabled){transform:translateY(-1px)}
.rp-btn.alt{background:#fff;color:var(--brand);border:1.5px solid var(--brand);box-shadow:none}
.rp-btn.xl{background:linear-gradient(135deg,#0b8f5f,#10b981);box-shadow:0 6px 14px -6px #10b981}
.rp-btn.pdf{background:linear-gradient(135deg,#be123c,#e11d48);box-shadow:0 6px 14px -6px #e11d48}
.rp-btn.ghost{background:#fff;color:var(--mute);border:1px solid var(--line);box-shadow:none;padding:10px 14px}
.rp-btn:disabled{opacity:.55;cursor:wait}
.rp-btn:focus-visible{outline:3px solid var(--sky);outline-offset:2px}
.rp-badge{font-size:12px;color:var(--mute);background:#f1f4f9;border-radius:999px;padding:4px 10px}
.rp-err{background:#fff1f3;border-left:5px solid var(--bad);padding:12px 16px;border-radius:10px;margin-bottom:18px;font-size:14px;color:#8a1c27}
.rp-empty{background:var(--surf);border:2px dashed #b9c2d1;border-radius:16px;padding:48px 24px;text-align:center;color:var(--mute)}
.rp-empty b{display:block;color:var(--ink);font-size:17px;margin-bottom:6px}
/* paneles */
.rp-panel{background:var(--surf);border:1px solid var(--line);border-radius:16px;margin-bottom:18px;overflow:hidden;box-shadow:0 6px 18px -14px rgba(18,32,59,.5)}
.rp-panel>header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid var(--line);
  background:linear-gradient(90deg,#f4f8ff,#fff)}
.rp-panel h3{margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px}
.rp-panel h3::before{content:"";width:6px;height:18px;border-radius:3px;background:linear-gradient(var(--sky),var(--brand))}
.rp-panel .body{padding:20px}
.rp-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
/* KPI */
.rp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.rp-kpi{position:relative;overflow:hidden;border-radius:14px;padding:16px 16px 14px;background:linear-gradient(160deg,color-mix(in srgb,var(--k) 13%,#fff),#fff 70%);border:1px solid color-mix(in srgb,var(--k) 25%,#fff)}
.rp-kpi::after{content:"";position:absolute;right:-18px;top:-18px;width:64px;height:64px;border-radius:50%;background:var(--k);opacity:.16}
.rp-kpi:nth-child(even)::after{border-radius:14px;transform:rotate(30deg)}
.rp-kpi strong{display:block;font-size:32px;font-weight:800;letter-spacing:-.03em;line-height:1.1;color:var(--k)}
.rp-kpi span{font-size:12.5px;color:var(--mute)}
/* cinta */
.rp-ribbon{display:flex;height:38px;border-radius:999px;overflow:hidden;margin:18px 0 10px;background:#e3e8f0}
.rp-ribbon i{display:flex;align-items:center;justify-content:center;color:#fff;font:700 12px ui-sans-serif,system-ui;font-style:normal;min-width:2px}
.rp-legend{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:var(--mute)}
.rp-legend s{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;text-decoration:none}
/* dona */
.rp-donut{display:flex;align-items:center;gap:22px;flex-wrap:wrap;justify-content:center}
.rp-donut svg{width:190px;height:190px;flex:none}
.rp-donut text{font-family:inherit}
/* barras */
.rp-row{display:grid;grid-template-columns:minmax(110px,230px) 1fr 90px;gap:14px;align-items:center;padding:7px 0;font-size:14px}
.rp-row .t{height:12px;background:#e3e8f0;border-radius:999px;overflow:hidden}
.rp-row .t i{display:block;height:100%;border-radius:999px}
.rp-row em{font-style:normal;text-align:right;font-weight:700}
/* columnas verticales */
.rp-cols{display:flex;align-items:flex-end;gap:12px;height:190px;padding:10px 4px 0;border-bottom:2px solid var(--line)}
.rp-cols div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.rp-cols i{display:block;width:100%;max-width:56px;border-radius:10px 10px 0 0;min-height:3px}
.rp-cols b{font-size:12.5px;margin-bottom:4px}
.rp-cols-l{display:flex;gap:12px;padding:6px 4px 0}
.rp-cols-l span{flex:1;text-align:center;font-size:11.5px;color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* tablas */
.rp-tw{overflow-x:auto}
.rp table{width:100%;border-collapse:collapse;font-size:14px}
.rp th{padding:11px 16px;text-align:left;font-size:12px;font-weight:700;color:var(--mute);background:#f4f8ff;border-bottom:2px solid var(--line);white-space:nowrap;text-transform:uppercase;letter-spacing:.04em}
.rp td{padding:11px 16px;border-bottom:1px solid #e8ecf2;vertical-align:middle}
.rp tbody tr:nth-child(even){background:#fafcff}
.rp tbody tr:hover{background:#eef5ff}
.rp tr:last-child td{border-bottom:0}
.rp .c{text-align:center}.rp .r{text-align:right}
.rp-tag{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;color:#fff;white-space:nowrap}
.rp-meter{display:inline-flex;align-items:center;gap:8px}
.rp-meter span{display:inline-flex;gap:2px}
.rp-meter span i{width:7px;height:16px;border-radius:3px;background:#dfe4ec}
.rp-meter b{min-width:34px;text-align:right;font-size:13px}
.rp-note{padding:14px 20px;background:#fff6e0;border-top:1px solid #f0dca6;font-size:14px}
.rp-pag{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-top:1px solid var(--line);font-size:13px;color:var(--mute);background:#fafcff}
.rp-pag div{display:flex;gap:6px}
.rp-pag button{padding:5px 12px;border-radius:999px;border:1px solid var(--line);background:#fff;cursor:pointer;font:inherit;font-size:13px}
.rp-pag button:disabled{opacity:.4;cursor:default}
.rp-spin{display:inline-block;width:14px;height:14px;border:2px solid #fff;border-right-color:transparent;border-radius:50%;animation:rpspin .7s linear infinite;vertical-align:-2px;margin-right:8px}
.rp-skel{height:90px;border-radius:16px;margin-bottom:18px;background:linear-gradient(90deg,#e3e8f0 25%,#f1f4f9 50%,#e3e8f0 75%);background-size:200% 100%;animation:rpsk 1.2s infinite}
@keyframes rpspin{to{transform:rotate(360deg)}}
@keyframes rpsk{to{background-position:-200% 0}}
@media(max-width:900px){.rp{padding:14px}.rp-grid{grid-template-columns:1fr}.rp-rail{position:static;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.rp-row{grid-template-columns:1fr 70px}.rp-row .t{grid-column:1/-1;order:3}}
@media(prefers-reduced-motion:reduce){.rp-spin,.rp-skel{animation:none}.rp-rail button{transition:none}}
@media print{
  .rp{background:#fff;padding:0}.rp-rail,.rp-bar,.rp-pag,.rp-noprint{display:none!important}
  .rp-grid{display:block}.rp-top{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .rp-panel{break-inside:avoid;box-shadow:none}.rp *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

/* ---------- piezas reutilizables ---------- */

function Panel({ titulo, extra, children, flush }) {
  return (
    <section class="rp-panel">
      <header><h3>{titulo}</h3>{extra}</header>
      {flush ? children : <div class="body">{children}</div>}
    </section>
  );
}

function Kpis({ items }) {
  return (
    <div class="rp-kpis">
      {items.map(([etq, val, color], i) => (
        <div class="rp-kpi" key={etq} style={{ '--k': color || PALETA[i % PALETA.length] }}>
          <strong>{val ?? 0}</strong>
          <span>{etq}</span>
        </div>
      ))}
    </div>
  );
}

function Cinta({ items }) {
  const total = items.reduce((s, i) => s + (i.valor || 0), 0) || 1;
  return (
    <div>
      <div class="rp-ribbon" role="img" aria-label="Distribución">
        {items.map((i) => i.valor > 0 && (
          <i key={i.etq} style={{ width: `${(i.valor / total) * 100}%`, background: i.color }}>
            {i.valor / total > 0.06 ? i.valor : ''}
          </i>
        ))}
      </div>
      <div class="rp-legend">
        {items.map((i) => (<span key={i.etq}><s style={{ background: i.color }} />{i.etq}: <b>{i.valor}</b></span>))}
      </div>
    </div>
  );
}

function Dona({ items, centro }) {
  const total = items.reduce((s, i) => s + (i.valor || 0), 0);
  let acum = 0;
  return (
    <div class="rp-donut">
      <svg viewBox="0 0 42 42" role="img" aria-label="Gráfico circular">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e3e8f0" stroke-width="6" />
        {total > 0 && items.map((i) => {
          const pct = (i.valor / total) * 100;
          const el = (
            <circle key={i.etq} cx="21" cy="21" r="15.915" fill="none" stroke={i.color} stroke-width="6"
              stroke-dasharray={`${pct} ${100 - pct}`} stroke-dashoffset={25 - acum} />
          );
          acum += pct;
          return el;
        })}
        <text x="21" y="21.5" text-anchor="middle" font-size="7" font-weight="800" fill="#12203b">{total}</text>
        <text x="21" y="27" text-anchor="middle" font-size="2.8" fill="#5b6577">{centro || 'total'}</text>
      </svg>
      <div class="rp-legend" style={{ flexDirection: 'column' }}>
        {items.map((i) => (
          <span key={i.etq}><s style={{ background: i.color }} />{i.etq}: <b>{i.valor}</b> ({total ? Math.round((i.valor / total) * 100) : 0}%)</span>
        ))}
      </div>
    </div>
  );
}

function Columnas({ items }) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return (
    <>
      <div class="rp-cols">
        {items.map((i, k) => (
          <div key={i.etq} title={`${i.etq}: ${i.valor}`}>
            <b>{i.valor}</b>
            <i style={{ height: `${(i.valor / max) * 150}px`, background: `linear-gradient(180deg,${i.color || PALETA[k % PALETA.length]},color-mix(in srgb,${i.color || PALETA[k % PALETA.length]} 55%,#fff))` }} />
          </div>
        ))}
      </div>
      <div class="rp-cols-l">{items.map((i) => <span key={i.etq}>{i.etq}</span>)}</div>
    </>
  );
}

function Plazo({ dias = 0 }) {
  const d = Number(dias) || 0;
  const color = d >= PLAZO ? '#e11d48' : d >= PLAZO - 2 ? '#f59e0b' : '#10b981';
  return (
    <div class="rp-meter" title={`${d} de ${PLAZO} días`}>
      <span>{Array.from({ length: PLAZO }, (_, k) => (<i key={k} style={k < d ? { background: color } : null} />))}</span>
      <b style={{ color }}>{d} d</b>
    </div>
  );
}

function Estado({ valor }) {
  return <span class="rp-tag" style={{ background: COLOR_ESTADO[valor] || '#6b7280' }}>{valor}</span>;
}

function Barras({ filas, color }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return filas.map((f, k) => {
    const c = color || PALETA[k % PALETA.length];
    return (
      <div class="rp-row" key={f.etq}>
        <span>{f.etq}</span>
        <div class="t"><i style={{ width: `${(f.valor / max) * 100}%`, background: `linear-gradient(90deg,${c},color-mix(in srgb,${c} 60%,#fff))` }} /></div>
        <em>{f.valor}{f.extra ? <small style={{ color: 'var(--mute)', fontWeight: 500 }}> {f.extra}</small> : null}</em>
      </div>
    );
  });
}

function Progreso({ pct, bueno }) {
  const c = pct >= bueno ? '#10b981' : '#e11d48';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150 }}>
      <div style={{ flex: 1, height: 10, background: '#e3e8f0', borderRadius: 999 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 999, background: c }} />
      </div>
      <b>{pct}%</b>
    </div>
  );
}

// Tabla paginada en cliente: evita pintar cientos de filas a la vez
function Tabla({ cols, filas, vacio = 'Sin registros para mostrar.', pag = FILAS_PAG }) {
  const [p, setP] = useState(0);
  const paginas = Math.max(1, Math.ceil(filas.length / pag));
  useEffect(() => { setP(0); }, [filas.length]);
  if (!filas.length) return <div class="rp-empty" style={{ border: 0 }}>{vacio}</div>;
  const ini = Math.min(p, paginas - 1) * pag;
  return (
    <>
      <div class="rp-tw">
        <table>
          <thead><tr>{cols.map((c) => <th key={c.h} class={c.a}>{c.h}</th>)}</tr></thead>
          <tbody>
            {filas.slice(ini, ini + pag).map((f, i) => (
              <tr key={ini + i}>{cols.map((c) => <td key={c.h} class={c.a}>{c.v(f)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <div class="rp-pag">
          <span>{ini + 1}–{Math.min(ini + pag, filas.length)} de {filas.length}</span>
          <div>
            <button disabled={p === 0} onClick={() => setP(p - 1)}>← Anterior</button>
            <button disabled={p >= paginas - 1} onClick={() => setP(p + 1)}>Siguiente →</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- filtrado en cliente (cada reporte, sin volver al servidor) ---------- */

const urgencia = (d) => (d >= 10 ? 'alta' : d >= 8 ? 'media' : 'baja');

const FILTRAR = {
  'expedientes-periodo': (d, f) => {
    const q = norm(f.q);
    const expedientes = (d.expedientes || []).filter((e) =>
      !q || norm(`${e.num_expediente} ${e.solicitante?.nombre_solicitante} ${e.asunto?.nombre_asunto}`).includes(q));
    return { ...d, expedientes };
  },
  'estados-actuales': (d, f) => {
    const q = norm(f.q);
    return {
      ...d,
      por_estado: d.por_estado.filter((e) => !f.estado || f.estado === 'Todos' || e.estado === f.estado),
      expedientes_mas_antiguos: (d.expedientes_mas_antiguos || []).filter((e) =>
        (!f.estado || f.estado === 'Todos' || e.estado === f.estado) &&
        (!q || norm(`${e.num_expediente} ${e.solicitante} ${e.asunto}`).includes(q))),
    };
  },
  'por-colaborador': (d, f) => {
    const q = norm(f.q);
    const est = d.estadisticas
      .filter((s) => (!q || norm(`${s.nombre_completo} ${s.usuario}`).includes(q)) && (!f.soloObs || s.observados > 0));
    const ord = {
      total: (a, b) => b.total_atenciones - a.total_atenciones,
      nombre: (a, b) => String(a.nombre_completo).localeCompare(b.nombre_completo),
      obs: (a, b) => b.observados - a.observados,
    }[f.orden || 'total'];
    return { ...d, estadisticas: [...est].sort(ord) };
  },
  'por-asunto': (d, f) => {
    const q = norm(f.q);
    return { ...d, filas: d.filas.filter((a) => !q || norm(a.asunto).includes(q)) };
  },
  'tiempos-atencion': (d, f) => {
    const q = norm(f.q);
    const tiempos_por_asunto = d.tiempos_por_asunto.filter((i) =>
      (!q || norm(i.asunto).includes(q)) &&
      (!f.cumpl || f.cumpl === 'todos' || (f.cumpl === 'bajo' ? i.porcentaje_dentro_plazo < 80 : i.porcentaje_dentro_plazo >= 80)));
    return { ...d, tiempos_por_asunto };
  },
  'expedientes-observados': (d, f) => {
    const q = norm(f.q);
    return {
      ...d,
      expedientes: d.expedientes.filter((x) =>
        (!f.urg || f.urg === 'todas' || urgencia(x.dias_transcurridos) === f.urg) &&
        (!q || norm(`${x.num_expediente} ${x.solicitante} ${x.asunto} ${x.observaciones}`).includes(q))),
    };
  },
  'entregas': (d, f) => {
    const q = norm(f.q);
    return {
      ...d,
      entregas: (d.entregas || []).filter((e) =>
        (!f.recogida || f.recogida === 'todos' || e.tipo_recogida === f.recogida) &&
        (!q || norm(`${e.expediente?.num_expediente} ${e.expediente?.solicitante?.nombre_solicitante} ${e.entregado_por}`).includes(q))),
    };
  },
};

// Filas planas para Excel/CSV según el reporte (ya filtradas)
const FILAS_EXPORT = {
  expedientes: (d) => d.expedientes,
  colaboradores: (d) => d.estadisticas,
  asuntos: (d) => d.filas,
  tiempos: (d) => d.tiempos_por_asunto,
  observados: (d) => d.expedientes,
  entregas: (d) => d.entregas,
};

/* ---------- reportes ---------- */

function RepPeriodo({ datos }) {
  const r = datos.resumen;
  const otros = Math.max(0, r.total_recibidos - r.total_atendidos - r.total_observados - r.total_en_proceso);
  const items = [
    { etq: 'Atendidos', valor: r.total_atendidos, color: '#10b981' },
    { etq: 'En proceso', valor: r.total_en_proceso, color: '#f59e0b' },
    { etq: 'Observados', valor: r.total_observados, color: '#e11d48' },
    { etq: 'Recepcionados', valor: otros, color: '#6366f1' },
  ];
  return (
    <>
      <Panel titulo="Resumen del período">
        <Kpis items={[
          ['Recibidos', r.total_recibidos, '#083f8f'], ['Atendidos', r.total_atendidos, '#10b981'],
          ['En proceso', r.total_en_proceso, '#f59e0b'], ['Observados', r.total_observados, '#e11d48'],
          ['Días promedio', r.tiempo_promedio_dias, '#6366f1'], ['Dentro del plazo', `${r.porcentaje_dentro_plazo}%`, '#0ea5d7'],
        ]} />
        <Cinta items={items} />
      </Panel>
      <div class="rp-2">
        <Panel titulo="Distribución de estados"><Dona items={items} centro="recibidos" /></Panel>
        {datos.top_asuntos?.length > 0 && (
          <Panel titulo="Asuntos más solicitados">
            <Barras filas={datos.top_asuntos.map((a) => ({ etq: a.asunto, valor: a.cantidad, extra: `${a.porcentaje}%` }))} />
          </Panel>
        )}
      </div>
      {datos.por_tipo_documento && Object.keys(datos.por_tipo_documento).length > 0 && (
        <Panel titulo="Por tipo de documento">
          <Columnas items={Object.entries(datos.por_tipo_documento).map(([etq, valor], k) => ({ etq, valor, color: PALETA[k % PALETA.length] }))} />
        </Panel>
      )}
      <Panel titulo="Expedientes del período" flush extra={<small>{datos.expedientes.length} resultado(s)</small>}>
        <Tabla filas={datos.expedientes} cols={[
          { h: 'N° Expediente', v: (e) => <b>{e.num_expediente}</b> },
          { h: 'Solicitante', v: (e) => e.solicitante?.nombre_solicitante || '—' },
          { h: 'Asunto', v: (e) => e.asunto?.nombre_asunto || '—' },
          { h: 'Recepción', v: (e) => fecha(e.fecha_recepcion) },
          { h: 'Estado', v: (e) => <Estado valor={e.estado} /> },
        ]} />
      </Panel>
    </>
  );
}

function RepEstados({ datos }) {
  const items = datos.por_estado.map((e) => ({ etq: e.estado, valor: e.cantidad, color: COLOR_ESTADO[e.estado] }));
  return (
    <>
      <Panel titulo="Expedientes por estado" extra={<small>{datos.total_expedientes} en total</small>}>
        <Kpis items={datos.por_estado.map((e) => [`${e.estado} (${e.porcentaje}%)`, e.cantidad, COLOR_ESTADO[e.estado]])} />
        <Cinta items={items} />
      </Panel>
      <div class="rp-2">
        <Panel titulo="Vista circular"><Dona items={items} centro="expedientes" /></Panel>
        <Panel titulo="Vista en columnas"><Columnas items={items} /></Panel>
      </div>
      <Panel titulo="Pendientes más antiguos" flush>
        <Tabla vacio="No hay expedientes pendientes." filas={datos.expedientes_mas_antiguos} cols={[
          { h: 'N° Expediente', v: (e) => <b>{e.num_expediente}</b> },
          { h: 'Solicitante', v: (e) => e.solicitante },
          { h: 'Asunto', v: (e) => e.asunto },
          { h: 'Estado', v: (e) => <Estado valor={e.estado} /> },
          { h: 'Plazo', v: (e) => <Plazo dias={e.dias_transcurridos} /> },
        ]} />
      </Panel>
    </>
  );
}

function RepColaborador({ datos }) {
  const est = datos.estadisticas;
  const max = Math.max(1, ...est.map((s) => s.total_atenciones));
  const totalAt = est.reduce((s, x) => s + x.total_atenciones, 0);
  return (
    <>
      <Panel titulo="Resumen">
        <Kpis items={[['Colaboradores', est.length, '#083f8f'], ['Atenciones registradas', totalAt, '#10b981'],
          ['Observados', est.reduce((s, x) => s + x.observados, 0), '#e11d48'], ['Listos para entrega', est.reduce((s, x) => s + x.listos_entrega, 0), '#0ea5d7']]} />
      </Panel>
      {est.length > 0 && (
        <Panel titulo="Ranking de atenciones">
          <Barras filas={est.slice(0, 8).map((s) => ({ etq: s.nombre_completo, valor: s.total_atenciones }))} />
        </Panel>
      )}
      <Panel titulo="Atenciones por colaborador" flush>
        <Tabla filas={est} cols={[
          { h: 'Colaborador', v: (s) => <><b>{s.nombre_completo}</b><div style={{ fontSize: 12, color: 'var(--mute)' }}>{s.usuario}</div></> },
          { h: 'Total', v: (s) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150 }}>
              <div style={{ flex: 1, height: 10, background: '#e3e8f0', borderRadius: 999 }}>
                <div style={{ width: `${(s.total_atenciones / max) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#083f8f,#0ea5d7)', borderRadius: 999 }} />
              </div>
              <b>{s.total_atenciones}</b>
            </div>) },
          { h: 'En proceso', a: 'c', v: (s) => s.en_proceso },
          { h: 'Observados', a: 'c', v: (s) => <span style={{ color: '#e11d48', fontWeight: 700 }}>{s.observados}</span> },
          { h: 'Listos para entrega', a: 'c', v: (s) => <span style={{ color: '#10b981', fontWeight: 700 }}>{s.listos_entrega}</span> },
        ]} />
      </Panel>
    </>
  );
}

function RepAsunto({ datos }) {
  const filas = datos.filas;
  const total = filas.reduce((s, a) => s + a.total, 0);
  return (
    <>
      <Panel titulo="Resumen por asunto">
        <Kpis items={[['Asuntos distintos', filas.length, '#ec4899'], ['Expedientes', total, '#083f8f'],
          ['Entregados', filas.reduce((s, a) => s + a.entregado, 0), '#10b981'], ['Observados', filas.reduce((s, a) => s + a.observado, 0), '#e11d48']]} />
      </Panel>
      <div class="rp-2">
        <Panel titulo="Participación por asunto">
          <Dona centro="expedientes" items={filas.slice(0, 7).map((a, k) => ({ etq: a.asunto, valor: a.total, color: PALETA[k % PALETA.length] }))} />
        </Panel>
        <Panel titulo="Asuntos más solicitados">
          <Barras filas={filas.slice(0, 8).map((a) => ({ etq: a.asunto, valor: a.total, extra: total ? `${Math.round((a.total / total) * 100)}%` : '' }))} />
        </Panel>
      </div>
      <Panel titulo="Detalle por asunto y estado" flush>
        <Tabla filas={filas} cols={[
          { h: 'Asunto', v: (a) => <b>{a.asunto}</b> },
          { h: 'Total', a: 'c', v: (a) => <b>{a.total}</b> },
          { h: 'Recepc.', a: 'c', v: (a) => a.recepcionado },
          { h: 'En proceso', a: 'c', v: (a) => a.en_proceso },
          { h: 'Observado', a: 'c', v: (a) => <span style={{ color: '#e11d48', fontWeight: 700 }}>{a.observado}</span> },
          { h: 'Listo', a: 'c', v: (a) => a.listo },
          { h: 'Entregado', a: 'c', v: (a) => <span style={{ color: '#10b981', fontWeight: 700 }}>{a.entregado}</span> },
        ]} />
      </Panel>
    </>
  );
}

function RepTiempos({ datos }) {
  const t = datos.tiempos_por_asunto;
  const cb = t.filter((i) => i.porcentaje_dentro_plazo < 80);
  return (
    <>
      <Panel titulo="Resumen">
        <Kpis items={[['Entregas analizadas', datos.total_entregas, '#083f8f'], ['Días promedio general', datos.promedio_general || 0, '#6366f1'],
          ['Asuntos fuera de meta', cb.length, cb.length ? '#e11d48' : '#10b981'], ['Asuntos mostrados', t.length, '#0ea5d7']]} />
      </Panel>
      {t.length > 0 && (
        <Panel titulo="Promedio de días por asunto">
          <Columnas items={t.slice(0, 8).map((i) => ({ etq: i.asunto, valor: Number(i.promedio_dias) || 0, color: i.promedio_dias > PLAZO ? '#e11d48' : '#10b981' }))} />
        </Panel>
      )}
      <Panel titulo="Tiempo de atención por asunto" flush>
        <Tabla filas={t} cols={[
          { h: 'Asunto', v: (i) => <b>{i.asunto}</b> },
          { h: 'Entregas', a: 'c', v: (i) => i.total_entregas },
          { h: 'Promedio', a: 'c', v: (i) => `${i.promedio_dias} d` },
          { h: 'Mín / Máx', a: 'c', v: (i) => `${i.minimo_dias} / ${i.maximo_dias} d` },
          { h: `Dentro de ${PLAZO} días`, v: (i) => <Progreso pct={i.porcentaje_dentro_plazo} bueno={80} /> },
        ]} />
        {cb.length > 0 && (<div class="rp-note"><b>Requieren atención (menos del 80% dentro del plazo): </b>{cb.map((i) => i.asunto).join(', ')}.</div>)}
      </Panel>
    </>
  );
}

function RepObservados({ datos }) {
  const x = datos.expedientes;
  const n = (u) => x.filter((e) => urgencia(e.dias_transcurridos) === u).length;
  const prom = x.length ? (x.reduce((s, e) => s + (e.dias_transcurridos || 0), 0) / x.length).toFixed(1) : 0;
  return (
    <>
      <Panel titulo="Resumen">
        <Kpis items={[['Observados', x.length, '#083f8f'], ['Urgencia alta (10+ días)', n('alta'), '#e11d48'],
          ['Urgencia media (8–9 días)', n('media'), '#f59e0b'], ['Urgencia baja', n('baja'), '#10b981'], ['Días promedio', prom, '#6366f1']]} />
        <Cinta items={[{ etq: 'Alta', valor: n('alta'), color: '#e11d48' }, { etq: 'Media', valor: n('media'), color: '#f59e0b' }, { etq: 'Baja', valor: n('baja'), color: '#10b981' }]} />
      </Panel>
      <Panel titulo="Detalle de observaciones" flush>
        <Tabla vacio="No hay expedientes observados." filas={x} cols={[
          { h: 'N° Expediente', v: (e) => <b>{e.num_expediente}</b> },
          { h: 'Solicitante', v: (e) => e.solicitante },
          { h: 'Asunto', v: (e) => e.asunto },
          { h: 'Plazo', v: (e) => <Plazo dias={e.dias_transcurridos} /> },
          { h: 'Observación', v: (e) => <span style={{ color: 'var(--mute)' }}>{e.observaciones || 'Sin observaciones'}</span> },
        ]} />
      </Panel>
    </>
  );
}

function RepEntregas({ datos }) {
  const lista = datos.entregas;
  const tit = lista.filter((e) => e.tipo_recogida === 'titular').length;
  const ter = lista.filter((e) => e.tipo_recogida !== 'titular').length;
  const prom = lista.length ? (lista.reduce((s, e) => s + (Number(e.dias_atencion) || 0), 0) / lista.length).toFixed(1) : 0;
  const items = [{ etq: 'Titular', valor: tit, color: '#10b981' }, { etq: 'Tercero', valor: ter, color: '#f59e0b' }];
  return (
    <>
      <Panel titulo="Resumen de entregas">
        <Kpis items={[['Total', lista.length, '#083f8f'], ['Recoge el titular', tit, '#10b981'], ['Recoge un tercero', ter, '#f59e0b'], ['Días promedio', prom, '#6366f1']]} />
      </Panel>
      <div class="rp-2">
        <Panel titulo="¿Quién recoge?"><Dona items={items} centro="entregas" /></Panel>
        <Panel titulo="Comparativo"><Columnas items={items} /></Panel>
      </div>
      <Panel titulo="Detalle" flush extra={<small>{lista.length} resultado(s)</small>}>
        <Tabla vacio="No hay entregas con los filtros seleccionados." filas={lista} cols={[
          { h: 'N° Expediente', v: (e) => <b>{e.expediente?.num_expediente || '—'}</b> },
          { h: 'Solicitante', v: (e) => e.expediente?.solicitante?.nombre_solicitante || '—' },
          { h: 'Recogió', v: (e) => <span class="rp-tag" style={{ background: e.tipo_recogida === 'titular' ? '#10b981' : '#f59e0b' }}>{(e.tipo_recogida || '—').toUpperCase()}</span> },
          { h: 'Fecha', v: (e) => fecha(e.fecha_entrega) },
          { h: 'Atención', v: (e) => <Plazo dias={e.dias_atencion} /> },
          { h: 'Entregado por', v: (e) => e.entregado_por || '—' },
        ]} />
      </Panel>
    </>
  );
}

const VISTAS = {
  'expedientes-periodo': [RepPeriodo, (d) => d.resumen],
  'estados-actuales': [RepEstados, (d) => Array.isArray(d.por_estado)],
  'por-colaborador': [RepColaborador, (d) => Array.isArray(d.estadisticas)],
  'por-asunto': [RepAsunto, (d) => Array.isArray(d.filas)],
  'tiempos-atencion': [RepTiempos, (d) => Array.isArray(d.tiempos_por_asunto)],
  'expedientes-observados': [RepObservados, (d) => Array.isArray(d.expedientes) && d.estadisticas],
  'entregas': [RepEntregas, (d) => d.estadisticas && Array.isArray(d.entregas)],
};

// Reporte por asunto: usa el endpoint propio y, si no existe, lo calcula
// a partir de expedientes-periodo (una sola consulta, sin tocar el backend).
function agruparPorAsunto(expedientes = []) {
  const m = new Map();
  for (const e of expedientes) {
    const nombre = e.asunto?.nombre_asunto || 'Sin asunto';
    const a = m.get(nombre) || { asunto: nombre, total: 0, recepcionado: 0, en_proceso: 0, observado: 0, listo: 0, entregado: 0 };
    a.total++;
    if (e.estado === 'RECEPCIONADO') a.recepcionado++;
    else if (e.estado === 'EN PROCESO') a.en_proceso++;
    else if (e.estado === 'OBSERVADO') a.observado++;
    else if (e.estado === 'LISTO PARA ENTREGA') a.listo++;
    else if (e.estado === 'ENTREGADO') a.entregado++;
    m.set(nombre, a);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/* ---------- módulo principal ---------- */

export default function ReportesModule({ usuario }) {
  const [tipo, setTipo] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState('');
  const [error, setError] = useState(null);
  const [desdeCache, setDesdeCache] = useState(false);
  const [documentos, setDocumentos] = useState([]);
  const [datos, setDatos] = useState(null);
  const [f, setF] = useState({
    ini: '', fin: '', documentoId: '', estado: 'Todos', usuario: '',
    q: '', orden: 'total', soloObs: false, cumpl: 'todos', urg: 'todas', recogida: 'todos',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const abortRef = useRef(null);
  const qDeb = useDebounced(f.q, 250);

  useEffect(() => {
    const hoy = new Date();
    setF((p) => ({ ...p, ini: aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fin: aISO(hoy) }));
    const ac = new AbortController();
    pedir(`${API_URL}/documentos`, { signal: ac.signal })
      .then(({ data }) => setDocumentos(Array.isArray(data) ? data : []))
      .catch((e) => e.name !== 'AbortError' && console.error('Error al cargar documentos:', e));
    return () => ac.abort();
  }, []);

  const rep = REPORTES.find((r) => r.id === tipo);
  const elegir = (id) => {
    abortRef.current?.abort();
    setTipo(id); setDatos(null); setError(null); setLoading(false);
    setF((p) => ({ ...p, q: '', estado: 'Todos', soloObs: false, cumpl: 'todos', urg: 'todas', recogida: 'todos' }));
  };

  const generar = async (forzar = false) => {
    if (!tipo) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true); setError(null); setDatos(null);
    try {
      const p = new URLSearchParams();
      if (rep.fechas) {
        if (f.ini) p.append('fecha_inicio', f.ini);
        if (f.fin) p.append('fecha_fin', f.fin);
      }
      if (tipo === 'expedientes-periodo') {
        if (f.documentoId) p.append('documento_id', f.documentoId);
        if (f.estado !== 'Todos') p.append('estado', f.estado);
      }
      if (tipo === 'por-asunto' && f.estado !== 'Todos') p.append('estado', f.estado);
      if (tipo === 'por-colaborador' && f.usuario) p.append('usuario', f.usuario);

      let resp;
      if (tipo === 'por-asunto') {
        try {
          resp = await pedir(`${API_URL}/reportes/por-asunto?${p}`, { signal: ac.signal, forzar });
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          const base = await pedir(`${API_URL}/reportes/expedientes-periodo?${p}`, { signal: ac.signal, forzar });
          resp = { cache: base.cache, data: { filas: agruparPorAsunto(base.data.expedientes) } };
        }
        if (!resp.data.filas && Array.isArray(resp.data.asuntos)) resp.data = { filas: resp.data.asuntos };
      } else {
        resp = await pedir(`${API_URL}/reportes/${tipo}?${p}`, { signal: ac.signal, forzar });
      }
      setDatos(resp.data); setDesdeCache(resp.cache);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  };

  // Los filtros de texto/estado/urgencia se aplican sobre lo ya descargado (sin nueva consulta)
  const filtrado = useMemo(() => {
    if (!datos || !tipo || !VISTAS[tipo][1](datos)) return datos;
    return FILTRAR[tipo](datos, { ...f, q: qDeb });
  }, [datos, tipo, qDeb, f.estado, f.orden, f.soloObs, f.cumpl, f.urg, f.recogida]);

  /* ---- exportaciones ---- */
  const descargar = (blob, ext) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `reporte_${tipo}_${aISO(new Date())}.${ext}` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const exportarExcel = async () => {
    if (!filtrado || !rep?.excel) return;
    setExportando('xlsx'); setError(null);
    const lista = (FILAS_EXPORT[rep.excel]?.(filtrado)) || [];
    try {
      const res = await fetch(`${API_URL}/reportes/exportar-excel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: rep.excel, datos: lista }),
      });
      if (!res.ok) throw new Error('rechazado');
      descargar(await res.blob(), 'xlsx');
    } catch {
      // Respaldo: CSV con BOM (Excel lo abre directamente) si el servidor no soporta este tipo
      const plano = lista.map((o) => Object.fromEntries(Object.entries(o).map(([k, v]) =>
        [k, v && typeof v === 'object' ? JSON.stringify(v) : v])));
      if (!plano.length) { setError('No hay datos para exportar con los filtros actuales.'); setExportando(''); return; }
      const cab = Object.keys(plano[0]);
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [cab.join(','), ...plano.map((r) => cab.map((c) => esc(r[c])).join(','))].join('\n');
      descargar(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), 'csv');
    } finally { setExportando(''); }
  };

  const exportarPDF = async () => {
    if (!filtrado) return;
    setExportando('pdf'); setError(null);
    try {
      const res = await fetch(`${API_URL}/reportes/exportar-pdf`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: rep.excel || tipo, titulo: rep.titulo, datos: FILAS_EXPORT[rep.excel]?.(filtrado) || filtrado }),
      });
      if (!res.ok) throw new Error('rechazado');
      descargar(await res.blob(), 'pdf');
    } catch {
      // Respaldo sin dependencias: el diálogo de impresión permite "Guardar como PDF"
      window.print();
    } finally { setExportando(''); }
  };

  const renderResultado = () => {
    const [Vista, valido] = VISTAS[tipo];
    return valido(datos)
      ? <Vista datos={filtrado} />
      : <div class="rp-err">El servidor respondió, pero sin los datos esperados para este reporte.</div>;
  };

  const limpiar = () => setF((p) => ({ ...p, q: '', estado: 'Todos', soloObs: false, cumpl: 'todos', urg: 'todas', recogida: 'todos', usuario: '', documentoId: '', orden: 'total' }));

  return (
    <div class="rp" style={{ '--c': rep?.color }}>
      <style>{CSS}</style>

      <div class="rp-top">
        <div>
          <h1>Reportes y estadísticas</h1>
          <p>Seguimiento de expedientes, plazos de atención y entregas para la toma de decisiones.</p>
        </div>
        {usuario && <div class="rp-user">Sesión: <b>{usuario.nombre_completo || usuario.usuario || usuario.nombre}</b></div>}
      </div>

      <div class="rp-grid">
        <nav class="rp-rail" aria-label="Tipos de reporte">
          {REPORTES.map((r) => (
            <button key={r.id} style={{ '--c': r.color }} aria-pressed={tipo === r.id} onClick={() => elegir(r.id)}>
              <div class={`rp-ico ${r.forma}`}><i style={{ fontStyle: 'normal' }}>{r.icono}</i></div>
              <div><b>{r.titulo}</b><span class="d">{r.desc}</span></div>
            </button>
          ))}
        </nav>

        <main class="rp-main">
          {!rep ? (
            <div class="rp-empty">
              <b>Elige un reporte para comenzar</b>
              Selecciona una opción de la lista, ajusta los filtros y genera el reporte.
            </div>
          ) : (
            <>
              <div class="rp-bar">
                <h4><s />Filtros · {rep.titulo}</h4>
                <div class="rp-filtros">
                  {rep.fechas && (
                    <>
                      <label>Desde<input type="date" value={f.ini} onInput={set('ini')} /></label>
                      <label>Hasta<input type="date" value={f.fin} onInput={set('fin')} /></label>
                    </>
                  )}

                  {tipo === 'expedientes-periodo' && (
                    <label>Tipo de documento
                      <select value={f.documentoId} onChange={set('documentoId')}>
                        <option value="">Todos</option>
                        {documentos.map((d) => (
                          <option key={d.id_documento} value={d.id_documento}>{d.nombre_tipo || d.nombre_documento || `Documento ${d.id_documento}`}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {['expedientes-periodo', 'por-asunto', 'estados-actuales'].includes(tipo) && (
                    <label>Estado
                      <select value={f.estado} onChange={set('estado')}>
                        <option value="Todos">Todos</option>
                        {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                  )}

                  {tipo === 'por-colaborador' && (
                    <>
                      <label>Usuario<input type="text" placeholder="Nombre de usuario" value={f.usuario} onInput={set('usuario')} /></label>
                      <label>Ordenar por
                        <select value={f.orden} onChange={set('orden')}>
                          <option value="total">Más atenciones</option>
                          <option value="obs">Más observados</option>
                          <option value="nombre">Nombre (A–Z)</option>
                        </select>
                      </label>
                      <label class="rp-chk"><input type="checkbox" checked={f.soloObs} onChange={set('soloObs')} />Solo con observados</label>
                    </>
                  )}

                  {tipo === 'tiempos-atencion' && (
                    <label>Cumplimiento
                      <select value={f.cumpl} onChange={set('cumpl')}>
                        <option value="todos">Todos</option>
                        <option value="bajo">Fuera de meta (&lt; 80%)</option>
                        <option value="ok">Dentro de meta (≥ 80%)</option>
                      </select>
                    </label>
                  )}

                  {tipo === 'expedientes-observados' && (
                    <label>Urgencia
                      <select value={f.urg} onChange={set('urg')}>
                        <option value="todas">Todas</option>
                        <option value="alta">Alta (10+ días)</option>
                        <option value="media">Media (8–9 días)</option>
                        <option value="baja">Baja</option>
                      </select>
                    </label>
                  )}

                  {tipo === 'entregas' && (
                    <label>Quién recogió
                      <select value={f.recogida} onChange={set('recogida')}>
                        <option value="todos">Todos</option>
                        <option value="titular">Titular</option>
                        <option value="tercero">Tercero</option>
                      </select>
                    </label>
                  )}

                  <label>Buscar
                    <input type="search" placeholder="Expediente, nombre, asunto…" value={f.q} onInput={set('q')} />
                  </label>
                </div>

                <div class="rp-acc">
                  <button class="rp-btn" onClick={() => generar(false)} disabled={loading}>
                    {loading && <span class="rp-spin" />}{loading ? 'Generando…' : 'Generar reporte'}
                  </button>
                  <button class="rp-btn ghost" onClick={() => generar(true)} disabled={loading} title="Ignora la caché y consulta de nuevo">↻ Actualizar</button>
                  <button class="rp-btn ghost" onClick={limpiar}>Limpiar filtros</button>
                  <div class="rp-sp" />
                  {datos && desdeCache && <span class="rp-badge">⚡ Resultado en caché</span>}
                  {datos && rep.excel && (
                    <button class="rp-btn xl" onClick={exportarExcel} disabled={!!exportando}>{exportando === 'xlsx' ? 'Exportando…' : '⬇ Excel'}</button>
                  )}
                  {datos && (
                    <button class="rp-btn pdf" onClick={exportarPDF} disabled={!!exportando}>{exportando === 'pdf' ? 'Exportando…' : '⬇ PDF'}</button>
                  )}
                </div>
              </div>

              {error && <div class="rp-err" role="alert"><b>No se pudo completar la acción.</b> {error}</div>}
              {loading && (<><div class="rp-skel" /><div class="rp-skel" style={{ height: 200 }} /></>)}
              {datos && !loading && renderResultado()}
              {!datos && !error && !loading && (
                <div class="rp-empty"><b>{rep.titulo}</b>Ajusta los filtros y pulsa «Generar reporte».</div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}