/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

const API_URL = 'https://sistemaugel-actas-backend.onrender.com/api';

export default function ReportesModule({ usuario }) {
  const [tipoReporte, setTipoReporte] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [documentoId, setDocumentoId] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  
  // Estados para datos
  const [documentos, setDocumentos] = useState([]);
  const [datosReporte, setDatosReporte] = useState(null);

  // Cargar documentos al montar
  useEffect(() => {
    cargarDocumentos();
    establecerFechasDefault();
  }, []);

  const establecerFechasDefault = () => {
  // ✅ CORRECCIÓN: Generar fechas locales sin desfase UTC
  const hoy = new Date();
  
  // Fecha de inicio: primer día del mes actual
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const añoInicio = primerDia.getFullYear();
  const mesInicio = String(primerDia.getMonth() + 1).padStart(2, '0');
  const diaInicio = String(primerDia.getDate()).padStart(2, '0');
  const fechaInicioLocal = `${añoInicio}-${mesInicio}-${diaInicio}`;
  
  // Fecha fin: día actual
  const añoFin = hoy.getFullYear();
  const mesFin = String(hoy.getMonth() + 1).padStart(2, '0');
  const diaFin = String(hoy.getDate()).padStart(2, '0');
  const fechaFinLocal = `${añoFin}-${mesFin}-${diaFin}`;
  
  setFechaInicio(fechaInicioLocal);
  setFechaFin(fechaFinLocal);
};

  const cargarDocumentos = async () => {
    try {
      const res = await fetch(`${API_URL}/documentos`);
      const data = await res.json();
      console.log('📄 Documentos cargados desde API:', data);
      setDocumentos(data);
    } catch (err) {
      console.error('❌ Error al cargar documentos:', err);
    }
  };

  const generarReporte = async () => {
    if (!tipoReporte) {
      setError('Selecciona un tipo de reporte');
      return;
    }

    setLoading(true);
    setError(null);
    setDatosReporte(null);

    try {
      let url = '';
      let params = new URLSearchParams();

      switch (tipoReporte) {
        case 'expedientes-periodo':
          url = `${API_URL}/reportes/expedientes-periodo`;
          params.append('fecha_inicio', fechaInicio);
          params.append('fecha_fin', fechaFin);
          if (documentoId) params.append('documento_id', documentoId);
          if (estadoFiltro !== 'Todos') params.append('estado', estadoFiltro);
          break;

        case 'estados-actuales':
          url = `${API_URL}/reportes/estados-actuales`;
          break;

        case 'por-colaborador':
          url = `${API_URL}/reportes/por-colaborador`;
          if (fechaInicio) params.append('fecha_inicio', fechaInicio);
          if (fechaFin) params.append('fecha_fin', fechaFin);
          if (usuarioFiltro) params.append('usuario', usuarioFiltro);
          break;

        case 'tiempos-atencion':
          url = `${API_URL}/reportes/tiempos-atencion`;
          if (fechaInicio) params.append('fecha_inicio', fechaInicio);
          if (fechaFin) params.append('fecha_fin', fechaFin);
          break;

        case 'expedientes-observados':
          url = `${API_URL}/reportes/expedientes-observados`;
          break;

        case 'entregas':
          url = `${API_URL}/reportes/entregas`;
          if (fechaInicio) params.append('fecha_inicio', fechaInicio);
          if (fechaFin) params.append('fecha_fin', fechaFin);
          break;
      }

      const res = await fetch(`${url}?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al generar reporte');
      }
      
      const data = await res.json();
      console.log('📊 Datos del reporte recibidos:', data);
      setDatosReporte(data);

    } catch (err) {
      setError(err.message);
      console.error('❌ Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = async () => {
    if (!datosReporte) return;

    setLoading(true);
    try {
      let tipo = '';
      let datos = [];

      switch (tipoReporte) {
        case 'expedientes-periodo':
          tipo = 'expedientes';
          datos = datosReporte.expedientes || [];
          break;
        case 'expedientes-observados':
          tipo = 'observados';
          datos = datosReporte.expedientes || [];
          break;
        case 'entregas':
          tipo = 'entregas';
          datos = datosReporte.entregas || [];
          break;
        case 'por-colaborador':
          tipo = 'colaboradores';
          datos = datosReporte.estadisticas || [];
          break;
        default:
          throw new Error('Tipo de reporte no soportado para exportación');
      }

      const res = await fetch(`${API_URL}/reportes/exportar-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, datos })
      });

      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${tipoReporte}_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError('Error al exportar Excel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFiltros = () => {
    const estiloLabel = {
      display: 'block',
      color: '#374151',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px'
    };

    const estiloInput = {
      width: '100%',
      padding: '10px 14px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s'
    };

    if (tipoReporte === 'expedientes-periodo') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '24px' }}>
          <div>
            <label style={estiloLabel}>📅 Fecha Inicio</label>
            <input 
              type="date" 
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={estiloInput}
            />
          </div>
          <div>
            <label style={estiloLabel}>📅 Fecha Fin</label>
            <input 
              type="date" 
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={estiloInput}
            />
          </div>
          <div>
            <label style={estiloLabel}>📄 Tipo Documento</label>
            <select 
              value={documentoId}
              onChange={(e) => setDocumentoId(e.target.value)}
              style={estiloInput}
            >
              <option value="">Todos los documentos</option>
              {documentos && documentos.length > 0 ? (
                documentos.map(doc => (
                  <option key={doc.id_documento} value={doc.id_documento}>
                    {/* ✅ CORRECCIÓN: Usar nombre_tipo en lugar de nombre_documento */}
                    {doc.nombre_tipo || doc.nombre_documento || `Documento ${doc.id_documento}`}
                  </option>
                ))
              ) : (
                <option value="" disabled>Cargando documentos...</option>
              )}
            </select>
          </div>
          <div>
            <label style={estiloLabel}>🔄 Estado</label>
            <select 
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              style={estiloInput}
            >
              <option value="Todos">Todos</option>
              <option value="RECEPCIONADO">Recepcionado</option>
              <option value="EN PROCESO">En Proceso</option>
              <option value="OBSERVADO">Observado</option>
              <option value="LISTO PARA ENTREGA">Listo para Entrega</option>
              <option value="ENTREGADO">Entregado</option>
            </select>
          </div>
        </div>
      );
    }

    if (['por-colaborador', 'tiempos-atencion', 'entregas'].includes(tipoReporte)) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: tipoReporte === 'por-colaborador' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '20px', marginTop: '24px' }}>
          <div>
            <label style={estiloLabel}>📅 Fecha Inicio</label>
            <input 
              type="date" 
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={estiloInput}
            />
          </div>
          <div>
            <label style={estiloLabel}>📅 Fecha Fin</label>
            <input 
              type="date" 
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={estiloInput}
            />
          </div>
          {tipoReporte === 'por-colaborador' && (
            <div>
              <label style={estiloLabel}>👤 Usuario</label>
              <input 
                type="text" 
                placeholder="Filtrar por usuario"
                value={usuarioFiltro}
                onChange={(e) => setUsuarioFiltro(e.target.value)}
                style={estiloInput}
              />
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const renderResultados = () => {
    if (!datosReporte) return null;

    // Validar que los datos existan antes de renderizar
    try {
      switch (tipoReporte) {
        case 'expedientes-periodo':
          if (!datosReporte.resumen) {
            return <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ No hay datos de resumen disponibles
            </div>;
          }
          return <ReporteExpedientesPeriodo datos={datosReporte} />;
        
        case 'estados-actuales':
          if (!datosReporte.por_estado || !Array.isArray(datosReporte.por_estado)) {
            return <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ No hay datos de estados disponibles
            </div>;
          }
          return <ReporteEstadosActuales datos={datosReporte} />;
        
        case 'por-colaborador':
          if (!datosReporte.estadisticas || !Array.isArray(datosReporte.estadisticas)) {
            return <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ No hay datos de colaboradores disponibles
            </div>;
          }
          return <ReportePorColaborador datos={datosReporte} />;
        
        case 'tiempos-atencion':
          if (!datosReporte.tiempos_por_asunto || !Array.isArray(datosReporte.tiempos_por_asunto)) {
            return <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ No hay datos de tiempos disponibles
            </div>;
          }
          return <ReporteTiemposAtencion datos={datosReporte} />;
        
        case 'expedientes-observados':
          if (!datosReporte.expedientes || !Array.isArray(datosReporte.expedientes)) {
            return <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ No hay expedientes observados disponibles
            </div>;
          }
          return <ReporteExpedientesObservados datos={datosReporte} />;
        
        case 'entregas':
          if (!datosReporte.estadisticas || !datosReporte.entregas || !Array.isArray(datosReporte.entregas)) {
            return <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ No hay datos de entregas disponibles
            </div>;
          }
          return <ReporteEntregas datos={datosReporte} />;
        
        default:
          return null;
      }
    } catch (error) {
      console.error('❌ Error al renderizar resultados:', error);
      return <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
        ⚠️ Error al mostrar los resultados: {error.message}
      </div>;
    }
  };

  const reportes = [
    { id: 'expedientes-periodo', icono: '📈', titulo: 'Expedientes por Período', color: '#083f8f' },
    { id: 'estados-actuales', icono: '📊', titulo: 'Estados Actuales', color: '#0ea5d7' },
    { id: 'por-colaborador', icono: '👥', titulo: 'Por Colaborador', color: '#10b981' },
    { id: 'tiempos-atencion', icono: '⏱️', titulo: 'Tiempos de Atención', color: '#6366f1' },
    { id: 'expedientes-observados', icono: '🔴', titulo: 'Expedientes Observados', color: '#dc2626' },
    { id: 'entregas', icono: '📦', titulo: 'Entregas', color: '#f59e0b' }
  ];

  const estiloBotonReporte = (activo, color) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px 16px',
    backgroundColor: activo ? color : '#ffffff',
    color: activo ? '#ffffff' : '#374151',
    border: activo ? 'none' : '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: activo ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
    minHeight: '140px'
  });

  const estiloBotonAccion = (color, disabled = false) => ({
    padding: '12px 24px',
    backgroundColor: disabled ? '#9ca3af' : color,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    opacity: disabled ? '0.6' : '1',
    transition: 'all 0.2s',
    boxShadow: disabled ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  const puedeExportar = ['expedientes-periodo', 'expedientes-observados', 'entregas', 'por-colaborador'].includes(tipoReporte);

  return (
    <div style={{ padding: '28px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Encabezado Mejorado */}
      <div style={{ 
        background: 'linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%)',
        padding: '32px',
        borderRadius: '16px',
        marginBottom: '28px',
        boxShadow: '0 4px 20px rgba(8, 63, 143, 0.3)',
        color: '#ffffff'
      }}>
        <h1 style={{ 
          margin: '0 0 12px 0',
          fontSize: '32px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          📊 REPORTES Y ESTADÍSTICAS
        </h1>
        <p style={{ margin: 0, fontSize: '16px', opacity: '0.95' }}>
          Sistema integral de generación de reportes gerenciales para análisis y toma de decisiones estratégicas
        </p>
      </div>

      {/* Selector de Reportes Mejorado */}
      <div style={{ 
        backgroundColor: '#ffffff',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '28px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{ 
            margin: 0,
            fontSize: '20px',
            fontWeight: '700',
            color: '#083f8f'
          }}>
            🎯 Seleccione el Tipo de Reporte
          </h2>
          {tipoReporte && (
            <button
              onClick={() => {
                setTipoReporte('');
                setDatosReporte(null);
                setError(null);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {reportes.map(reporte => (
            <button 
              key={reporte.id}
              onClick={() => setTipoReporte(reporte.id)}
              style={estiloBotonReporte(tipoReporte === reporte.id, reporte.color)}
            >
              <span style={{ fontSize: '48px' }}>{reporte.icono}</span>
              <span>{reporte.titulo}</span>
            </button>
          ))}
        </div>

        {/* Filtros */}
        {renderFiltros()}

        {/* Botones de Acción */}
        {tipoReporte && (
          <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={generarReporte}
              disabled={loading}
              style={estiloBotonAccion('#0ea5d7', loading)}
            >
              <span>{loading ? '⏳' : '🔍'}</span>
              <span>{loading ? 'Generando...' : 'Generar Reporte'}</span>
            </button>

            {datosReporte && puedeExportar && (
              <button 
                onClick={exportarExcel}
                disabled={loading}
                style={estiloBotonAccion('#10b981', loading)}
              >
                <span>📊</span>
                <span>Exportar Excel</span>
              </button>
            )}
          </div>
        )}

        {/* Error Mejorado */}
        {error && (
          <div style={{ 
            marginTop: '20px',
            padding: '16px 20px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '2px solid #fecaca'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Resultados */}
      {datosReporte && (
        <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
          {renderResultados()}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTES DE REPORTES ESPECÍFICOS
// ============================================

function ReporteExpedientesPeriodo({ datos }) {
  const estiloCard = {
    backgroundColor: '#ffffff',
    padding: '28px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '20px'
  };

  const estiloStat = {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '2px solid #e5e7eb'
  };

  return (
    <div>
      {/* Resumen Ejecutivo */}
      <div style={estiloCard}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700', color: '#083f8f', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📈</span>
          <span>RESUMEN EJECUTIVO</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
          <div style={estiloStat}>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#083f8f', marginBottom: '8px' }}>
              {datos.resumen.total_recibidos}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              Total Recibidos
            </div>
          </div>

          <div style={estiloStat}>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
              {datos.resumen.total_atendidos}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              Total Atendidos
            </div>
          </div>

          <div style={estiloStat}>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
              {datos.resumen.total_observados}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              Total Observados
            </div>
          </div>

          <div style={estiloStat}>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#0ea5d7', marginBottom: '8px' }}>
              {datos.resumen.total_en_proceso}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              En Proceso
            </div>
          </div>

          <div style={estiloStat}>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#6366f1', marginBottom: '8px' }}>
              {datos.resumen.tiempo_promedio_dias}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              Días Promedio
            </div>
          </div>

          <div style={estiloStat}>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
              {datos.resumen.porcentaje_dentro_plazo}%
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              Dentro del Plazo
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Asuntos */}
      {datos.top_asuntos && datos.top_asuntos.length > 0 && (
        <div style={estiloCard}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span>
            <span>TOP 5 ASUNTOS MÁS SOLICITADOS</span>
          </h3>
          
          {datos.top_asuntos.map((asunto, idx) => (
            <div key={idx} style={{ 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ 
                minWidth: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#083f8f',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700',
                boxShadow: '0 2px 4px rgba(8,63,143,0.3)'
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  {asunto.asunto}
                </div>
                <div style={{ 
                  height: '10px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%',
                    width: `${asunto.porcentaje}%`,
                    backgroundColor: '#0ea5d7',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
              <div style={{ 
                fontSize: '15px',
                fontWeight: '700',
                color: '#083f8f',
                minWidth: '100px',
                textAlign: 'right'
              }}>
                {asunto.cantidad} <span style={{ fontSize: '13px', color: '#6b7280' }}>({asunto.porcentaje}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReporteEstadosActuales({ datos }) {
  const coloresPorEstado = {
    'RECEPCIONADO': '#6366f1',
    'EN PROCESO': '#f59e0b',
    'OBSERVADO': '#dc2626',
    'LISTO PARA ENTREGA': '#10b981',
    'ENTREGADO': '#6b7280'
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      padding: '28px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700', color: '#083f8f', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>📊</span>
        <span>DISTRIBUCIÓN POR ESTADOS</span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {datos.por_estado.map((item, idx) => (
          <div key={idx} style={{ 
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            borderLeft: `5px solid ${coloresPorEstado[item.estado] || '#6b7280'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px', fontWeight: '600' }}>
              {item.estado}
            </div>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#083f8f', marginBottom: '4px' }}>
              {item.cantidad}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
              {item.porcentaje}% del total
            </div>
          </div>
        ))}
      </div>

      {/* Expedientes más antiguos */}
      {datos.expedientes_mas_antiguos && datos.expedientes_mas_antiguos.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>EXPEDIENTES PENDIENTES </span>
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>N° Expediente</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Solicitante</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Asunto</th>
                  <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Estado</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Días</th>
                </tr>
              </thead>
              <tbody>
                {datos.expedientes_mas_antiguos.map((exp, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px', fontSize: '14px', fontWeight: '600' }}>{exp.num_expediente}</td>
                    <td style={{ padding: '14px', fontSize: '14px' }}>{exp.solicitante}</td>
                    <td style={{ padding: '14px', fontSize: '14px' }}>{exp.asunto}</td>
                    <td style={{ padding: '14px', fontSize: '14px' }}>
                      <span style={{ 
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: coloresPorEstado[exp.estado] || '#6b7280',
                        color: '#ffffff'
                      }}>
                        {exp.estado}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '14px',
                      fontSize: '16px',
                      fontWeight: '700',
                      textAlign: 'center',
                      color: exp.dias_transcurridos >= 10 ? '#dc2626' : '#f59e0b'
                    }}>
                      {exp.dias_transcurridos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportePorColaborador({ datos }) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      padding: '28px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#083f8f', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>👥</span>
          <span>ESTADÍSTICAS POR COLABORADOR</span>
        </h3>
        <div style={{ 
          padding: '12px 20px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#6b7280'
        }}>
          Total: {datos.total_usuarios} colaboradores
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#083f8f' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>Usuario</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>Nombre Completo</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>Total Atenciones</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>En Proceso</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>Observados</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>Listos Entrega</th>
            </tr>
          </thead>
          <tbody>
            {datos.estadisticas.map((stat, idx) => (
              <tr key={idx} style={{ 
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb'
              }}>
                <td style={{ padding: '14px', fontSize: '14px', fontWeight: '600' }}>
                  {stat.usuario}
                </td>
                <td style={{ padding: '14px', fontSize: '14px' }}>
                  {stat.nombre_completo}
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '16px', fontWeight: '700', color: '#083f8f' }}>
                  {stat.total_atenciones}
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px' }}>
                  {stat.en_proceso}
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px', color: '#f59e0b', fontWeight: '600' }}>
                  {stat.observados}
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px', color: '#10b981', fontWeight: '600' }}>
                  {stat.listos_entrega}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteTiemposAtencion({ datos }) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      padding: '28px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700', color: '#083f8f', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>⏱️</span>
        <span>TIEMPOS DE ATENCIÓN POR ASUNTO</span>
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Asunto</th>
              <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Promedio</th>
              <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Mín</th>
              <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Máx</th>
              <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>% &lt;10d</th>
            </tr>
          </thead>
          <tbody>
            {datos.tiempos_por_asunto.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '14px', fontSize: '14px', fontWeight: '500' }}>{item.asunto}</td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '16px', fontWeight: '700', color: '#083f8f' }}>
                  {item.promedio_dias} días
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px' }}>
                  {item.minimo_dias}d
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px' }}>
                  {item.maximo_dias}d
                </td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: '16px', fontWeight: '700' }}>
                  <span style={{ 
                    color: item.porcentaje_dentro_plazo >= 80 ? '#10b981' : '#dc2626'
                  }}>
                    {item.porcentaje_dentro_plazo}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cuellos de botella */}
      {datos.cuellos_botella && datos.cuellos_botella.length > 0 && (
        <div style={{ 
          marginTop: '24px',
          padding: '20px',
          backgroundColor: '#fee2e2',
          borderRadius: '12px',
          borderLeft: '5px solid #dc2626'
        }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '700', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>CUELLOS DE BOTELLA IDENTIFICADOS</span>
          </h4>
          <ul style={{ margin: 0, paddingLeft: '24px' }}>
            {datos.cuellos_botella.map((item, idx) => (
              <li key={idx} style={{ fontSize: '14px', color: '#374151', marginBottom: '8px', fontWeight: '500' }}>
                <strong>{item.asunto}</strong> supera el plazo en el {100 - item.porcentaje_dentro_plazo}% de los casos
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReporteExpedientesObservados({ datos }) {
  const getColorUrgencia = (urgencia) => {
    switch (urgencia) {
      case 'alta': return '#dc2626';
      case 'media': return '#f59e0b';
      default: return '#10b981';
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      padding: '28px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#083f8f', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔴</span>
          <span>EXPEDIENTES OBSERVADOS</span>
        </h3>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626' }}>
              {datos.estadisticas.urgencia_alta}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Urgencia Alta</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
              {datos.estadisticas.urgencia_media}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Urgencia Media</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#083f8f' }}>
              {datos.estadisticas.promedio_dias}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Días Promedio</div>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>N° Expediente</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Solicitante</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Asunto</th>
              <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Días</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.expedientes.map((exp, idx) => (
              <tr key={idx} style={{ 
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: exp.urgencia === 'alta' ? '#fee2e2' : (exp.urgencia === 'media' ? '#fef3c7' : '#ffffff')
              }}>
                <td style={{ padding: '14px', fontSize: '14px', fontWeight: '600' }}>
                  {exp.num_expediente}
                </td>
                <td style={{ padding: '14px', fontSize: '14px' }}>
                  {exp.solicitante}
                </td>
                <td style={{ padding: '14px', fontSize: '14px' }}>
                  {exp.asunto}
                </td>
                <td style={{ 
                  padding: '14px',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: getColorUrgencia(exp.urgencia)
                }}>
                  {exp.dias_transcurridos} / 10
                </td>
                <td style={{ padding: '14px', fontSize: '13px', color: '#6b7280' }}>
                  {exp.observaciones || 'Sin observaciones'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteEntregas({ datos }) {
  // ✅ Validar que entregas sea un array antes de usar slice
  const entregas = Array.isArray(datos.entregas) ? datos.entregas : [];
  
  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      padding: '28px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700', color: '#083f8f', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>📦</span>
        <span>REPORTE DE ENTREGAS</span>
      </h3>

      {/* Estadísticas Generales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
          <div style={{ fontSize: '40px', fontWeight: '700', color: '#083f8f', marginBottom: '8px' }}>
            {datos.estadisticas?.total_entregas || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
            Total Entregas
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
          <div style={{ fontSize: '40px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
            {datos.estadisticas?.entrega_titular || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
            Entrega Titular
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
          <div style={{ fontSize: '40px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
            {datos.estadisticas?.entrega_tercero || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
            Entrega Tercero
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
          <div style={{ fontSize: '40px', fontWeight: '700', color: '#6366f1', marginBottom: '8px' }}>
            {datos.estadisticas?.tiempo_promedio || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
            Días Promedio
          </div>
        </div>
      </div>

      {/* Tabla de Entregas */}
      {entregas.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>N° Expediente</th>
                <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Solicitante</th>
                <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Tipo Recogida</th>
                <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Fecha Entrega</th>
                <th style={{ padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Días Atención</th>
                <th style={{ padding: '14px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Entregado Por</th>
              </tr>
            </thead>
            <tbody>
              {entregas.slice(0, 50).map((entrega, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px', fontSize: '14px', fontWeight: '600' }}>
                    {entrega.expediente?.num_expediente || 'N/A'}
                  </td>
                  <td style={{ padding: '14px', fontSize: '14px' }}>
                    {entrega.expediente?.solicitante?.nombre_solicitante || 'N/A'}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px' }}>
                    <span style={{ 
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: entrega.tipo_recogida === 'titular' ? '#d1fae5' : '#fed7aa',
                      color: entrega.tipo_recogida === 'titular' ? '#065f46' : '#92400e'
                    }}>
                      {entrega.tipo_recogida?.toUpperCase() || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontSize: '14px' }}>
                    {entrega.fecha_entrega ? new Date(entrega.fecha_entrega).toLocaleDateString('es-PE') : 'N/A'}
                  </td>
                  <td style={{ 
                    padding: '14px',
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: (entrega.dias_atencion || 0) <= 10 ? '#10b981' : '#dc2626'
                  }}>
                    {entrega.dias_atencion || 0}
                  </td>
                  <td style={{ padding: '14px', fontSize: '14px' }}>
                    {entrega.entregado_por || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          No hay entregas registradas en el período seleccionado
        </div>
      )}
    </div>
  );
}