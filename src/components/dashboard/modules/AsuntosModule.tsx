/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

export default function AsuntosModule() {
  const [documentos, setDocumentos] = useState([]);
  const [asuntos, setAsuntos] = useState([]);
  const [asuntosFiltrados, setAsuntosFiltrados] = useState([]);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'activos', 'inactivos'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre_asunto: '',
    documento_id: '',
    activo: true
  });

  // Configuración de la API - ajustar según tu configuración de Laravel
  const API_BASE = import.meta.env.PUBLIC_API_URL || 'https://sistemaugel-actas-backend.onrender.com/api';

  // Cargar documentos al montar el componente
  useEffect(() => {
    cargarDocumentos();
  }, []);

  // Cargar asuntos cuando cambia el documento seleccionado
  useEffect(() => {
    if (documentoSeleccionado) {
      cargarAsuntos(documentoSeleccionado.id_documento);
    }
  }, [documentoSeleccionado]);

  // Filtrar asuntos según el estado seleccionado
  useEffect(() => {
    if (filtroEstado === 'todos') {
      setAsuntosFiltrados(asuntos);
    } else if (filtroEstado === 'activos') {
      setAsuntosFiltrados(asuntos.filter(a => a.activo));
    } else if (filtroEstado === 'inactivos') {
      setAsuntosFiltrados(asuntos.filter(a => !a.activo));
    }
  }, [asuntos, filtroEstado]);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando documentos desde:', `${API_BASE}/documentos`);
      
      const response = await fetch(`${API_BASE}/documentos`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Si usas cookies para auth
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Documentos cargados:', data);
      setDocumentos(data);
      
      // Seleccionar el primer documento por defecto (Solicitud)
      if (data.length > 0) {
        setDocumentoSeleccionado(data[0]);
      }
    } catch (err) {
      const errorMsg = `Error al cargar documentos: ${err.message}. Verifica que la API esté corriendo en ${API_BASE}`;
      setError(errorMsg);
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarAsuntos = async (documentoId) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando asuntos para documento:', documentoId);
      
      // Traer TODOS los asuntos (activos e inactivos) - removemos el filtro activo=true
      const response = await fetch(`${API_BASE}/asuntos?documento_id=${documentoId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Asuntos cargados:', data);
      setAsuntos(data);
    } catch (err) {
      const errorMsg = `Error al cargar asuntos: ${err.message}`;
      setError(errorMsg);
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (asunto = null) => {
    if (asunto) {
      setEditando(asunto);
      setFormData({
        nombre_asunto: asunto.nombre_asunto,
        documento_id: asunto.documento_id,
        activo: asunto.activo
      });
    } else {
      setEditando(null);
      setFormData({
        nombre_asunto: '',
        documento_id: documentoSeleccionado?.id_documento || '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(null);
    setFormData({
      nombre_asunto: '',
      documento_id: '',
      activo: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_asunto.trim()) {
      setError('El nombre del asunto es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = editando 
        ? `${API_BASE}/asuntos/${editando.id_asunto}`
        : `${API_BASE}/asuntos`;
      
      const method = editando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el asunto');
      }

      await cargarAsuntos(documentoSeleccionado.id_documento);
      cerrarModal();
    } catch (err) {
      setError(err.message || 'Error al guardar el asunto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminar = (asunto) => {
    setShowDeleteConfirm(asunto);
  };

  const eliminarAsunto = async () => {
    if (!showDeleteConfirm) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/asuntos/${showDeleteConfirm.id_asunto}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el asunto');
      }

      await cargarAsuntos(documentoSeleccionado.id_documento);
      setShowDeleteConfirm(null);
    } catch (err) {
      setError('Error al eliminar el asunto. Puede que esté siendo usado en expedientes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstadoAsunto = async (asunto) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/asuntos/${asunto.id_asunto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...asunto,
          activo: !asunto.activo
        })
      });

      if (!response.ok) {
        throw new Error('Error al cambiar el estado');
      }

      await cargarAsuntos(documentoSeleccionado.id_documento);
    } catch (err) {
      setError('Error al cambiar el estado del asunto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular estadísticas
  const calcularEstadisticas = () => {
    const total = asuntos.length;
    const activos = asuntos.filter(a => a.activo).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  };

  const estadisticas = calcularEstadisticas();

  return (
    <div style={{
      backgroundColor: '#f3f4f6',
      minHeight: '100vh',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '28px' }}>📋</span>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#083f8f',
              margin: '0'
            }}>
              GESTIÓN DE ASUNTOS
            </h1>
          </div>
          <p style={{
            color: '#6b7280',
            margin: '0',
            fontSize: '15px'
          }}>
            Administra los tipos de asuntos disponibles para cada tipo de documento
          </p>
        </div>

        {/* Selector de Tipo de Documento */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '700',
            color: '#083f8f',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📄 Tipo de Documento:
          </label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {documentos.map((doc) => (
              <label
                key={doc.id_documento}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: documentoSeleccionado?.id_documento === doc.id_documento ? '#083f8f' : '#6b7280',
                  backgroundColor: documentoSeleccionado?.id_documento === doc.id_documento ? '#e0f2fe' : '#f9fafb',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: documentoSeleccionado?.id_documento === doc.id_documento ? '2px solid #0ea5d7' : '2px solid #e5e7eb',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="radio"
                  name="tipo_documento"
                  checked={documentoSeleccionado?.id_documento === doc.id_documento}
                  onChange={() => setDocumentoSeleccionado(doc)}
                  style={{ 
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px'
                  }}
                />
                <span>{doc.nombre_tipo}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Barra de Estadísticas */}
        {documentoSeleccionado && asuntos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Total */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #083f8f'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Total Asuntos
                  </p>
                  <p style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#083f8f',
                    margin: '0'
                  }}>
                    {estadisticas.total}
                  </p>
                </div>
                <span style={{ fontSize: '40px' }}>📊</span>
              </div>
            </div>

            {/* Activos */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #10b981'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Activos
                  </p>
                  <p style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#10b981',
                    margin: '0'
                  }}>
                    {estadisticas.activos}
                  </p>
                </div>
                <span style={{ fontSize: '40px' }}>✅</span>
              </div>
            </div>

            {/* Inactivos */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #dc2626'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Inactivos
                  </p>
                  <p style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#dc2626',
                    margin: '0'
                  }}>
                    {estadisticas.inactivos}
                  </p>
                </div>
                <span style={{ fontSize: '40px' }}>❌</span>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #dc2626',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            color: '#dc2626',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Controles: Filtros y Botón Nuevo */}
        {documentoSeleccionado && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {/* Filtros de Estado */}
            <div style={{
              display: 'flex',
              gap: '8px',
              backgroundColor: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <button
                onClick={() => setFiltroEstado('todos')}
                style={{
                  backgroundColor: filtroEstado === 'todos' ? '#083f8f' : 'transparent',
                  color: filtroEstado === 'todos' ? '#ffffff' : '#6b7280',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📊 Todos ({estadisticas.total})
              </button>
              <button
                onClick={() => setFiltroEstado('activos')}
                style={{
                  backgroundColor: filtroEstado === 'activos' ? '#10b981' : 'transparent',
                  color: filtroEstado === 'activos' ? '#ffffff' : '#6b7280',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ✅ Activos ({estadisticas.activos})
              </button>
              <button
                onClick={() => setFiltroEstado('inactivos')}
                style={{
                  backgroundColor: filtroEstado === 'inactivos' ? '#dc2626' : 'transparent',
                  color: filtroEstado === 'inactivos' ? '#ffffff' : '#6b7280',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ❌ Inactivos ({estadisticas.inactivos})
              </button>
            </div>

            {/* Botón Nuevo Asunto */}
            <button
              onClick={() => abrirModal()}
              disabled={loading}
              style={{
                backgroundColor: '#0ea5d7',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: loading ? '0.5' : '1',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '18px' }}>➕</span>
              Nuevo Asunto
            </button>
          </div>
        )}

        {/* Tabla de Asuntos */}
        {documentoSeleccionado && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Header de la tabla */}
            <div style={{
              padding: '24px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#083f8f',
                margin: '0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📑 Asuntos de {documentoSeleccionado.nombre_tipo}
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#6b7280',
                margin: '8px 0 0 0'
              }}>
                Mostrando {asuntosFiltrados.length} de {asuntos.length} asuntos
              </p>
            </div>

            {loading && asuntos.length === 0 ? (
              <div style={{
                padding: '60px 40px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '15px'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px'
                }}>
                  ⏳
                </div>
                Cargando asuntos...
              </div>
            ) : asuntosFiltrados.length === 0 ? (
              <div style={{
                padding: '60px 40px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '15px'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px'
                }}>
                  📭
                </div>
                {filtroEstado === 'todos' 
                  ? 'No hay asuntos registrados para este tipo de documento'
                  : filtroEstado === 'activos'
                  ? 'No hay asuntos activos'
                  : 'No hay asuntos inactivos'}
              </div>
            ) : (
              <div style={{ 
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: '600px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead style={{
                    position: 'sticky',
                    top: '0',
                    backgroundColor: '#f9fafb',
                    zIndex: '10'
                  }}>
                    <tr>
                      <th style={{
                        padding: '16px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#083f8f',
                        textTransform: 'uppercase',
                        borderBottom: '2px solid #083f8f',
                        letterSpacing: '0.5px'
                      }}>
                        Nombre del Asunto
                      </th>
                      <th style={{
                        padding: '16px 24px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#083f8f',
                        textTransform: 'uppercase',
                        borderBottom: '2px solid #083f8f',
                        width: '150px',
                        letterSpacing: '0.5px'
                      }}>
                        Estado
                      </th>
                      <th style={{
                        padding: '16px 24px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#083f8f',
                        textTransform: 'uppercase',
                        borderBottom: '2px solid #083f8f',
                        width: '180px',
                        letterSpacing: '0.5px'
                      }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {asuntosFiltrados.map((asunto, index) => (
                      <tr
                        key={asunto.id_asunto}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                          transition: 'all 0.2s'
                        }}
                      >
                        <td style={{
                          padding: '20px 24px',
                          fontSize: '15px',
                          color: '#083f8f',
                          fontWeight: '600'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <span style={{ 
                              fontSize: '18px',
                              opacity: asunto.activo ? '1' : '0.4'
                            }}>
                              📄
                            </span>
                            <span style={{
                              opacity: asunto.activo ? '1' : '0.5'
                            }}>
                              {asunto.nombre_asunto}
                            </span>
                          </div>
                        </td>
                        <td style={{
                          padding: '20px 24px',
                          textAlign: 'center'
                        }}>
                          <button
                            onClick={() => cambiarEstadoAsunto(asunto)}
                            disabled={loading}
                            style={{
                              backgroundColor: asunto.activo ? '#d1fae5' : '#fee2e2',
                              color: asunto.activo ? '#10b981' : '#dc2626',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                            title="Click para cambiar estado"
                          >
                            <span>{asunto.activo ? '✅' : '❌'}</span>
                            {asunto.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td style={{
                          padding: '20px 24px',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center'
                          }}>
                            <button
                              onClick={() => abrirModal(asunto)}
                              disabled={loading}
                              style={{
                                backgroundColor: '#0ea5d7',
                                color: '#ffffff',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="Editar asunto"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => confirmarEliminar(asunto)}
                              disabled={loading}
                              style={{
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="Eliminar asunto"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal de Crear/Editar Asunto */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <span style={{ fontSize: '24px' }}>➕</span>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#083f8f',
                  margin: '0'
                }}>
                  {editando ? 'EDITAR ASUNTO' : 'NUEVO ASUNTO'}
                </h2>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#083f8f',
                    marginBottom: '8px'
                  }}>
                    Tipo Documento:
                  </label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {documentos.map((doc) => (
                      <label
                        key={doc.id_documento}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#083f8f'
                        }}
                      >
                        <input
                          type="radio"
                          name="documento_modal"
                          checked={formData.documento_id === doc.id_documento}
                          onChange={() => setFormData({ ...formData, documento_id: doc.id_documento })}
                          style={{ cursor: 'pointer' }}
                        />
                        {doc.nombre_tipo}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#083f8f',
                    marginBottom: '8px'
                  }}>
                    Nombre del Asunto:
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_asunto}
                    onChange={(e) => setFormData({ ...formData, nombre_asunto: e.target.value })}
                    placeholder="Ingrese el nombre del asunto"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#083f8f',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#083f8f',
                    marginBottom: '8px'
                  }}>
                    Estado:
                  </label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#083f8f'
                    }}>
                      <input
                        type="radio"
                        checked={formData.activo === true}
                        onChange={() => setFormData({ ...formData, activo: true })}
                        style={{ cursor: 'pointer' }}
                      />
                      Activo
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#083f8f'
                    }}>
                      <input
                        type="radio"
                        checked={formData.activo === false}
                        onChange={() => setFormData({ ...formData, activo: false })}
                        style={{ cursor: 'pointer' }}
                      />
                      Inactivo
                    </label>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    disabled={loading}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#6b7280',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>💾</span>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '32px' }}>⚠️</span>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#dc2626',
                  margin: '0'
                }}>
                  Confirmar Eliminación
                </h2>
              </div>

              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '8px',
                lineHeight: '1.6'
              }}>
                ¿Está seguro que desea eliminar el asunto:
              </p>
              <p style={{
                fontSize: '16px',
                color: '#083f8f',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                "{showDeleteConfirm.nombre_asunto}"?
              </p>
              <p style={{
                fontSize: '13px',
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '24px',
                lineHeight: '1.5'
              }}>
                ⚠️ Esta acción no se puede deshacer. Si hay expedientes que usan este asunto, la eliminación puede fallar.
              </p>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={loading}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#6b7280',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarAsunto}
                  disabled={loading}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}