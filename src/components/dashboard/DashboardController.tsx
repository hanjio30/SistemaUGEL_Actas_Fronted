// src/components/dashboard/DashboardController.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
// Imports de módulos
import RecepcionModule from './modules/RecepcionModule';
import GestionModule from './modules/GestionModule';
import AtencionModule from './modules/AtencionModule';
import ObservadosModule from './modules/ObservadosModule';
import EntregaModule from './modules/EntregaModule';
import HistorialModule from './modules/HistorialModule';
import UsuariosModule from './modules/UsuariosModule';
import AsuntosModule from './modules/AsuntosModule';
import ReportesModule from './modules/ReportesModule';

interface Module {
  id: string;
  title: string;
  image: string;
  emoji: string;
}

interface User {
  nombre?: string;
  usuario?: string;
  rol?: string;
}

interface Props {
  colaboradorModules: Module[];
  adminModules: Module[];
}

export default function DashboardController({ colaboradorModules, adminModules }: Props) {
  const [activeModule, setActiveModule] = useState<string>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Verificar autenticación
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) {
      window.location.href = '/';
      return;
    }
    
    try {
      const usuario = JSON.parse(usuarioStr);
      setUser(usuario);
    } catch (e) {
      console.error('Error al parsear usuario:', e);
      window.location.href = '/';
    }

    // Actualizar fecha
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const date = new Date().toLocaleDateString('es-ES', options);
    setCurrentDate(date.charAt(0).toUpperCase() + date.slice(1));
  }, []);

  if (!user) return null;

  const isAdmin = user.rol?.toLowerCase() === 'administrador';
  const modules = isAdmin ? adminModules : colaboradorModules;
  const currentModule = modules.find(m => m.id === activeModule);

  const handleModuleClick = (moduleId: string) => {
    setActiveModule(moduleId);
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      sessionStorage.removeItem('usuario');
      window.location.href = '/';
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/logo.png" alt="UGEL Santa" className="sidebar-logo" />
          </div>
          <h2 className="sidebar-title">UGEL SANTA</h2>
          <p className="sidebar-subtitle">Actas y Certificaciones</p>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="user-details">
            <h3 className="user-name">{user.nombre || user.usuario || 'Usuario'}</h3>
            <span className="user-role">{user.rol || 'Colaborador'}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {modules.map(module => (
            <button
              key={module.id}
              className={`nav-item ${activeModule === module.id ? 'active' : ''}`}
              onClick={() => handleModuleClick(module.id)}
            >
              <span className="nav-emoji">{module.emoji}</span>
              <span>{module.title}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="header-title">
            {activeModule === 'welcome' ? (
              <>
                <h1>Bienvenido</h1>
                <p>Seleccione una opción del menú</p>
              </>
            ) : currentModule ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img 
                  src={currentModule.image} 
                  alt={currentModule.title} 
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }} 
                />
                <div>
                  <h1>{currentModule.title}</h1>
                  <p>Módulo de {currentModule.title.toLowerCase()}</p>
                </div>
              </div>
            ) : (
              <>
                <h1>Dashboard</h1>
                <p>Sistema de gestión</p>
              </>
            )}
          </div>
          <div className="header-actions">
            <div className="current-date">{currentDate}</div>
          </div>
        </header>

        <div className="content-body">
          {/* Welcome Screen */}
          {activeModule === 'welcome' && (
            <div className="module-content active">
              <div className="welcome-screen">
                <div className="welcome-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2>Bienvenido al Sistema</h2>
                <p>Área de Actas y Certificaciones - UGEL Santa</p>
                <div className="welcome-cards">
                  <div className="info-card">
                    <div className="info-icon blue">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3>Sistema de Gestión</h3>
                    <p>Administre expedientes y documentación de manera eficiente</p>
                  </div>
                  <div className="info-card">
                    <div className="info-icon green">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3>Seguimiento en Tiempo Real</h3>
                    <p>Monitoree el estado de todos los expedientes</p>
                  </div>
                  <div className="info-card">
                    <div className="info-icon purple">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3>Historial Completo</h3>
                    <p>Acceda al historial de todos los procedimientos</p>
                  </div>
                </div>
              </div>
            </div>
          )}

         {/* Módulos Implementados */}
{modules.map(module => {
  if (activeModule !== module.id) return null;
  
  return (
    <div key={module.id} className="module-content active">
      {module.id === 'recepcion' && <RecepcionModule />}
      {module.id === 'gestion' && <GestionModule />}
      {module.id === 'atencion' && <AtencionModule />}
      {module.id === 'observados' && <ObservadosModule />}
      {module.id === 'entrega' && <EntregaModule />}
      {module.id === 'historial' && <HistorialModule />}
      {module.id === 'usuarios' && <UsuariosModule />}
      {module.id === 'asuntos' && <AsuntosModule />}
      {module.id === 'reportes' && <ReportesModule />}
    </div>
  );
})}
        </div>
      </main>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay active"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}