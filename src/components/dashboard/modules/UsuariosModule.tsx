/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

export default function UsuariosModule() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [buscar, setBuscar] = useState('');

  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    administradores: 0,
    colaboradores: 0
  });

  const [formData, setFormData] = useState({
    nombre_completo: '',
    dni: '',
    telefono: '',
    usuario: '',
    correo: '',
    contrasena: '',
    confirmar_contrasena: '',
    rol: 'Colaborador',
    estado: 'Activo'
  });

  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    cargarUsuarios();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      
      let url = `${API_URL}/usuarios`;
      const params = new URLSearchParams();
      
      if (filtroEstado !== 'Todos') params.append('estado', filtroEstado);
      if (filtroRol !== 'Todos') params.append('rol', filtroRol);
      if (buscar.trim()) params.append('buscar', buscar);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }
      
      const data = await response.json();
      setUsuarios(data);
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios/estadisticas`);
      if (response.ok) {
        const data = await response.json();
        setEstadisticas(data);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, [filtroEstado, filtroRol, buscar]);

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setEditingUser(usuario);
      setFormData({
        nombre_completo: usuario.nombre_completo,
        dni: usuario.dni,
        telefono: usuario.telefono || '',
        usuario: usuario.usuario,
        correo: usuario.correo,
        contrasena: '',
        confirmar_contrasena: '',
        rol: usuario.rol,
        estado: usuario.estado
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre_completo: '',
        dni: '',
        telefono: '',
        usuario: '',
        correo: '',
        contrasena: '',
        confirmar_contrasena: '',
        rol: 'Colaborador',
        estado: 'Activo'
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validarFormulario = () => {
    if (!formData.nombre_completo.trim()) {
      setError('El nombre completo es obligatorio');
      return false;
    }
    if (!formData.dni.trim() || formData.dni.length !== 8) {
      setError('El DNI debe tener exactamente 8 dígitos');
      return false;
    }
    if (!/^\d{8}$/.test(formData.dni)) {
      setError('El DNI debe contener solo números');
      return false;
    }
    if (formData.telefono && !/^\d{9}$/.test(formData.telefono)) {
      setError('El teléfono debe tener 9 dígitos');
      return false;
    }
    if (!formData.usuario.trim()) {
      setError('El usuario es obligatorio');
      return false;
    }
    if (formData.usuario.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres');
      return false;
    }
    if (!formData.correo.trim()) {
      setError('El correo es obligatorio');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      setError('Ingrese un correo válido');
      return false;
    }
    
    if (!editingUser) {
      if (!formData.contrasena) {
        setError('La contraseña es obligatoria');
        return false;
      }
      if (formData.contrasena.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
      if (formData.contrasena !== formData.confirmar_contrasena) {
        setError('Las contraseñas no coinciden');
        return false;
      }
    } else if (formData.contrasena) {
      if (formData.contrasena.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
      if (formData.contrasena !== formData.confirmar_contrasena) {
        setError('Las contraseñas no coinciden');
        return false;
      }
    }

    return true;
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;

    try {
      const payload = {
        nombre_completo: formData.nombre_completo.trim(),
        dni: formData.dni.trim(),
        telefono: formData.telefono.trim() || null,
        usuario: formData.usuario.trim(),
        correo: formData.correo.trim(),
        rol: formData.rol,
        estado: formData.estado
      };

      if (!editingUser || formData.contrasena) {
        payload.contrasena = formData.contrasena;
      }

      const url = editingUser 
        ? `${API_URL}/usuarios/${editingUser.id}`
        : `${API_URL}/usuarios`;
      
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0][0];
          throw new Error(firstError);
        }
        throw new Error(data.message || 'Error al guardar usuario');
      }

      setSuccess(editingUser ? '✅ Usuario actualizado exitosamente' : '✅ Usuario creado exitosamente');
      cerrarModal();
      cargarUsuarios();
      cargarEstadisticas();
    } catch (err) {
      setError(err.message || 'Error al guardar usuario');
    }
  };

  const cambiarEstado = async (id, estadoActual, nombreUsuario) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    const accion = nuevoEstado === 'Activo' ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Está seguro de ${accion} al usuario "${nombreUsuario}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/usuarios/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cambiar estado');
      }

      setSuccess(`✅ Usuario ${nuevoEstado.toLowerCase()} exitosamente`);
      cargarUsuarios();
      cargarEstadisticas();
    } catch (err) {
      setError(err.message || 'Error al cambiar estado');
    }
  };

  const eliminarUsuario = async (id, nombreUsuario) => {
    if (!confirm(`¿Está seguro de eliminar al usuario "${nombreUsuario}"?\n\n⚠️ Esta acción no se puede deshacer y eliminará todos los datos asociados.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al eliminar usuario');
      }

      setSuccess('✅ Usuario eliminado exitosamente');
      cargarUsuarios();
      cargarEstadisticas();
    } catch (err) {
      setError(err.message || 'Error al eliminar usuario');
    }
  };

  const getInitials = (nombre) => {
    const words = nombre.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '24px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#083f8f', margin: '0 0 8px 0' }}>
              👥 Gestión de Usuarios
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
              Administra los usuarios del sistema
            </p>
          </div>
          <button
            onClick={() => abrirModal()}
            style={{
              backgroundColor: '#083f8f',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0ea5d7'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#083f8f'}
          >
            ➕ Nuevo Usuario
          </button>
        </div>

        {/* Estadísticas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '6px',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
              TOTAL USUARIOS
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#083f8f' }}>
              {estadisticas.total}
            </div>
          </div>
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#d1fae5', 
            borderRadius: '6px',
            border: '2px solid #10b981'
          }}>
            <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px', fontWeight: '600' }}>
              ACTIVOS
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
              {estadisticas.activos}
            </div>
          </div>
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#fee2e2', 
            borderRadius: '6px',
            border: '2px solid #dc2626'
          }}>
            <div style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: '4px', fontWeight: '600' }}>
              INACTIVOS
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>
              {estadisticas.inactivos}
            </div>
          </div>
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#fef3c7', 
            borderRadius: '6px',
            border: '2px solid #f59e0b'
          }}>
            <div style={{ fontSize: '12px', color: '#78350f', marginBottom: '4px', fontWeight: '600' }}>
              ADMINISTRADORES
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
              {estadisticas.administradores}
            </div>
          </div>
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#dbeafe', 
            borderRadius: '6px',
            border: '2px solid #0ea5d7'
          }}>
            <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px', fontWeight: '600' }}>
              COLABORADORES
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0ea5d7' }}>
              {estadisticas.colaboradores}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #dc2626',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '600'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#d1fae5',
          border: '2px solid #10b981',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '600'
        }}>
          <span>{success}</span>
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, usuario, DNI o correo..."
            value={buscar}
            onInput={(e) => setBuscar(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">✅ Activos</option>
            <option value="Inactivo">❌ Inactivos</option>
          </select>
        </div>
        <div>
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="Todos">Todos los roles</option>
            <option value="Administrador">👑 Administradores</option>
            <option value="Colaborador">👤 Colaboradores</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>Cargando usuarios...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    color: '#083f8f', 
                    fontWeight: '700',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    USUARIO
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    color: '#083f8f', 
                    fontWeight: '700',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    DNI
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    color: '#083f8f', 
                    fontWeight: '700',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    CONTACTO
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'center', 
                    color: '#083f8f', 
                    fontWeight: '700',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    ROL
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'center', 
                    color: '#083f8f', 
                    fontWeight: '700',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    ESTADO
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'center', 
                    color: '#083f8f', 
                    fontWeight: '700',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    ACCIONES
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                      <div style={{ fontSize: '16px', fontWeight: '500' }}>No hay usuarios registrados</div>
                      <div style={{ fontSize: '14px', marginTop: '8px' }}>Crea el primer usuario usando el botón "Nuevo Usuario"</div>
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario, index) => (
                    <tr 
                      key={usuario.id} 
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#083f8f',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '16px',
                            flexShrink: '0'
                          }}>
                            {getInitials(usuario.nombre_completo)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#083f8f', fontSize: '14px' }}>
                              {usuario.nombre_completo}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              @{usuario.usuario}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                          {usuario.dni}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '13px', color: '#374151' }}>
                          📧 {usuario.correo}
                        </div>
                        {usuario.telefono && (
                          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            📱 {usuario.telefono}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: usuario.rol === 'Administrador' ? '#fef3c7' : '#dbeafe',
                          color: usuario.rol === 'Administrador' ? '#78350f' : '#1e40af',
                          display: 'inline-block'
                        }}>
                          {usuario.rol === 'Administrador' ? '👑 ' : '👤 '}
                          {usuario.rol}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: usuario.estado === 'Activo' ? '#d1fae5' : '#fee2e2',
                          color: usuario.estado === 'Activo' ? '#065f46' : '#7f1d1d',
                          display: 'inline-block'
                        }}>
                          {usuario.estado === 'Activo' ? '✅ ' : '❌ '}
                          {usuario.estado}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => abrirModal(usuario)}
                            style={{
                              backgroundColor: '#0ea5d7',
                              color: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#0891b2'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#0ea5d7'}
                            title="Editar usuario"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => cambiarEstado(usuario.id, usuario.estado, usuario.nombre_completo)}
                            style={{
                              backgroundColor: usuario.estado === 'Activo' ? '#f59e0b' : '#10b981',
                              color: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.opacity = '0.8'}
                            onMouseOut={(e) => e.target.style.opacity = '1'}
                            title={usuario.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                          >
                            {usuario.estado === 'Activo' ? '🔒' : '🔓'}
                          </button>
                          <button
                            onClick={() => eliminarUsuario(usuario.id, usuario.nombre_completo)}
                            style={{
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                            title="Eliminar usuario"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '0',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '24px',
              borderBottom: '2px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#083f8f',
                margin: '0'
              }}>
                {editingUser ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '8px 0 0 0'
              }}>
                {editingUser 
                  ? 'Modifica la información del usuario' 
                  : 'Completa todos los campos obligatorios'}
              </p>
            </div>

            {/* Contenido del Modal */}
            <div style={{ 
              padding: '24px',
              overflowY: 'auto',
              flex: '1'
            }}>
              <form onSubmit={guardarUsuario}>
                {/* Grid de 2 columnas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* Nombre Completo */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      name="nombre_completo"
                      value={formData.nombre_completo}
                      onInput={handleInputChange}
                      placeholder="Juan Pérez García"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      required
                    />
                  </div>

                  {/* DNI */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      DNI *
                    </label>
                    <input
                      type="text"
                      name="dni"
                      value={formData.dni}
                      onInput={handleInputChange}
                      placeholder="12345678"
                      maxLength="8"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      8 dígitos
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      value={formData.telefono}
                      onInput={handleInputChange}
                      placeholder="987654321"
                      maxLength="9"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      Opcional, 9 dígitos
                    </div>
                  </div>

                  {/* Usuario */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      Usuario *
                    </label>
                    <input
                      type="text"
                      name="usuario"
                      value={formData.usuario}
                      onInput={handleInputChange}
                      placeholder="jperez"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      Mín. 3 caracteres
                    </div>
                  </div>

                  {/* Correo */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      Correo *
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onInput={handleInputChange}
                      placeholder="usuario@ejemplo.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      required
                    />
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      Contraseña {!editingUser && '*'}
                    </label>
                    <input
                      type="password"
                      name="contrasena"
                      value={formData.contrasena}
                      onInput={handleInputChange}
                      placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      required={!editingUser}
                    />
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      {editingUser ? 'Dejar vacío para mantener actual' : 'Mínimo 6 caracteres'}
                    </div>
                  </div>

                  {/* Confirmar Contraseña */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '8px',
                      fontSize: '13px'
                    }}>
                      Confirmar {!editingUser && '*'}
                    </label>
                    <input
                      type="password"
                      name="confirmar_contrasena"
                      value={formData.confirmar_contrasena}
                      onInput={handleInputChange}
                      placeholder="Repite la contraseña"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#083f8f'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      required={!editingUser || formData.contrasena}
                    />
                  </div>
                </div>

                {/* Rol y Estado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {/* Rol */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '12px',
                      fontSize: '13px'
                    }}>
                      Rol *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '12px',
                        border: '2px solid',
                        borderColor: formData.rol === 'Administrador' ? '#083f8f' : '#e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: formData.rol === 'Administrador' ? '#f0f9ff' : '#ffffff',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="rol"
                          value="Administrador"
                          checked={formData.rol === 'Administrador'}
                          onChange={handleInputChange}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ 
                          color: '#374151',
                          fontWeight: formData.rol === 'Administrador' ? '700' : '400',
                          fontSize: '13px'
                        }}>
                          👑 Administrador
                        </span>
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '12px',
                        border: '2px solid',
                        borderColor: formData.rol === 'Colaborador' ? '#083f8f' : '#e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: formData.rol === 'Colaborador' ? '#f0f9ff' : '#ffffff',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="rol"
                          value="Colaborador"
                          checked={formData.rol === 'Colaborador'}
                          onChange={handleInputChange}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ 
                          color: '#374151',
                          fontWeight: formData.rol === 'Colaborador' ? '700' : '400',
                          fontSize: '13px'
                        }}>
                          👤 Colaborador
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      color: '#374151', 
                      fontWeight: '700', 
                      marginBottom: '12px',
                      fontSize: '13px'
                    }}>
                      Estado *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '12px',
                        border: '2px solid',
                        borderColor: formData.estado === 'Activo' ? '#10b981' : '#e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: formData.estado === 'Activo' ? '#d1fae5' : '#ffffff',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="estado"
                          value="Activo"
                          checked={formData.estado === 'Activo'}
                          onChange={handleInputChange}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ 
                          color: '#374151',
                          fontWeight: formData.estado === 'Activo' ? '700' : '400',
                          fontSize: '13px'
                        }}>
                          ✅ Activo
                        </span>
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        padding: '12px',
                        border: '2px solid',
                        borderColor: formData.estado === 'Inactivo' ? '#dc2626' : '#e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: formData.estado === 'Inactivo' ? '#fee2e2' : '#ffffff',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="estado"
                          value="Inactivo"
                          checked={formData.estado === 'Inactivo'}
                          onChange={handleInputChange}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ 
                          color: '#374151',
                          fontWeight: formData.estado === 'Inactivo' ? '700' : '400',
                          fontSize: '13px'
                        }}>
                          ❌ Inactivo
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Error en el modal */}
                {error && (
                  <div style={{
                    backgroundColor: '#fee2e2',
                    border: '2px solid #dc2626',
                    color: '#dc2626',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Footer del Modal */}
            <div style={{
              padding: '24px',
              borderTop: '2px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={cerrarModal}
                style={{
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={guardarUsuario}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                💾 {editingUser ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}