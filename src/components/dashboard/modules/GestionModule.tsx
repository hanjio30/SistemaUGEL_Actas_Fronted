/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

export default function GestionModule() {
  const [expedientes, setExpedientes] = useState([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState('Este mes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [formData, setFormData] = useState({});

  const API_BASE = 'http://localhost:8000/api';

  const EstilosImpresion = () => (
  <style>{`
    @media print {
      /* Ocultar elementos innecesarios */
      body * {
        visibility: hidden;
      }
      
      #area-impresion, #area-impresion * {
        visibility: visible;
      }
      
      #area-impresion {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      
      /* Ocultar botones y elementos de navegación */
      button {
        display: none !important;
      }
      
      /* Ajustar tamaños de página */
      @page {
        size: A4;
        margin: 2cm;
      }
      
      /* Evitar saltos de página no deseados */
      h3, .seccion-impresion {
        page-break-inside: avoid;
        page-break-after: avoid;
      }
      
      /* Ajustar colores para impresión */
      * {
        background-color: white !important;
        color: black !important;
        box-shadow: none !important;
      }
      
      /* Bordes más sutiles para impresión */
      .seccion-impresion {
        border: 1px solid #ddd !important;
        margin-bottom: 15px !important;
        padding: 10px !important;
      }
      
      h3 {
        border-bottom: 2px solid #333 !important;
        color: #333 !important;
      }
    }
  `}</style>
);

  const colores = {
    primario: '#083f8f',
    secundario: '#0ea5d7',
    texto: '#6b7280',
    fondo: '#f3f4f6',
    blanco: '#ffffff',
    exito: '#10b981',
    error: '#dc2626',
    advertencia: '#f59e0b'
  };

  const estadoConfig = {
  'RECEPCIONADO': { emoji: '⚪', color: '#9ca3af', bgColor: '#f3f4f6' },
  'EN PROCESO': { emoji: '🟡', color: '#f59e0b', bgColor: '#fef3c7' },
  'LISTO PARA ENTREGA': { emoji: '🟢', color: '#10b981', bgColor: '#d1fae5' }
};

  useEffect(() => {
    cargarExpedientes();
  }, []);

  const cargarExpedientes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/expedientes`);
      if (!response.ok) throw new Error('Error al cargar expedientes');
      const data = await response.json();
      setExpedientes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularDiasTranscurridos = (fechaRecepcion) => {
    if (!fechaRecepcion) return 0;
    
    // Extraer solo la parte de la fecha (YYYY-MM-DD) ignorando la hora
    const fechaStr = fechaRecepcion.split('T')[0];
    const [year, month, day] = fechaStr.split('-').map(Number);
    
    // Crear fecha sin problemas de zona horaria
    const fecha = new Date(year, month - 1, day);
    
    // Obtener fecha actual sin hora
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const diferencia = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  const filtrarPorFecha = (fechaRecepcion) => {
    if (!fechaRecepcion) return false;
    
    // Extraer solo la parte de la fecha
    const fechaStr = fechaRecepcion.split('T')[0];
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fechaExp = new Date(year, month - 1, day);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (filtroFecha === 'Todos') return true;
    
    if (filtroFecha === 'Esta semana') {
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      return fechaExp >= inicioSemana;
    }
    
    if (filtroFecha === 'Este mes') {
      return fechaExp.getMonth() === hoy.getMonth() && 
             fechaExp.getFullYear() === hoy.getFullYear();
    }
    
    return true;
  };

  const expedientesFiltrados = expedientes.filter(exp => {
  // Solo mostrar expedientes con estados válidos
  const estadosValidos = ['RECEPCIONADO', 'EN PROCESO', 'LISTO PARA ENTREGA'];
  if (!estadosValidos.includes(exp.estado)) {
    return false;
  }

  const coincideBusqueda = 
    exp.num_expediente?.toLowerCase().includes(busqueda.toLowerCase()) ||
    exp.solicitante?.nombre_solicitante?.toLowerCase().includes(busqueda.toLowerCase()) ||
    exp.asunto?.nombre_asunto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    exp.firma_ruta?.toLowerCase().includes(busqueda.toLowerCase());

  const coincideEstado = filtroEstado === 'Todos' || exp.estado === filtroEstado;
  
  const coincideFecha = filtrarPorFecha(exp.fecha_recepcion);

  return coincideBusqueda && coincideEstado && coincideFecha;
});

  const verDetalleExpediente = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/expedientes/${id}`);
      if (!response.ok) throw new Error('Error al cargar detalle');
      const data = await response.json();
      setExpedienteSeleccionado(data);
      setFormData({
        observaciones: data.observaciones || ''
    });
      setModoEdicion(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const cerrarDetalle = () => {
    setExpedienteSeleccionado(null);
    setModoEdicion(false);
    setFormData({});
  };

  const editarExpediente = async () => {
    if (!modoEdicion) {
      setModoEdicion(true);
      return;
    }

  // Guardar cambios
    try {
      const response = await fetch(`${API_BASE}/expedientes/${expedienteSeleccionado.id_expediente}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          observaciones: formData.observaciones
        })
      });
      
      if (!response.ok) throw new Error('Error al actualizar expediente');
      
      const expedienteActualizado = await response.json();
      alert('Expediente actualizado exitosamente');
      setExpedienteSeleccionado(expedienteActualizado);
      setModoEdicion(false);
      cargarExpedientes();
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    }
  };

  const cancelarEdicion = () => {
  setModoEdicion(false);
  setFormData({
    observaciones: expedienteSeleccionado.observaciones || ''
  });
};

  const borrarExpediente = async () => {
    if (!confirm('¿Está seguro de que desea eliminar este expediente? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/expedientes/${expedienteSeleccionado.id_expediente}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Error al eliminar expediente');
      
      alert('Expediente eliminado exitosamente');
      cerrarDetalle();
      cargarExpedientes();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Extraer los componentes de la fecha directamente del string
    // Esto evita problemas de zona horaria
    const fechaStr = fecha.split('T')[0]; // Obtener solo YYYY-MM-DD
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const truncarTexto = (texto, maxLength = 20) => {
    if (!texto) return '-';
    return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
  };

  const imprimirExpediente = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        color: colores.texto 
      }}>
        <div>Cargando expedientes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: colores.error, 
        color: colores.blanco,
        borderRadius: '8px',
        margin: '20px'
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: colores.fondo,
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {!expedienteSeleccionado ? (
        // VISTA PRINCIPAL - LISTA DE EXPEDIENTES
        <div style={{ 
          backgroundColor: colores.blanco, 
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '24px',
            borderBottom: `1px solid ${colores.fondo}`,
            backgroundColor: colores.primario,
            color: colores.blanco
          }}>
            <h2 style={{ 
              margin: '0',
              fontSize: '24px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              📋 MIS EXPEDIENTES
            </h2>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div style={{ padding: '24px', borderBottom: `1px solid ${colores.fondo}` }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar por N° expediente, solicitante, asunto..."
                  value={busqueda}
                  onInput={(e) => setBusqueda(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `2px solid ${colores.fondo}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = colores.secundario}
                  onBlur={(e) => e.target.style.borderColor = colores.fondo}
                />
              </div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${colores.fondo}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: colores.blanco,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Todos">Todos</option>
                <option value="RECEPCIONADO">Recepcionado</option>
                <option value="EN PROCESO">En Proceso</option>
                <option value="LISTO PARA ENTREGAR">Listo para Entregar</option>
              </select>
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${colores.fondo}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: colores.blanco,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Todos">Todas las fechas</option>
                <option value="Esta semana">Esta semana</option>
                <option value="Este mes">Este mes</option>
              </select>
            </div>

            {/* Leyenda */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              fontSize: '13px',
              color: colores.texto,
              flexWrap: 'wrap'
            }}>
              <span>⚪ RECEPCIONADO</span>
              <span>🟡 EN PROCESO</span>
              <span>🟢 LISTO PARA ENTREGAR</span>
            </div>
          </div>

          {/* Tabla de expedientes */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colores.fondo }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colores.texto }}>ESTADO</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colores.texto }}>N° EXP</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colores.texto }}>SOLICITANTE</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colores.texto }}>ASUNTO</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colores.texto }}>DÍAS</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: colores.texto }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {expedientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ 
                      padding: '40px', 
                      textAlign: 'center', 
                      color: colores.texto 
                    }}>
                      No se encontraron expedientes
                    </td>
                  </tr>
                ) : (
                  expedientesFiltrados.map((exp) => {
                    const dias = calcularDiasTranscurridos(exp.fecha_recepcion);
                    const limiteAlcanzado = dias >= 10;
                    const config = estadoConfig[exp.estado] || estadoConfig['RECEPCIONADO'];
                    
                    return (
                      <tr 
                        key={exp.id_expediente}
                        style={{ 
                          borderBottom: `1px solid ${colores.fondo}`,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = colores.fondo}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px' }}>
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: config.bgColor
  }}>
    <span style={{ fontSize: '18px' }}>{config.emoji}</span>
    <span style={{ 
      fontSize: '12px',
      color: config.color,
      fontWeight: '600'
    }}>
      {exp.estado}
    </span>
  </div>
</td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                          {exp.num_expediente}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: colores.texto }}>
                          {truncarTexto(exp.solicitante?.nombre_solicitante, 25)}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: colores.texto }}>
                          {truncarTexto(exp.asunto?.nombre_asunto, 20)}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            fontSize: '14px',
                            color: limiteAlcanzado ? colores.error : colores.texto,
                            fontWeight: limiteAlcanzado ? '600' : '400'
                          }}>
                            {dias}/10 {limiteAlcanzado && '⚠️'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            onClick={() => verDetalleExpediente(exp.id_expediente)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: colores.secundario,
                              color: colores.blanco,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = colores.primario}
                            onMouseOut={(e) => e.target.style.backgroundColor = colores.secundario}
                          >
                            👁️ Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer con contador */}
          <div style={{ 
            padding: '16px 24px', 
            borderTop: `1px solid ${colores.fondo}`,
            fontSize: '14px',
            color: colores.texto
          }}>
            Mostrando {expedientesFiltrados.length} de {expedientes.length} expedientes
          </div>
        </div>
      ) : (
        // VISTA DETALLE DEL EXPEDIENTE
        <>
          {/* Estilos para impresión */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              
              #area-impresion, #area-impresion * {
                visibility: visible;
              }
              
              #area-impresion {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              
              button {
                display: none !important;
              }
              
              .no-print {
                display: none !important;
              }
              
              @page {
                size: A4;
                margin: 2cm;
              }
              
              h3 {
                page-break-inside: avoid;
                page-break-after: avoid;
              }
              
              .seccion-impresion {
                page-break-inside: avoid;
                margin-bottom: 15px;
                padding: 10px;
                border: 1px solid #ddd;
              }
              
              * {
                background-color: white !important;
                color: black !important;
                box-shadow: none !important;
              }
              
              h3 {
                border-bottom: 2px solid #333 !important;
                color: #333 !important;
              }
            }
          `}</style>

          <div style={{ 
            backgroundColor: colores.blanco, 
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {/* Header del detalle - NO SE IMPRIME */}
            <div 
              className="no-print"
              style={{ 
                padding: '24px',
                borderBottom: `1px solid ${colores.fondo}`,
                backgroundColor: colores.primario,
                color: colores.blanco,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2 style={{ 
                margin: '0',
                fontSize: '22px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                📄 EXPEDIENTE N° {expedienteSeleccionado.num_expediente}
              </h2>
              <button
                onClick={cerrarDetalle}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: colores.blanco,
                  border: `2px solid ${colores.blanco}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            {/* CONTENIDO IMPRIMIBLE */}
            <div id="area-impresion" style={{ padding: '32px' }}>
              {/* Encabezado para impresión */}
              <div style={{ 
                marginBottom: '32px', 
                textAlign: 'center',
                borderBottom: '3px solid #083f8f',
                paddingBottom: '16px'
              }}>
                <h1 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '24px',
                  color: colores.primario,
                  fontWeight: '700'
                }}>
                  EXPEDIENTE N° {expedienteSeleccionado.num_expediente}
                </h1>
                <p style={{ 
                  margin: '0', 
                  fontSize: '13px',
                  color: colores.texto,
                  fontFamily: 'monospace'
                }}>
                  Código de Seguimiento: {expedienteSeleccionado.firma_ruta}
                </p>
              </div>

              {/* Información General */}
              <div className="seccion-impresion" style={{ marginBottom: '28px' }}>
                <h3 style={{ 
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colores.primario,
                  borderBottom: `2px solid ${colores.fondo}`,
                  paddingBottom: '8px'
                }}>
                  INFORMACIÓN GENERAL
                </h3>
                <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Estado:</span>
                    <span style={{ 
                      color: estadoConfig[expedienteSeleccionado.estado]?.color || colores.texto,
                      fontWeight: '600'
                    }}>
                      {estadoConfig[expedienteSeleccionado.estado]?.emoji} {expedienteSeleccionado.estado}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Fecha Recepción:</span>
                    <span>{formatearFecha(expedienteSeleccionado.fecha_recepcion)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Días transcurridos:</span>
                    <span style={{ 
                      color: calcularDiasTranscurridos(expedienteSeleccionado.fecha_recepcion) >= 10 ? colores.error : colores.texto,
                      fontWeight: '600'
                    }}>
                      {calcularDiasTranscurridos(expedienteSeleccionado.fecha_recepcion)} de 10 días
                      {calcularDiasTranscurridos(expedienteSeleccionado.fecha_recepcion) >= 10 && ' ⚠️'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Solicitante */}
              <div className="seccion-impresion" style={{ marginBottom: '28px' }}>
                <h3 style={{ 
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colores.primario,
                  borderBottom: `2px solid ${colores.fondo}`,
                  paddingBottom: '8px'
                }}>
                  SOLICITANTE
                </h3>
                <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Tipo:</span>
                    <span>{expedienteSeleccionado.solicitante?.nombre_tipo || '-'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>DNI:</span>
                    <span>{expedienteSeleccionado.solicitante?.dni || '-'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Código Modular:</span>
                    <span>{expedienteSeleccionado.solicitante?.codigo_modular || '-'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Nombre:</span>
                    <span style={{ fontWeight: '600' }}>
                      {expedienteSeleccionado.solicitante?.nombre_solicitante || '-'}
                    </span>
                  </div>
                  {expedienteSeleccionado.solicitante?.email && (
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                      <span style={{ fontWeight: '600', color: colores.texto }}>Email:</span>
                      <span>{expedienteSeleccionado.solicitante.email}</span>
                    </div>
                  )}
                  {expedienteSeleccionado.solicitante?.telefono && (
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                      <span style={{ fontWeight: '600', color: colores.texto }}>Teléfono:</span>
                      <span>{expedienteSeleccionado.solicitante.telefono}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documento y Asunto */}
              <div className="seccion-impresion" style={{ marginBottom: '28px' }}>
                <h3 style={{ 
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colores.primario,
                  borderBottom: `2px solid ${colores.fondo}`,
                  paddingBottom: '8px'
                }}>
                  DOCUMENTO
                </h3>
                <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Tipo:</span>
                    <span>{expedienteSeleccionado.asunto?.documento?.nombre_documento || '-'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: colores.texto }}>Asunto:</span>
                    <span style={{ fontWeight: '600' }}>
                      {expedienteSeleccionado.asunto?.nombre_asunto || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div className="seccion-impresion" style={{ marginBottom: '28px' }}>
                <h3 style={{ 
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colores.primario,
                  borderBottom: `2px solid ${colores.fondo}`,
                  paddingBottom: '8px'
                }}>
                  ATENCIÓN ACTUAL
                </h3>
                {modoEdicion ? (
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    placeholder="Escriba las observaciones del expediente..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      border: `2px solid ${colores.fondo}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '16px',
                    backgroundColor: colores.fondo,
                    borderRadius: '8px',
                    borderLeft: `4px solid ${estadoConfig[expedienteSeleccionado.estado]?.color || colores.texto}`,
                    minHeight: '60px'
                  }}>
                    <p style={{ 
                      margin: '0',
                      color: colores.texto,
                      lineHeight: '1.6',
                      fontSize: '14px'
                    }}>
                      {expedienteSeleccionado.observaciones || 'Sin observaciones registradas'}
                    </p>
                  </div>
                )}
              </div>

              {/* Pie de página para impresión */}
              <div style={{ 
                marginTop: '48px',
                paddingTop: '20px',
                borderTop: '2px solid #ddd',
                fontSize: '11px',
                color: '#666',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0' }}>
                  Documento generado el {new Date().toLocaleDateString('es-PE', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric'
                  })} a las {new Date().toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '10px' }}>
                  Sistema de Gestión y Seguimiento de Expedientes
                </p>
              </div>
            </div>

            {/* Botones de acción - NO SE IMPRIMEN */}
            <div 
              className="no-print"
              style={{ 
                display: 'flex', 
                gap: '12px', 
                padding: '24px 32px',
                borderTop: `1px solid ${colores.fondo}`,
                flexWrap: 'wrap'
              }}
            >
              {modoEdicion ? (
                <>
                  <button
                    onClick={editarExpediente}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: colores.exito,
                      color: colores.blanco,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.opacity = '0.8'}
                    onMouseOut={(e) => e.target.style.opacity = '1'}
                  >
                    💾 Guardar Cambios
                  </button>
                  <button
                    onClick={cancelarEdicion}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: colores.blanco,
                      color: colores.texto,
                      border: `2px solid ${colores.fondo}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.borderColor = colores.texto}
                    onMouseOut={(e) => e.target.style.borderColor = colores.fondo}
                  >
                    ✕ Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={editarExpediente}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: colores.secundario,
                      color: colores.blanco,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = colores.primario}
                    onMouseOut={(e) => e.target.style.backgroundColor = colores.secundario}
                  >
                    ✏️ Editar Expediente
                  </button>
                  <button
                    onClick={borrarExpediente}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: colores.error,
                      color: colores.blanco,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.opacity = '0.8'}
                    onMouseOut={(e) => e.target.style.opacity = '1'}
                  >
                    🗑️ Borrar Expediente
                  </button>
                  <button
                    onClick={imprimirExpediente}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: colores.blanco,
                      color: colores.texto,
                      border: `2px solid ${colores.fondo}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.borderColor = colores.texto}
                    onMouseOut={(e) => e.target.style.borderColor = colores.fondo}
                  >
                    🖨️ Imprimir
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}