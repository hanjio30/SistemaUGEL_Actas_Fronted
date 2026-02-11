/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';
let solicitante;

export default function RecepcionModule() {
  // Estados principales
  const [tipoSolicitante, setTipoSolicitante] = useState('Natural');
  const [tipoDocumento, setTipoDocumento] = useState('Solicitud');
  
  // Estados para solicitante
  const [dniRuc, setDniRuc] = useState('');
  const [nombreSolicitante, setNombreSolicitante] = useState('');
  const [emailSolicitante, setEmailSolicitante] = useState('');
  const [telefonoSolicitante, setTelefonoSolicitante] = useState('');
  const [nombreIE, setNombreIE] = useState('');
  const [solicitanteEncontrado, setSolicitanteEncontrado] = useState(false);
  
  // Estados para documento
  const [asuntoId, setAsuntoId] = useState('');
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [receptorDocumento, setReceptorDocumento] = useState('');
  const [fechaRecepcion, setFechaRecepcion] = useState('');
  
  // Estados de datos
  const [asuntos, setAsuntos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados de confirmación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [expedienteCreado, setExpedienteCreado] = useState(null);
  const [mostrarCargo, setMostrarCargo] = useState(false);
  
  // Modal de nuevo solicitante
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');

  // Configuración de API
  const API_URL = 'https://sistemaugel-actas-backend.onrender.com/api';

  // Inicializar fecha actual
  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setFechaRecepcion(hoy);
  }, []);

  // Cargar asuntos según tipo de documento
  useEffect(() => {
    cargarAsuntos();
  }, [tipoDocumento]);

  const cargarAsuntos = async () => {
    try {
      const documentoId = tipoDocumento === 'Solicitud' ? 1 : 2;
      const response = await fetch(`${API_URL}/asuntos?documento_id=${documentoId}`);
      const data = await response.json();
      
      // Filtrar solo asuntos activos
      const asuntosActivos = data.filter(asunto => asunto.activo === true);
      
      setAsuntos(asuntosActivos);
      if (asuntosActivos.length > 0) {
        setAsuntoId(asuntosActivos[0].id_asunto.toString());
      } else {
        setAsuntoId('');
      }
    } catch (err) {
      setError('Error al cargar asuntos');
    }
  };

  const buscarSolicitante = async () => {
    if (!dniRuc) {
      setError('Ingrese DNI o Código Modular/RUC');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const campo = tipoSolicitante === 'Natural' ? 'dni' : 'codigo_modular';
      const response = await fetch(`${API_URL}/solicitantes?${campo}=${dniRuc}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const solicitante = data[0];
          setNombreSolicitante(solicitante.nombre_solicitante || '');
          setEmailSolicitante(solicitante.email || '');
          setTelefonoSolicitante(solicitante.telefono || '');
          if (tipoSolicitante === 'Jurídica') {
            setNombreIE(solicitante.nombre_solicitante || '');
          }
          setSolicitanteEncontrado(true);
          setSuccess('✓ Solicitante encontrado');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Solicitante no encontrado. Use el botón "Nuevo" para registrarlo.');
          setTimeout(() => setError(''), 4000);
          limpiarDatosSolicitante();
        }
      } else {
        setError('Solicitante no encontrado. Use el botón "Nuevo" para registrarlo.');
        setTimeout(() => setError(''), 4000);
        limpiarDatosSolicitante();
      }
    } catch (err) {
      setError('Error al buscar solicitante');
      setTimeout(() => setError(''), 3000);
      limpiarDatosSolicitante();
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNuevo = () => {
    if (!dniRuc) {
      setError('Ingrese DNI o Código Modular primero');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setNuevoNombre('');
    setNuevoEmail('');
    setNuevoTelefono('');
    setMostrarModalNuevo(true);
  };

  const guardarNuevoSolicitante = async () => {
    if (!nuevoNombre.trim()) {
      setError('Ingrese el nombre del solicitante');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Primero verificar si ya existe un solicitante con ese DNI o código modular
      const campo = tipoSolicitante === 'Natural' ? 'dni' : 'codigo_modular';
      const checkResponse = await fetch(`${API_URL}/solicitantes?${campo}=${dniRuc}`);
      
      if (checkResponse.ok) {
        const existente = await checkResponse.json();
        if (existente && existente.length > 0) {
          // Ya existe un solicitante con ese DNI/código
          const solicitanteExistente = existente[0];
          setError(`⚠️ Este ${tipoSolicitante === 'Natural' ? 'DNI' : 'código modular'} ya está registrado a nombre de: "${solicitanteExistente.nombre_solicitante}". Use el botón Buscar para cargarlo.`);
          setTimeout(() => setError(''), 6000);
          setLoading(false);
          return;
        }
      }

      // Si no existe, proceder con el registro
      const solicitanteData = {
        nombre_solicitante: nuevoNombre.trim(),
        nombre_tipo: tipoSolicitante === 'Natural' ? 'Natural' : 'Jurídica',
        ...(tipoSolicitante === 'Natural' ? { dni: dniRuc } : { codigo_modular: dniRuc }),
        email: nuevoEmail.trim(),
        telefono: nuevoTelefono.trim()
      };

      const response = await fetch(`${API_URL}/solicitantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitanteData)
      });

      if (response.ok) {
        const solicitante = await response.json();
        setNombreSolicitante(solicitante.nombre_solicitante);
        setEmailSolicitante(solicitante.email || '');
        setTelefonoSolicitante(solicitante.telefono || '');
        if (tipoSolicitante === 'Jurídica') {
          setNombreIE(solicitante.nombre_solicitante);
        }
        setSolicitanteEncontrado(true);
        setSuccess('✓ Solicitante registrado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
        setMostrarModalNuevo(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Error al registrar solicitante');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Error al guardar solicitante: ' + err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const limpiarDatosSolicitante = () => {
    setNombreSolicitante('');
    setEmailSolicitante('');
    setTelefonoSolicitante('');
    setNombreIE('');
    setSolicitanteEncontrado(false);
  };

  const registrarExpediente = async () => {
    // Validaciones
    if (!dniRuc || !nombreSolicitante) {
      setError('Complete los datos del solicitante');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!asuntoId || !receptorDocumento) {
      setError('Complete todos los campos requeridos');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Crear o obtener solicitante
      const solicitanteData = {
        nombre_solicitante: tipoSolicitante === 'Natural' ? nombreSolicitante : nombreIE,
        nombre_tipo: tipoSolicitante === 'Natural' ? 'Natural' : 'Jurídica',
        ...(tipoSolicitante === 'Natural' ? { dni: dniRuc } : { codigo_modular: dniRuc }),
        email: emailSolicitante,
        telefono: telefonoSolicitante
      };

      if (solicitanteEncontrado) {
  // YA EXISTE → solo usar sus datos
  const response = await fetch(
    `${API_URL}/solicitantes?${tipoSolicitante === 'Natural' ? 'dni' : 'codigo_modular'}=${dniRuc}`
  );
  const data = await response.json();
  solicitante = data[0];
} else {
  // NO EXISTE → crear
  const response = await fetch(`${API_URL}/solicitantes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(solicitanteData)
  });

  if (!response.ok) {
    throw new Error('No se pudo registrar el solicitante');
  }

  solicitante = await response.json();
}

      // 2. Crear expediente
      const expedienteData = {
        solicitante_id: solicitante.id_solicitante,
        asunto_id: parseInt(asuntoId),
        fecha_recepcion: fechaRecepcion,
        receptor: receptorDocumento,
        nombre_documento: nombreDocumento || 'FUT',
        tipo_documento: tipoDocumento
      };

      const expedienteResponse = await fetch(`${API_URL}/expedientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expedienteData)
      });

      const expediente = await expedienteResponse.json();

      // Calcular fecha límite (10 días hábiles)
      const fechaLimite = calcularFechaLimite(new Date(fechaRecepcion), 10);

      setExpedienteCreado({
        ...expediente,
        solicitante: solicitante,
        asunto_nombre: asuntos.find(a => a.id_asunto === parseInt(asuntoId))?.nombre_asunto,
        fecha_limite: fechaLimite,
        receptor: receptorDocumento
      });

      setMostrarConfirmacion(true);
      limpiarFormulario();
    } catch (err) {
      setError('Error al registrar expediente: ' + err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const calcularFechaLimite = (fechaInicio, diasHabiles) => {
    let fecha = new Date(fechaInicio);
    let diasAgregados = 0;

    while (diasAgregados < diasHabiles) {
      fecha.setDate(fecha.getDate() + 1);
      const diaSemana = fecha.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAgregados++;
      }
    }

    return fecha.toLocaleDateString('es-PE');
  };

  const limpiarFormulario = () => {
    setDniRuc('');
    setNombreSolicitante('');
    setEmailSolicitante('');
    setTelefonoSolicitante('');
    setNombreIE('');
    setNombreDocumento('');
    setReceptorDocumento('');
    setSolicitanteEncontrado(false);
    setError('');
    setSuccess('');
  };

  const imprimirCargo = () => {
    setMostrarCargo(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const cerrarConfirmacion = () => {
    setMostrarConfirmacion(false);
    setExpedienteCreado(null);
    setMostrarCargo(false);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Header Mejorado */}
      <div style={{ background: 'linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%)', borderRadius: '12px', padding: '28px 32px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '32px' }}>📥</span>
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }}>
              NUEVO EXPEDIENTE - RECEPCIÓN
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0 0', fontWeight: '400' }}>
              Sistema de Gestión de Expedientes - UGEL Santa
            </p>
          </div>
        </div>
      </div>

      {/* Formulario Principal Mejorado */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '36px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', border: '1px solid #e2e8f0' }}>
        
        {/* Tipo de Solicitante */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '15px', fontWeight: '700', color: '#083f8f', marginBottom: '14px', letterSpacing: '0.3px' }}>
            TIPO DE SOLICITANTE
          </label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 20px', borderRadius: '10px', border: tipoSolicitante === 'Natural' ? '2px solid #083f8f' : '2px solid #e2e8f0', backgroundColor: tipoSolicitante === 'Natural' ? '#f0f7ff' : '#ffffff', transition: 'all 0.2s', flex: '1', minWidth: '200px' }}>
              <input
                type="radio"
                value="Natural"
                checked={tipoSolicitante === 'Natural'}
                onChange={(e) => {
                  setTipoSolicitante(e.target.value);
                  limpiarDatosSolicitante();
                  setDniRuc('');
                }}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#083f8f' }}
              />
              <div>
                <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600', display: 'block' }}>Persona Natural</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>DNI</span>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 20px', borderRadius: '10px', border: tipoSolicitante === 'Jurídica' ? '2px solid #083f8f' : '2px solid #e2e8f0', backgroundColor: tipoSolicitante === 'Jurídica' ? '#f0f7ff' : '#ffffff', transition: 'all 0.2s', flex: '1', minWidth: '200px' }}>
              <input
                type="radio"
                value="Jurídica"
                checked={tipoSolicitante === 'Jurídica'}
                onChange={(e) => {
                  setTipoSolicitante(e.target.value);
                  limpiarDatosSolicitante();
                  setDniRuc('');
                }}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#083f8f' }}
              />
              <div>
                <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600', display: 'block' }}>Institución Educativa</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Código Modular</span>
              </div>
            </label>
          </div>
        </div>

        {/* Datos del Solicitante */}
        <div style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '18px' }}>👤</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#083f8f', margin: '0', letterSpacing: '0.2px' }}>
              DATOS DEL SOLICITANTE
            </h3>
          </div>

          {tipoSolicitante === 'Natural' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 0.6fr) 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    DNI <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={dniRuc}
                      onChange={(e) => {
                        setDniRuc(e.target.value);
                        limpiarDatosSolicitante();
                      }}
                      maxLength={tipoSolicitante === 'Natural' ? 8 : 7}
                      placeholder="12345678"
                      style={{ flex: '1', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                      onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      onClick={buscarSolicitante}
                      disabled={loading}
                      style={{ padding: '11px 18px', backgroundColor: '#0ea5d7', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(14, 165, 215, 0.2)' }}
                      onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#0c93c1')}
                      onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#0ea5d7')}
                    >
                      {loading ? '⏳' : '🔍 Buscar'}
                    </button>
                    <button
                      onClick={abrirModalNuevo}
                      disabled={loading}
                      style={{ padding: '11px 18px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
                      onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#059669')}
                      onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#10b981')}
                    >
                      ➕ Nuevo
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Nombre Completo <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                  type="text"
                  value={nombreSolicitante}
                  onChange={(e) => setNombreSolicitante(e.target.value)}
                  placeholder="Nombres y Apellidos"
                  style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: '#ffffff', transition: 'all 0.2s', outline: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={emailSolicitante}
                    onChange={(e) => setEmailSolicitante(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={telefonoSolicitante}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 9) {
                        setTelefonoSolicitante(value);
                      }
                    }}
                    maxLength={9}
                    placeholder="999999999"
                    style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 0.6fr) 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Código Modular/RUC <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={dniRuc}
                      onChange={(e) => {
                        setDniRuc(e.target.value);
                        limpiarDatosSolicitante();
                    }}
                      maxLength={7}
                      placeholder="0123456"
                      style={{ flex: '1', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                      onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      onClick={buscarSolicitante}
                      disabled={loading}
                      style={{ padding: '11px 18px', backgroundColor: '#0ea5d7', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(14, 165, 215, 0.2)' }}
                      onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#0c93c1')}
                      onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#0ea5d7')}
                    >
                      {loading ? '⏳' : '🔍 Buscar'}
                    </button>
                    <button
                      onClick={abrirModalNuevo}
                      disabled={loading}
                      style={{ padding: '11px 18px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
                      onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#059669')}
                      onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#10b981')}
                    >
                      ➕ Nuevo
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Nombre IE <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={nombreIE}
                    onChange={(e) => {
                      setNombreIE(e.target.value);
                      setNombreSolicitante(e.target.value);
                    }}
                    placeholder="Nombre de la Institución Educativa"
                    style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: '#ffffff', transition: 'all 0.2s', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Datos del Documento */}
        <div style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '18px' }}>📄</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#083f8f', margin: '0', letterSpacing: '0.2px' }}>
              DATOS DEL DOCUMENTO
            </h3>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 20px', borderRadius: '10px', border: tipoDocumento === 'Solicitud' ? '2px solid #083f8f' : '2px solid #e2e8f0', backgroundColor: tipoDocumento === 'Solicitud' ? '#f0f7ff' : '#ffffff', transition: 'all 0.2s', flex: '1', minWidth: '180px' }}>
              <input
                type="radio"
                value="Solicitud"
                checked={tipoDocumento === 'Solicitud'}
                onChange={(e) => setTipoDocumento(e.target.value)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#083f8f' }}
              />
              <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>Solicitud (FUT)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 20px', borderRadius: '10px', border: tipoDocumento === 'Oficio' ? '2px solid #083f8f' : '2px solid #e2e8f0', backgroundColor: tipoDocumento === 'Oficio' ? '#f0f7ff' : '#ffffff', transition: 'all 0.2s', flex: '1', minWidth: '180px' }}>
              <input
                type="radio"
                value="Oficio"
                checked={tipoDocumento === 'Oficio'}
                onChange={(e) => setTipoDocumento(e.target.value)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#083f8f' }}
              />
              <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>Oficio</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Asunto <span style={{ color: '#dc2626' }}>*</span>
              </label>
              {asuntos.length > 0 ? (
                <select
                  value={asuntoId}
                  onChange={(e) => setAsuntoId(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  {asuntos.map(asunto => (
                    <option key={asunto.id_asunto} value={asunto.id_asunto}>
                      {asunto.nombre_asunto}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ width: '100%', padding: '11px 14px', border: '2px solid #fbbf24', borderRadius: '8px', fontSize: '14px', fontWeight: '500', backgroundColor: '#fef3c7', color: '#92400e' }}>
                  ⚠️ No hay asuntos activos disponibles para {tipoDocumento}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Nombre del Documento
              </label>
              <input
                type="text"
                value={nombreDocumento}
                onChange={(e) => setNombreDocumento(e.target.value)}
                placeholder="Descripción adicional (opcional)"
                style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>
        </div>

        {/* Datos de Recepción */}
        <div style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '18px' }}>✍️</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#083f8f', margin: '0', letterSpacing: '0.2px' }}>
              RECEPCIÓN
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Receptor del Documento <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={receptorDocumento}
                onChange={(e) => setReceptorDocumento(e.target.value)}
                placeholder="Nombre del colaborador que recibe"
                style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Fecha de Recepción <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>
        </div>

        {/* Mensajes de Estado */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '2px solid #dc2626', color: '#991b1b', padding: '14px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.1)' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #10b981', color: '#065f46', padding: '14px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1)' }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            {success}
          </div>
        )}

        {/* Botones de Acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e2e8f0' }}>
          <button
            onClick={limpiarFormulario}
            style={{ padding: '13px 28px', backgroundColor: '#64748b', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(100, 116, 139, 0.2)' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#475569'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#64748b'}
          >
            🗑️ Cancelar
          </button>
          <button
            onClick={registrarExpediente}
            disabled={loading}
            style={{ padding: '13px 32px', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.3)', letterSpacing: '0.3px' }}
            onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
          >
            <span style={{ fontSize: '18px' }}>💾</span>
            {loading ? 'REGISTRANDO...' : 'REGISTRAR EXPEDIENTE'}
          </button>
        </div>
      </div>

      {/* Modal Nuevo Solicitante */}
      {mostrarModalNuevo && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1000', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '520px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f0f7ff', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '28px' }}>➕</span>
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#083f8f', margin: '0', letterSpacing: '-0.3px' }}>
                  Registrar Nuevo Solicitante
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Complete los datos del {tipoSolicitante === 'Natural' ? 'ciudadano' : 'institución'}
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                {tipoSolicitante === 'Natural' ? 'DNI' : 'Código Modular'}: <span style={{ fontWeight: '700', color: '#083f8f' }}>{dniRuc}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                {tipoSolicitante === 'Natural' ? 'Nombre Completo' : 'Nombre de la Institución'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder={tipoSolicitante === 'Natural' ? 'Nombres y Apellidos' : 'Nombre de la IE'}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Teléfono
              </label>
              <input
                type="tel"
                value={nuevoTelefono}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 9) {
                    setNuevoTelefono(value);
                  }
                }}
                maxLength={9}
                placeholder="999999999"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setMostrarModalNuevo(false)}
                disabled={loading}
                style={{ padding: '12px 24px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#cbd5e1')}
                onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#e2e8f0')}
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevoSolicitante}
                disabled={loading}
                style={{ padding: '12px 28px', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.3)' }}
              >
                {loading ? '⏳ Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {mostrarConfirmacion && expedienteCreado && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1000', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '36px', maxWidth: '560px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '48px' }}>✅</span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#083f8f', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>
                ¡Expediente Registrado!
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>
                El expediente ha sido creado exitosamente
              </p>
            </div>

            <div style={{ backgroundColor: 'linear-gradient(135deg, #f8fafc 0%, #f0f7ff 100%)', padding: '24px', borderRadius: '12px', marginBottom: '28px', border: '2px solid #e2e8f0' }}>
              <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nº Expediente</span>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#083f8f', marginTop: '6px' }}>
                  {expedienteCreado.num_expediente}
                </div>
              </div>
              <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código de Seguimiento</span>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#0ea5d7', marginTop: '6px', letterSpacing: '1px', fontFamily: 'monospace' }}>
                  {expedienteCreado.firma_ruta}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha Límite de Atención</span>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#dc2626', marginTop: '6px' }}>
                  {expedienteCreado.fecha_limite}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={imprimirCargo}
                style={{ padding: '14px 24px', backgroundColor: '#083f8f', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(8, 63, 143, 0.3)' }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#062f6b';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#083f8f';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '18px' }}>🖨️</span>
                IMPRIMIR CARGO
              </button>
              <button
                onClick={cerrarConfirmacion}
                style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)' }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cargo de Recepción para Imprimir */}
      {mostrarCargo && expedienteCreado && (
        <div style={{ display: 'none' }} className="print-only">
          <style>{`
            @media print {
              .print-only { display: block !important; }
              body * { visibility: hidden; }
              .print-only, .print-only * { visibility: visible; }
              .print-only { position: absolute; top: 0; left: 0; width: 100%; }
            }
          `}</style>
          <div style={{ padding: '40px', fontFamily: 'monospace' }}>
            <div style={{ border: '3px double #083f8f', padding: '30px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
                UGEL SANTA - ÁREA DE ACTAS Y CERTIFICADOS
              </h1>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
                CARGO DE RECEPCIÓN DE EXPEDIENTE
              </h2>
              
              <div style={{ borderTop: '1px solid #083f8f', paddingTop: '20px', textAlign: 'left' }}>
                <p style={{ margin: '10px 0' }}>
                  <strong>Nº EXPEDIENTE:</strong> {expedienteCreado.num_expediente}
                </p>
                <p style={{ margin: '10px 0' }}>
                  <strong>FECHA:</strong> {fechaRecepcion.split('-').reverse().join('/')}
                </p>
                
                <div style={{ borderTop: '1px solid #6b7280', margin: '20px 0', paddingTop: '15px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>SOLICITANTE:</p>
                  <p style={{ margin: '5px 0' }}>
                    {expedienteCreado.solicitante.nombre_tipo === 'Natural' ? 'DNI' : 'Cód. Modular'}: {expedienteCreado.solicitante.dni || expedienteCreado.solicitante.codigo_modular}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    Nombre: {expedienteCreado.solicitante.nombre_solicitante}
                  </p>
                </div>
                
                <div style={{ borderTop: '1px solid #6b7280', margin: '20px 0', paddingTop: '15px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>ASUNTO:</p>
                  <p>{expedienteCreado.asunto_nombre}</p>
                </div>
                
                <div style={{ borderTop: '1px solid #6b7280', margin: '20px 0', paddingTop: '15px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>CÓDIGO DE SEGUIMIENTO:</p>
                  <div style={{ border: '2px solid #083f8f', padding: '15px', display: 'inline-block', fontSize: '18px', fontWeight: 'bold' }}>
                    {expedienteCreado.firma_ruta}
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid #6b7280', margin: '20px 0', paddingTop: '15px' }}>
                  <p style={{ fontWeight: 'bold', color: '#dc2626' }}>
                    FECHA LÍMITE DE ATENCIÓN: {expedienteCreado.fecha_limite}
                  </p>
                </div>
                
                <div style={{ borderTop: '1px solid #6b7280', margin: '20px 0', paddingTop: '15px', fontSize: '12px' }}>
                  <p style={{ margin: '5px 0' }}>CONSULTE EL ESTADO DE SU EXPEDIENTE EN:</p>
                  <p style={{ margin: '5px 0' }}>www.ugelsanta.gob.pe/consulta</p>
                  <p style={{ margin: '5px 0' }}>Ingresando su código de seguimiento</p>
                </div>
                
                <div style={{ borderTop: '1px solid #6b7280', margin: '20px 0', paddingTop: '15px' }}>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Recibido por:</strong> {expedienteCreado.receptor}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}