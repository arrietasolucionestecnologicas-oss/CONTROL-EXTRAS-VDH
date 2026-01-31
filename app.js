/**
 * VDH CONTABLE SYSTEM - FRONTEND CORE
 * Autor: Gerson Arrieta (ASR)
 */

const CONFIG = {
    // 🔴 REEMPLAZA ESTO CON TU URL NUEVA SI CAMBIASTE EL SCRIPT
    API_URL: "https://script.google.com/macros/s/AKfycbwodxrlf8FsHtkyJp8kaENejYf15_F9YFGUxM3olNM1riPNvuREKXgEWnAkPb2A4YT2_g/exec",
    PIN_CONTADOR: "1234" 
};

// Objeto Principal de la Aplicación
const app = {
    state: {
        trabajadores: [],
        clientes: []
    },

    init: function() {
        console.log("VDH System Iniciado");
        
        // Setup Fecha Hoy
        const dateInput = document.getElementById('inputFecha');
        if(dateInput) dateInput.valueAsDate = new Date();

        // Listeners Principales
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
            this.cargarReporteFull(); // Cargar datos administrativos
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

    // --- CONEXIÓN DE DATOS ---
    fetchMetadata: async function() {
        try {
            const res = await fetch(`${CONFIG.API_URL}?action=get_metadata`);
            const json = await res.json();
            if (json.status === 'success') {
                this.state.trabajadores = json.data.empleados;
                this.state.clientes = json.data.clientes;
                this.renderListas();
                
                // Si viene configuración, precargarla en el formulario oculto
                if(json.data.config) this.renderConfig(json.data.config);
            }
        } catch (e) { console.error("Error metadata", e); }
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

    // --- ACCIONES DIGITADOR ---
    guardarHoras: async function(e) {
        e.preventDefault();
        this.toggleLoader(true);
        
        const payload = {
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

        try {
            const res = await fetch(CONFIG.API_URL + "?action=registrar_horas", {
                method: 'POST', body: JSON.stringify(payload)
            });
            const json = await res.json();
            if(json.status === 'success') {
                this.mostrarToast("✅ Reporte guardado correctamente");
                document.getElementById('form-horas').reset();
                document.getElementById('inputFecha').valueAsDate = new Date();
            } else { throw new Error(json.message); }
        } catch(err) {
            this.mostrarToast("Error: " + err.message, "error");
        } finally {
            this.toggleLoader(false);
        }
    },

    // --- ACCIONES CONTADOR ---
    cargarReporteFull: async function() {
        this.toggleLoader(true);
        try {
            const res = await fetch(CONFIG.API_URL + "?action=obtener_reporte_full");
            const json = await res.json();
            
            if(json.status === 'success') {
                this.renderPendientes(json.data.pendientes);
                this.renderNomina(json.data.nomina);
                this.renderConfig(json.data.config);
            }
        } catch(e) {
            console.error(e);
            this.mostrarToast("Error cargando dashboard", "error");
        } finally {
            this.toggleLoader(false);
        }
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
                <td class="fw-bold text-dark">${item.trabajador}</td>
                <td class="text-center"><span class="badge bg-light text-dark border">${parseFloat(item.total).toFixed(1)}h</span></td>
                <td class="small text-danger">${item.extras > 0 ? '+' + item.extras + 'h Extra' : '-'}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-success me-1" onclick="app.gestionarHora(${item.row}, 'aprobar')"><i class="bi bi-check-lg"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.gestionarHora(${item.row}, 'rechazar')"><i class="bi bi-x-lg"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    gestionarHora: async function(rowId, type) {
        if(!confirm(`¿Seguro deseas ${type} este registro?`)) return;
        this.toggleLoader(true);
        const action = type === 'aprobar' ? 'aprobar_horas' : 'rechazar_horas';
        
        try {
            await fetch(CONFIG.API_URL + `?action=${action}`, {
                method: 'POST', body: JSON.stringify({ row: rowId })
            });
            this.mostrarToast(`Registro ${type === 'aprobar' ? 'Aprobado' : 'Rechazado'}`);
            this.cargarReporteFull(); // Recargar tabla
        } catch(e) {
            this.mostrarToast("Error de conexión", "error");
        } finally {
            this.toggleLoader(false);
        }
    },

    renderNomina: function(data) {
        // Lógica visual para la tabla de dinero
        // Se implementará completamente cuando el backend retorne cálculos reales
    },

    renderConfig: function(cfg) {
        if(!cfg) return;
        // Mapear valores del backend a los inputs del frontend
        if(cfg.HORA_NOCTURNA_INICIO) document.getElementById('conf-noc-ini').value = cfg.HORA_NOCTURNA_INICIO;
        if(cfg.HORA_NOCTURNA_FIN) document.getElementById('conf-noc-fin').value = cfg.HORA_NOCTURNA_FIN;
        if(cfg.RECARGO_NOCTURNO) document.getElementById('conf-rec-noc').value = cfg.RECARGO_NOCTURNO;
        // ... Agregar resto de campos
    },

    guardarConfiguracion: async function() {
        this.toggleLoader(true);
        const data = {
            hora_noc_ini: document.getElementById('conf-noc-ini').value,
            hora_noc_fin: document.getElementById('conf-noc-fin').value,
            recargo_noc: document.getElementById('conf-rec-noc').value,
            // ... resto
        };
        try {
            await fetch(CONFIG.API_URL + "?action=guardar_config", {
                method: 'POST', body: JSON.stringify(data)
            });
            this.mostrarToast("Configuración Actualizada");
        } catch(e) {
            this.mostrarToast("Error guardando config", "error");
        } finally {
            this.toggleLoader(false);
        }
    },

    mostrarToast: function(msg, type='success') {
        const t = document.getElementById('liveToast');
        const b = document.getElementById('toast-message');
        const h = t.querySelector('.toast-header');
        
        b.innerText = msg;
        if(type==='error') {
            h.classList.remove('bg-corporate'); h.classList.add('bg-danger');
        } else {
            h.classList.add('bg-corporate'); h.classList.remove('bg-danger');
        }
        new bootstrap.Toast(t).show();
    }
};

// --- MÓDULO DE MODALES (Popups) ---
const modals = {
    nuevoTrabajador: function() {
        new bootstrap.Modal(document.getElementById('modalTrabajador')).show();
    },
    
    guardarTrabajador: async function() {
        const nombre = document.getElementById('new-worker-name').value;
        const salario = document.getElementById('new-worker-salary').value;
        if(!nombre || !salario) return alert("Complete los campos");

        app.toggleLoader(true);
        try {
            await fetch(CONFIG.API_URL + "?action=crear_trabajador", {
                method: 'POST', body: JSON.stringify({ nombre, salario })
            });
            app.mostrarToast("Trabajador Creado");
            bootstrap.Modal.getInstance(document.getElementById('modalTrabajador')).hide();
            app.fetchMetadata(); // Refrescar lista
        } catch(e) { app.mostrarToast("Error", "error"); }
        finally { app.toggleLoader(false); }
    },

    nuevoCliente: function() {
        new bootstrap.Modal(document.getElementById('modalCliente')).show();
    },

    guardarCliente: async function() {
        const nombre = document.getElementById('new-client-name').value;
        if(!nombre) return alert("Escriba el nombre");

        app.toggleLoader(true);
        try {
            await fetch(CONFIG.API_URL + "?action=crear_cliente", {
                method: 'POST', body: JSON.stringify({ nombre })
            });
            app.mostrarToast("Cliente Guardado");
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            app.fetchMetadata(); // Refrescar lista
        } catch(e) { app.mostrarToast("Error", "error"); }
        finally { app.toggleLoader(false); }
    }
};

// Función Global para el botón de Navbar
window.cambiarVista = () => location.reload();
window.app = app;
window.modals = modals;

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => app.init());
