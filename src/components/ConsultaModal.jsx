// src/components/ConsultaModal.jsx
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default function ConsultaModal({ isOpen, onClose, expediente }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            // Bloquear scroll del body cuando el modal está abierto
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    // ============================================
    // FUNCIÓN CORREGIDA PARA FORMATEAR FECHAS
    // ============================================
    const formatearFecha = (fecha) => {
        if (!fecha) return 'No disponible';
        
        try {
            const partes = fecha.split('-');
            if (partes.length === 3) {
                const year = parseInt(partes[0]);
                const month = parseInt(partes[1]) - 1;
                const day = parseInt(partes[2]);
                
                const date = new Date(year, month, day);
                
                if (isNaN(date.getTime())) {
                    console.error('Fecha inválida:', fecha);
                    return 'Fecha no válida';
                }
                
                const dia = String(day).padStart(2, '0');
                const mes = String(month + 1).padStart(2, '0');
                const anio = year;
                
                return `${dia}/${mes}/${anio}`;
            }
            
            return 'Formato de fecha inválido';
        } catch (error) {
            console.error('Error al formatear fecha:', error, fecha);
            return 'Error en fecha';
        }
    };

    // ============================================
    // FUNCIÓN CORREGIDA PARA CALCULAR DÍAS
    // ============================================
    const calcularDiasTranscurridos = (fechaRecepcion) => {
        if (!fechaRecepcion) return 0;
        
        try {
            const hoy = new Date();
            const partes = fechaRecepcion.split('-');
            if (partes.length === 3) {
                const year = parseInt(partes[0]);
                const month = parseInt(partes[1]) - 1;
                const day = parseInt(partes[2]);
                
                const fechaRecep = new Date(year, month, day);
                
                if (isNaN(fechaRecep.getTime())) {
                    console.error('Fecha de recepción inválida:', fechaRecepcion);
                    return 0;
                }
                
                const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                const fechaNormalizada = new Date(year, month, day);
                
                const diferenciaMilisegundos = hoyNormalizado.getTime() - fechaNormalizada.getTime();
                const diferenciaDias = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
                
                return diferenciaDias >= 0 ? diferenciaDias : 0;
            }
            
            return 0;
        } catch (error) {
            console.error('Error al calcular días:', error, fechaRecepcion);
            return 0;
        }
    };

    const obtenerColorEstado = (estado) => {
        const estados = {
            'RECEPCIONADO': { bg: '#dbeafe', color: '#1e40af', label: 'RECEPCIONADO' },
            'EN PROCESO': { bg: '#fef3c7', color: '#92400e', label: 'EN PROCESO' },
            'OBSERVADO': { bg: '#fee2e2', color: '#991b1b', label: 'OBSERVADO' },
            'LISTO PARA ENTREGA': { bg: '#d1fae5', color: '#065f46', label: 'LISTO PARA RECOGER' },
            'ENTREGADO': { bg: '#e0e7ff', color: '#3730a3', label: 'ENTREGADO' }
        };
        return estados[estado] || estados['RECEPCIONADO'];
    };

    const handlePrint = () => {
        window.print();
    };

    const diasTranscurridos = calcularDiasTranscurridos(expediente.fecha_recepcion);
    const estadoInfo = obtenerColorEstado(expediente.estado);
    const diasLimite = 10;
    const porcentajeProgreso = Math.min((diasTranscurridos / diasLimite) * 100, 100);

    const fechaConsulta = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div 
            className={`modal-overlay ${isOpen ? 'active' : ''}`}
            onClick={onClose}
        >
            <div 
                className={`modal-container ${isOpen ? 'active' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ============================================ */}
                {/* ENCABEZADO PARA IMPRESIÓN */}
                {/* ============================================ */}
                <div className="print-only print-header-oficial">
                    <div className="print-header-top">
                        <div className="print-logo-container">
                            <img src="/logo.png" alt="UGEL Santa" className="print-logo" />
                        </div>
                        <div className="print-header-text">
                            <h1 className="print-institucion">UNIDAD DE GESTIÓN EDUCATIVA LOCAL SANTA</h1>
                            <h2 className="print-titulo">📋 COMPROBANTE DE CONSULTA DE EXPEDIENTE 📋</h2>
                            <div className="print-info-contacto">
                                <p>📍 Av. Los Alcatraces s/n - Nuevo Chimbote - Ancash</p>
                                <p>📞 Teléfono: (043) 311252</p>
                            </div>
                        </div>
                    </div>
                    <div className="print-header-footer">
                        <div className="print-fecha-consulta">
                            <strong>Fecha de consulta:</strong> {fechaConsulta}
                        </div>
                        <div className="print-numero-comprobante">
                            <strong>N° Comprobante:</strong> {expediente.num_expediente || 'N/A'}
                        </div>
                    </div>
                </div>

                {/* ============================================ */}
                {/* HEADER DEL MODAL (Solo pantalla) */}
                {/* ============================================ */}
                <div className="modal-header screen-only">
                    <div className="modal-header-content">
                        <div className="modal-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="modal-title">Estado de su Expediente</h2>
                            <p className="modal-subtitle">Consulta pública - UGEL Santa</p>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ============================================ */}
                {/* CONTENIDO PRINCIPAL */}
                {/* ============================================ */}
                <div className="modal-body">
                    {/* Estado Principal */}
                    <div className="estado-principal">
                        <div 
                            className="estado-badge-large"
                            style={{ backgroundColor: estadoInfo.bg, color: estadoInfo.color }}
                        >
                            {estadoInfo.label}
                        </div>
                    </div>

                    {/* Información del Expediente */}
                    <div className="expediente-info-grid">
                        <div className="info-card">
                            <div className="info-icon" style={{ background: 'linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%)' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="info-content">
                                <p className="info-label">N° Expediente</p>
                                <p className="info-value">{expediente.num_expediente || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon" style={{ background: 'linear-gradient(135deg, #0ea5d7 0%, #083f8f 100%)' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div className="info-content">
                                <p className="info-label">Código de Seguimiento</p>
                                <p className="info-value">{expediente.firma_ruta || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Detalles */}
                    <div className="detalles-section">
                        <h3 className="section-title">Información del Trámite</h3>
                        
                        <div className="detalle-item">
                            <span className="detalle-label">Asunto:</span>
                            <span className="detalle-value">{expediente.asunto?.nombre_asunto || 'No especificado'}</span>
                        </div>

                        <div className="detalle-item">
                            <span className="detalle-label">Tipo de Documento:</span>
                            <span className="detalle-value">{expediente.asunto?.tipo_documento || 'No especificado'}</span>
                        </div>

                        <div className="detalle-item">
                            <span className="detalle-label">Fecha de Recepción:</span>
                            <span className="detalle-value">{formatearFecha(expediente.fecha_recepcion)}</span>
                        </div>

                        <div className="detalle-item">
                            <span className="detalle-label">Solicitante:</span>
                            <span className="detalle-value">{expediente.solicitante?.nombre_solicitante || 'No especificado'}</span>
                        </div>
                    </div>

                    {/* Progreso de Días */}
                    <div className="progreso-section">
                        <div className="progreso-header">
                            <span className="progreso-label">Tiempo transcurrido</span>
                            <span className="progreso-dias">{diasTranscurridos} / {diasLimite} días</span>
                        </div>
                        <div className="progreso-bar">
                            <div 
                                className="progreso-fill"
                                style={{ 
                                    width: `${porcentajeProgreso}%`,
                                    backgroundColor: diasTranscurridos >= diasLimite ? '#dc2626' : diasTranscurridos >= 8 ? '#f59e0b' : '#10b981'
                                }}
                            />
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* OBSERVACIONES - VERSIÓN CORREGIDA */}
                    {/* ============================================ */}
                    {expediente.estado === 'OBSERVADO' && (
                        <div className="observaciones-alert">
                            <div className="alert-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="alert-content">
                                <h4 className="alert-title">⚠️ Su expediente está OBSERVADO</h4>
                                <p className="alert-message">
                                    {expediente.observaciones && expediente.observaciones.trim() !== '' 
                                        ? expediente.observaciones 
                                        : 'Su expediente presenta observaciones. Por favor, acérquese a nuestras oficinas en Av. Los Alcatraces s/n - Nuevo Chimbote para conocer los detalles y subsanar las observaciones indicadas.'}
                                </p>
                                <p className="alert-instruction">
                                    Después de subsanar las observaciones, vuelva a presentar su expediente para continuar con el trámite.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Mensaje cuando está listo para entrega */}
                    {expediente.estado === 'LISTO PARA ENTREGA' && (
                        <div className="success-alert">
                            <div className="alert-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="alert-content">
                                <h4 className="alert-title">✅ ¡Su documento está listo para recoger!</h4>
                                <p className="alert-message">Presente su DNI original y este comprobante en nuestras oficinas.</p>
                            </div>
                        </div>
                    )}

                    {/* Información de Contacto */}
                    <div className="contacto-section">
                        <h3 className="section-title">Información de Contacto</h3>
                        <div className="contacto-grid">
                            <div className="contacto-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div>
                                    <p className="contacto-label">Dirección</p>
                                    <p className="contacto-value">Av. Los Alcatraces s/n - Nuevo Chimbote</p>
                                </div>
                            </div>
                            <div className="contacto-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <div>
                                    <p className="contacto-label">Teléfono</p>
                                    <p className="contacto-value"> (043) 311252</p>
                                </div>
                            </div>
                            <div className="contacto-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="contacto-label">Horario de atención</p>
                                    <p className="contacto-value">De Lunes a Viernes
Mañana 9:00 A.M. - 1:00 P.M y de 2:00 P.M. a 4:30 P.M.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* PIE DE PÁGINA PARA IMPRESIÓN */}
                    {/* ============================================ */}
                    <div className="print-only print-footer-oficial">
                        <div className="print-footer-content">
                            <div className="print-footer-notas">
                                <h4>📌 NOTAS IMPORTANTES:</h4>
                                <ul>
                                    <li>Este comprobante es válido para el seguimiento de su expediente.</li>
                                    <li>Conserve este documento para futuras consultas.</li>
                                    <li>Para recoger su documento, presente su DNI original.</li>
                                    <li>Horario de atención:De Lunes a Viernes
Mañana 9:00 A.M. - 1:00 P.M y de 2:00 P.M. a 4:30 P.M.</li>
                                </ul>
                            </div>

                            <div className="print-footer-firma">
                                <div className="print-firma-box">
                                    <div className="print-firma-linea"></div>
                                    <p className="print-firma-texto">Firma del Solicitante</p>
                                    <p className="print-firma-fecha">Fecha: _____/_____/_____</p>
                                </div>
                                
                                <div className="print-sello-box">
                                    <div className="sello-placeholder">
                                        <p>SELLO</p>
                                        <span>UGEL Santa</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="print-footer-bottom">
                            <p>© 2025 UGEL Santa - Unidad de Gestión Educativa Local Santa</p>
                            <p>Este documento ha sido generado electrónicamente</p>
                        </div>
                    </div>
                </div>

                {/* ============================================ */}
                {/* FOOTER DEL MODAL (Solo pantalla) */}
                {/* ============================================ */}
                <div className="modal-footer screen-only">
                    <button className="btn-secondary" onClick={handlePrint}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir Comprobante
                    </button>
                    <button className="btn-primary" onClick={onClose}>Cerrar</button>
                </div>
            </div>

            <style>{`
                /* ============================================ */
                /* ESTILOS BASE DEL MODAL - POSICIONAMIENTO CORREGIDO */
                /* ============================================ */
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    padding: 20px;
                }

                .modal-overlay.active {
                    opacity: 1;
                }

                .modal-container {
                    position: relative;
                    background: white;
                    border-radius: 24px;
                    max-width: 700px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px rgba(8, 63, 143, 0.3);
                    transform: scale(0.9) translateY(20px);
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    margin: 0 auto;
                }

                .modal-container.active {
                    transform: scale(1) translateY(0);
                }

                /* Ocultar elementos de impresión en pantalla */
                .print-only {
                    display: none !important;
                }

                /* Elementos solo visibles en pantalla */
                .screen-only {
                    display: block;
                }

                .modal-header {
                    background: linear-gradient(135deg, #083f8f 0%, #0a4faf 50%, #0ea5d7 100%);
                    padding: 28px 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    border-radius: 24px 24px 0 0;
                }

                .modal-header-content {
                    display: flex;
                    gap: 16px;
                    align-items: start;
                }

                .modal-icon {
                    width: 50px;
                    height: 50px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .modal-icon svg {
                    width: 28px;
                    height: 28px;
                    stroke: white;
                    stroke-width: 2;
                }

                .modal-title {
                    color: white;
                    font-size: 22px;
                    font-weight: 700;
                    margin: 0 0 4px 0;
                }

                .modal-subtitle {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 14px;
                    margin: 0;
                }

                .modal-close {
                    width: 36px;
                    height: 36px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }

                .modal-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.05);
                }

                .modal-close svg {
                    width: 20px;
                    height: 20px;
                    stroke: white;
                    stroke-width: 2;
                }

                .modal-body {
                    padding: 32px;
                }

                .estado-principal {
                    text-align: center;
                    margin-bottom: 28px;
                }

                .estado-badge-large {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 14px 32px;
                    border-radius: 30px;
                    font-size: 16px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .expediente-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 16px;
                    margin-bottom: 28px;
                }

                .info-card {
                    background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
                    border: 2px solid #e5e7eb;
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    transition: all 0.3s;
                }

                .info-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(8, 63, 143, 0.1);
                    border-color: #0ea5d7;
                }

                .info-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .info-icon svg {
                    width: 26px;
                    height: 26px;
                    stroke: white;
                    stroke-width: 2;
                }

                .info-content {
                    flex: 1;
                    min-width: 0;
                }

                .info-label {
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .info-value {
                    font-size: 15px;
                    color: #083f8f;
                    font-weight: 700;
                    margin: 0;
                    word-break: break-word;
                }

                .detalles-section {
                    background: #f9fafb;
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 24px;
                }

                .section-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #083f8f;
                    margin: 0 0 20px 0;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #e5e7eb;
                }

                .detalle-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    padding: 12px 0;
                    border-bottom: 1px solid #e5e7eb;
                    gap: 16px;
                }

                .detalle-item:last-child {
                    border-bottom: none;
                }

                .detalle-label {
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 600;
                    flex-shrink: 0;
                }

                .detalle-value {
                    font-size: 14px;
                    color: #1f2937;
                    font-weight: 600;
                    text-align: right;
                }

                .progreso-section {
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .progreso-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .progreso-label {
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 600;
                }

                .progreso-dias {
                    font-size: 14px;
                    color: #083f8f;
                    font-weight: 700;
                }

                .progreso-bar {
                    height: 12px;
                    background: #e5e7eb;
                    border-radius: 20px;
                    overflow: hidden;
                }

                .progreso-fill {
                    height: 100%;
                    border-radius: 20px;
                    transition: width 0.5s ease, background-color 0.3s;
                }

                .observaciones-alert {
                    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                    border: 2px solid #fca5a5;
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .success-alert {
                    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                    border: 2px solid #6ee7b7;
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .alert-icon {
                    width: 40px;
                    height: 40px;
                    flex-shrink: 0;
                }

                .observaciones-alert .alert-icon svg {
                    width: 40px;
                    height: 40px;
                    stroke: #991b1b;
                    stroke-width: 2;
                }

                .success-alert .alert-icon svg {
                    width: 40px;
                    height: 40px;
                    stroke: #065f46;
                    stroke-width: 2;
                }

                .alert-content {
                    flex: 1;
                }

                .alert-title {
                    font-size: 16px;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                }

                .observaciones-alert .alert-title {
                    color: #991b1b;
                }

                .success-alert .alert-title {
                    color: #065f46;
                }

                .alert-message {
                    font-size: 14px;
                    margin: 0 0 8px 0;
                    line-height: 1.6;
                }

                .observaciones-alert .alert-message {
                    color: #7f1d1d;
                }

                .success-alert .alert-message {
                    color: #064e3b;
                }

                .alert-instruction {
                    font-size: 13px;
                    margin: 0;
                    font-style: italic;
                    color: #991b1b;
                }

                .contacto-section {
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 16px;
                    padding: 24px;
                }

                .contacto-grid {
                    display: grid;
                    gap: 16px;
                }

                .contacto-item {
                    display: flex;
                    gap: 14px;
                    align-items: start;
                }

                .contacto-item svg {
                    width: 22px;
                    height: 22px;
                    stroke: #0ea5d7;
                    stroke-width: 2;
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .contacto-label {
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .contacto-value {
                    font-size: 14px;
                    color: #1f2937;
                    font-weight: 600;
                    margin: 0;
                }

                .modal-footer {
                    padding: 24px 32px;
                    border-top: 2px solid #e5e7eb;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .btn-primary,
                .btn-secondary {
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(8, 63, 143, 0.3);
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(8, 63, 143, 0.4);
                }

                .btn-secondary {
                    background: white;
                    color: #083f8f;
                    border: 2px solid #e5e7eb;
                }

                .btn-secondary:hover {
                    border-color: #0ea5d7;
                    background: rgba(14, 165, 215, 0.05);
                    transform: translateY(-2px);
                }

                .btn-secondary svg {
                    width: 18px;
                    height: 18px;
                    stroke: currentColor;
                    stroke-width: 2;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .modal-overlay {
                        padding: 10px;
                    }

                    .modal-container {
                        max-height: 95vh;
                        border-radius: 20px;
                    }

                    .modal-header {
                        padding: 24px 20px;
                    }

                    .modal-body {
                        padding: 24px 20px;
                    }

                    .expediente-info-grid {
                        grid-template-columns: 1fr;
                    }

                    .modal-footer {
                        padding: 20px;
                        flex-direction: column-reverse;
                    }

                    .btn-primary,
                    .btn-secondary {
                        width: 100%;
                        justify-content: center;
                    }
                }

                /* ============================================ */
                /* ESTILOS EXCLUSIVOS PARA IMPRESIÓN */
                /* ============================================ */
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    @page {
                        margin: 0.8cm;
                        size: A4 portrait;
                    }

                    /* OCULTAR TODO EXCEPTO EL MODAL */
                    body * {
                        visibility: hidden !important;
                    }

                    .modal-overlay,
                    .modal-overlay * {
                        visibility: visible !important;
                    }

                    html, body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                        height: auto;
                        overflow: visible;
                    }

                    body {
                        background: white !important;
                    }

                    .modal-overlay {
                        background: white !important;
                        backdrop-filter: none !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: auto !important;
                        padding: 0 !important;
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        width: 100% !important;
                    }

                    .modal-container {
                        max-width: 100% !important;
                        width: 100% !important;
                        max-height: none !important;
                        height: auto !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        transform: none !important;
                        overflow: visible !important;
                        border: 2px solid #083f8f;
                        background: white;
                        margin: 0 !important;
                        position: relative !important;
                    }

                    .screen-only {
                        display: none !important;
                    }

                    .print-only {
                        display: block !important;
                    }

                    /* ===== ENCABEZADO DEL COMPROBANTE - COMPACTO ===== */
                    .print-header-oficial {
                        background: linear-gradient(135deg, #083f8f 0%, #0a4faf 50%, #0ea5d7 100%);
                        padding: 15px 25px;
                        margin: 0;
                        border-bottom: 4px solid #0ea5d7;
                    }

                    .print-header-top {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                        margin-bottom: 12px;
                    }

                    .print-logo-container {
                        flex-shrink: 0;
                        background: white;
                        padding: 6px;
                        border-radius: 8px;
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                    }

                    .print-logo {
                        width: 65px;
                        height: auto;
                        display: block;
                    }

                    .print-header-text {
                        flex: 1;
                    }

                    .print-institucion {
                        font-size: 16px;
                        font-weight: 800;
                        color: white;
                        margin: 0 0 6px 0;
                        text-align: center;
                        letter-spacing: 0.3px;
                        text-transform: uppercase;
                        line-height: 1.2;
                    }

                    .print-titulo {
                        font-size: 14px;
                        font-weight: 700;
                        color: #fef3c7;
                        margin: 0 0 8px 0;
                        text-align: center;
                        padding: 5px 12px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 6px;
                        border: 2px dashed rgba(255, 255, 255, 0.3);
                    }

                    .print-info-contacto {
                        text-align: center;
                        background: rgba(255, 255, 255, 0.15);
                        padding: 6px;
                        border-radius: 6px;
                    }

                    .print-info-contacto p {
                        font-size: 9px;
                        color: white;
                        margin: 2px 0;
                        font-weight: 600;
                    }

                    .print-header-footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 10px 15px;
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: 6px;
                        margin-top: 10px;
                    }

                    .print-fecha-consulta,
                    .print-numero-comprobante {
                        font-size: 10px;
                        color: #083f8f;
                        font-weight: 700;
                    }

                    .print-fecha-consulta strong,
                    .print-numero-comprobante strong {
                        color: #0ea5d7;
                        font-size: 11px;
                    }

                    /* ===== CUERPO DEL COMPROBANTE - COMPACTO ===== */
                    .modal-body {
                        padding: 18px 25px !important;
                        background: white;
                    }

                    /* Estado Principal - Destacado pero compacto */
                    .estado-principal {
                        text-align: center;
                        margin-bottom: 18px;
                        padding: 12px;
                        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                    }

                    .estado-badge-large {
                        border: 2px solid currentColor !important;
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
                        font-size: 14px !important;
                        padding: 10px 30px !important;
                        text-transform: uppercase;
                        letter-spacing: 0.8px;
                    }

                    /* Tarjetas de Información - Compactas */
                    .expediente-info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                        margin-bottom: 18px;
                    }

                    .info-card {
                        border: 2px solid #083f8f !important;
                        background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%) !important;
                        box-shadow: 0 1px 4px rgba(8, 63, 143, 0.1) !important;
                        padding: 12px !important;
                        border-radius: 8px !important;
                    }

                    .info-card:hover {
                        transform: none !important;
                    }

                    .info-icon {
                        border: 2px solid white;
                        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
                        width: 40px;
                        height: 40px;
                    }

                    .info-icon svg {
                        width: 20px;
                        height: 20px;
                    }

                    .info-label {
                        font-size: 9px !important;
                        color: #083f8f !important;
                        font-weight: 700 !important;
                    }

                    .info-value {
                        font-size: 11px !important;
                        color: #1f2937 !important;
                        font-weight: 700 !important;
                    }

                    /* Sección de Detalles - Compacta */
                    .detalles-section {
                        background: #f9fafb !important;
                        border: 2px solid #083f8f !important;
                        border-radius: 8px !important;
                        padding: 15px !important;
                        margin-bottom: 15px;
                        page-break-inside: avoid;
                    }

                    .section-title {
                        font-size: 12px !important;
                        font-weight: 800 !important;
                        color: #083f8f !important;
                        margin: 0 0 12px 0 !important;
                        padding: 6px 12px;
                        background: linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%);
                        color: white !important;
                        border-radius: 5px;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                    }

                    .detalle-item {
                        padding: 6px 0;
                        border-bottom: 1px solid #d1d5db;
                    }

                    .detalle-label {
                        font-size: 10px !important;
                        color: #083f8f !important;
                        font-weight: 700 !important;
                    }

                    .detalle-value {
                        font-size: 10px !important;
                        color: #1f2937 !important;
                        font-weight: 600 !important;
                    }

                    /* Progreso - Compacto */
                    .progreso-section {
                        background: white !important;
                        border: 2px solid #0ea5d7 !important;
                        border-radius: 8px !important;
                        padding: 12px !important;
                        margin-bottom: 15px;
                        page-break-inside: avoid;
                    }

                    .progreso-header {
                        margin-bottom: 8px;
                    }

                    .progreso-label {
                        font-size: 10px !important;
                        color: #083f8f !important;
                        font-weight: 700 !important;
                    }

                    .progreso-dias {
                        font-size: 11px !important;
                        color: #0ea5d7 !important;
                        font-weight: 800 !important;
                    }

                    .progreso-bar {
                        height: 10px;
                        border: 1px solid #d1d5db;
                    }

                    /* Alertas - Compactas */
                    .observaciones-alert,
                    .success-alert {
                        page-break-inside: avoid;
                        border: 2px solid currentColor !important;
                        border-radius: 8px !important;
                        padding: 12px !important;
                        margin-bottom: 15px;
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
                    }

                    .observaciones-alert {
                        background: #fee2e2 !important;
                        border-color: #dc2626 !important;
                    }

                    .success-alert {
                        background: #d1fae5 !important;
                        border-color: #059669 !important;
                    }

                    .alert-icon {
                        width: 30px;
                        height: 30px;
                    }

                    .alert-icon svg {
                        width: 30px;
                        height: 30px;
                    }

                    .alert-title {
                        font-size: 12px !important;
                        font-weight: 800 !important;
                        margin-bottom: 6px !important;
                    }

                    .alert-message {
                        font-size: 10px !important;
                        line-height: 1.4 !important;
                        font-weight: 600 !important;
                    }

                    .alert-instruction {
                        font-size: 9px !important;
                        font-style: italic;
                        margin-top: 6px !important;
                    }

                    /* Contacto - Compacto */
                    .contacto-section {
                        background: #f0f9ff !important;
                        border: 2px solid #083f8f !important;
                        border-radius: 8px !important;
                        padding: 15px !important;
                        page-break-inside: avoid;
                        margin-bottom: 15px;
                    }

                    .contacto-grid {
                        gap: 10px;
                    }

                    .contacto-item {
                        gap: 10px;
                    }

                    .contacto-item svg {
                        width: 16px;
                        height: 16px;
                    }

                    .contacto-label {
                        font-size: 9px !important;
                        color: #083f8f !important;
                        font-weight: 700 !important;
                        margin: 0 0 2px 0 !important;
                    }

                    .contacto-value {
                        font-size: 10px !important;
                        color: #1f2937 !important;
                        font-weight: 700 !important;
                    }

                    /* ===== PIE DEL COMPROBANTE - COMPACTO ===== */
                    .print-footer-oficial {
                        margin-top: 15px;
                        page-break-inside: avoid;
                        border-top: 2px solid #083f8f;
                        padding-top: 12px;
                    }

                    .print-footer-content {
                        padding: 0;
                    }

                    .print-footer-notas {
                        background: #fffbeb !important;
                        border: 2px solid #f59e0b !important;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                    }

                    .print-footer-notas h4 {
                        font-size: 11px !important;
                        color: #92400e !important;
                        margin: 0 0 8px 0 !important;
                        font-weight: 800 !important;
                        text-transform: uppercase;
                    }

                    .print-footer-notas ul {
                        margin: 0;
                        padding-left: 18px;
                    }

                    .print-footer-notas li {
                        font-size: 9px !important;
                        color: #78350f !important;
                        margin: 4px 0;
                        line-height: 1.4;
                        font-weight: 600;
                    }

                    .print-footer-firma {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        margin: 20px 0 15px 0;
                        padding: 12px;
                        background: #f9fafb;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                    }

                    .print-firma-box {
                        flex: 1;
                    }

                    .print-firma-linea {
                        width: 200px;
                        border-bottom: 2px solid #083f8f;
                        margin-bottom: 6px;
                    }

                    .print-firma-texto {
                        font-size: 10px !important;
                        font-weight: 700 !important;
                        color: #083f8f !important;
                        margin: 0 0 4px 0 !important;
                        text-transform: uppercase;
                    }

                    .print-firma-fecha {
                        font-size: 9px !important;
                        color: #6b7280 !important;
                        font-weight: 600;
                    }

                    .print-sello-box {
                        margin-left: 25px;
                    }

                    .sello-placeholder {
                        width: 70px;
                        height: 70px;
                        border: 2px solid #083f8f;
                        border-radius: 50%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: white;
                        box-shadow: 0 2px 6px rgba(8, 63, 143, 0.2);
                    }

                    .sello-placeholder p {
                        font-size: 14px !important;
                        font-weight: 800 !important;
                        color: #083f8f !important;
                        margin: 0 !important;
                    }

                    .sello-placeholder span {
                        font-size: 8px !important;
                        color: #0ea5d7 !important;
                        text-align: center;
                        font-weight: 700;
                    }

                    .print-footer-bottom {
                        text-align: center;
                        padding: 10px;
                        background: linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%);
                        border-radius: 6px;
                        margin-top: 12px;
                    }

                    .print-footer-bottom p {
                        font-size: 8px !important;
                        color: white !important;
                        margin: 2px 0 !important;
                        font-weight: 600;
                    }

                    /* Línea decorativa de autenticidad - Más compacta */
                    .print-footer-bottom::before {
                        content: '';
                        display: block;
                        width: 100%;
                        height: 2px;
                        background: repeating-linear-gradient(
                            90deg,
                            #fef3c7 0px,
                            #fef3c7 8px,
                            transparent 8px,
                            transparent 16px
                        );
                        margin-bottom: 8px;
                    }
                }
            `}</style>
        </div>
    );
}