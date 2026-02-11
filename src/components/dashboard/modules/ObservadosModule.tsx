/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

export default function ObservadosModule() {
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExpediente, setSelectedExpediente] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCorrecionModal, setShowCorrecionModal] = useState(false);
  const [expedienteACorregir, setExpedienteACorregir] = useState(null);
  const [notification, setNotification] = useState(null);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  // URL base de la API - AJUSTA ESTO según tu configuración
  const API_BASE_URL = 'https://sistemaugel-actas-backend.onrender.com/api'; // Cambia el puerto si es necesario

  // Cargar expedientes observados
  useEffect(() => {
    fetchExpedientesObservados();
  }, []);

  const fetchExpedientesObservados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `${API_BASE_URL}/expedientes?estado=OBSERVADO`;
      console.log('Intentando cargar desde:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Datos recibidos:', data);
      
      if (!Array.isArray(data)) {
        throw new Error('La respuesta no es un array válido');
      }
      
      const expedientesConDias = data.map(exp => ({
        ...exp,
        dias_transcurridos: calcularDiasTranscurridos(exp.fecha_recepcion)
      })).sort((a, b) => b.dias_transcurridos - a.dias_transcurridos);
      
      setExpedientes(expedientesConDias);
      setError(null);
    } catch (err) {
      console.error('Error completo:', err);
      setError(err.message);
      setExpedientes([]);
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

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Extraer los componentes de la fecha directamente del string
    // Esto evita problemas de zona horaria
    const fechaStr = fecha.split('T')[0]; // Obtener solo YYYY-MM-DD
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleVerDetalle = async (expediente) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expedientes/${expediente.id_expediente}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar detalles');
      
      const data = await response.json();
      setSelectedExpediente(data);
      setShowModal(true);
    } catch (err) {
      showNotification('Error al cargar detalles del expediente', 'error');
      console.error('Error:', err);
    }
  };

  const handleAbrirCorreccion = (expediente) => {
    setExpedienteACorregir({
      id_expediente: expediente.id_expediente,
      num_expediente: expediente.num_expediente,
      observaciones: expediente.observaciones || ''
    });
    setShowCorrecionModal(true);
  };

  const handleCorregirExpediente = async () => {
    if (!expedienteACorregir) return;

    try {
      // ✅ IMPORTANTE: Al corregir, actualizamos la fecha de recepción a HOY
      // para que los días transcurridos empiecen desde 0
      const fechaHoy = new Date().toISOString().split('T')[0]; // Formato: YYYY-MM-DD
      
      const response = await fetch(`${API_BASE_URL}/expedientes/${expedienteACorregir.id_expediente}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          estado: 'RECEPCIONADO',
          fecha_recepcion: fechaHoy, // 🔄 Reinicia la fecha para que días = 0
          observaciones: expedienteACorregir.observaciones
        })
      });

      if (!response.ok) {
        throw new Error('Error al corregir el expediente');
      }

      const data = await response.json();
      
      showNotification('✅ Expediente corregido y cambiado a RECEPCIONADO. Los días transcurridos se reiniciaron a 0.', 'success');
      setShowCorrecionModal(false);
      setExpedienteACorregir(null);
      
      // Recargar la lista
      await fetchExpedientesObservados();
    } catch (err) {
      showNotification('Error al corregir el expediente: ' + err.message, 'error');
      console.error('Error:', err);
    }
  };

  const handleNotificarVencimientos = async () => {
    const proximosVencer = expedientes.filter(exp => exp.dias_transcurridos >= 8);
    
    if (proximosVencer.length === 0) {
      showNotification('No hay expedientes próximos a vencer', 'warning');
      return;
    }
    
    setSendingNotifications(true);
    
    try {
      // Aquí puedes implementar el envío real de notificaciones
      // Por ejemplo, llamar a un endpoint de tu API que envíe emails o notificaciones push
      
      // Simulación de envío (reemplaza con tu lógica real)
      const response = await fetch(`${API_BASE_URL}/notificaciones/vencimientos`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expedientes: proximosVencer.map(exp => ({
            id: exp.id_expediente,
            num_expediente: exp.num_expediente,
            dias: exp.dias_transcurridos,
            solicitante: exp.solicitante?.nombre_solicitante,
            observaciones: exp.observaciones
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar notificaciones');
      }

      showNotification(
        `✅ Notificaciones enviadas para ${proximosVencer.length} expediente(s) próximo(s) a vencer`,
        'success'
      );
    } catch (err) {
      // Si el endpoint no existe aún, mostrar mensaje informativo
      console.log('Expedientes a notificar:', proximosVencer);
      showNotification(
        `📧 Se notificaría a los administradores sobre ${proximosVencer.length} expediente(s) próximo(s) a vencer. (Endpoint de notificaciones pendiente)`,
        'warning'
      );
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleExportarLista = async () => {
    if (expedientes.length === 0) {
      showNotification('No hay expedientes para exportar', 'warning');
      return;
    }
    
    try {
      showNotification('Generando archivo Excel...', 'success');
      
      // Llamar al endpoint de Laravel que genera el Excel
      const response = await fetch(`${API_BASE_URL}/expedientes/exportar-observados`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel');
      }

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear URL temporal y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expedientes_observados_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showNotification('✅ Archivo Excel descargado correctamente', 'success');
    } catch (err) {
      showNotification('Error al exportar la lista: ' + err.message, 'error');
      console.error('Error:', err);
    }
  };

  const showNotification = (mensaje, tipo) => {
    setNotification({ mensaje, tipo });
    setTimeout(() => setNotification(null), 4000);
  };

  const proximosVencer = expedientes.filter(exp => exp.dias_transcurridos >= 8).length;

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '15px'
          }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Cargando expedientes observados...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', margin: '20px' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee2e2', 
          color: '#dc2626',
          borderRadius: '8px',
          border: '2px solid #dc2626'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
            ❌ Error al cargar datos
          </div>
          <div style={{ marginBottom: '15px' }}>{error}</div>
          <button
            onClick={fetchExpedientesObservados}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔄 Reintentar
          </button>
        </div>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '20px', 
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <strong>💡 Verifica lo siguiente:</strong>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li><strong>Servidor Laravel:</strong> Asegúrate que esté corriendo (php artisan serve)</li>
            <li><strong>URL de API:</strong> Verifica que <code style={{ 
              backgroundColor: '#ffffff', 
              padding: '2px 6px', 
              borderRadius: '3px',
              fontFamily: 'monospace'
            }}>{API_BASE_URL}</code> sea correcta</li>
            <li><strong>Ruta en Laravel:</strong> Verifica que exista <code style={{ 
              backgroundColor: '#ffffff', 
              padding: '2px 6px', 
              borderRadius: '3px',
              fontFamily: 'monospace'
            }}>Route::get('/api/expedientes', ...)</code></li>
            <li><strong>Base de datos:</strong> Debe haber expedientes con estado "OBSERVADO"</li>
            <li><strong>CORS:</strong> Si el error persiste, puede ser un problema de CORS</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Notificaciones */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '15px 25px',
          backgroundColor: notification.tipo === 'success' ? '#10b981' : 
                          notification.tipo === 'error' ? '#dc2626' : '#f59e0b',
          color: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: '1000',
          maxWidth: '400px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>
              {notification.tipo === 'success' ? '✅' : 
               notification.tipo === 'error' ? '❌' : '⚠️'}
            </span>
            <div>{notification.mensaje}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '25px', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '32px' }}>🔴</span>
            <h2 style={{ 
              margin: '0', 
              fontSize: '28px', 
              fontWeight: 'bold',
              color: '#083f8f'
            }}>
              EXPEDIENTES OBSERVADOS
            </h2>
          </div>
          
          <button
            onClick={fetchExpedientesObservados}
            style={{
              padding: '10px 15px',
              backgroundColor: '#0ea5d7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔄 Actualizar
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '15px'
        }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#eff6ff', 
            borderRadius: '8px',
            border: '2px solid #083f8f'
          }}>
            <div style={{ 
              color: '#083f8f', 
              fontSize: '14px', 
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              Total observados
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: '#083f8f' 
            }}>
              {expedientes.length}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
              {expedientes.length === 1 ? 'expediente' : 'expedientes'}
            </div>
          </div>

          <div style={{ 
            padding: '20px', 
            backgroundColor: proximosVencer > 0 ? '#fef3c7' : '#f3f4f6', 
            borderRadius: '8px',
            border: proximosVencer > 0 ? '2px solid #f59e0b' : '2px solid #e5e7eb'
          }}>
            <div style={{ 
              color: proximosVencer > 0 ? '#92400e' : '#6b7280', 
              fontSize: '14px', 
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              ⚠️ Próximos a vencer
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: proximosVencer > 0 ? '#f59e0b' : '#6b7280'
            }}>
              {proximosVencer}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
              {proximosVencer === 1 ? 'expediente urgente' : 'expedientes urgentes'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de expedientes */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {expedientes.length === 0 ? (
          <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            color: '#6b7280' 
          }}>
            <div style={{ fontSize: '64px', marginBottom: '15px' }}>✅</div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold',
              color: '#083f8f',
              marginBottom: '8px'
            }}>
              ¡Excelente trabajo!
            </div>
            <div style={{ fontSize: '16px' }}>
              No hay expedientes observados en este momento
            </div>
            <div style={{ fontSize: '14px', marginTop: '5px', color: '#9ca3af' }}>
              Todos los expedientes están en orden
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#083f8f', color: '#ffffff' }}>
                  <th style={{ 
                    padding: '15px 12px', 
                    textAlign: 'left', 
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    N° Expediente
                  </th>
                  <th style={{ 
                    padding: '15px 12px', 
                    textAlign: 'left', 
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    Solicitante
                  </th>
                  <th style={{ 
                    padding: '15px 12px', 
                    textAlign: 'left', 
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    Observación
                  </th>
                  <th style={{ 
                    padding: '15px 12px', 
                    textAlign: 'center', 
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    Días
                  </th>
                  <th style={{ 
                    padding: '15px 12px', 
                    textAlign: 'center', 
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {expedientes.map((exp, index) => (
                  <tr 
                    key={exp.id_expediente}
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                    }}
                  >
                    <td style={{ 
                      padding: '15px 12px', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      color: '#083f8f'
                    }}>
                      {exp.num_expediente}
                    </td>
                    <td style={{ padding: '15px 12px', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500', color: '#111827' }}>
                        {exp.solicitante?.nombre_solicitante?.substring(0, 25) || 'Sin nombre'}
                        {exp.solicitante?.nombre_solicitante?.length > 25 && '...'}
                      </div>
                      {/* Mostrar DNI si existe (persona natural) */}
                      {exp.solicitante?.dni && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          marginTop: '3px'
                        }}>
                          DNI: {exp.solicitante.dni}
                        </div>
                      )}
                      {/* Mostrar Código Modular si existe (institución) */}
                      {exp.solicitante?.codigo_modular && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          marginTop: '3px'
                        }}>
                          Código: {exp.solicitante.codigo_modular}
                        </div>
                      )}
                      {/* Mostrar tipo de solicitante */}
                      {exp.solicitante?.nombre_tipo && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#9ca3af',
                          marginTop: '2px',
                          fontStyle: 'italic'
                        }}>
                          {exp.solicitante.nombre_tipo}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '15px 12px', fontSize: '14px', color: '#4b5563' }}>
                      {exp.observaciones?.substring(0, 30) || 'Sin observación'}
                      {exp.observaciones?.length > 30 && '...'}
                    </td>
                    <td style={{ 
                      padding: '15px 12px', 
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        backgroundColor: exp.dias_transcurridos >= 10 ? '#fee2e2' :
                                       exp.dias_transcurridos >= 8 ? '#fef3c7' : '#f3f4f6',
                        color: exp.dias_transcurridos >= 10 ? '#dc2626' :
                               exp.dias_transcurridos >= 8 ? '#f59e0b' : '#6b7280'
                      }}>
                        {exp.dias_transcurridos}/10
                      </div>
                    </td>
                    <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleVerDetalle(exp)}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#0ea5d7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold'
                          }}
                        >
                          👁️ Ver
                        </button>
                        <button
                          onClick={() => handleAbrirCorreccion(exp)}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✅ Corregir
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

      {/* Botones de acción */}
      <div style={{ 
        marginTop: '20px', 
        display: 'flex', 
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleExportarLista}
          disabled={expedientes.length === 0}
          style={{
            padding: '14px 24px',
            backgroundColor: expedientes.length === 0 ? '#d1d5db' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: expedientes.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            boxShadow: expedientes.length > 0 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          📊 Exportar a Excel
        </button>

        <button
          onClick={handleNotificarVencimientos}
          disabled={proximosVencer === 0 || sendingNotifications}
          style={{
            padding: '14px 24px',
            backgroundColor: proximosVencer === 0 ? '#d1d5db' : '#f59e0b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: proximosVencer === 0 || sendingNotifications ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            boxShadow: proximosVencer > 0 && !sendingNotifications ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          {sendingNotifications ? '⏳ Enviando...' : `🔔 Notificar Vencimientos (${proximosVencer})`}
        </button>
      </div>

      {/* Modal de detalles */}
      {showModal && selectedExpediente && (
        <div 
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999',
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: '0', 
                color: '#083f8f',
                fontSize: '22px',
                fontWeight: 'bold'
              }}>
                📄 Detalle del Expediente
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: '1',
                  padding: '0',
                  width: '32px',
                  height: '32px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#083f8f', 
                marginBottom: '6px',
                fontSize: '13px',
                textTransform: 'uppercase'
              }}>
                N° Expediente:
              </div>
              <div style={{ 
                color: '#111827',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {selectedExpediente.num_expediente}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#083f8f', 
                marginBottom: '6px',
                fontSize: '13px',
                textTransform: 'uppercase'
              }}>
                Firma de Ruta:
              </div>
              <div style={{ 
                color: '#111827', 
                fontFamily: 'monospace',
                fontSize: '14px',
                backgroundColor: '#f3f4f6',
                padding: '8px 12px',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                {selectedExpediente.firma_ruta}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#083f8f', 
                marginBottom: '6px',
                fontSize: '13px',
                textTransform: 'uppercase'
              }}>
                Solicitante:
              </div>
              <div style={{ color: '#111827', fontSize: '15px', fontWeight: '500' }}>
                {selectedExpediente.solicitante?.nombre_solicitante || 'No especificado'}
              </div>
              {selectedExpediente.solicitante?.dni && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '3px' }}>
                  DNI: {selectedExpediente.solicitante.dni}
                </div>
              )}
              {selectedExpediente.solicitante?.codigo_modular && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '3px' }}>
                  Código Modular: {selectedExpediente.solicitante.codigo_modular}
                </div>
              )}
              {selectedExpediente.solicitante?.nombre_tipo && (
                <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px', fontStyle: 'italic' }}>
                  Tipo: {selectedExpediente.solicitante.nombre_tipo}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#083f8f', 
                marginBottom: '6px',
                fontSize: '13px',
                textTransform: 'uppercase'
              }}>
                Asunto:
              </div>
              <div style={{ color: '#111827', fontSize: '15px' }}>
                {selectedExpediente.asunto?.nombre_asunto || 'No especificado'}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#083f8f', 
                marginBottom: '6px',
                fontSize: '13px',
                textTransform: 'uppercase'
              }}>
                Fecha de Recepción:
              </div>
              <div style={{ color: '#111827', fontSize: '15px' }}>
                {formatearFecha(selectedExpediente.fecha_recepcion)}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#083f8f', 
                marginBottom: '8px',
                fontSize: '13px',
                textTransform: 'uppercase'
              }}>
                Observaciones:
              </div>
              <div style={{ 
                color: '#111827',
                padding: '15px',
                backgroundColor: '#fef3c7',
                borderRadius: '6px',
                minHeight: '80px',
                fontSize: '14px',
                lineHeight: '1.6',
                border: '2px solid #f59e0b'
              }}>
                {selectedExpediente.observaciones || 'Sin observaciones registradas'}
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#083f8f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 'bold'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Corrección */}
      {showCorrecionModal && expedienteACorregir && (
        <div 
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999',
            padding: '20px'
          }}
          onClick={() => setShowCorrecionModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '550px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: '0', 
                color: '#10b981',
                fontSize: '22px',
                fontWeight: 'bold'
              }}>
                ✅ Corregir Expediente
              </h3>
              <button
                onClick={() => setShowCorrecionModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: '1',
                  padding: '0',
                  width: '32px',
                  height: '32px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ 
              backgroundColor: '#d1fae5', 
              padding: '15px', 
              borderRadius: '8px',
              marginBottom: '20px',
              border: '2px solid #10b981'
            }}>
              <div style={{ fontSize: '14px', color: '#065f46', lineHeight: '1.6' }}>
                <strong>📝 Expediente:</strong> {expedienteACorregir.num_expediente}
              </div>
              <div style={{ fontSize: '14px', color: '#065f46', lineHeight: '1.6', marginTop: '8px' }}>
                <strong>🔄 Acción:</strong> El estado cambiará a <strong>"RECEPCIONADO"</strong> y los <strong>días transcurridos se reiniciarán a 0</strong>.
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block',
                fontWeight: 'bold', 
                color: '#083f8f', 
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                Observaciones (opcional):
              </label>
              <textarea
                value={expedienteACorregir.observaciones}
                onChange={(e) => setExpedienteACorregir({
                  ...expedienteACorregir,
                  observaciones: e.target.value
                })}
                placeholder="Escribe cualquier nota adicional sobre la corrección..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '10px',
              marginTop: '25px'
            }}>
              <button
                onClick={() => setShowCorrecionModal(false)}
                style={{
                  flex: '1',
                  padding: '14px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCorregirExpediente}
                style={{
                  flex: '1',
                  padding: '14px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold'
                }}
              >
                ✅ Confirmar Corrección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}