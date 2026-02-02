/**
 * VDH ENTERPRISE - APP.JS
 * Versión: 5.0.0 (Multi-Role Logic)
 */

const CONFIG = {
    // 🔴 PEGA AQUÍ TU URL DE LA NUEVA VERSIÓN 5.0
    API_URL: "https://script.google.com/macros/s/AKfycbyubr3wxCftRobp80h3KUgzZymjqrnasvB5HaJfi81Hn3XDh0sP28uoIuOU3B46cPpP/exec"
};

const state = {
    dbId: null,
    role: null, // 'ADMIN' o 'CLIENT'
    masterKey: null, // Solo se guarda si es admin
    tokenSesion: null
};

// --- BRIDGE ---
async function sendRequest(action, payload = {}) {
    if (state.dbId) payload.dbId = state.dbId;
    
    // Inyectamos MasterKey si existe en sesión (para acciones de admin)
    if (state.masterKey) payload.masterKey = state.masterKey;

    try {
        const response = await fetch(CONFIG.API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action, payload }) 
        });
        const text = await response.text();
        try { return JSON.parse(text); } 
        catch (e) { throw new Error("Respuesta inválida del servidor: " + text); }
    } catch (e) {
        throw e.message; 
    }
}

// --- APP CORE ---
const app = {
    init: function() {
        console.log("VDH Enterprise v5.0");
        document.getElementById('btn-login-action')?.addEventListener('click', () => this.login());
        document.getElementById('form-horas')?.addEventListener('submit', (e) => this.guardarHoras(e));
        this.verificarSesion();
    },

    verificarSesion: function() {
        this.mostrarPantalla('view-login');
        this.cargarListaEmpresas();
    },

    mostrarPantalla: function(viewId) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('d-none'));
        document.getElementById(viewId)?.classList.remove('d-none');
    },

    toggleLoader: function(show) {
        const el = document.getElementById('loader');
        if(el) show ? el.classList.remove('d-none') : el.classList.add('d-none');
    },

    mostrarToast: function(msg) {
        const el = document.getElementById('liveToast');
        if(el) {
            document.getElementById('toast-message').innerText = msg;
            new bootstrap.Toast(el).show();
        } else { alert(msg); }
    },

    // --- LOGIN SYSTEM ---
    cargarListaEmpresas: function() {
        this.toggleLoader(true);
        const sel = document.getElementById('login-empresa-select');
        sendRequest("get_empresas_list").then(json => {
            sel.innerHTML = '<option value="" selected>Soy Administrador (Dejar vacío)</option>';
            if(json.data) json.data.forEach(emp => {
                let opt = document.createElement('option');
                opt.value = emp.id; opt.text = emp.nombre;
                sel.appendChild(opt);
            });
        }).catch(console.error).finally(() => this.toggleLoader(false));
    },

    login: function() {
        const empresaId = document.getElementById('login-empresa-select').value;
        const token = document.getElementById('login-token').value;
        
        if(!token) return alert("Ingrese el Token o Clave Maestra.");

        this.toggleLoader(true);
        sendRequest("login_empresa", { empresaId, token }).then(json => {
            const data = json.data || json; // Compatibilidad

            if(json.status === 'success') {
                state.role = data.role;
                
                // RUTA 1: ES UN CLIENTE (DIGITADOR)
                if (state.role === 'CLIENT') {
                    state.dbId = data.dbId;
                    document.getElementById('nav-empresa-label').innerText = data.nombre;
                    this.mostrarPantalla('view-digitador');
                    this.fetchMetadata();
                } 
                // RUTA 2: ES EL SUPER ADMIN (TÚ)
                else if (state.role === 'ADMIN') {
                    state.masterKey = token; // Guardamos la llave para futuras peticiones
                    this.mostrarPantalla('view-admin');
                    this.renderAdminDashboard(data.listaEmpresas);
                }
            } else {
                alert("❌ Acceso Denegado: " + json.message);
            }
        }).catch(e => alert("Error: " + e)).finally(() => this.toggleLoader(false));
    },

    logout: function() {
        state.dbId = null; state.role = null; state.masterKey = null;
        document.getElementById('login-token').value = "";
        this.mostrarPantalla('view-login');
    },

    // --- MÓDULO CLIENTE (DIGITADOR) ---
    fetchMetadata: function() {
        this.toggleLoader(true);
        sendRequest("get_metadata").then(json => {
            if(json.status === 'success') {
                this.llenarSelect('inputTrabajador', json.data.empleados);
                this.llenarSelect('inputCliente', json.data.clientes);
            }
        }).finally(() => this.toggleLoader(false));
    },
    
    llenarSelect: function(id, arr) {
        const sel = document.getElementById(id);
        sel.innerHTML = '<option value="" disabled selected>Seleccione...</option>';
        if(arr) arr.forEach(x => { let o=document.createElement('option'); o.value=x; o.text=x; sel.appendChild(o); });
    },

    guardarHoras: function(e) {
        e.preventDefault();
        this.toggleLoader(true);
        const datos = { registros: [{
            trabajador: document.getElementById('inputTrabajador').value,
            fecha: document.getElementById('inputFecha').value,
            cliente: document.getElementById('inputCliente').value,
            trabajo: document.getElementById('inputActividad').value,
            entrada: document.getElementById('inputEntrada').value,
            salida: document.getElementById('inputSalida').value,
            almuerzo: document.getElementById('checkAlmuerzo').checked
        }]};
        sendRequest("registrar_horas", datos).then(j => {
            if(j.status==='success') { this.mostrarToast("Guardado OK"); document.getElementById('form-horas').reset(); }
            else alert(j.message);
        }).finally(()=>this.toggleLoader(false));
    },

    // --- MÓDULO SUPER ADMIN ---
    renderAdminDashboard: function(empresas) {
        const list = document.getElementById('admin-company-list');
        list.innerHTML = "";
        empresas.forEach(emp => {
            list.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${emp.nombre}</div>
                        <small class="text-muted">Token: ${emp.token}</small>
                    </div>
                    <span class="badge bg-success rounded-pill">ACTIVO</span>
                </li>
            `;
        });
    },

    adminCrearEmpresa: function() {
        const nombre = document.getElementById('admin-new-name').value;
        const token = document.getElementById('admin-new-token').value;
        if(!nombre || !token) return alert("Complete los datos");

        this.toggleLoader(true);
        sendRequest("crear_empresa_saas", { nombre, tokenNuevo: token }).then(json => {
            if(json.status === 'success') {
                alert("✅ EMPRESA CREADA EXITOSAMENTE.\nEl sistema ha fabricado el Excel y configurado todo.");
                document.getElementById('admin-new-name').value = "";
                document.getElementById('admin-new-token').value = "";
                // Recargar lista (truco rápido: reloguear o pedir lista de nuevo)
                this.logout(); 
                alert("Por seguridad, inicia sesión de nuevo para ver la lista actualizada.");
            } else {
                alert("Error: " + json.message);
            }
        }).catch(e => alert(e)).finally(() => this.toggleLoader(false));
    }
};

const modals = {
    nuevoTrabajador: () => new bootstrap.Modal(document.getElementById('modalTrabajador')).show(),
    guardarTrabajador: () => { 
        const n = document.getElementById('new-worker-name').value; const s = document.getElementById('new-worker-salary').value;
        if(n&&s) { app.toggleLoader(true); sendRequest("crear_trabajador",{nombre:n,salario:s}).then(()=>{app.mostrarToast("Creado");bootstrap.Modal.getInstance(document.getElementById('modalTrabajador')).hide();app.fetchMetadata();}).finally(()=>app.toggleLoader(false)); }
    },
    nuevoCliente: () => new bootstrap.Modal(document.getElementById('modalCliente')).show(),
    guardarCliente: () => {
        const n = document.getElementById('new-client-name').value;
        if(n) { app.toggleLoader(true); sendRequest("crear_cliente",{nombre:n}).then(()=>{app.mostrarToast("Creado");bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();app.fetchMetadata();}).finally(()=>app.toggleLoader(false)); }
    }
};

window.app = app; window.modals = modals;
document.addEventListener('DOMContentLoaded', () => app.init());
