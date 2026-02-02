/**
 * VDH ENTERPRISE - APP.JS
 * Versión: 6.0.0 (Admin Dashboard Completo)
 */

const CONFIG = {
    // 🔴 PEGA LA URL DE LA VERSIÓN 6.0 AQUÍ
    API_URL: "https://script.google.com/macros/s/AKfycbyubr3wxCftRobp80h3KUgzZymjqrnasvB5HaJfi81Hn3XDh0sP28uoIuOU3B46cPpP/exec"
};

const state = {
    dbId: null,
    role: null,
    masterKey: null,
    // Datos Admin
    listaAdmin: []
};

async function sendRequest(action, payload = {}) {
    if (state.dbId) payload.dbId = state.dbId;
    if (state.masterKey) payload.masterKey = state.masterKey;

    try {
        const response = await fetch(CONFIG.API_URL, { 
            method: "POST", body: JSON.stringify({ action, payload }) 
        });
        const text = await response.text();
        try { return JSON.parse(text); } 
        catch (e) { throw new Error("Server Error: " + text); }
    } catch (e) { throw e.message; }
}

const app = {
    init: function() {
        console.log("VDH v6.0 Ready");
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
        if(el) { document.getElementById('toast-message').innerText = msg; new bootstrap.Toast(el).show(); } 
        else { alert(msg); }
    },

    // --- LOGIN ---
    cargarListaEmpresas: function() {
        this.toggleLoader(true);
        const sel = document.getElementById('login-empresa-select');
        sendRequest("get_empresas_list").then(json => {
            sel.innerHTML = '<option value="" selected>Soy Administrador (Dejar vacío)</option>';
            if(json.data) json.data.forEach(emp => {
                let opt = document.createElement('option'); opt.value = emp.id; opt.text = emp.nombre; sel.appendChild(opt);
            });
        }).finally(() => this.toggleLoader(false));
    },

    login: function() {
        const empresaId = document.getElementById('login-empresa-select').value;
        const token = document.getElementById('login-token').value;
        if(!token) return alert("Ingrese el Token o Clave Maestra.");

        this.toggleLoader(true);
        sendRequest("login_empresa", { empresaId, token }).then(json => {
            const data = json.data || json;
            if(json.status === 'success') {
                state.role = data.role;
                
                if (state.role === 'CLIENT') {
                    state.dbId = data.dbId;
                    document.getElementById('nav-empresa-label').innerText = data.nombre;
                    this.mostrarPantalla('view-digitador');
                    this.fetchMetadata();
                } else if (state.role === 'ADMIN') {
                    state.masterKey = token;
                    this.mostrarPantalla('view-admin');
                    state.listaAdmin = data.listaEmpresas;
                    this.renderAdminDashboard();
                }
            } else { alert("❌ " + json.message); }
        }).finally(() => this.toggleLoader(false));
    },

    logout: function() {
        state.dbId = null; state.role = null; state.masterKey = null;
        document.getElementById('login-token').value = "";
        this.mostrarPantalla('view-login');
    },

    volverAlPanel: function() {
        if(state.role === 'ADMIN') {
            state.dbId = null; // Soltar la empresa que estábamos viendo
            this.mostrarPantalla('view-admin');
        } else {
            this.logout();
        }
    },

    // --- GESTIÓN SUPER ADMIN ---
    renderAdminDashboard: function() {
        const list = document.getElementById('admin-company-list');
        list.innerHTML = "";
        state.listaAdmin.forEach(emp => {
            list.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center company-row py-3">
                    <div>
                        <div class="fw-bold text-primary">${emp.nombre}</div>
                        <small class="text-muted font-monospace bg-light px-2 rounded">Token: ${emp.token}</small>
                    </div>
                    <div class="btn-group">
                        <button onclick="app.adminEntrarContador('${emp.dbId}', '${emp.nombre}')" class="btn btn-sm btn-outline-success" title="Entrar a Contabilidad"><i class="bi bi-box-arrow-in-right"></i> Entrar</button>
                        <button onclick="app.adminAbrirEditToken('${emp.id}')" class="btn btn-sm btn-outline-secondary" title="Cambiar Contraseña"><i class="bi bi-key"></i></button>
                        <button onclick="app.adminEliminarEmpresa('${emp.id}')" class="btn btn-sm btn-outline-danger" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </div>
                </li>
            `;
        });
    },

    refreshAdminList: function() {
        this.toggleLoader(true);
        // Simulamos un relogin rápido para traer la lista fresca
        sendRequest("login_empresa", { empresaId: "", token: state.masterKey }).then(json => {
            const data = json.data || json;
            state.listaAdmin = data.listaEmpresas;
            this.renderAdminDashboard();
        }).finally(() => this.toggleLoader(false));
    },

    adminCrearEmpresa: function() {
        const nombre = document.getElementById('admin-new-name').value;
        const token = document.getElementById('admin-new-token').value;
        if(!nombre || !token) return alert("Complete datos");
        this.toggleLoader(true);
        sendRequest("crear_empresa_saas", { nombre, tokenNuevo: token }).then(j => {
            if(j.status === 'success') { this.mostrarToast("Empresa creada"); this.refreshAdminList(); }
            else alert(j.message);
        }).finally(() => this.toggleLoader(false));
    },

    adminEliminarEmpresa: function(id) {
        if(!confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará la empresa del sistema. No se puede deshacer.")) return;
        this.toggleLoader(true);
        sendRequest("eliminar_empresa", { idEmpresa: id }).then(j => {
            if(j.status==='success') { this.mostrarToast("Eliminada"); this.refreshAdminList(); }
            else alert(j.message);
        }).finally(() => this.toggleLoader(false));
    },

    adminAbrirEditToken: function(id) {
        document.getElementById('edit-id-empresa').value = id;
        document.getElementById('edit-new-token').value = "";
        new bootstrap.Modal(document.getElementById('modalEditToken')).show();
    },

    adminGuardarToken: function() {
        const id = document.getElementById('edit-id-empresa').value;
        const nuevo = document.getElementById('edit-new-token').value;
        if(!nuevo) return alert("Escriba la nueva contraseña");
        this.toggleLoader(true);
        sendRequest("cambiar_token", { idEmpresa: id, nuevoToken: nuevo }).then(j => {
            if(j.status==='success') {
                this.mostrarToast("Contraseña actualizada");
                bootstrap.Modal.getInstance(document.getElementById('modalEditToken')).hide();
                this.refreshAdminList();
            } else alert(j.message);
        }).finally(() => this.toggleLoader(false));
    },

    // --- MODO DIOS (Admin entra a Empresa) ---
    adminEntrarContador: function(dbId, nombre) {
        state.dbId = dbId; // ¡Magia! Ahora todas las peticiones van a esa empresa
        document.getElementById('contador-empresa-label').innerText = nombre;
        this.mostrarPantalla('view-contador');
        this.contadorCargarDatos();
    },

    // --- CONTABILIDAD ---
    contadorCargarDatos: function() {
        this.toggleLoader(true);
        sendRequest("obtener_reporte_contable").then(json => {
            const data = json.data || json;
            // 1. Llenar Tabla Pendientes
            const tbody = document.getElementById('tabla-pendientes');
            tbody.innerHTML = "";
            if(data.pendientes.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">No hay horas pendientes de aprobación.</td></tr>';
            
            data.pendientes.forEach(p => {
                tbody.innerHTML += `
                    <tr>
                        <td>${p.fecha}</td>
                        <td><div class="fw-bold">${p.trabajador}</div><small class="text-muted">ID: ${p.id}</small></td>
                        <td class="text-center fw-bold text-primary">${p.total}h</td>
                        <td><small>${p.detalle}</small></td>
                        <td class="text-end">
                            <button onclick="app.contadorAccionHora(${p.row}, 'aprobar')" class="btn btn-sm btn-success me-1"><i class="bi bi-check"></i></button>
                            <button onclick="app.contadorAccionHora(${p.row}, 'rechazar')" class="btn btn-sm btn-danger"><i class="bi bi-x"></i></button>
                        </td>
                    </tr>
                `;
            });

            // 2. Llenar Config
            if(data.config) {
                document.getElementById('conf-noc-ini').value = data.config.HORA_NOCTURNA_INICIO;
                document.getElementById('conf-noc-fin').value = data.config.HORA_NOCTURNA_FIN;
                document.getElementById('conf-rec-noc').value = data.config.RECARGO_NOCTURNO;
            }
        }).finally(() => this.toggleLoader(false));
    },

    contadorAccionHora: function(row, action) {
        const apiAction = action === 'aprobar' ? 'aprobar_hora' : 'rechazar_hora';
        this.toggleLoader(true);
        sendRequest(apiAction, { row: row }).then(() => {
            this.contadorCargarDatos(); // Recargar tabla
            this.mostrarToast(action === 'aprobar' ? "Hora Aprobada" : "Hora Rechazada");
        }).finally(() => this.toggleLoader(false));
    },

    contadorGuardarConfig: function() {
        const data = {
            hora_noc_ini: document.getElementById('conf-noc-ini').value,
            hora_noc_fin: document.getElementById('conf-noc-fin').value,
            recargo_noc: document.getElementById('conf-rec-noc').value
        };
        this.toggleLoader(true);
        sendRequest("guardar_config", data).then(() => {
            this.mostrarToast("Configuración guardada");
        }).finally(() => this.toggleLoader(false));
    },

    // --- DIGITADOR ---
    fetchMetadata: function() {
        sendRequest("get_metadata").then(json => {
            if(json.data) { this.llenarSelect('inputTrabajador', json.data.empleados); this.llenarSelect('inputCliente', json.data.clientes); }
        });
    },
    llenarSelect: function(id, arr) { const s=document.getElementById(id); s.innerHTML='<option selected disabled>Seleccione...</option>'; if(arr)arr.forEach(x=>{let o=document.createElement('option');o.value=x;o.text=x;s.appendChild(o)}); },
    guardarHoras: function(e) {
        e.preventDefault(); this.toggleLoader(true);
        const d = { registros: [{ trabajador:document.getElementById('inputTrabajador').value, fecha:document.getElementById('inputFecha').value, cliente:document.getElementById('inputCliente').value, trabajo:document.getElementById('inputActividad').value, entrada:document.getElementById('inputEntrada').value, salida:document.getElementById('inputSalida').value, almuerzo:document.getElementById('checkAlmuerzo').checked }] };
        sendRequest("registrar_horas", d).then(j=>{ if(j.status==='success'){this.mostrarToast("Guardado");document.getElementById('form-horas').reset();}else alert(j.message); }).finally(()=>this.toggleLoader(false));
    }
};

const modals = {
    nuevoTrabajador: () => new bootstrap.Modal(document.getElementById('modalTrabajador')).show(),
    guardarTrabajador: () => { const n=document.getElementById('new-worker-name').value; const s=document.getElementById('new-worker-salary').value; if(n&&s){ app.toggleLoader(true); sendRequest("crear_trabajador",{nombre:n,salario:s}).then(()=>{app.mostrarToast("Creado");bootstrap.Modal.getInstance(document.getElementById('modalTrabajador')).hide();app.fetchMetadata();}).finally(()=>app.toggleLoader(false)); } },
    nuevoCliente: () => new bootstrap.Modal(document.getElementById('modalCliente')).show(),
    guardarCliente: () => { const n=document.getElementById('new-client-name').value; if(n){ app.toggleLoader(true); sendRequest("crear_cliente",{nombre:n}).then(()=>{app.mostrarToast("Creado");bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();app.fetchMetadata();}).finally(()=>app.toggleLoader(false)); } }
};

window.app = app; window.modals = modals;
document.addEventListener('DOMContentLoaded', () => app.init());
