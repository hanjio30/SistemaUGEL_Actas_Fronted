// Feriados fijos del Perú (MM-DD)
const FERIADOS_FIJOS = [
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-07', // Día de la Bandera / Batalla de Arica
  '06-29', // San Pedro y San Pablo
  '07-23', // Día de la Fuerza Aérea
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-06', // Batalla de Junín
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Todos los Santos
  '12-08', // Inmaculada Concepción
  '11-10',
  '11-11',
  '12-09', // Batalla de Ayacucho
  '12-25'  // Navidad
];

// Días no laborables o feriados extra decretados (YYYY-MM-DD)
const FERIADOS_EXTRA = [
  // '2026-12-24',
  // '2026-12-31',
];

const calcularPascua = (año) => {
  const a = año % 19;
  const b = Math.floor(año / 100);
  const c = año % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(año, mes - 1, dia);
};

const aClave = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const esFeriado = (fecha) => {
  const clave = aClave(fecha);
  const mmdd = clave.slice(5);

  if (FERIADOS_FIJOS.includes(mmdd)) return true;
  if (FERIADOS_EXTRA.includes(clave)) return true;

  const pascua = calcularPascua(fecha.getFullYear());
  const juevesSanto = new Date(pascua);
  juevesSanto.setDate(pascua.getDate() - 3);
  const viernesSanto = new Date(pascua);
  viernesSanto.setDate(pascua.getDate() - 2);

  return clave === aClave(juevesSanto) || clave === aClave(viernesSanto);
};

export const esDiaHabil = (fecha) => {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6 && !esFeriado(fecha);
};

// Cuenta los días hábiles transcurridos desde fechaInicio (YYYY-MM-DD) hasta hoy.
// El día de recepción no cuenta; el día de hoy sí (si es hábil).
export const contarDiasHabiles = (fechaInicioStr, hasta = new Date()) => {
  if (!fechaInicioStr) return 0;

  const [y, m, d] = fechaInicioStr.split('T')[0].split('-').map(Number);
  const inicio = new Date(y, m - 1, d);

  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);

  let dias = 0;
  const cursor = new Date(inicio);

  while (cursor < fin) {
    cursor.setDate(cursor.getDate() + 1);
    if (esDiaHabil(cursor)) dias++;
  }

  return dias;
};

// Fecha límite sumando N días hábiles
export const calcularFechaLimite = (fechaInicioStr, diasHabiles) => {
  const [y, m, d] = fechaInicioStr.split('T')[0].split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  let agregados = 0;

  while (agregados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    if (esDiaHabil(fecha)) agregados++;
  }

  return fecha.toLocaleDateString('es-PE');
};