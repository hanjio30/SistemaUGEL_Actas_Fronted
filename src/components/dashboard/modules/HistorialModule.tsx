/** @jsxImportSource preact */
import { useState, useEffect, useRef } from 'preact/hooks';

export default function HistorialModule() {
  const [expedientes, setExpedientes] = useState([]);
  const [selectedExpediente, setSelectedExpediente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const historialRef = useRef(null);

  const API_BASE = 'http://localhost:8000/api';

  // Cargar lista de expedientes
  useEffect(() => {
    fetchExpedientes();
  }, []);

  const fetchExpedientes = async () => {
    try {
      const response = await fetch(`${API_BASE}/expedientes`);
      const data = await response.json();
      setExpedientes(data);
    } catch (err) {
      setError('Error al cargar expedientes');
    }
  };

  // Cargar historial de un expediente
  const fetchHistorial = async (expedienteId) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/expedientes/${expedienteId}/historial`);
      const data = await response.json();
      setSelectedExpediente(data.expediente);
      setHistorial(data.historial);
    } catch (err) {
      setError('Error al cargar historial');
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar expedientes por búsqueda
  const filteredExpedientes = expedientes.filter(exp => 
    exp.num_expediente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.firma_ruta?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener ícono según estado
  const getEstadoIcon = (estado) => {
    const icons = {
      'RECEPCIONADO': '⚪',
      'EN PROCESO': '🟡',
      'LISTO PARA ENTREGA': '🟢',
      'ENTREGADO': '📦',
      'OBSERVADO': '🔴',
      'ARCHIVADO': '📁'
    };
    return icons[estado] || '📄';
  };

  // Obtener color según estado
  const getEstadoColor = (estado) => {
    const colors = {
      'RECEPCIONADO': '#6b7280',
      'EN PROCESO': '#f59e0b',
      'LISTO PARA ENTREGA': '#10b981',
      'ENTREGADO': '#3b82f6',
      'OBSERVADO': '#ef4444',
      'ARCHIVADO': '#8b5cf6'
    };
    return colors[estado] || '#6b7280';
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Formatear fecha corta para PDF
  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Exportar a PDF usando jsPDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Cargar jsPDF desde CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      let yPos = 0;

      // Paleta de colores moderna
      const primary = [8, 63, 143];
      const accent = [14, 165, 215];
      const success = [16, 185, 129];
      const dark = [15, 23, 42];
      const light = [248, 250, 252];
      const border = [226, 232, 240];

      // ==================== ENCABEZADO MODERNO ====================
      // Fondo degradado simulado con franjas
      doc.setFillColor(8, 63, 143);
      doc.rect(0, 0, pageWidth, 55, 'F');
      
      doc.setFillColor(10, 80, 160);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setFillColor(14, 165, 215);
      doc.rect(0, 45, pageWidth, 10, 'F');

      // Título principal - más moderno
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.setFont(undefined, 'bold');
      doc.text('HISTORIAL DE EXPEDIENTE', pageWidth / 2, 25, { align: 'center' });
      
      // Línea decorativa
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 50, 32, pageWidth / 2 + 50, 32);
      
      // Subtítulo
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text('Sistema de Gestión y Trazabilidad', pageWidth / 2, 40, { align: 'center' });

      yPos = 65;

      // ==================== INFORMACIÓN PRINCIPAL - DISEÑO CARD ====================
      const cardHeight = 45;
      
      // Sombra de la tarjeta
      doc.setFillColor(200, 200, 200);
      doc.roundedRect(margin + 1, yPos + 1, pageWidth - (2 * margin), cardHeight, 4, 4, 'F');
      
      // Tarjeta blanca
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, yPos, pageWidth - (2 * margin), cardHeight, 4, 4, 'F');
      
      // Borde sutil
      doc.setDrawColor(...border);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPos, pageWidth - (2 * margin), cardHeight, 4, 4, 'S');

      // Contenido de la tarjeta en grid
      const cardPadding = 8;
      const col1X = margin + cardPadding;
      const col2X = margin + (pageWidth - 2 * margin) / 2 + 5;
      let cardY = yPos + 10;

      // Columna 1 - N° Expediente
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text('N° DE EXPEDIENTE', col1X, cardY);
      
      doc.setFontSize(16);
      doc.setTextColor(...primary);
      doc.setFont(undefined, 'bold');
      doc.text(selectedExpediente.num_expediente, col1X, cardY + 7);
      
      cardY += 18;

      // Código de ruta
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text('CODIGO DE RUTA', col1X, cardY);
      
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.setFont(undefined, 'normal');
      const codigoLines = doc.splitTextToSize(selectedExpediente.firma_ruta, 80);
      doc.text(codigoLines, col1X, cardY + 5);

      // Columna 2 - Estado
      cardY = yPos + 10;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text('ESTADO ACTUAL', col2X, cardY);
      
      // Badge del estado con colores
      const estadoText = selectedExpediente.estado;
      const badgeWidth = doc.getTextWidth(estadoText) + 16;
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(col2X, cardY + 2, badgeWidth, 10, 5, 5, 'F');
      doc.setDrawColor(...accent);
      doc.setLineWidth(1);
      doc.roundedRect(col2X, cardY + 2, badgeWidth, 10, 5, 5, 'S');
      
      doc.setFontSize(10);
      doc.setTextColor(...accent);
      doc.setFont(undefined, 'bold');
      doc.text(estadoText, col2X + 8, cardY + 9);
      
      cardY += 18;

      // Total de cambios
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      doc.text('TOTAL DE CAMBIOS', col2X, cardY);
      
      doc.setFontSize(20);
      doc.setTextColor(...accent);
      doc.setFont(undefined, 'bold');
      doc.text(historial.length.toString(), col2X, cardY + 10);
      
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont(undefined, 'normal');
      doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, col2X, cardY + 15);

      yPos += cardHeight + 15;

      // ==================== TÍTULO DE SECCIÓN ====================
      doc.setFontSize(14);
      doc.setTextColor(...primary);
      doc.setFont(undefined, 'bold');
      doc.text('Trazabilidad del Expediente', margin, yPos);
      
      // Línea decorativa bajo el título
      doc.setDrawColor(...accent);
      doc.setLineWidth(2);
      doc.line(margin, yPos + 2, margin + 60, yPos + 2);
      
      yPos += 10;

      // ==================== HISTORIAL - DISEÑO TIMELINE MODERNO ====================
      historial.forEach((item, index) => {
        // Calcular altura
        const hasObs = item.observaciones && item.observaciones.trim() !== '';
        let obsLines = [];
        if (hasObs) {
          obsLines = doc.splitTextToSize(item.observaciones, pageWidth - 2 * margin - 30);
        }
        const baseHeight = 32;
        const obsHeight = obsLines.length > 0 ? obsLines.length * 3.5 + 10 : 0;
        const itemHeight = baseHeight + obsHeight;

        // Verificar espacio
        if (yPos + itemHeight > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }

        const itemY = yPos;
        const timelineX = margin + 15;
        const contentX = timelineX + 15;

        // ========== LÍNEA VERTICAL DEL TIMELINE ==========
        if (index < historial.length - 1) {
          doc.setDrawColor(...border);
          doc.setLineWidth(2);
          doc.line(timelineX, itemY + 10, timelineX, itemY + itemHeight + 5);
        }

        // ========== CÍRCULO NUMERADO ==========
        // Círculo exterior
        doc.setFillColor(...accent);
        doc.circle(timelineX, itemY + 8, 5, 'F');
        
        // Círculo interior blanco
        doc.setFillColor(255, 255, 255);
        doc.circle(timelineX, itemY + 8, 3.5, 'F');
        
        // Número
        doc.setFontSize(7);
        doc.setTextColor(...accent);
        doc.setFont(undefined, 'bold');
        doc.text((historial.length - index).toString(), timelineX, itemY + 10, { align: 'center' });

        // ========== TARJETA DEL EVENTO ==========
        // Sombra
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(contentX + 0.5, itemY + 0.5, pageWidth - contentX - margin + 0.5, itemHeight - 5, 3, 3, 'F');
        
        // Fondo blanco
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(contentX, itemY, pageWidth - contentX - margin, itemHeight - 5, 3, 3, 'F');
        
        // Borde
        doc.setDrawColor(...border);
        doc.setLineWidth(0.3);
        doc.roundedRect(contentX, itemY, pageWidth - contentX - margin, itemHeight - 5, 3, 3, 'S');

        let contentY = itemY + 6;

        // ========== FECHA - Badge estilo moderno ==========
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(contentX + 3, contentY - 2, 70, 6, 3, 3, 'F');
        
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.setFont(undefined, 'normal');
        doc.text(formatDate(item.fecha_cambio), contentX + 5, contentY + 2);
        
        contentY += 8;

        // ========== USUARIO - En línea con badge de rol ==========
        doc.setFontSize(9);
        doc.setTextColor(...dark);
        doc.setFont(undefined, 'bold');
        doc.text(item.usuario, contentX + 3, contentY);
        
        // Badge de Colaborador
        const userNameWidth = doc.getTextWidth(item.usuario);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(contentX + userNameWidth + 6, contentY - 3, 22, 5, 2.5, 2.5, 'F');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.setFont(undefined, 'normal');
        doc.text('Colaborador', contentX + userNameWidth + 8, contentY + 0.5);
        
        contentY += 7;

        // ========== ESTADO - Box destacado ==========
        const estadoBoxWidth = pageWidth - contentX - margin - 6;
        
        // Fondo con gradiente simulado
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(contentX + 3, contentY - 1, estadoBoxWidth, 10, 2, 2, 'F');
        
        // Borde izquierdo de color
        doc.setFillColor(...accent);
        doc.roundedRect(contentX + 3, contentY - 1, 2, 10, 1, 1, 'F');
        
        // Texto del estado
        doc.setFontSize(11);
        doc.setTextColor(...primary);
        doc.setFont(undefined, 'bold');
        doc.text(item.estado_nuevo, contentX + 8, contentY + 6);
        
        contentY += 13;

        // ========== OBSERVACIONES ==========
        if (hasObs) {
          // Separador sutil
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.5);
          doc.line(contentX + 3, contentY - 1, pageWidth - margin - 3, contentY - 1);
          
          contentY += 3;

          // Icono y título
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.setFont(undefined, 'bold');
          doc.text('OBSERVACION', contentX + 3, contentY);
          
          contentY += 4;

          // Caja de observación
          doc.setFillColor(249, 250, 251);
          const obsBoxHeight = obsLines.length * 3.5 + 4;
          doc.roundedRect(contentX + 3, contentY - 2, estadoBoxWidth, obsBoxHeight, 2, 2, 'F');
          
          // Texto
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.setFont(undefined, 'normal');
          doc.text(obsLines, contentX + 5, contentY);
        }

        yPos += itemHeight + 3;
      });

      // ==================== PIE DE PÁGINA MODERNO ====================
      const footerY = pageHeight - 18;
      
      // Línea superior
      doc.setDrawColor(...accent);
      doc.setLineWidth(1);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      // Texto institucional
      doc.setFontSize(10);
      doc.setTextColor(...primary);
      doc.setFont(undefined, 'bold');
      doc.text('SISTEMA DE GESTIÓN DE EXPEDIENTES', pageWidth / 2, footerY + 6, { align: 'center' });
      
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      const footerDate = `Documento generado el ${new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })} a las ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(footerDate, pageWidth / 2, footerY + 11, { align: 'center' });

      // Guardar PDF
      const cleanExpNum = selectedExpediente.num_expediente.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `Historial_${cleanExpNum}_${timestamp}.pdf`;
      doc.save(fileName);
      
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Encabezado mejorado */}
        <div style={{
          background: 'linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%)',
          padding: '32px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px rgba(8, 63, 143, 0.3)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px'
            }}>
              📜
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 'bold',
                marginBottom: '8px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
              }}>
                Historial de Expedientes
              </h1>
              <p style={{ fontSize: '15px', opacity: 0.95 }}>
                Consulta la trazabilidad completa y genera reportes profesionales
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' }}>
          {/* Panel izquierdo - Lista de expedientes */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            height: 'fit-content'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#083f8f',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📋</span> Seleccionar Expediente
            </h2>

            {/* Buscador mejorado */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Buscar por N° o código..."
                value={searchTerm}
                onInput={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5d7'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px'
              }}>🔍</span>
            </div>

            {/* Contador de resultados */}
            <div style={{
              fontSize: '13px',
              color: '#6b7280',
              marginBottom: '12px',
              padding: '8px 12px',
              background: '#f9fafb',
              borderRadius: '6px'
            }}>
              {filteredExpedientes.length} expediente{filteredExpedientes.length !== 1 ? 's' : ''} encontrado{filteredExpedientes.length !== 1 ? 's' : ''}
            </div>

            {/* Lista de expedientes mejorada */}
            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {filteredExpedientes.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                  <p>No se encontraron expedientes</p>
                </div>
              ) : (
                filteredExpedientes.map(exp => (
                  <div
                    key={exp.id_expediente}
                    onClick={() => fetchHistorial(exp.id_expediente)}
                    style={{
                      padding: '14px',
                      border: '2px solid',
                      borderColor: selectedExpediente?.id_expediente === exp.id_expediente ? '#0ea5d7' : '#e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      background: selectedExpediente?.id_expediente === exp.id_expediente 
                        ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' 
                        : '#ffffff',
                      transition: 'all 0.3s ease',
                      transform: selectedExpediente?.id_expediente === exp.id_expediente ? 'translateX(4px)' : 'none',
                      boxShadow: selectedExpediente?.id_expediente === exp.id_expediente 
                        ? '0 4px 12px rgba(14, 165, 215, 0.2)' 
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedExpediente?.id_expediente !== exp.id_expediente) {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedExpediente?.id_expediente !== exp.id_expediente) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{
                      fontWeight: '700',
                      color: '#083f8f',
                      fontSize: '15px',
                      marginBottom: '6px'
                    }}>
                      📄 {exp.num_expediente}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      marginBottom: '8px',
                      lineHeight: '1.4'
                    }}>
                      {exp.firma_ruta}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: selectedExpediente?.id_expediente === exp.id_expediente 
                        ? 'rgba(14, 165, 215, 0.15)' 
                        : '#f3f4f6',
                      color: getEstadoColor(exp.estado)
                    }}>
                      {getEstadoIcon(exp.estado)} {exp.estado}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel derecho - Historial mejorado */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            minHeight: '600px'
          }}>
            {!selectedExpediente ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#6b7280'
              }}>
                <div style={{
                  fontSize: '80px',
                  marginBottom: '24px',
                  opacity: 0.5
                }}>📋</div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Selecciona un expediente
                </h3>
                <p style={{ fontSize: '15px' }}>
                  Elige un expediente de la lista para visualizar su historial completo
                </p>
              </div>
            ) : (
              <>
                {/* Encabezado del expediente mejorado */}
                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '10px',
                  padding: '20px',
                  marginBottom: '28px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <h2 style={{
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: '#083f8f',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <span style={{
                          fontSize: '28px',
                          background: 'linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>📜</span>
                        EXPEDIENTE N° {selectedExpediente.num_expediente}
                      </h2>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        <strong>Código:</strong> {selectedExpediente.firma_ruta}
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      background: 'white',
                      border: `2px solid ${getEstadoColor(selectedExpediente.estado)}`,
                      fontSize: '13px',
                      fontWeight: '700',
                      color: getEstadoColor(selectedExpediente.estado),
                      boxShadow: `0 2px 8px ${getEstadoColor(selectedExpediente.estado)}33`
                    }}>
                      {getEstadoIcon(selectedExpediente.estado)} {selectedExpediente.estado}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      padding: '10px',
                      background: 'white',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ color: '#6b7280', marginBottom: '4px' }}>Total de cambios</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#083f8f' }}>
                        {historial.length}
                      </div>
                    </div>
                    <div style={{
                      padding: '10px',
                      background: 'white',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ color: '#6b7280', marginBottom: '4px' }}>Último cambio</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#083f8f' }}>
                        {historial.length > 0 ? formatDateShort(historial[0].fecha_cambio) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Línea de tiempo del historial mejorada */}
                {loading ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #0ea5d7',
                      borderRadius: '50%',
                      margin: '0 auto 16px',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <div style={{ color: '#0ea5d7', fontSize: '16px', fontWeight: '600' }}>
                      Cargando historial...
                    </div>
                  </div>
                ) : error ? (
                  <div style={{
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    border: '2px solid #dc2626',
                    borderRadius: '8px',
                    padding: '20px',
                    color: '#dc2626',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{error}</div>
                  </div>
                ) : historial.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '60px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
                    <p style={{ color: '#6b7280', fontSize: '16px' }}>
                      No hay registros en el historial
                    </p>
                  </div>
                ) : (
                  <div ref={historialRef} style={{ position: 'relative' }}>
                    {/* Línea vertical mejorada */}
                    <div style={{
                      position: 'absolute',
                      left: '24px',
                      top: '0',
                      bottom: '0',
                      width: '3px',
                      background: 'linear-gradient(180deg, #0ea5d7 0%, #083f8f 100%)',
                      borderRadius: '2px',
                      opacity: 0.3
                    }}></div>

                    {historial.map((item, index) => (
                      <div
                        key={item.id_historial}
                        style={{
                          position: 'relative',
                          paddingLeft: '60px',
                          paddingBottom: '28px',
                          marginBottom: index < historial.length - 1 ? '8px' : '0'
                        }}
                      >
                        {/* Punto en la línea mejorado */}
                        <div style={{
                          position: 'absolute',
                          left: '14px',
                          top: '8px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #083f8f 0%, #0ea5d7 100%)',
                          border: '4px solid #ffffff',
                          boxShadow: '0 0 0 3px #0ea5d740, 0 4px 12px rgba(14, 165, 215, 0.4)',
                          zIndex: 1
                        }}></div>

                        {/* Contenido mejorado */}
                        <div style={{
                          background: '#ffffff',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          padding: '18px',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#0ea5d7';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(14, 165, 215, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        >
                          <div style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            fontWeight: '600',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ fontSize: '16px' }}>📅</span>
                            {formatDate(item.fecha_cambio)}
                          </div>

                          <div style={{
                            fontSize: '14px',
                            color: '#374151',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ fontSize: '16px' }}>👤</span>
                            <strong>{item.usuario}</strong>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: '#f3f4f6',
                              borderRadius: '10px',
                              color: '#6b7280'
                            }}>
                              Colaborador
                            </span>
                          </div>

                          <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: getEstadoColor(item.estado_nuevo),
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px',
                            background: `${getEstadoColor(item.estado_nuevo)}10`,
                            borderRadius: '8px',
                            border: `1px solid ${getEstadoColor(item.estado_nuevo)}30`
                          }}>
                            <span style={{ fontSize: '20px' }}>{getEstadoIcon(item.estado_nuevo)}</span>
                            {item.estado_nuevo}
                          </div>

                          {item.observaciones && (
                            <div style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              fontStyle: 'italic',
                              background: '#f9fafb',
                              padding: '12px',
                              borderRadius: '6px',
                              marginTop: '12px',
                              borderLeft: '3px solid #0ea5d7',
                              lineHeight: '1.6'
                            }}>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#083f8f',
                                marginBottom: '6px',
                                fontStyle: 'normal'
                              }}>
                                💬 Observación:
                              </div>
                              "{item.observaciones}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón de acción */}
                {historial.length > 0 && (
                  <div style={{
                    marginTop: '32px',
                    paddingTop: '28px',
                    borderTop: '2px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={handleExportPDF}
                      disabled={exporting || loading}
                      style={{
                        padding: '16px 48px',
                        background: exporting 
                          ? 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)' 
                          : 'linear-gradient(135deg, #0ea5d7 0%, #0bb5e7 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: (exporting || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(14, 165, 215, 0.3)',
                        opacity: (exporting || loading) ? 0.6 : 1,
                        minWidth: '280px'
                      }}
                      onMouseEnter={(e) => {
                        if (!exporting && !loading) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 215, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!exporting && !loading) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 215, 0.3)';
                        }
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{exporting ? '⏳' : '📊'}</span>
                      {exporting ? 'Generando PDF...' : 'Exportar PDF'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* CSS para animaciones */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Estilos para el scrollbar */
          div::-webkit-scrollbar {
            width: 8px;
          }
          
          div::-webkit-scrollbar-track {
            background: #f3f4f6;
            border-radius: 4px;
          }
          
          div::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
          }
          
          div::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
        `}
      </style>
    </div>
  );
}