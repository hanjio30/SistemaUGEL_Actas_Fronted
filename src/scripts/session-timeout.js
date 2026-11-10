const API_URL = import.meta.env.PUBLIC_API_URL;
const LIMITE_MS = 2 * 60 * 60 * 1000; // 2 horas
const CLAVE = 'ultima_actividad';
const LOGIN_URL = '/?expirada=1'; // ⚠ ajusta a la ruta real de tu login

let cerrando = false;

async function cerrarSesion() {
    if (cerrando) return;
    cerrando = true;
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            credentials: 'include',
        });
    } catch (_) {}
    sessionStorage.clear();
    localStorage.removeItem(CLAVE);
    window.location.href = LOGIN_URL;
}

function marcarActividad() {
    localStorage.setItem(CLAVE, Date.now().toString());
}

function haExpirado() {
    const ultima = parseInt(localStorage.getItem(CLAVE) || Date.now(), 10);
    return Date.now() - ultima >= LIMITE_MS;
}

function revisar() {
    if (haExpirado()) cerrarSesion();
}

// Al cargar la página: si el tiempo ya venció (por ejemplo, abrió el sistema
// después de varias horas), cierra sesión; si no, registra la actividad.
if (haExpirado()) {
    cerrarSesion();
} else {
    marcarActividad();
}

// Actividad real del usuario: registra en el navegador y avisa al backend
// (máximo 1 vez cada 5 minutos para no saturar el servidor)
let ultimoPing = 0;
['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev => {
    window.addEventListener(ev, () => {
        const ahora = Date.now();
        if (ahora - ultimoPing > 5 * 60 * 1000) {
            ultimoPing = ahora;
            marcarActividad();
            fetch(`${API_URL}/usuario-actual`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
            }).catch(() => {});
        }
    }, { passive: true });
});

// Revisión periódica y al volver a la pestaña
setInterval(revisar, 60 * 1000);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) revisar();
});

// Si cualquier petición al backend devuelve 401, volver al login
const fetchOriginal = window.fetch;
window.fetch = async (...args) => {
    const res = await fetchOriginal(...args);
    const url = String(args[0]?.url || args[0]);
    if (res.status === 401 && !url.includes('/login') && !cerrando) {
        cerrando = true;
        sessionStorage.clear();
        localStorage.removeItem(CLAVE);
        window.location.href = LOGIN_URL;
    }
    return res;
};