/**
 * VDH CONTABLE SYSTEM - FRONTEND
 * Estrategia: "Simple POST" (Clonada de App Pro para evitar CORS/302)
 */

const CONFIG = {
    // 🔴 URL DE PRODUCCIÓN (Actualizada por el usuario)
    API_URL: "https://script.google.com/macros/s/AKfycbwm-HV30TiGK61EylJlkeBwUt2ifumc_y6K1gyla9ARvQYe7mMJuLp3MSomrQMHGOLDVQ/exec", 
    
    PIN_CONTADOR: "1234" 
};

// --- FUNCIÓN NÚCLEO DE COMUNICACIÓN (POST ONLY) ---
async function sendRequest(action, payload = {}) {
    const options = { 
        method: "POST", 
        // Enviamos un string JSON plano. Apps Script lo recibirá en e.postData.contents
        body: JSON.stringify({ action: action, payload: payload }) 
    };
    
    try {
        // Al usar POST sin headers 'Content-Type', evitamos el 'Pre-flight' de CORS
        const response = await fetch(CONFIG.API_URL, options);
        const json = await response.json();
        return json;
    } catch (e) {
        console.error("Error de conexión:", e);
        throw "No se pudo conectar con el servidor.";
    }
}

// --- OBJETO PRINCIPAL DE LA APP ---
const app = {
    state: { trabajadores: [], clientes: [] },

    init: function() {
        console.log("VDH System Iniciado (Modo POST)");
        
        // Configurar fecha por defecto a HOY
        const dateInput = document.getElementById('inputFecha');
        if(dateInput) dateInput.valueAsDate = new Date();

        // Listeners de Formularios
        const formHoras = document.getElementById('form-horas');
        if(formHoras) formHoras.addEventListener('submit', (e) => this.guardarHoras(e));

        // Cargar Listas Iniciales
        this.fetchMetadata();
    },

    // --- NAVEGACIÓN ---
    irADigitador: function() { this.cambiarPantalla('view-digitador'); },
    
    irAContador: function() {
        let pin = prompt("🔐 VDH SEGURIDAD\nIngrese PIN de Contador:");
        if (pin === CONFIG.PIN_CONTADOR) {
            this.cambiarPantalla('view-contador');
            this.cargarReporteFull();
        } else {
            this.mostrarToast("Acceso Denegado", "error");
        }
    },
    
    cambiarPantalla: function(id) {
        document.querySelectorAll('.container.fade-in').forEach(el => el.classList.add('d-none'));
        document.getElementById(id).classList.remove('d-none');
    },
    
    toggleLoader: function(show) {
        const el = document.getElementById('loader');
        if(el) show ? el.classList.remove('d-none') : el.classList.add('d-none');
    },

    // --- LOGICA DE DATOS ---
    fetchMetadata: function() {
        // Llamada POST al backend
        sendRequest("get_metadata").then(json => {
            if (json.status === 'success') {
                this.state.trabajadores = json.data.empleados;
                this.state.clientes = json.data.clientes;
                this.renderListas();
                
                // Si viene configuración, cargarla
                if(json.data.config) this.renderConfig(json.data.config);
            }
        }).catch(err => console.error(err));
    },

    renderListas: function() {
        this.llenarSelect('inputTrabajador', this.state.trabajadores);
        this.llenarSelect('inputCliente', this.state.clientes);
    },

    llenarSelect: function(id, array) {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.innerHTML = '<option value="" selected disabled>Seleccione...</option>';
        array.forEach(item => {
            let opt = document.createElement('option');
            opt.value = item;
            opt.text = item;
            sel.appendChild(opt);
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
                this.mostrarToast("✅ Reporte guardado correctamente");
                document.getElementById('form-horas').reset();
                document.getElementById('inputFecha').valueAsDate = new Date();
            } else { 
                alert("Error del servidor: " + json.message); 
            }
        }).catch(err => this.mostrarToast(err, "error"))
          .finally(() => this.toggleLoader(false));
    },

    cargarReporteFull: function() {
        this.toggleLoader(true);
        sendRequest("obtener_reporte_full").then(json => {
            if(json.status === 'success') {
                this.renderPendientes(json.data.pendientes);
                this.renderConfig(json.data.config);
            }
        }).finally(() => this.toggleLoader(false));
    },

    renderPendientes: function(lista) {
        const tbody = document.getElementById('tabla-pendientes');
        tbody.innerHTML = '';
        if(!lista || lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">No hay registros pendientes.</td></tr>';
            return;
        }
        lista.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.fecha}</td>
                <td class="fw-bold">${item.trabajador}</td>
                <td class="text-center">${parseFloat(item.total).toFixed(1)}h</td>
                <td class="text-danger small">${item.extras}h Ext</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-success" onclick="app.gestionarHora(${item.row}, 'aprobar')"><i class="bi bi-check-lg"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.gestionarHora(${item.row}, 'rechazar')"><i class="bi bi-x-lg"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    },

    gestionarHora: function(rowId, type) {
        if(!confirm(`¿Seguro deseas ${type} este registro?`)) return;
        this.toggleLoader(true);
        const action = type === 'aprobar' ? 'aprobar_horas' : 'rechazar_horas';
        
        sendRequest(action, { row: rowId }).then(() => {
            this.mostrarToast("Estado Actualizado");
            this.cargarReporteFull();
        }).finally(() => this.toggleLoader(false));
    },

    // --- CORRECCIÓN: LIMPIEZA DE HORAS ---
    renderConfig: function(cfg) {
        if(!cfg) return;
        
        // Usamos la nueva función 'limpiarHora' para corregir el formato de Google
        // Si Google manda "1899-12-30T21:00:00", esto lo convierte en "21:00"
        if(cfg.HORA_NOCTURNA_INICIO) {
            document.getElementById('conf-noc-ini').value = this.limpiarHora(cfg.HORA_NOCTURNA_INICIO);
        }
        if(cfg.HORA_NOCTURNA_FIN) {
            document.getElementById('conf-noc-fin').value = this.limpiarHora(cfg.HORA_NOCTURNA_FIN);
        }
        
        // Los números no necesitan limpieza
        if(cfg.RECARGO_NOCTURNO) document.getElementById('conf-rec-noc').value = cfg.RECARGO_NOCTURNO;
        if(cfg.RECARGO_DOMINICAL) {
             const domInput = document.getElementById('conf-dom');
             if(domInput) domInput.value = cfg.RECARGO_DOMINICAL; 
        }
    },

    // Nueva función auxiliar para evitar el error de formato
    limpiarHora: function(valor) {
        if (!valor) return "";
        // Si ya viene limpio "21:00", lo devolvemos tal cual
        if (typeof valor === 'string' && valor.length === 5) return valor;
        
        // Si viene como fecha larga de Google (ej: 1899-12-31T02:00:00.000Z)
        try {
            let fecha = new Date(valor);
            let horas = fecha.getHours().toString().padStart(2, '0');
            let minutos = fecha.getMinutes().toString().padStart(2, '0');
            return `${horas}:${minutos}`;
        } catch (e) {
            console.error("Error limpiando hora:", valor);
            return "00:00";
        }
    },

    guardarConfiguracion: function() {
        this.toggleLoader(true);
        const data = {
            hora_noc_ini: document.getElementById('conf-noc-ini').value,
            hora_noc_fin: document.getElementById('conf-noc-fin').value,
            recargo_noc: document.getElementById('conf-rec-noc').value
        };
        sendRequest("guardar_config", data).then(() => {
            this.mostrarToast("Configuración Guardada");
        }).finally(() => this.toggleLoader(false));
    },

    mostrarToast: function(msg, type='success') {
        const t = document.getElementById('liveToast');
        document.getElementById('toast-message').innerText = msg;
        const h = t.querySelector('.toast-header');
        h.className = type==='error' ? 'toast-header bg-danger text-white' : 'toast-header bg-corporate text-white';
        new bootstrap.Toast(t).show();
    }
};

