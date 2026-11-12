// generarPdfHistorial.js
// Genera la "Hoja de trazabilidad" de un expediente con jsPDF.

const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

// ---------- Paleta ----------
const INK = [24, 32, 48];
const NAVY = [8, 63, 143];
const CYAN = [14, 165, 215];
const MUTED = [112, 122, 138];
const RULE = [206, 212, 221];
const TINT = [243, 245, 249];

const ESTADO_COLOR = {
  'RECEPCIONADO': [100, 116, 139],
  'EN PROCESO': [217, 119, 6],
  'LISTO PARA ENTREGA': [5, 150, 105],
  'ENTREGADO': [37, 99, 235],
  'OBSERVADO': [220, 38, 38],
  'ARCHIVADO': [124, 58, 237]
};
const colorEstado = (e) => ESTADO_COLOR[e] || MUTED;

// ---------- Utilidades de fecha ----------
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad = (n) => String(n).padStart(2, '0');
const fFecha = (d) => `${pad(d.getDate())} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
const fHora = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const duracion = (ms) => {
  const min = Math.floor(ms / 60000);
  if (min < 1) return '<1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
};

// ---------- Carga de jsPDF ----------
const cargarJsPDF = () =>
  new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF);
    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
    document.head.appendChild(s);
  });

// ---------- Sello rotado (estado actual) ----------
function sello(doc, texto, cx, cy, color, grados) {
  const a = (grados * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // rotación visual antihoraria (eje Y hacia abajo)
  const rot = (px, py) => [cx + px * cos + py * sin, cy - px * sin + py * cos];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const tw = doc.getTextWidth(texto);
  const w = tw + 12;
  const h = 11;

  doc.setDrawColor(...color);
  const caja = (ww, hh, grosor) => {
    doc.setLineWidth(grosor);
    const p = [rot(-ww / 2, -hh / 2), rot(ww / 2, -hh / 2), rot(ww / 2, hh / 2), rot(-ww / 2, hh / 2)];
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = p[i];
      const [x2, y2] = p[(i + 1) % 4];
      doc.line(x1, y1, x2, y2);
    }
  };
  caja(w, h, 0.9);
  caja(w - 2.4, h - 2.4, 0.25);

  doc.setTextColor(...color);
  const [tx, ty] = rot(-tw / 2, 1.4);
  doc.text(texto, tx, ty, { angle: grados });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  const etiqueta = 'ESTADO ACTUAL';
  const lw = doc.getTextWidth(etiqueta);
  const [lx, ly] = rot(-lw / 2, h / 2 + 4.2);
  doc.text(etiqueta, lx, ly, { angle: grados });
}

// ---------- Principal ----------
export async function generarPdfHistorial(expediente, historial) {
  const jsPDF = await cargarJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const LIMITE = H - 22;

  const eventos = [...historial].sort(
    (a, b) => new Date(a.fecha_cambio) - new Date(b.fecha_cambio)
  );

  const etiqueta = (txt, x, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.5);
    doc.text(txt, x, y);
    doc.setCharSpace(0);
  };

  // ==================== PORTADA / CABECERA ====================
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 13, 'F');
  doc.setFillColor(...CYAN);
  doc.rect(0, 13, W, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setCharSpace(0.7);
  doc.text('UGEL SANTA  ·  ÁREA DE ACTAS Y CERTIFICADOS', M, 8.2);
  doc.text('TRAZABILIDAD', W - M, 8.2, { align: 'right' });
  doc.setCharSpace(0);

  doc.setFont('times', 'bold');
  doc.setFontSize(27);
  doc.setTextColor(...NAVY);
  doc.text('Hoja de trazabilidad', M, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text('Registro cronológico de movimientos y cambios de estado', M, 45);

  sello(doc, expediente.estado || '—', W - M - 29, 35, colorEstado(expediente.estado), 7);

  // ==================== FICHA ====================
  let y = 60;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.9);
  doc.line(M, y, W - M, y);

  const colB = M + 92;

  etiqueta('N° DE EXPEDIENTE', M, y + 7);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text(String(expediente.num_expediente ?? '—'), M, y + 17);

  etiqueta('CÓDIGO DE SEGUIMIENTO', colB, y + 7);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  const codigo = doc.splitTextToSize(String(expediente.firma_ruta ?? '—'), W - M - colB);
  doc.text(codigo, colB, y + 15);

  y += 24;

  const sol = expediente.solicitante?.nombre_solicitante;
  const asu = expediente.asunto?.nombre_asunto;
  if (sol || asu) {
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.line(M, y, W - M, y);

    let maxLineas = 1;
    const bloque = (titulo, valor, x, ancho) => {
      if (!valor) return;
      etiqueta(titulo, x, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const lineas = doc.splitTextToSize(valor, ancho).slice(0, 2);
      maxLineas = Math.max(maxLineas, lineas.length);
      doc.text(lineas, x, y + 11.5);
    };
    bloque('SOLICITANTE', sol, M, 84);
    bloque('ASUNTO', asu, colB, W - M - colB);
    y += 11 + maxLineas * 4.6;
  }

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 7;

  // ==================== RESUMEN ====================
  const primero = eventos[0] ? new Date(eventos[0].fecha_cambio) : null;
  const ultimo = eventos.length ? new Date(eventos[eventos.length - 1].fecha_cambio) : null;
  const responsables = new Set(eventos.map((e) => e.usuario).filter(Boolean)).size;

  const stats = [
    ['MOVIMIENTOS', String(eventos.length)],
    ['DURACIÓN TOTAL', primero && ultimo ? duracion(ultimo - primero) : '—'],
    ['ÚLTIMO MOVIMIENTO', ultimo ? fFecha(ultimo) : '—'],
    ['RESPONSABLES', String(responsables)]
  ];
  const bandaH = 20;
  doc.setFillColor(...TINT);
  doc.rect(M, y, W - 2 * M, bandaH, 'F');
  const colW = (W - 2 * M) / stats.length;
  stats.forEach(([lab, val], i) => {
    const x = M + i * colW + 6;
    if (i > 0) {
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.25);
      doc.line(M + i * colW, y + 4, M + i * colW, y + bandaH - 4);
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(i === 2 ? 13.5 : 16);
    doc.setTextColor(...NAVY);
    doc.text(val, x, y + 10.5);
    etiqueta(lab, x, y + 16);
  });
  y += bandaH + 12;

  // ==================== LÍNEA DE TIEMPO ====================
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('Línea de tiempo', M, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('del más antiguo al más reciente', M + 38, y);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.9);
  doc.line(M, y + 2.5, M + 14, y + 2.5);
  y += 12;

  const nodeX = M + 34;
  const cX = M + 42;
  const cW = W - M - cX;
  const colFecha = M + 27;

  const cabeceraContinuacion = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setCharSpace(0.6);
    doc.text(`HOJA DE TRAZABILIDAD  ·  EXP. ${expediente.num_expediente}`, M, 5.9);
    doc.setCharSpace(0);
  };

  eventos.forEach((ev, i) => {
    const d = new Date(ev.fecha_cambio);
    const obs = (ev.observaciones || '').trim();
    const color = colorEstado(ev.estado_nuevo);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const obsLineas = obs ? doc.splitTextToSize(obs, cW - 7) : [];

    const contenidoH = 10.8 + (obsLineas.length ? 3 + obsLineas.length * 4.2 : 0) + 2;
    const h = contenidoH + 8;

    let nuevaPagina = false;
    if (y + h > LIMITE) {
      doc.addPage();
      cabeceraContinuacion();
      y = 22;
      nuevaPagina = true;
    }

    const nodeY = y + 3;

    // Conector con el evento anterior si cambió la página
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.6);
    if (nuevaPagina) doc.line(nodeX, 12, nodeX, nodeY);
    // Conector hacia el siguiente evento
    if (i < eventos.length - 1) doc.line(nodeX, nodeY, nodeX, y + h + 3);

    // Nodo
    doc.setFillColor(...color);
    doc.circle(nodeX, nodeY, 2.4, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(nodeX, nodeY, 1.1, 'F');

    // Columna de fecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(fFecha(d), colFecha, y + 3.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${fHora(d)} h`, colFecha, y + 7.4, { align: 'right' });
    if (i > 0) {
      const prev = new Date(eventos[i - 1].fecha_cambio);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...CYAN);
      doc.text(`+${duracion(d - prev)}`, colFecha, y + 11.4, { align: 'right' });
    }

    // Fila 1: transición de estado
    let x = cX;
    if (ev.estado_anterior) {
      const cAnt = colorEstado(ev.estado_anterior);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...cAnt);
      doc.text(ev.estado_anterior, x, y + 4.1);
      x += doc.getTextWidth(ev.estado_anterior) + 2.5;
      doc.setDrawColor(...MUTED);
      doc.setLineWidth(0.45);
      doc.line(x, y + 3, x + 4.4, y + 3);
      doc.setFillColor(...MUTED);
      doc.triangle(x + 4.4, y + 1.9, x + 4.4, y + 4.1, x + 6.2, y + 3, 'F');
      x += 8.4;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const estadoTxt = String(ev.estado_nuevo || '—');
    const chipW = doc.getTextWidth(estadoTxt) + 7;
    doc.setFillColor(...color);
    doc.rect(x, y, chipW, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(estadoTxt, x + 3.5, y + 4.2);
    if (!ev.estado_anterior) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text('REGISTRO INICIAL', x + chipW + 3, y + 4.1);
    }

    // Número correlativo
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...RULE);
    doc.text(`#${pad(i + 1)}`, cX + cW, y + 4.2, { align: 'right' });

    // Fila 2: responsable
    const y2 = y + 10.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Registrado por', cX, y2);
    const lw = doc.getTextWidth('Registrado por');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(String(ev.usuario || '—'), cX + lw + 2, y2);

    // Observación
    if (obsLineas.length) {
      const yObs = y2 + 6;
      doc.setFillColor(...color);
      doc.rect(cX, yObs - 3.4, 0.7, obsLineas.length * 4.2 + 0.8, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(65, 75, 90);
      doc.text(obsLineas, cX + 3.5, yObs);
    }

    y += h;
  });

  // Cierre
  if (y + 12 > LIMITE) {
    doc.addPage();
    cabeceraContinuacion();
    y = 24;
  }
  const cy = y + 2;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(M, cy, W / 2 - 22, cy);
  doc.line(W / 2 + 22, cy, W - M, cy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(0.7);
  doc.text('FIN DEL REGISTRO', W / 2, cy + 0.9, { align: 'center' });
  doc.setCharSpace(0);

  // ==================== PIE EN TODAS LAS PÁGINAS ====================
  const total = doc.getNumberOfPages();
  const ahora = new Date();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Generado el ${fFecha(ahora)} · ${fHora(ahora)} h`, M, H - 9.5);
    doc.text('Sistema de Gestión de Expedientes · UGEL Santa', W / 2, H - 9.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${p} de ${total}`, W - M, H - 9.5, { align: 'right' });
  }

  const limpio = String(expediente.num_expediente).replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Trazabilidad_${limpio}_${ahora.toISOString().split('T')[0]}.pdf`);
}