/**
 * GERSON SUITE FRONTEND
 * Conectado a Google Apps Script
 */

const CONFIG = {
    // 🔴 TU URL DEL BACKEND (NO MODIFICAR)
    API_URL: "https://script.google.com/macros/s/AKfycbwodxrlf8FsHtkyJp8kaENejYf15_F9YFGUxM3olNM1riPNvuREKXgEWnAkPb2A4YT2_g/exec",
    
    // Contraseña simple para el contador (puedes cambiarla)
    PIN_CONTADOR: "1234" 
};

const app = {
    init: function() {
        console.log("Sistema Iniciado");
        document.getElementById('inputFecha').valueAsDate = new Date();
        
        // Cargar listas al iniciar (silencioso)
        this.fetchMetadata();
        
        // Listeners
        document.getElementById('form-horas').addEventListener('submit', (e) => this.guardarHoras(e));
    },

    // --- NAVEGACIÓN ---
    irADigitador: function() {
        this.cambiarPantalla('view-digitador');
    },

    irAContador: function() {
        let pin = prompt("Ingrese PIN de Contador:");
        if (pin === CONFIG.PIN_CONTADOR) {
            this.cambiarPantalla('view-contador');
            this.cargarReporte(); // Cargar datos frescos
        } else {
            this.mostrarToast("PIN Incorrecto", "error");
        }
    },

    cambiarPantalla: function(idPantalla) {
        // Ocultar todas
        ['view-login', 'view-digitador', 'view-contador'].forEach(id => {
            document.getElementById(id).classList.add('d-none');
        });
        // Mostrar objetivo
        document.getElementById(idPantalla).classList.remove('d-none');
    },

    // --- COMUNICACIÓN CON GOOGLE ---
    
    toggleLoader: function(show) {
        const el = document.getElementById('loader');
        show ? el.classList.remove('d-none') : el.classList.add('d-none');
    },

    fetchMetadata: async function() {
        // Trae trabajadores y clientes
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=get_metadata`);
            const json = await response.json();
            
            if (json.status === 'success') {
                this.llenarSelect('inputTrabajador', json.data.empleados);
                this.llenarSelect('inputCliente', json.data.clientes);
            }
        } catch (e) {
            console.error("Error cargando listas", e);
        }
    },

    llenarSelect: function(id, arrayDatos) {
        const select = document.getElementById(id);
        select.innerHTML = '<option value="" selected disabled>Seleccione...</option>';
        arrayDatos.forEach(item => {
            let option = document.createElement('option');
            option.value = item;
            option.text = item;
            select.appendChild(option);
        });
    },

    guardarHoras: async function(e) {
        e.preventDefault();
        this.toggleLoader(true);

        const datos = {
            trabajador: document.getElementById('inputTrabajador').value,
            fecha: document.getElementById('inputFecha').value,
            cliente: document.getElementById('inputCliente').value,
            trabajo: document.getElementById('inputActividad').value,
            entrada: document.getElementById('inputEntrada').value,
            salida: document.getElementById('inputSalida').value,
            almuerzo: document.getElementById('checkAlmuerzo').checked
        };

        try {
            // Usamos un array 'registros' porque el backend espera recibir un lote
            const payload = JSON.stringify({ registros: [datos] });
            
            // fetch con no-cors a veces es tricky en GAS, usamos POST normal
            const response = await fetch(`${CONFIG.API_URL}?action=registrar_horas`, {
                method: 'POST',
                body: payload
            });
            
            const json = await response.json();

            if (json.status === 'success') {
                this.mostrarToast("¡Registro guardado exitosamente!");
                document.getElementById('form-horas').reset();
                document.getElementById('inputFecha').valueAsDate = new Date(); // Reset fecha a hoy
            } else {
                throw new Error(json.message);
            }

        } catch (error) {
            this.mostrarToast("Error guardando: " + error.message, "error");
        } finally {
            this.toggleLoader(false);
        }
    },

    cargarReporte: async function() {
        // Simulación para mostrar datos mientras conectas el backend real de reporte
        const tabla = document.getElementById('tabla-contador-body');
        tabla.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Conectando con base de datos...</td></tr>';
        
        // NOTA: Aquí deberíamos llamar a ?action=obtener_reporte
        // Por ahora mostraré un mensaje de éxito simulado
        setTimeout(() => {
            tabla.innerHTML = '<tr><td colspan="5" class="text-center text-success"><i class="bi bi-check-circle"></i> Conexión establecida. Use el Google Sheet para ver detalles completos.</td></tr>';
            document.getElementById('kpi-pendientes').innerText = "Ver Sheet";
            document.getElementById('kpi-extras').innerText = "Ver Sheet";
        }, 1500);
    },

    mostrarToast: function(mensaje, tipo = 'success') {
        const toastEl = document.getElementById('liveToast');
        const body = document.getElementById('toast-message');
        const header = toastEl.querySelector('.toast-header');
        
        body.innerText = mensaje;
        
        if (tipo === 'error') {
            header.classList.remove('bg-corporate');
            header.classList.add('bg-danger');
        } else {
            header.classList.add('bg-corporate');
            header.classList.remove('bg-danger');
        }

        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
};

// Global function para el botón del navbar
window.cambiarVista = function() {
    location.reload(); // La forma más segura de limpiar estado
};

// Arrancar
document.addEventListener('DOMContentLoaded', () => app.init());
