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
import WelcomeScreen from './WelcomeScreen';

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
    import('../../scripts/session-timeout.js');
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
    <WelcomeScreen user={user} modules={modules} onSelect={handleModuleClick} />
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