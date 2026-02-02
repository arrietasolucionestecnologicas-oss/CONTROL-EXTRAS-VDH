/**
 * VDH CONTABLE SYSTEM - FRONTEND SAAS
 * Versión: 4.6.0 (Producción Final - Login Fix + Diagnóstico)
 */

const CONFIG = {
    // URL de tu última implementación
    API_URL: "https://script.google.com/macros/s/AKfycbyubr3wxCftRobp80h3KUgzZymjqrnasvB5HaJfi81Hn3XDh0sP28uoIuOU3B46cPpP/exec" 
};

// --- ESTADO GLOBAL ---
const state = {
    dbId: null,
    empresaNombre: null, 
    trabajadores: [],
    clientes: [],
    tokenSesion: null
};

// --- NÚCLEO DE COMUNICACIÓN (MODO DETECTIVE) ---
async function sendRequest(action, payload = {}) {
    if (state.dbId) payload.dbId = state.dbId;

    // Usamos text/plain para evitar bloqueos estrictos de CORS
    const options = { 
        method: "POST", 
        body: JSON.stringify({ action: action, payload: payload }) 
    };
    
    try {
        const response = await fetch(CONFIG.API_URL, options);
        
        // Si Google devuelve un error HTTP (ej: 404, 500, 401)
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} (${response.statusText})`);
        }

        const text = await response.text();
        
        // Intentamos leer el JSON
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Respuesta no es JSON:", text);
            throw new Error("El servidor respondió basura (HTML en vez de JSON). Mira la consola.");
        }

    } catch (e) {
        console.error("FALLO CRÍTICO DE RED:", e);
        // Lanzamos el error hacia arriba para mostrarlo en pantalla
        throw e.message; 
    }
}

// --- APP PRINCIPAL ---
const app = {
    init: function() {
        console.log("VDH SaaS Iniciado v4.6");
        
        const btnLogin = document.getElementById('btn-login-action');
        if(btnLogin) btnLogin.addEventListener('click', () => this.login());

        const formHoras = document.getElementById('form-horas');
        if(formHoras) formHoras.addEventListener('submit', (e) => this.guardarHoras(e));

        this.verificarSesion();
    },

    verificarSesion: function() {
        this.mostrarPantalla('view-login');
        this.cargarListaEmpresas();
    },

    mostrarPantalla: function(viewId) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.add('d-none'));
        const target = document.getElementById(viewId);
        if(target) target.classList.remove('d-none');
    },

    toggleLoader: function(show) {
        const el = document.getElementById('loader');
        if(el) show ? el.classList.remove('d-none') : el.classList.add('d-none');
    },

    mostrarToast: function(msg, type='success') {
        const toastEl = document.getElementById('liveToast');
        if(toastEl) {
            document.getElementById('toast-message').innerText = msg;
            const bsToast = new bootstrap.Toast(toastEl);
            bsToast.show();
        } else {
            alert((type === 'error' ? '❌ ' : '✅ ') + msg);
        }
    },

    // --- MÓDULO DE LOGIN ---

    cargarListaEmpresas: function() {
        this.toggleLoader(true);
        const sel = document.getElementById('login-empresa-select');
        
        sendRequest("get_empresas_list")
            .then(json => {
                if(json.status === 'success') {
                    sel.innerHTML = '<option value="" selected disabled>Seleccione su Empresa...</option>';
                    
                    if(json.data.length === 0) {
                         sel.innerHTML = '<option disabled>⚠️ Lista vacía (Revise Excel)</option>';
                    }

                    json.data.forEach(emp => {
                        let opt = document.createElement('option');
                        opt.value = emp.id;
                        opt.text = emp.nombre;
                        sel.appendChild(opt);
                    });
                } else {
                    // El servidor respondió, pero con error lógico
                    sel.innerHTML = `<option disabled>❌ Error Lógico: ${json.message}</option>`;
                    alert("Error del Sistema: " + json.message);
                }
            })
            .catch(errorMsg => {
                // AQUÍ ATRAPAMOS EL ERROR DE CONEXIÓN
                console.error(errorMsg);
                sel.innerHTML = `<option disabled style="color:red; font-weight:bold;">☠️ ERROR: ${errorMsg}</option>`;
                
                // Explicación amigable según el error
                if(errorMsg.includes("Failed to fetch")) {
                    alert("⛔ BLOQUEO DE CONEXIÓN (CORS)\n\nCausa: No has hecho 'Nueva Versión' o la URL está mal.\n\nSolución: Ve a Apps Script > Implementar > Nueva Versión.");
                } else if(errorMsg.includes("401")) {
                     alert("⛔ ERROR 401 (NO AUTORIZADO)\n\nCausa: No pusiste acceso 'Cualquier persona' (Anyone).");
                } else {
                    alert("⛔ ERROR TÉCNICO:\n" + errorMsg);
                }
            })
            .finally(() => this.toggleLoader(false));
    },

    login: function() {
        const empresaId = document.getElementById('login-empresa-select').value;
        const token = document.getElementById('login-token').value;

        if(!empresaId || !token) return alert("Seleccione empresa e ingrese el Token.");

        this.toggleLoader(true);
        sendRequest("login_empresa", { empresaId, token }).then(json => {
            if(json.status === 'success') {
                // --- CORRECCIÓN CRÍTICA DE DBID ---
                // Verifica si viene directo o dentro de 'data'
                const payload = json.data || json; 

                if (!payload.dbId) {
                    alert("Error Técnico: El servidor no devolvió el ID de base de datos.");
                    return;
                }

                state.dbId = payload.dbId;
                state.empresaNombre = payload.nombre || "Empresa";
                
                // Actualizar UI
                const label = document.getElementById('nav-empresa-label');
                if(label) label.innerText = state.empresaNombre;
                
                this.mostrarPantalla('view-digitador');
                this.fetchMetadata();
            } else {
                alert("❌ Acceso denegado: " + json.message);
            }
        }).catch(e => {
            console.error(e);
            alert("Error al procesar login: " + e);
        })
        .finally(() => this.toggleLoader(false));
    },

    logout: function() {
        state.dbId = null;
        state.empresaNombre = null;
        document.getElementById('login-token').value = "";
        this.mostrarPantalla('view-login');
    },

    // --- OPERACIÓN ---
    irADigitador: function() { this.mostrarPantalla('view-digitador'); },
    
    irAContador: function() { 
        this.mostrarPantalla('view-contador');
        // Opcional: Cargar config si no se cargó antes
    },

    fetchMetadata: function() {
        this.toggleLoader(true);
        sendRequest("get_metadata").then(json => {
            if (json.status === 'success') {
                state.trabajadores = json.data.empleados;
                state.clientes = json.data.clientes;
                if(json.data.config) this.renderConfig(json.data.config);
                this.renderListas();
            }
        }).finally(() => this.toggleLoader(false));
    },

    renderListas: function() {
        this.llenarSelect('inputTrabajador', state.trabajadores);
        this.llenarSelect('inputCliente', state.clientes);
    },

    llenarSelect: function(id, array) {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.innerHTML = '<option value="" selected disabled>Seleccione...</option>';
        if(array) array.forEach(i => {
            let opt = document.createElement('option'); opt.value = i; opt.text = i; sel.appendChild(opt);
        });
    },

    guardarHoras: function(e) {
        e.preventDefault();
        this.toggleLoader(true);
        const datos = {
            registros: [{
                trabajador: document.getElementById('inputTrabajador').value,
                fecha: document.getElementById('inputFecha').value,
                cliente: document.getElementById('inputCliente').value,
                trabajo: document.getElementById('inputActividad').value,
                entrada: document.getElementById('inputEntrada').value,
                salida: document.getElementById('inputSalida').value,
                almuerzo: document.getElementById('checkAlmuerzo').checked
            }]
        };
        sendRequest("registrar_horas", datos).then(json => {
            if(json.status === 'success') {
                this.mostrarToast("Registro guardado exitosamente");
                document.getElementById('form-horas').reset();
                // Reset fecha a hoy
                document.getElementById('inputFecha').valueAsDate = new Date();
            } else { 
                alert("Error: " + json.message); 
            }
        }).finally(() => this.toggleLoader(false));
    },

    // --- MÓDULO DE CONFIGURACIÓN ---
    renderConfig: function(cfg) {
        if(!cfg) return;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.value = val;
        };
        setVal('conf-noc-ini', cfg.HORA_NOCTURNA_INICIO);
        setVal('conf-noc-fin', cfg.HORA_NOCTURNA_FIN);
        setVal('conf-rec-noc', cfg.RECARGO_NOCTURNO);
    },

    guardarConfiguracion: function() {
        this.toggleLoader(true);
        const data = {
            hora_noc_ini: document.getElementById('conf-noc-ini').value,
            hora_noc_fin: document.getElementById('conf-noc-fin').value,
            recargo_noc: document.getElementById('conf-rec-noc').value
        };
        sendRequest("guardar_config", data).then(json => {
            if(json.status === 'success') {
                this.mostrarToast("Parámetros actualizados para: " + state.empresaNombre);
            } else {
                alert("Error: " + json.message);
            }
        }).finally(() => this.toggleLoader(false));
    }
};

// --- MODALES (Restaurados Completos) ---
const modals = {
    nuevoTrabajador: () => {
        const el = document.getElementById('modalTrabajador');
        if(el) new bootstrap.Modal(el).show();
    },
    
    guardarTrabajador: () => {
        const nombre = document.getElementById('new-worker-name').value;
        const salario = document.getElementById('new-worker-salary').value;
        if(nombre && salario) {
            app.toggleLoader(true);
            sendRequest("crear_trabajador", { nombre, salario }).then(json => {
                if(json.status === 'success') {
                    app.mostrarToast("Trabajador creado");
                    const el = document.getElementById('modalTrabajador');
                    const modal = bootstrap.Modal.getInstance(el);
                    if(modal) modal.hide();
                    
                    // Limpiar inputs
                    document.getElementById('new-worker-name').value = "";
                    document.getElementById('new-worker-salary').value = "";

                    app.fetchMetadata(); // Recargar listas
                } else {
                    alert("Error: " + json.message);
                }
            }).finally(() => app.toggleLoader(false));
        } else {
            alert("Complete todos los campos");
        }
    },

    nuevoCliente: () => {
        const el = document.getElementById('modalCliente');
        if(el) new bootstrap.Modal(el).show();
    },

    guardarCliente: () => {
        const nombre = document.getElementById('new-client-name').value;
        if(nombre) {
            app.toggleLoader(true);
            sendRequest("crear_cliente", { nombre }).then(json => {
                if(json.status === 'success') {
                    app.mostrarToast("Cliente creado");
                    const el = document.getElementById('modalCliente');
                    const modal = bootstrap.Modal.getInstance(el);
                    if(modal) modal.hide();

                    document.getElementById('new-client-name').value = "";
                    app.fetchMetadata(); // Recargar listas
                } else {
                    alert("Error: " + json.message);
                }
            }).finally(() => app.toggleLoader(false));
        } else {
            alert("Ingrese el nombre del cliente");
        }
    }
};

// Exponer globalmente
window.app = app;
window.modals = modals;

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => app.init());
