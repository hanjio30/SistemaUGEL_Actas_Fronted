/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

export default function EntregaModule() {
  const [searchValue, setSearchValue] = useState('');
  const [expediente, setExpediente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [deliveryData, setDeliveryData] = useState({
    dniRecoge: '',
    tipoRecogida: 'titular',
    nombreAutorizado: '',
    dniAutorizado: '',
    documentoAutorizacion: null,
    observaciones: ''
  });
  const [showVoucher, setShowVoucher] = useState(false);
  const [voucherData, setVoucherData] = useState(null);

  const API_URL = 'https://sistemaugel-actas-backend.onrender.com/api';

  // Cargar usuario desde sessionStorage (IGUAL QUE EN ATENCIONMODULE)
  useEffect(() => {
    const usuarioGuardado = sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        const usuario = JSON.parse(usuarioGuardado);
        setUsuarioActual(usuario);
        console.log('✅ Usuario cargado desde sessionStorage:', usuario);
      } catch (error) {
        console.error('❌ Error al parsear usuario:', error);
      }
    } else {
      console.warn('⚠️ No hay usuario en sessionStorage');
    }
  }, []);

  // Función para formatear fechas sin problemas de zona horaria
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Extraer los componentes de la fecha directamente del string
    // Esto evita problemas de zona horaria
    const fechaStr = fecha.split('T')[0]; // Obtener solo YYYY-MM-DD
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Función para obtener el nombre del usuario
  const obtenerNombreUsuario = () => {
    if (!usuarioActual) return 'Funcionario UGEL';
    return usuarioActual.usuario || usuarioActual.nombre || 'Funcionario UGEL';
  };

  // Limpiar mensajes después de 5 segundos
  const clearMessages = () => {
    setTimeout(() => {
      setError('');
      setSuccessMessage('');
    }, 5000);
  };

  const buscarExpediente = async () => {
    if (!searchValue.trim()) {
      setError('Por favor, ingrese un número de expediente o código de seguimiento');
      clearMessages();
      return;
    }

    setLoading(true);
    setError('');
    setExpediente(null);

    try {
      // Obtener todos los expedientes y buscar localmente
      const response = await fetch(`${API_URL}/expedientes`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar expedientes');
      }
      
      const expedientes = await response.json();
      
      // Buscar por número de expediente o código de seguimiento
      const found = expedientes.find(exp => 
        exp.num_expediente === searchValue || 
        exp.firma_ruta === searchValue
      );
      
      if (!found) {
        throw new Error('Expediente no encontrado. Verifique el número o código ingresado.');
      }
      
      if (found.estado !== 'LISTO PARA ENTREGA') {
        setError(`Este expediente está en estado: ${found.estado}. Solo se pueden entregar expedientes con estado "LISTO PARA ENTREGA".`);
        clearMessages();
        return;
      }
      
      setExpediente(found);
      setSuccessMessage('¡Expediente encontrado! Puede proceder con la entrega.');
      clearMessages();
      
    } catch (err) {
      setError(err.message || 'Error al buscar el expediente. Intente nuevamente.');
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const calcularTiempoAtencion = () => {
    if (!expediente || !expediente.fecha_recepcion) return 0;
    
    // Extraer solo la parte de la fecha (YYYY-MM-DD) ignorando la hora
    const fechaStr = expediente.fecha_recepcion.split('T')[0];
    const [year, month, day] = fechaStr.split('-').map(Number);
    
    // Crear fecha sin problemas de zona horaria
    const fechaRecepcion = new Date(year, month - 1, day);
    
    // Obtener fecha actual sin hora
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);
    
    const diferencia = Math.floor((fechaActual - fechaRecepcion) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  const validarDNI = (dni) => {
    return /^\d{8}$/.test(dni);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Solo se permiten archivos PDF para el documento de autorización');
        clearMessages();
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setError('El archivo no debe superar los 5MB');
        clearMessages();
        e.target.value = '';
        return;
      }
      setDeliveryData({...deliveryData, documentoAutorizacion: file});
    }
  };

  const registrarEntrega = async () => {
    // Validaciones según tipo de recogida
    if (deliveryData.tipoRecogida === 'titular') {
      if (!deliveryData.dniRecoge.trim()) {
        setError('Ingrese el DNI del titular que recoge el documento');
        clearMessages();
        return;
      }

      if (!validarDNI(deliveryData.dniRecoge)) {
        setError('El DNI debe tener exactamente 8 dígitos numéricos');
        clearMessages();
        return;
      }
    }

    if (deliveryData.tipoRecogida === 'tercero') {
      if (!deliveryData.nombreAutorizado.trim()) {
        setError('Ingrese el nombre completo del tercero autorizado');
        clearMessages();
        return;
      }
      if (!deliveryData.dniAutorizado.trim()) {
        setError('Ingrese el DNI del tercero autorizado');
        clearMessages();
        return;
      }
      if (!validarDNI(deliveryData.dniAutorizado)) {
        setError('El DNI del autorizado debe tener exactamente 8 dígitos numéricos');
        clearMessages();
        return;
      }
    }

    // Verificar usuario (IGUAL QUE EN ATENCIONMODULE)
    const nombreUsuario = usuarioActual?.usuario || usuarioActual?.nombre;
    
    if (!nombreUsuario) {
      console.log('Usuario actual:', usuarioActual); // Debug
      alert('Error: No se pudo identificar el usuario. Por favor, inicie sesión nuevamente.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Crear FormData para enviar archivo
      const formData = new FormData();
      formData.append('expediente_id', expediente.id_expediente);
      formData.append('tipo_recogida', deliveryData.tipoRecogida);
      
      // Para titular: solo enviar dniRecoge
      if (deliveryData.tipoRecogida === 'titular') {
        formData.append('dni_recoge', deliveryData.dniRecoge);
      }
      
      // Para tercero: enviar datos del tercero
      if (deliveryData.tipoRecogida === 'tercero') {
        formData.append('nombre_autorizado', deliveryData.nombreAutorizado);
        formData.append('dni_autorizado', deliveryData.dniAutorizado);
        // El dni_recoge será el mismo que el dniAutorizado para terceros
        formData.append('dni_recoge', deliveryData.dniAutorizado);
        if (deliveryData.documentoAutorizacion) {
          formData.append('documento_autorizacion', deliveryData.documentoAutorizacion);
        }
      }
      
      if (deliveryData.observaciones) {
        formData.append('observaciones', deliveryData.observaciones);
      }
      
      // Enviar el nombre del usuario actual automáticamente
      formData.append('entregado_por', nombreUsuario);
      
      console.log('📤 Enviando entrega con funcionario:', nombreUsuario);

      // Registrar entrega en la nueva tabla
      const response = await fetch(`${API_URL}/entregas`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Error al registrar la entrega');
      }

      const entregaData = await response.json();

      // Generar datos del voucher
      const fechaEntrega = new Date();
      const voucher = {
        idEntrega: entregaData.data.id_entrega,
        expediente: expediente.num_expediente,
        codigo: expediente.firma_ruta,
        fechaRecepcion: formatearFecha(expediente.fecha_recepcion),
        fechaEntrega: (() => {
          const año = fechaEntrega.getFullYear();
          const mes = String(fechaEntrega.getMonth() + 1).padStart(2, '0');
          const dia = String(fechaEntrega.getDate()).padStart(2, '0');
          return formatearFecha(`${año}-${mes}-${dia}`);
        })(),
        horaEntrega: fechaEntrega.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        tiempoAtencion: calcularTiempoAtencion(),
        solicitante: expediente.solicitante,
        asunto: expediente.asunto,
        tipoRecogida: deliveryData.tipoRecogida,
        dniRecoge: deliveryData.tipoRecogida === 'titular' ? deliveryData.dniRecoge : deliveryData.dniAutorizado,
        dniRecibe: deliveryData.tipoRecogida === 'titular' ? deliveryData.dniRecoge : deliveryData.dniAutorizado,
        nombreAutorizado: deliveryData.nombreAutorizado,
        observaciones: deliveryData.observaciones,
        entregadoPor: nombreUsuario
      };

      setVoucherData(voucher);
      setShowVoucher(true);
      setSuccessMessage('¡Entrega registrada exitosamente!');
      
    } catch (err) {
      console.error('Error completo:', err);
      setError(err.message || 'Error al registrar la entrega. Intente nuevamente.');
      clearMessages();
    } finally {
      setLoading(false);
    }
  };

  const reiniciar = () => {
    setSearchValue('');
    setExpediente(null);
    setError('');
    setSuccessMessage('');
    setDeliveryData({
      dniRecoge: '',
      tipoRecogida: 'titular',
      nombreAutorizado: '',
      dniAutorizado: '',
      documentoAutorizacion: null,
      observaciones: ''
    });
    setShowVoucher(false);
    setVoucherData(null);
  };

  const imprimirVoucher = () => {
    window.print();
  };

  // Estilos para impresión optimizados para A4
  const printStyles = `
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }
      
      body * {
        visibility: hidden;
      }
      
      .voucher-print, .voucher-print * {
        visibility: visible;
      }
      
      .voucher-print {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      
      .no-print {
        display: none !important;
      }
      
      .voucher-container {
        box-shadow: none !important;
        border: 2px solid #000 !important;
        page-break-inside: avoid;
      }
      
      .logo-institucional {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  if (showVoucher && voucherData) {
    return (
      <>
        <style>{printStyles}</style>
        <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
          <div className="voucher-print" style={{ maxWidth: '190mm', margin: '0 auto', backgroundColor: '#ffffff', padding: '15mm', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            
            {/* Voucher mejorado con logo */}
            <div className="voucher-container" style={{ border: '3px solid #083f8f', padding: '20px', marginBottom: '20px', backgroundColor: '#ffffff' }}>
              
              {/* Encabezado institucional con logo */}
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px double #083f8f', paddingBottom: '12px' }}>
                {/* Logo institucional */}
                <div style={{ marginBottom: '8px' }}>
                  <img 
                    src="/logo.png" 
                    alt="Logo UGEL" 
                    className="logo-institucional"
                    style={{ 
                      width: '70px', 
                      height: '70px', 
                      margin: '0 auto',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{ 
                    width: '70px', 
                    height: '70px', 
                    margin: '0 auto', 
                    backgroundColor: '#083f8f', 
                    borderRadius: '50%', 
                    display: 'none', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#fff', 
                    fontSize: '20px', 
                    fontWeight: 'bold' 
                  }}>
                    UGEL
                  </div>
                </div>
                
                <h2 style={{ color: '#083f8f', margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.2' }}>
                  Unidad de Gestión Educativa Local Santa
                </h2>
                <h3 style={{ color: '#0ea5d7', margin: '3px 0', fontSize: '14px', fontWeight: '600' }}>
                  Área de Actas y Certificados
                </h3>
                <h1 style={{ color: '#dc2626', margin: '8px 0 0 0', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  CARGO DE ENTREGA DE DOCUMENTO
                </h1>
              </div>

              {/* Información del expediente */}
              <div style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <p style={{ margin: '3px 0', color: '#6b7280', fontSize: '10px', fontWeight: '600' }}>N° EXPEDIENTE</p>
                    <p style={{ margin: '0', color: '#111827', fontSize: '14px', fontWeight: 'bold' }}>{voucherData.expediente}</p>
                  </div>
                  <div>
                    <p style={{ margin: '3px 0', color: '#6b7280', fontSize: '10px', fontWeight: '600' }}>CÓDIGO DE SEGUIMIENTO</p>
                    <p style={{ margin: '0', color: '#111827', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>{voucherData.codigo}</p>
                  </div>
                </div>
              </div>

              {/* Fechas y tiempo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <p style={{ margin: '0 0 3px 0', color: '#6b7280', fontSize: '9px', fontWeight: '600' }}>FECHA RECEPCIÓN</p>
                  <p style={{ margin: '0', color: '#374151', fontSize: '12px', fontWeight: 'bold' }}>{voucherData.fechaRecepcion}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 3px 0', color: '#6b7280', fontSize: '9px', fontWeight: '600' }}>FECHA ENTREGA</p>
                  <p style={{ margin: '0', color: '#374151', fontSize: '12px', fontWeight: 'bold' }}>{voucherData.fechaEntrega}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 3px 0', color: '#6b7280', fontSize: '9px', fontWeight: '600' }}>TIEMPO DE ATENCIÓN</p>
                  <p style={{ margin: '0', color: '#10b981', fontSize: '14px', fontWeight: 'bold' }}>{voucherData.tiempoAtencion} días</p>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }}></div>

              {/* Datos del solicitante */}
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#083f8f', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  📋 Datos del Solicitante
                </h4>
                <div style={{ paddingLeft: '8px', fontSize: '11px' }}>
                  <p style={{ margin: '3px 0', color: '#374151' }}>
                    <strong>Nombre:</strong> {voucherData.solicitante.nombre_solicitante}
                  </p>
                  <p style={{ margin: '3px 0', color: '#374151' }}>
                    <strong>DNI/Código:</strong> {voucherData.solicitante.dni || voucherData.solicitante.codigo_modular}
                  </p>
                  <p style={{ margin: '3px 0', color: '#374151' }}>
                    <strong>Tipo:</strong> {voucherData.solicitante.nombre_tipo || 'No especificado'}
                  </p>
                </div>
              </div>

              {/* Documento entregado */}
              <div style={{ marginBottom: '12px', backgroundColor: '#fef3c7', padding: '8px', borderRadius: '4px', border: '1px solid #fbbf24' }}>
                <h4 style={{ color: '#92400e', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  📄 Documento Entregado
                </h4>
                <p style={{ margin: '0', color: '#78350f', fontSize: '11px', fontWeight: '600' }}>
                  {voucherData.asunto.nombre_asunto}
                </p>
              </div>

              <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }}></div>

              {/* Recibido por */}
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ color: '#083f8f', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  ✍️ Recibido Por
                </h4>
                <div style={{ paddingLeft: '8px' }}>
                  <div style={{ marginBottom: '6px', fontSize: '11px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', marginRight: '15px' }}>
                      <span style={{ fontSize: '16px', marginRight: '4px' }}>
                        {voucherData.tipoRecogida === 'titular' ? '☑' : '☐'}
                      </span>
                      <span style={{ fontWeight: voucherData.tipoRecogida === 'titular' ? 'bold' : 'normal' }}>
                        Titular
                      </span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px', marginRight: '4px' }}>
                        {voucherData.tipoRecogida === 'tercero' ? '☑' : '☐'}
                      </span>
                      <span style={{ fontWeight: voucherData.tipoRecogida === 'tercero' ? 'bold' : 'normal' }}>
                        Tercero Autorizado
                      </span>
                    </label>
                  </div>
                  
                  {voucherData.tipoRecogida === 'tercero' && (
                    <div style={{ backgroundColor: '#fef3c7', padding: '6px', borderRadius: '4px', marginBottom: '6px' }}>
                      <p style={{ margin: '3px 0', color: '#78350f', fontSize: '10px' }}>
                        <strong>Nombre del autorizado:</strong> {voucherData.nombreAutorizado}
                      </p>
                    </div>
                  )}
                  
                  <p style={{ margin: '8px 0 3px 0', color: '#374151', fontSize: '11px' }}>
                    <strong>DNI de quien recibe:</strong> {voucherData.dniRecibe}
                  </p>
                  
                  <div style={{ marginTop: '20px', marginBottom: '8px' }}>
                    <div style={{ borderBottom: '2px solid #000', width: '60%', margin: '0 auto' }}></div>
                    <p style={{ textAlign: 'center', margin: '6px 0 0 0', fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>
                      Firma y Huella Digital
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }}></div>

              {/* Entregado por */}
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#083f8f', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  👤 Entregado Por
                </h4>
                <div style={{ paddingLeft: '8px', fontSize: '11px' }}>
                  <p style={{ margin: '3px 0', color: '#374151' }}>
                    <strong>Fecha:</strong> {voucherData.fechaEntrega} &nbsp;|&nbsp; <strong>Hora:</strong> {voucherData.horaEntrega}
                  </p>
                  <p style={{ margin: '3px 0', color: '#374151' }}>
                    <strong>Funcionario:</strong> {voucherData.entregadoPor}
                  </p>
                </div>
              </div>

              {voucherData.observaciones && (
                <>
                  <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }}></div>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ color: '#083f8f', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      📝 Observaciones
                    </h4>
                    <p style={{ margin: '0', color: '#374151', fontSize: '10px', paddingLeft: '8px', fontStyle: 'italic' }}>
                      {voucherData.observaciones}
                    </p>
                  </div>
                </>
              )}

              {/* Pie de página */}
              <div style={{ borderTop: '2px double #083f8f', paddingTop: '10px', textAlign: 'center' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ border: '2px dashed #6b7280', padding: '8px', display: 'inline-block', borderRadius: '4px' }}>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '10px', fontWeight: '600' }}>
                      [SELLO INSTITUCIONAL]
                    </p>
                  </div>
                </div>
                <p style={{ margin: '3px 0', color: '#6b7280', fontSize: '9px' }}>
                  Este documento certifica la entrega del trámite especificado
                </p>
                <p style={{ margin: '3px 0', color: '#6b7280', fontSize: '8px', fontStyle: 'italic' }}>
                  ID de Registro: #{voucherData.idEntrega}
                </p>
              </div>
            </div>

            {/* Nota de copias */}
            <div className="no-print" style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginBottom: '20px', fontStyle: 'italic' }}>
              <p style={{ margin: '5px 0' }}>💡 Consejo: Imprima dos copias</p>
              <p style={{ margin: '5px 0' }}>✅ Una copia para el solicitante | 📁 Una copia para archivo UGEL</p>
            </div>

            {/* Botones de acción */}
            <div className="no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={imprimirVoucher}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#083f8f', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#062b66'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#083f8f'}
              >
                🖨️ Imprimir Cargo
              </button>
              <button
                onClick={reiniciar}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#10b981', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                ➕ Nueva Entrega
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#ffffff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        
        {/* Header mejorado */}
        <div style={{ marginBottom: '30px', borderBottom: '3px solid #083f8f', paddingBottom: '15px', background: 'linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%)', padding: '20px', borderRadius: '8px 8px 0 0', marginLeft: '-30px', marginRight: '-30px', marginTop: '-30px' }}>
          <h2 style={{ color: '#ffffff', margin: '0 0 5px 0', fontSize: '28px', fontWeight: 'bold', textAlign: 'center' }}>
            📦 Módulo de Entrega de Documentos
          </h2>
          <p style={{ color: '#e0f2fe', margin: '5px 0 0 0', fontSize: '14px', textAlign: 'center' }}>
            Sistema de Registro de Entregas - UGEL Santa
          </p>
          
          {/* Usuario Actual */}
          {usuarioActual && (
            <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '6px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#ffffff', margin: '0' }}>
                👤 Usuario: <strong>{usuarioActual.usuario || usuarioActual.nombre}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Mensajes de error y éxito */}
        {error && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fee2e2', 
            border: '2px solid #dc2626', 
            borderRadius: '6px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <p style={{ color: '#dc2626', margin: 0, fontWeight: '600', flex: 1 }}>{error}</p>
          </div>
        )}

        {successMessage && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#d1fae5', 
            border: '2px solid #10b981', 
            borderRadius: '6px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <p style={{ color: '#047857', margin: 0, fontWeight: '600', flex: 1 }}>{successMessage}</p>
          </div>
        )}

        {/* Búsqueda mejorada */}
        <div style={{ marginBottom: '30px', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '10px', fontSize: '16px' }}>
            🔍 Buscar Expediente Listo para Entrega
          </label>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '10px' }}>
            Ingrese el número de expediente o el código de seguimiento
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={searchValue}
              onInput={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && buscarExpediente()}
              placeholder="Ej: 2024-0001 o UGEL-2024-0001-ABCD"
              style={{ 
                flex: 1, 
                padding: '12px', 
                border: '2px solid #d1d5db', 
                borderRadius: '6px', 
                fontSize: '14px',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#083f8f'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <button
              onClick={buscarExpediente}
              disabled={loading}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: loading ? '#9ca3af' : '#083f8f', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold',
                fontSize: '14px',
                minWidth: '120px',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#062b66')}
              onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#083f8f')}
            >
              {loading ? '🔄 Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Expediente encontrado */}
        {expediente && (
          <>
            {/* Información del expediente */}
            <div style={{ 
              borderTop: '3px dashed #d1d5db', 
              paddingTop: '25px', 
              marginBottom: '25px',
              backgroundColor: '#f0fdf4',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #10b981'
            }}>
              <h3 style={{ color: '#083f8f', marginBottom: '15px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>✅</span>
                EXPEDIENTE ENCONTRADO
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px', fontWeight: '600' }}>N° EXPEDIENTE</p>
                  <p style={{ margin: '0', color: '#111827', fontSize: '16px', fontWeight: 'bold' }}>{expediente.num_expediente}</p>
                </div>
                
                <div style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px', fontWeight: '600' }}>ESTADO</p>
                  <p style={{ margin: '0', color: '#10b981', fontSize: '16px', fontWeight: 'bold' }}>🟢 {expediente.estado}</p>
                </div>
                
                <div style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px', fontWeight: '600' }}>SOLICITANTE</p>
                  <p style={{ margin: '0', color: '#111827', fontSize: '14px', fontWeight: 'bold' }}>{expediente.solicitante.nombre_solicitante}</p>
                </div>
                
                <div style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px', fontWeight: '600' }}>DNI / CÓDIGO</p>
                  <p style={{ margin: '0', color: '#111827', fontSize: '14px', fontWeight: 'bold' }}>
                    {expediente.solicitante.dni || expediente.solicitante.codigo_modular}
                  </p>
                </div>
              </div>
              
              <div style={{ marginTop: '15px', backgroundColor: '#ffffff', padding: '15px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px', fontWeight: '600' }}>DOCUMENTO A ENTREGAR</p>
                <p style={{ margin: '0', color: '#111827', fontSize: '14px', fontWeight: 'bold' }}>{expediente.asunto.nombre_asunto}</p>
              </div>
            </div>

            {/* Formulario de entrega */}
            <div style={{ 
              borderTop: '3px dashed #d1d5db', 
              paddingTop: '25px', 
              marginBottom: '25px',
              backgroundColor: '#fef3c7',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #fbbf24'
            }}>
              <h3 style={{ color: '#083f8f', marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🔐</span>
                VERIFICACIÓN DE IDENTIDAD
              </h3>
              
              {/* Tipo de recogida */}
              <div style={{ marginBottom: '20px', backgroundColor: '#ffffff', padding: '15px', borderRadius: '6px' }}>
                <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
                  ¿Quién recoge el documento?
                </label>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    border: deliveryData.tipoRecogida === 'titular' ? '2px solid #083f8f' : '2px solid #d1d5db',
                    backgroundColor: deliveryData.tipoRecogida === 'titular' ? '#eff6ff' : '#ffffff',
                    flex: '1 1 200px',
                    transition: 'all 0.3s'
                  }}>
                    <input
                      type="radio"
                      name="tipoRecogida"
                      value="titular"
                      checked={deliveryData.tipoRecogida === 'titular'}
                      onChange={(e) => setDeliveryData({
                        ...deliveryData, 
                        tipoRecogida: e.target.value, 
                        nombreAutorizado: '', 
                        dniAutorizado: '',
                        documentoAutorizacion: null
                      })}
                      style={{ marginRight: '10px', width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>👤 Titular</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>El solicitante recoge personalmente</div>
                    </div>
                  </label>
                  
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    border: deliveryData.tipoRecogida === 'tercero' ? '2px solid #083f8f' : '2px solid #d1d5db',
                    backgroundColor: deliveryData.tipoRecogida === 'tercero' ? '#eff6ff' : '#ffffff',
                    flex: '1 1 200px',
                    transition: 'all 0.3s'
                  }}>
                    <input
                      type="radio"
                      name="tipoRecogida"
                      value="tercero"
                      checked={deliveryData.tipoRecogida === 'tercero'}
                      onChange={(e) => setDeliveryData({...deliveryData, tipoRecogida: e.target.value})}
                      style={{ marginRight: '10px', width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>👥 Tercero Autorizado</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Otra persona con autorización</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* DNI de quien recoge - SOLO PARA TITULAR */}
              {deliveryData.tipoRecogida === 'titular' && (
                <div style={{ marginBottom: '20px', backgroundColor: '#ffffff', padding: '15px', borderRadius: '6px' }}>
                  <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                    DNI del titular que recoge: <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryData.dniRecoge}
                    onInput={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setDeliveryData({...deliveryData, dniRecoge: value});
                    }}
                    maxLength={8}
                    placeholder="Ingrese 8 dígitos"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #d1d5db', 
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'border-color 0.3s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
              )}

              {/* Datos del tercero autorizado - SOLO PARA TERCERO */}
              {deliveryData.tipoRecogida === 'tercero' && (
                <div style={{ 
                  backgroundColor: '#ffffff', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  marginTop: '15px',
                  border: '2px solid #f59e0b'
                }}>
                  <h4 style={{ color: '#92400e', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
                    📋 Datos del Tercero Autorizado
                  </h4>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                      Nombre completo: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryData.nombreAutorizado}
                      onInput={(e) => setDeliveryData({...deliveryData, nombreAutorizado: e.target.value})}
                      placeholder="Nombres y apellidos completos"
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        border: '2px solid #d1d5db', 
                        borderRadius: '6px',
                        fontSize: '14px',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                      DNI del tercero autorizado: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryData.dniAutorizado}
                      onInput={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setDeliveryData({...deliveryData, dniAutorizado: value});
                      }}
                      maxLength={8}
                      placeholder="Ingrese 8 dígitos"
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        border: '2px solid #d1d5db', 
                        borderRadius: '6px',
                        fontSize: '14px',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                      Documento de autorización: <span style={{ color: '#6b7280', fontWeight: 'normal', fontSize: '12px' }}>(Opcional - PDF, máx. 5MB)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          border: '2px dashed #d1d5db', 
                          borderRadius: '6px', 
                          backgroundColor: '#f9fafb',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      />
                      {deliveryData.documentoAutorizacion && (
                        <p style={{ margin: '5px 0 0 0', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                          ✅ Archivo seleccionado: {deliveryData.documentoAutorizacion.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div style={{ 
              borderTop: '3px dashed #d1d5db', 
              paddingTop: '25px', 
              marginBottom: '25px'
            }}>
              <h3 style={{ color: '#083f8f', marginBottom: '15px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📝</span>
                INFORMACIÓN ADICIONAL
              </h3>
              
              {/* Mostrar funcionario actual */}
              <div style={{ marginBottom: '15px', backgroundColor: '#e0f2fe', padding: '15px', borderRadius: '6px', border: '2px solid #0ea5d7' }}>
                <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                  👤 Funcionario que entrega:
                </label>
                <p style={{ margin: '0', color: '#083f8f', fontSize: '18px', fontWeight: 'bold' }}>
                  {usuarioActual?.usuario || usuarioActual?.nombre || 'Usuario actual'}
                </p>
                <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '12px', fontStyle: 'italic' }}>
                  ✅ Este nombre se registrará automáticamente en el cargo de entrega
                </p>
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                  Observaciones de entrega:
                </label>
                <textarea
                  value={deliveryData.observaciones}
                  onInput={(e) => setDeliveryData({...deliveryData, observaciones: e.target.value})}
                  placeholder='Opcional - Ej: "Presentó copia de DNI", "Documento en buen estado", etc.'
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid #d1d5db', 
                    borderRadius: '6px', 
                    resize: 'vertical',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ 
              borderTop: '3px solid #d1d5db', 
              paddingTop: '25px', 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'flex-end',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={reiniciar}
                style={{ 
                  padding: '14px 28px', 
                  backgroundColor: '#6b7280', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'background-color 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                ❌ Cancelar
              </button>
              <button
                onClick={registrarEntrega}
                disabled={loading}
                style={{ 
                  padding: '14px 28px', 
                  backgroundColor: loading ? '#9ca3af' : '#10b981', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'background-color 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#059669')}
                onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#10b981')}
              >
                {loading ? '⏳ Procesando...' : '✅ REGISTRAR ENTREGA Y GENERAR CARGO'}
              </button>
            </div>
          </>
        )}

        {/* Mensaje informativo cuando no hay expediente */}
        {!expediente && !loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '2px dashed #d1d5db'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
            <h3 style={{ color: '#374151', marginBottom: '10px', fontSize: '18px' }}>
              Busque un expediente para comenzar
            </h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Ingrese el número de expediente o código de seguimiento en el campo superior
            </p>
          </div>
        )}
      </div>
    </div>
  );
}