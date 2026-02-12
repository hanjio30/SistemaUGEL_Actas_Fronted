/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

const API_BASE = 'https://sistemaugel-actas-backend.onrender.com/api';

export default function AtencionModule() {
  const [expedientes, setExpedientes] = useState([]);
  const [expedientesFiltrados, setExpedientesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Cargar usuario desde sessionStorage
  useEffect(() => {
    const usuarioGuardado = sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        const usuario = JSON.parse(usuarioGuardado);
        setUsuarioActual(usuario);
      } catch (error) {
        console.error('Error al parsear usuario:', error);
      }
    }
  }, []);

  // Cargar expedientes
  useEffect(() => {
    cargarExpedientes();
  }, [filtroEstado]);

  // Filtrar expedientes según búsqueda
  useEffect(() => {
    if (busqueda.trim() === '') {
      setExpedientesFiltrados(expedientes);
    } else {
      const busquedaLower = busqueda.toLowerCase();
      const filtrados = expedientes.filter(exp => {
        const numExpediente = exp.num_expediente?.toLowerCase() || '';
        const firmaRuta = exp.firma_ruta?.toLowerCase() || '';
        const solicitante = exp.solicitante?.nombre_solicitante?.toLowerCase() || '';
        const asunto = exp.asunto?.nombre_asunto?.toLowerCase() || '';
        
        return numExpediente.includes(busquedaLower) ||
               firmaRuta.includes(busquedaLower) ||
               solicitante.includes(busquedaLower) ||
               asunto.includes(busquedaLower);
      });
      setExpedientesFiltrados(filtrados);
    }
  }, [busqueda, expedientes]);

  const cargarExpedientes = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/expedientes`;
      
      // Si el filtro es vacío (Todos), excluir OBSERVADO
      if (filtroEstado === '') {
        url += `?estado_excluir=OBSERVADO`;
      } else if (filtroEstado) {
        url += `?estado=${filtroEstado}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include' // Para enviar cookies de sesión
      });
      const data = await response.json();
      setExpedientes(data);
      setExpedientesFiltrados(data);
    } catch (error) {
      console.error('Error al cargar expedientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDias = (fechaRecepcion) => {
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

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Extraer los componentes de la fecha directamente del string
    // Esto evita problemas de zona horaria
    const fechaStr = fecha.split('T')[0]; // Obtener solo YYYY-MM-DD
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const obtenerAlerta = (dias) => {
    if (dias <= 5) return { emoji: '✅', texto: 'Dentro del plazo', color: '#10b981' };
    if (dias <= 8) return { emoji: '⚠️', texto: 'Cerca del límite', color: '#f59e0b' };
    if (dias <= 10) return { emoji: '🔥', texto: 'Urgente', color: '#dc2626' };
    return { emoji: '❌', texto: 'VENCIDO', color: '#dc2626' };
  };

  const abrirModalAtencion = (expediente) => {
    setExpedienteSeleccionado(expediente);
    setEstadoSeleccionado(expediente.estado || 'EN PROCESO');
    setObservaciones(expediente.observaciones || '');
    setModalAbierto(true);
  };

  const guardarAtencion = async () => {
    if (!estadoSeleccionado) {
      alert('Debe seleccionar un estado');
      return;
    }

    // Verificar usuario
    const nombreUsuario = usuarioActual?.usuario || usuarioActual?.nombre;
    
    if (!nombreUsuario) {
      console.log('Usuario actual:', usuarioActual); // Debug
      alert('Error: No se pudo identificar el usuario. Por favor, inicie sesión nuevamente.');
      return;
    }

    try {
      setGuardando(true);
      
      // Guardar la atención en la nueva tabla
      const atencionResponse = await fetch(`${API_BASE}/atenciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Para enviar cookies de sesión
        body: JSON.stringify({
          id_expediente: expedienteSeleccionado.id_expediente,
          estado_anterior: expedienteSeleccionado.estado,
          estado_nuevo: estadoSeleccionado,
          observaciones: observaciones,
          usuario: nombreUsuario
        })
      });

      if (!atencionResponse.ok) {
        const errorData = await atencionResponse.json();
        throw new Error(errorData.error || 'Error al registrar la atención');
      }

      // Actualizar el expediente
      const expedienteResponse = await fetch(`${API_BASE}/expedientes/${expedienteSeleccionado.id_expediente}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Para enviar cookies de sesión
        body: JSON.stringify({
          estado: estadoSeleccionado,
          observaciones: observaciones
        })
      });

      if (expedienteResponse.ok) {
        alert('Expediente actualizado correctamente');
        setModalAbierto(false);
        cargarExpedientes();
      } else {
        const errorData = await expedienteResponse.json();
        alert('Error al actualizar expediente: ' + (errorData.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'RECEPCIONADO':
        return '#0ea5d7';
      case 'EN PROCESO':
        return '#f59e0b';
      case 'OBSERVADO':
        return '#dc2626';
      case 'LISTO PARA ENTREGA':
        return '#10b981';
      case 'ENTREGADO':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  // Verificar si el expediente puede ser atendido
  const puedeAtender = (estado) => {
    return estado === 'RECEPCIONADO' || estado === 'EN PROCESO';
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#083f8f', marginBottom: '16px' }}>
          📋 Atención de Expedientes
        </h1>
        
        {/* Usuario Actual */}
        {usuarioActual && (
          <div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px' }}>
            <p style={{ fontSize: '14px', color: '#083f8f' }}>
              👤 Usuario: <strong>{usuarioActual.usuario || usuarioActual.nombre}</strong>
            </p>
          </div>
        )}
        
        {/* Buscador */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por N° expediente, código, solicitante o asunto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingLeft: '40px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#083f8f'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px'
            }}>
              🔍
            </span>
          </div>
          {busqueda && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              Mostrando {expedientesFiltrados.length} de {expedientes.length} expedientes
            </p>
          )}
        </div>
        
        {/* Filtros */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFiltroEstado('')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filtroEstado === '' ? '#083f8f' : '#e5e7eb',
              color: filtroEstado === '' ? '#ffffff' : '#6b7280',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroEstado('RECEPCIONADO')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filtroEstado === 'RECEPCIONADO' ? '#0ea5d7' : '#e5e7eb',
              color: filtroEstado === 'RECEPCIONADO' ? '#ffffff' : '#6b7280',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            🔵 Recepcionados
          </button>
          <button
            onClick={() => setFiltroEstado('EN PROCESO')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filtroEstado === 'EN PROCESO' ? '#f59e0b' : '#e5e7eb',
              color: filtroEstado === 'EN PROCESO' ? '#ffffff' : '#6b7280',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            🟡 En Proceso
          </button>
          <button
            onClick={() => setFiltroEstado('LISTO PARA ENTREGA')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filtroEstado === 'LISTO PARA ENTREGA' ? '#10b981' : '#e5e7eb',
              color: filtroEstado === 'LISTO PARA ENTREGA' ? '#ffffff' : '#6b7280',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            🟢 Listos
          </button>
          <button
            onClick={() => setFiltroEstado('ENTREGADO')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filtroEstado === 'ENTREGADO' ? '#6b7280' : '#e5e7eb',
              color: filtroEstado === 'ENTREGADO' ? '#ffffff' : '#6b7280',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            ✅ Entregados
          </button>
        </div>
      </div>

      {/* Lista de expedientes */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Cargando expedientes...
        </div>
      ) : expedientesFiltrados.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', textAlign: 'center', color: '#6b7280' }}>
          {busqueda ? 
            `No se encontraron expedientes que coincidan con "${busqueda}"` :
            `No hay expedientes ${filtroEstado ? `con estado "${filtroEstado}"` : ''}`
          }
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {expedientesFiltrados.map((exp) => {
            const dias = calcularDias(exp.fecha_recepcion);
            const alerta = obtenerAlerta(dias);
            const puedeSerAtendido = puedeAtender(exp.estado);
            const esEntregado = exp.estado === 'ENTREGADO';
            
            return (
              <div
                key={exp.id_expediente}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${obtenerColorEstado(exp.estado)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#083f8f', marginBottom: '4px' }}>
                      Expediente N° {exp.num_expediente}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                      Código: {exp.firma_ruta}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: obtenerColorEstado(exp.estado) + '20',
                      color: obtenerColorEstado(exp.estado)
                    }}
                  >
                    {exp.estado}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: esEntregado ? '1fr 1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Solicitante</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#083f8f' }}>
                      {exp.solicitante?.nombre_solicitante || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Asunto</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#083f8f' }}>
                      {exp.asunto?.nombre_asunto || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Fecha Recepción</p>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>
                      {formatearFecha(exp.fecha_recepcion)}
                    </p>
                  </div>
                  
                  {/* Solo mostrar días transcurridos si NO está entregado */}
                  {!esEntregado && (
                    <div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Días Transcurridos</p>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: alerta.color }}>
                        {alerta.emoji} {dias} de 10 días - {alerta.texto}
                      </p>
                    </div>
                  )}
                </div>

                {exp.observaciones && (
                  <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                      Observaciones:
                    </p>
                    <p style={{ fontSize: '14px', color: '#78350f' }}>
                      {exp.observaciones}
                    </p>
                  </div>
                )}

                {/* Mostrar botón solo si puede ser atendido */}
                {puedeSerAtendido ? (
                  <button
                    onClick={() => abrirModalAtencion(exp)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#083f8f',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#062d6b'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#083f8f'}
                  >
                    ✏️ Atender Expediente
                  </button>
                ) : (
                  <div style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: '#f3f4f6', 
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    {esEntregado ? '✅ Expediente Entregado' : '🟢 Listo para Entrega'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Atención */}
      {modalAbierto && expedienteSeleccionado && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setModalAbierto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header del Modal */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#083f8f' }}>
                ⚙️ ATENCIÓN DE EXPEDIENTE N° {expedienteSeleccionado.num_expediente}
              </h2>
            </div>

            {/* Contenido del Modal */}
            <div style={{ padding: '24px' }}>
              {/* Evaluación del Expediente */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#083f8f', marginBottom: '12px' }}>
                  EVALUACIÓN DEL EXPEDIENTE
                </h3>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${obtenerAlerta(calcularDias(expedienteSeleccionado.fecha_recepcion)).color}`
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#78350f' }}>
                    Días transcurridos: {calcularDias(expedienteSeleccionado.fecha_recepcion)} de 10{' '}
                    {obtenerAlerta(calcularDias(expedienteSeleccionado.fecha_recepcion)).emoji}
                  </p>
                  <p style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                    {obtenerAlerta(calcularDias(expedienteSeleccionado.fecha_recepcion)).texto}
                  </p>
                </div>
              </div>

              {/* Actualizar Estado */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#083f8f', marginBottom: '12px' }}>
                  ACTUALIZAR ESTADO:
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* EN PROCESO */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      border: '2px solid',
                      borderColor: estadoSeleccionado === 'EN PROCESO' ? '#f59e0b' : '#e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: estadoSeleccionado === 'EN PROCESO' ? '#fef3c7' : '#ffffff'
                    }}
                  >
                    <input
                      type="radio"
                      name="estado"
                      value="EN PROCESO"
                      checked={estadoSeleccionado === 'EN PROCESO'}
                      onChange={(e) => setEstadoSeleccionado(e.target.value)}
                      style={{ marginTop: '2px', marginRight: '8px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>
                        🟡 EN PROCESO
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        El expediente está siendo atendido
                      </div>
                    </div>
                  </label>

                  {/* OBSERVADO */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      border: '2px solid',
                      borderColor: estadoSeleccionado === 'OBSERVADO' ? '#dc2626' : '#e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: estadoSeleccionado === 'OBSERVADO' ? '#fee2e2' : '#ffffff'
                    }}
                  >
                    <input
                      type="radio"
                      name="estado"
                      value="OBSERVADO"
                      checked={estadoSeleccionado === 'OBSERVADO'}
                      onChange={(e) => setEstadoSeleccionado(e.target.value)}
                      style={{ marginTop: '2px', marginRight: '8px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                        🔴 OBSERVADO
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Requiere correcciones o documentación adicional
                      </div>
                    </div>
                  </label>

                  {/* LISTO PARA ENTREGA */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      border: '2px solid',
                      borderColor: estadoSeleccionado === 'LISTO PARA ENTREGA' ? '#10b981' : '#e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: estadoSeleccionado === 'LISTO PARA ENTREGA' ? '#d1fae5' : '#ffffff'
                    }}
                  >
                    <input
                      type="radio"
                      name="estado"
                      value="LISTO PARA ENTREGA"
                      checked={estadoSeleccionado === 'LISTO PARA ENTREGA'}
                      onChange={(e) => setEstadoSeleccionado(e.target.value)}
                      style={{ marginTop: '2px', marginRight: '8px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>
                        🟢 LISTO PARA ENTREGA
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        El documento está terminado y listo para ser entregado
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Observaciones */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#083f8f', marginBottom: '8px' }}>
                  OBSERVACIONES:
                </h3>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ingrese observaciones adicionales sobre la atención..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  Estas observaciones se registrarán en el historial de atención
                </p>
              </div>

              {/* Info adicional */}
              <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Atendido por: <span style={{ fontWeight: '600', color: '#083f8f' }}>
                    {usuarioActual?.usuario || usuarioActual?.nombre || 'Usuario actual'}
                  </span>
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Fecha de actualización: <span style={{ fontWeight: '600', color: '#083f8f' }}>
                    {(() => {
                      const hoy = new Date();
                      const año = hoy.getFullYear();
                      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
                      const dia = String(hoy.getDate()).padStart(2, '0');
                      return formatearFecha(`${año}-${mes}-${dia}`);
                    })()}
                  </span>
                </p>
              </div>
            </div>

            {/* Footer del Modal */}
            <div
              style={{
                padding: '20px 24px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}
            >
              <button
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#6b7280',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  opacity: guardando ? 0.5 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarAtencion}
                disabled={guardando}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#083f8f',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  opacity: guardando ? 0.5 : 1
                }}
              >
                {guardando ? '⏳ Guardando...' : '💾 GUARDAR ATENCIÓN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}