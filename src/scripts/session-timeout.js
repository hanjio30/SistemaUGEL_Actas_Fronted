const LIMITE_MS = 2 * 60 * 60 * 1000; // 2 horas
const CLAVE = 'ultima_actividad';
const LOGIN_URL = '/?expirada=1';

let cerrando = false;

function cerrarSesion() {
    if (cerrando) return;
    cerrando = true;
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

if (haExpirado()) {
    cerrarSesion();
} else {
    marcarActividad();
}

let ultimoRegistro = 0;
['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev => {
    window.addEventListener(ev, () => {
        const ahora = Date.now();
        if (ahora - ultimoRegistro > 30000) {
            ultimoRegistro = ahora;
            marcarActividad();
        }
    }, { passive: true });
});

setInterval(() => { if (haExpirado()) cerrarSesion(); }, 60 * 1000);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && haExpirado()) cerrarSesion();
});