// --- MÓDULO DE MODALES (Popups) ---
const modals = {
    nuevoTrabajador: () => new bootstrap.Modal(document.getElementById('modalTrabajador')).show(),
    
    guardarTrabajador: () => {
        const nombre = document.getElementById('new-worker-name').value;
        const salario = document.getElementById('new-worker-salary').value;
        if(!nombre || !salario) return alert("Complete todos los datos");
        
        app.toggleLoader(true);
        sendRequest("crear_trabajador", { nombre, salario }).then(() => {
            app.mostrarToast("Trabajador Creado");
            bootstrap.Modal.getInstance(document.getElementById('modalTrabajador')).hide();
            app.fetchMetadata();
        }).finally(() => app.toggleLoader(false));
    },
    
    nuevoCliente: () => new bootstrap.Modal(document.getElementById('modalCliente')).show(),
    
    guardarCliente: () => {
        const nombre = document.getElementById('new-client-name').value;
        if(!nombre) return alert("Escriba el nombre");
        
        app.toggleLoader(true);
        sendRequest("crear_cliente", { nombre }).then(() => {
            app.mostrarToast("Cliente Creado");
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            app.fetchMetadata();
        }).finally(() => app.toggleLoader(false));
    }
};

// Globales
window.cambiarVista = () => location.reload();
window.app = app;
window.modals = modals;

// Iniciar
document.addEventListener('DOMContentLoaded', () => app.init());
