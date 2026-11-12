/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

const API_URL = 'https://sistemaugel-actas-backend.onrender.com/api';
const PLAZO = 10; // días hábiles de atención

const COLOR_ESTADO = {
  'RECEPCIONADO': '#6366f1',
  'EN PROCESO': '#d99a0b',
  'OBSERVADO': '#c62d3b',
  'LISTO PARA ENTREGA': '#0ea5d7',
  'ENTREGADO': '#13906b',
};

const REPORTES = [
  { id: 'expedientes-periodo', titulo: 'Expedientes por período', desc: 'Volumen recibido, atendido y plazos', color: '#083f8f', fechas: true, excel: 'expedientes' },
  { id: 'estados-actuales', titulo: 'Estados actuales', desc: 'Dónde está cada expediente hoy', color: '#0ea5d7' },
  { id: 'por-colaborador', titulo: 'Por colaborador', desc: 'Atenciones realizadas por persona', color: '#13906b', fechas: true, excel: 'colaboradores' },
  { id: 'tiempos-atencion', titulo: 'Tiempos de atención', desc: 'Cumplimiento del plazo por asunto', color: '#6366f1', fechas: true },
  { id: 'expedientes-observados', titulo: 'Observados', desc: 'Expedientes detenidos por observación', color: '#c62d3b', excel: 'observados' },
  { id: 'entregas', titulo: 'Entregas', desc: 'Documentos entregados y a quién', color: '#d99a0b', fechas: true, excel: 'entregas' },
];

const ESTADOS = ['RECEPCIONADO', 'EN PROCESO', 'OBSERVADO', 'LISTO PARA ENTREGA', 'ENTREGADO'];

const aISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CSS = `
.rp{--ink:#14213d;--mute:#5b6577;--line:#d9dee7;--paper:#eef1f6;--surf:#fff;--brand:#083f8f;--sky:#0ea5d7;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--paper);
  min-height:100vh;padding:28px;font-variant-numeric:tabular-nums}
.rp *{box-sizing:border-box}
.rp-top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:22px;
  padding-bottom:18px;border-bottom:3px solid var(--brand)}
.rp-top h1{margin:0;font-size:28px;letter-spacing:-.02em;font-weight:800;color:var(--brand)}
.rp-top p{margin:6px 0 0;color:var(--mute);font-size:14px;max-width:60ch}
.rp-user{font-size:13px;color:var(--mute)}
.rp-grid{display:grid;grid-template-columns:270px 1fr;gap:24px;align-items:start}
.rp-rail{background:var(--surf);border:1px solid var(--line);border-radius:6px;position:sticky;top:16px;overflow:hidden}
.rp-rail button{all:unset;box-sizing:border-box;display:block;width:100%;padding:14px 16px 14px 18px;cursor:pointer;
  border-left:5px solid transparent;border-bottom:1px solid var(--line)}
.rp-rail button:last-child{border-bottom:0}
.rp-rail button:hover{background:#f5f8fd}
.rp-rail button:focus-visible{outline:2px solid var(--sky);outline-offset:-2px}
.rp-rail b{display:block;font-size:15px;font-weight:700}
.rp-rail span{display:block;font-size:12.5px;color:var(--mute);margin-top:3px}
.rp-rail button[aria-pressed=true]{background:#eaf1fb;border-left-color:var(--c)}
.rp-main{min-width:0}
.rp-bar{background:var(--surf);border:1px solid var(--line);border-radius:6px;padding:16px 18px;margin-bottom:18px;
  display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end}
.rp-bar label{display:grid;gap:5px;font-size:12.5px;font-weight:600;color:var(--mute)}
.rp-bar input,.rp-bar select{padding:9px 11px;border:1px solid #b9c2d1;border-radius:4px;font:inherit;font-size:14px;color:var(--ink);background:#fff;min-width:150px}
.rp-bar input:focus,.rp-bar select:focus{outline:2px solid var(--sky);border-color:var(--sky)}
.rp-sp{flex:1}
.rp-btn{padding:10px 18px;border:0;border-radius:4px;font:inherit;font-size:14px;font-weight:700;color:#fff;background:var(--brand);cursor:pointer}
.rp-btn.alt{background:#fff;color:var(--brand);border:1.5px solid var(--brand)}
.rp-btn:disabled{opacity:.55;cursor:wait}
.rp-btn:focus-visible{outline:3px solid var(--sky);outline-offset:2px}
.rp-err{background:#fdecee;border-left:5px solid #c62d3b;padding:12px 16px;border-radius:4px;margin-bottom:18px;font-size:14px;color:#8a1c27}
.rp-empty{background:var(--surf);border:1px dashed #b9c2d1;border-radius:6px;padding:48px 24px;text-align:center;color:var(--mute)}
.rp-empty b{display:block;color:var(--ink);font-size:17px;margin-bottom:6px}
.rp-panel{background:var(--surf);border:1px solid var(--line);border-radius:6px;margin-bottom:18px;overflow:hidden}
.rp-panel>header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid var(--line);background:#f8fafc}
.rp-panel h3{margin:0;font-size:16px;font-weight:700}
.rp-panel .body{padding:20px}
.rp-stats{display:flex;flex-wrap:wrap}
.rp-stat{flex:1 1 130px;padding:4px 20px;border-left:1px solid var(--line)}
.rp-stat:first-child{border-left:0;padding-left:0}
.rp-stat strong{display:block;font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.rp-stat span{font-size:12.5px;color:var(--mute)}
.rp-ribbon{display:flex;height:38px;border-radius:4px;overflow:hidden;margin:18px 0 10px;background:#e3e8f0}
.rp-ribbon i{display:flex;align-items:center;justify-content:center;color:#fff;font:700 12px ui-sans-serif,system-ui;font-style:normal;min-width:2px}
.rp-legend{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:var(--mute)}
.rp-legend s{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;text-decoration:none}
.rp-row{display:grid;grid-template-columns:minmax(120px,240px) 1fr 90px;gap:14px;align-items:center;padding:7px 0;font-size:14px}
.rp-row .t{height:8px;background:#e3e8f0;border-radius:4px;overflow:hidden}
.rp-row .t i{display:block;height:100%;background:var(--brand)}
.rp-row em{font-style:normal;text-align:right;font-weight:700}
.rp-tw{overflow-x:auto}
.rp table{width:100%;border-collapse:collapse;font-size:14px}
.rp th{padding:11px 16px;text-align:left;font-size:12.5px;font-weight:700;color:var(--mute);background:#f8fafc;border-bottom:2px solid var(--line);white-space:nowrap}
.rp td{padding:11px 16px;border-bottom:1px solid #e8ecf2;vertical-align:middle}
.rp tr:last-child td{border-bottom:0}
.rp .c{text-align:center}
.rp .r{text-align:right}
.rp-tag{display:inline-block;padding:3px 9px;border-radius:3px;font-size:12px;font-weight:700;color:#fff;white-space:nowrap}
.rp-meter{display:inline-flex;align-items:center;gap:8px}
.rp-meter span{display:inline-flex;gap:2px}
.rp-meter span i{width:7px;height:16px;border-radius:1px;background:#dfe4ec}
.rp-meter b{min-width:34px;text-align:right;font-size:13px}
.rp-note{padding:14px 20px;background:#fff6e0;border-top:1px solid #f0dca6;font-size:14px}
.rp-spin{display:inline-block;width:14px;height:14px;border:2px solid #fff;border-right-color:transparent;border-radius:50%;
  animation:rpspin .7s linear infinite;vertical-align:-2px;margin-right:8px}
@keyframes rpspin{to{transform:rotate(360deg)}}
@media(max-width:900px){.rp{padding:16px}.rp-grid{grid-template-columns:1fr}.rp-rail{position:static}.rp-row{grid-template-columns:1fr 70px}.rp-row .t{grid-column:1/-1;order:3}}
@media(prefers-reduced-motion:reduce){.rp-spin{animation:none}}
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

function Stats({ items }) {
  return (
    <div class="rp-stats">
      {items.map(([etq, val, color]) => (
        <div class="rp-stat" key={etq}>
          <strong style={{ color: color || 'var(--ink)' }}>{val ?? 0}</strong>
          <span>{etq}</span>
        </div>
      ))}
    </div>
  );
}

function Cinta({ items }) {
  const total = items.reduce((s, i) => s + (i.valor || 0), 0);
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
        {items.map((i) => (
          <span key={i.etq}><s style={{ background: i.color }} />{i.etq}: <b>{i.valor}</b></span>
        ))}
      </div>
    </div>
  );
}

// Medidor del plazo: 10 casillas = 10 días. Es la pieza que unifica todos los reportes.
function Plazo({ dias = 0 }) {
  const d = Number(dias) || 0;
  const color = d >= PLAZO ? '#c62d3b' : d >= PLAZO - 2 ? '#d99a0b' : '#13906b';
  return (
    <div class="rp-meter" title={`${d} de ${PLAZO} días`}>
      <span>
        {Array.from({ length: PLAZO }, (_, k) => (
          <i key={k} style={k < d ? { background: color } : null} />
        ))}
      </span>
      <b style={{ color }}>{d} d</b>
    </div>
  );
}

function Estado({ valor }) {
  return <span class="rp-tag" style={{ background: COLOR_ESTADO[valor] || '#6b7280' }}>{valor}</span>;
}

function Barras({ filas, color }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return filas.map((f) => (
    <div class="rp-row" key={f.etq}>
      <span>{f.etq}</span>
      <div class="t"><i style={{ width: `${(f.valor / max) * 100}%`, background: color }} /></div>
      <em>{f.valor}{f.extra ? <small style={{ color: 'var(--mute)', fontWeight: 500 }}> {f.extra}</small> : null}</em>
    </div>
  ));
}

function Tabla({ cols, filas, vacio = 'Sin registros para mostrar.' }) {
  if (!filas.length) return <div class="rp-empty" style={{ border: 0 }}>{vacio}</div>;
  return (
    <div class="rp-tw">
      <table>
        <thead><tr>{cols.map((c) => <th key={c.h} class={c.a}>{c.h}</th>)}</tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>{cols.map((c) => <td key={c.h} class={c.a}>{c.v(f)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');

/* ---------- reportes ---------- */

function RepPeriodo({ datos }) {
  const r = datos.resumen;
  const otros = Math.max(0, r.total_recibidos - r.total_atendidos - r.total_observados - r.total_en_proceso);
  const exp = (datos.expedientes || []).slice(0, 50);
  return (
    <>
      <Panel titulo="Resumen del período">
        <Stats items={[
          ['Recibidos', r.total_recibidos, 'var(--brand)'],
          ['Atendidos', r.total_atendidos, '#13906b'],
          ['En proceso', r.total_en_proceso, '#d99a0b'],
          ['Observados', r.total_observados, '#c62d3b'],
          ['Días promedio', r.tiempo_promedio_dias],
          ['Dentro del plazo', `${r.porcentaje_dentro_plazo}%`, '#13906b'],
        ]} />
        <Cinta items={[
          { etq: 'Atendidos', valor: r.total_atendidos, color: '#13906b' },
          { etq: 'En proceso', valor: r.total_en_proceso, color: '#d99a0b' },
          { etq: 'Observados', valor: r.total_observados, color: '#c62d3b' },
          { etq: 'Recepcionados', valor: otros, color: '#6366f1' },
        ]} />
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }}>
        {datos.top_asuntos?.length > 0 && (
          <Panel titulo="Asuntos más solicitados">
            <Barras color="var(--sky)" filas={datos.top_asuntos.map((a) => ({ etq: a.asunto, valor: a.cantidad, extra: `${a.porcentaje}%` }))} />
          </Panel>
        )}
        {datos.por_tipo_documento && Object.keys(datos.por_tipo_documento).length > 0 && (
          <Panel titulo="Por tipo de documento">
            <Barras color="var(--brand)" filas={Object.entries(datos.por_tipo_documento).map(([etq, valor]) => ({ etq, valor }))} />
          </Panel>
        )}
      </div>

      <Panel titulo="Expedientes del período" flush extra={<small>Primeros {exp.length} de {datos.expedientes?.length || 0}</small>}>
        <Tabla filas={exp} cols={[
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
  return (
    <>
      <Panel titulo="Expedientes por estado" extra={<small>{datos.total_expedientes} en total</small>}>
        <Stats items={datos.por_estado.map((e) => [e.estado.toLowerCase().replace(/^./, (c) => c.toUpperCase()) + ` (${e.porcentaje}%)`, e.cantidad, COLOR_ESTADO[e.estado]])} />
        <Cinta items={datos.por_estado.map((e) => ({ etq: e.estado, valor: e.cantidad, color: COLOR_ESTADO[e.estado] }))} />
      </Panel>
      <Panel titulo="Pendientes más antiguos" flush>
        <Tabla vacio="No hay expedientes pendientes." filas={datos.expedientes_mas_antiguos || []} cols={[
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
  const max = Math.max(1, ...datos.estadisticas.map((s) => s.total_atenciones));
  return (
    <>
      <Panel titulo="Resumen">
        <Stats items={[
          ['Colaboradores', datos.total_usuarios, 'var(--brand)'],
          ['Atenciones registradas', datos.total_atenciones, '#13906b'],
        ]} />
      </Panel>
      <Panel titulo="Atenciones por colaborador" flush>
        <Tabla filas={datos.estadisticas} cols={[
          { h: 'Colaborador', v: (s) => <><b>{s.nombre_completo}</b><div style={{ fontSize: 12, color: 'var(--mute)' }}>{s.usuario}</div></> },
          { h: 'Total', v: (s) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150 }}>
              <div style={{ flex: 1, height: 8, background: '#e3e8f0', borderRadius: 4 }}>
                <div style={{ width: `${(s.total_atenciones / max) * 100}%`, height: '100%', background: 'var(--brand)', borderRadius: 4 }} />
              </div>
              <b>{s.total_atenciones}</b>
            </div>
          ) },
          { h: 'En proceso', a: 'c', v: (s) => s.en_proceso },
          { h: 'Observados', a: 'c', v: (s) => <span style={{ color: '#c62d3b', fontWeight: 700 }}>{s.observados}</span> },
          { h: 'Listos para entrega', a: 'c', v: (s) => <span style={{ color: '#13906b', fontWeight: 700 }}>{s.listos_entrega}</span> },
        ]} />
      </Panel>
    </>
  );
}

function RepTiempos({ datos }) {
  const cb = datos.cuellos_botella || [];
  return (
    <>
      <Panel titulo="Resumen">
        <Stats items={[
          ['Entregas analizadas', datos.total_entregas, 'var(--brand)'],
          ['Días promedio general', datos.promedio_general || 0],
          ['Asuntos fuera de meta', cb.length, cb.length ? '#c62d3b' : '#13906b'],
        ]} />
      </Panel>
      <Panel titulo="Tiempo de atención por asunto" flush>
        <Tabla filas={datos.tiempos_por_asunto} cols={[
          { h: 'Asunto', v: (i) => <b>{i.asunto}</b> },
          { h: 'Entregas', a: 'c', v: (i) => i.total_entregas },
          { h: 'Promedio', a: 'c', v: (i) => `${i.promedio_dias} d` },
          { h: 'Mín / Máx', a: 'c', v: (i) => `${i.minimo_dias} / ${i.maximo_dias} d` },
          { h: `Dentro de ${PLAZO} días`, v: (i) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150 }}>
              <div style={{ flex: 1, height: 8, background: '#e3e8f0', borderRadius: 4 }}>
                <div style={{ width: `${i.porcentaje_dentro_plazo}%`, height: '100%', borderRadius: 4, background: i.porcentaje_dentro_plazo >= 80 ? '#13906b' : '#c62d3b' }} />
              </div>
              <b>{i.porcentaje_dentro_plazo}%</b>
            </div>
          ) },
        ]} />
        {cb.length > 0 && (
          <div class="rp-note">
            <b>Requieren atención (menos del 80% dentro del plazo): </b>
            {cb.map((i) => i.asunto).join(', ')}.
          </div>
        )}
      </Panel>
    </>
  );
}

function RepObservados({ datos }) {
  const e = datos.estadisticas;
  return (
    <>
      <Panel titulo="Resumen">
        <Stats items={[
          ['Observados', e.total, 'var(--brand)'],
          ['Urgencia alta (10+ días)', e.urgencia_alta, '#c62d3b'],
          ['Urgencia media (8–9 días)', e.urgencia_media, '#d99a0b'],
          ['Días promedio', e.promedio_dias],
        ]} />
      </Panel>
      <Panel titulo="Detalle de observaciones" flush>
        <Tabla vacio="No hay expedientes observados." filas={datos.expedientes} cols={[
          { h: 'N° Expediente', v: (x) => <b>{x.num_expediente}</b> },
          { h: 'Solicitante', v: (x) => x.solicitante },
          { h: 'Asunto', v: (x) => x.asunto },
          { h: 'Plazo', v: (x) => <Plazo dias={x.dias_transcurridos} /> },
          { h: 'Observación', v: (x) => <span style={{ color: 'var(--mute)' }}>{x.observaciones || 'Sin observaciones'}</span> },
        ]} />
      </Panel>
    </>
  );
}

function RepEntregas({ datos }) {
  const s = datos.estadisticas || {};
  const lista = Array.isArray(datos.entregas) ? datos.entregas : [];
  return (
    <>
      <Panel titulo="Resumen de entregas">
        <Stats items={[
          ['Total', s.total_entregas, 'var(--brand)'],
          ['Recoge el titular', s.entrega_titular, '#13906b'],
          ['Recoge un tercero', s.entrega_tercero, '#d99a0b'],
          ['Días promedio', s.tiempo_promedio],
        ]} />
        <Cinta items={[
          { etq: 'Titular', valor: s.entrega_titular || 0, color: '#13906b' },
          { etq: 'Tercero', valor: s.entrega_tercero || 0, color: '#d99a0b' },
        ]} />
      </Panel>
      <Panel titulo="Detalle" flush extra={<small>Primeras {Math.min(50, lista.length)} de {lista.length}</small>}>
        <Tabla vacio="No hay entregas en el período seleccionado." filas={lista.slice(0, 50)} cols={[
          { h: 'N° Expediente', v: (e) => <b>{e.expediente?.num_expediente || '—'}</b> },
          { h: 'Solicitante', v: (e) => e.expediente?.solicitante?.nombre_solicitante || '—' },
          { h: 'Recogió', v: (e) => <span class="rp-tag" style={{ background: e.tipo_recogida === 'titular' ? '#13906b' : '#d99a0b' }}>{(e.tipo_recogida || '—').toUpperCase()}</span> },
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
  'tiempos-atencion': [RepTiempos, (d) => Array.isArray(d.tiempos_por_asunto)],
  'expedientes-observados': [RepObservados, (d) => Array.isArray(d.expedientes) && d.estadisticas],
  'entregas': [RepEntregas, (d) => d.estadisticas && Array.isArray(d.entregas)],
};

/* ---------- módulo principal ---------- */

export default function ReportesModule({ usuario }) {
  const [tipo, setTipo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [documentoId, setDocumentoId] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    const hoy = new Date();
    setFechaInicio(aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
    setFechaFin(aISO(hoy));
    fetch(`${API_URL}/documentos`)
      .then((r) => r.json())
      .then(setDocumentos)
      .catch((e) => console.error('Error al cargar documentos:', e));
  }, []);

  const rep = REPORTES.find((r) => r.id === tipo);

  const elegir = (id) => { setTipo(id); setDatos(null); setError(null); };

  const generar = async () => {
    if (!tipo) return;
    setLoading(true); setError(null); setDatos(null);
    try {
      const p = new URLSearchParams();
      if (rep.fechas) {
        if (fechaInicio) p.append('fecha_inicio', fechaInicio);
        if (fechaFin) p.append('fecha_fin', fechaFin);
      }
      if (tipo === 'expedientes-periodo') {
        if (documentoId) p.append('documento_id', documentoId);
        if (estado !== 'Todos') p.append('estado', estado);
      }
      if (tipo === 'por-colaborador' && usuarioFiltro) p.append('usuario', usuarioFiltro);

      const res = await fetch(`${API_URL}/reportes/${tipo}?${p}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'No se pudo generar el reporte');
      }
      setDatos(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportar = async () => {
    if (!datos || !rep?.excel) return;
    setLoading(true);
    try {
      const lista = { expedientes: datos.expedientes, observados: datos.expedientes, entregas: datos.entregas, colaboradores: datos.estadisticas }[rep.excel] || [];
      const res = await fetch(`${API_URL}/reportes/exportar-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: rep.excel, datos: lista }),
      });
      if (!res.ok) throw new Error('El servidor rechazó la exportación');
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: `reporte_${tipo}_${aISO(new Date())}.xlsx` });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Error al exportar Excel: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderResultado = () => {
    const [Vista, valido] = VISTAS[tipo];
    return valido(datos)
      ? <Vista datos={datos} />
      : <div class="rp-err">El servidor respondió, pero sin los datos esperados para este reporte.</div>;
  };

  return (
    <div class="rp">
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
              <b>{r.titulo}</b>
              <span>{r.desc}</span>
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
                {rep.fechas && (
                  <>
                    <label>Desde<input type="date" value={fechaInicio} onInput={(e) => setFechaInicio(e.target.value)} /></label>
                    <label>Hasta<input type="date" value={fechaFin} onInput={(e) => setFechaFin(e.target.value)} /></label>
                  </>
                )}
                {tipo === 'expedientes-periodo' && (
                  <>
                    <label>Tipo de documento
                      <select value={documentoId} onChange={(e) => setDocumentoId(e.target.value)}>
                        <option value="">Todos</option>
                        {documentos.map((d) => (
                          <option key={d.id_documento} value={d.id_documento}>
                            {d.nombre_tipo || d.nombre_documento || `Documento ${d.id_documento}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>Estado
                      <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                        <option value="Todos">Todos</option>
                        {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                  </>
                )}
                {tipo === 'por-colaborador' && (
                  <label>Usuario
                    <input type="text" placeholder="Nombre de usuario" value={usuarioFiltro} onInput={(e) => setUsuarioFiltro(e.target.value)} />
                  </label>
                )}
                <div class="rp-sp" />
                {datos && rep.excel && (
                  <button class="rp-btn alt" onClick={exportar} disabled={loading}>Descargar Excel</button>
                )}
                <button class="rp-btn" onClick={generar} disabled={loading}>
                  {loading && <span class="rp-spin" />}{loading ? 'Generando…' : 'Generar reporte'}
                </button>
              </div>

              {error && <div class="rp-err" role="alert"><b>No se pudo completar la acción.</b> {error}</div>}
              {datos && renderResultado()}
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