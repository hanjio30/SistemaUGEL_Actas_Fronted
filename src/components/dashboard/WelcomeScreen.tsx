// src/components/dashboard/WelcomeScreen.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import './WelcomeScreen.css';

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
  user: User;
  modules: Module[];
  onSelect: (moduleId: string) => void;
}

/** Etapas del expediente, en el orden en que avanza el trámite. */
const FLOW_IDS = ['recepcion', 'gestion', 'atencion', 'observados', 'entrega'];

/** Nombres cortos para la ruta (el nombre completo queda en el tooltip y el lector de pantalla). */
const SHORT_LABELS: Record<string, string> = {
  recepcion: 'Recepción',
  gestion: 'Gestión',
  atencion: 'Atención',
  observados: 'Observados',
  entrega: 'Entrega',
};

const DESCRIPTIONS: Record<string, string> = {
  recepcion: 'Registra los expedientes que ingresan',
  gestion: 'Visualiza, edita y elimina expedientes registrados',
  atencion: 'Atiende los expedientes asignados',
  observados: 'Subsana los expedientes con observaciones',
  entrega: 'Entrega actas y certificados al solicitante',
  historial: 'Consulta los trámites anteriores',
  usuarios: 'Administra cuentas y roles',
  asuntos: 'Configura los tipos de trámite',
  reportes: 'Genera reportes y estadísticas',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getFirstName(user: User): string {
  const full = (user.nombre || user.usuario || '').trim();
  if (!full) return '';
  const first = full.split(/\s+/)[0].toLowerCase();
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const ArrowIcon = () => (
  <svg className="ws-tile-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 5v14M5 12h14" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function WelcomeScreen({ user, modules, onSelect }: Props) {
  const has = (id: string) => modules.some(m => m.id === id);

  const flow = FLOW_IDS
    .map(id => modules.find(m => m.id === id))
    .filter((m): m is Module => Boolean(m));

  const others = modules.filter(m => !FLOW_IDS.includes(m.id));
  const firstName = getFirstName(user);

  return (
    <div className="ws">
      <section className="ws-hero" aria-labelledby="ws-title">
        <h2 id="ws-title" className="ws-title">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="ws-lead">
          Así avanza un expediente por el sistema. Entra a cualquier etapa para continuar tu trabajo.
        </p>

        {(has('recepcion') || has('historial')) && (
          <div className="ws-actions">
            {has('recepcion') && (
              <button type="button" className="ws-btn ws-btn-primary" onClick={() => onSelect('recepcion')}>
                <PlusIcon />
                Recibir expediente
              </button>
            )}
            {has('historial') && (
              <button type="button" className="ws-btn ws-btn-ghost" onClick={() => onSelect('historial')}>
                <ClockIcon />
                Consultar historial
              </button>
            )}
          </div>
        )}

        {flow.length > 0 && (
          <ol className="ws-track" style={`--ws-steps:${flow.length}`}>
            {flow.map((module, i) => (
              <li key={module.id} className="ws-step" style={`--i:${i}`}>
                <button
                  type="button"
                  className="ws-step-btn"
                  title={module.title}
                  aria-label={`${module.title}. ${DESCRIPTIONS[module.id] || ''}`}
                  onClick={() => onSelect(module.id)}
                >
                  <span className="ws-node">{i + 1}</span>
                  <span className="ws-step-text">
                    <span className="ws-step-title">{SHORT_LABELS[module.id] || module.title}</span>
                    <span className="ws-step-desc">{DESCRIPTIONS[module.id]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby="ws-others">
          <h3 id="ws-others" className="ws-section-title">Otras herramientas</h3>
          <div className="ws-grid">
            {others.map(module => (
              <button
                key={module.id}
                type="button"
                className="ws-tile"
                onClick={() => onSelect(module.id)}
              >
                <span className="ws-tile-media">
                  {module.image ? (
                    <img src={module.image} alt="" />
                  ) : (
                    <span aria-hidden="true">{module.emoji}</span>
                  )}
                </span>
                <span className="ws-tile-text">
                  <span className="ws-tile-title">{module.title}</span>
                  <span className="ws-tile-desc">
                    {DESCRIPTIONS[module.id] || `Módulo de ${module.title.toLowerCase()}`}
                  </span>
                </span>
                <ArrowIcon />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}