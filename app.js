/** APP.JS V18 - CORRECCIÓN DE ROLES Y NAVEGACIÓN */
const CONFIG = {
    // 🔴 PEGA TU URL DE BACKEND AQUÍ
    API: "https://script.google.com/macros/s/AKfycbwkFaP_G5bSYnalTk4w92OZ3FuSBMaSTF3x2z5TDGGqiR0R1Oa6V4hlxmcH0XvDTzyl/exec"
};

// ESTADO GLOBAL
let STATE = {
    dbId: null,
    role: null, // 'DIGITADOR', 'CONTADOR', 'ADMIN'
    masterKey: null,
    nombreEmpresa: ""
};

const api = async (act, pl={}) => {
    if(STATE.dbId) pl.dbId = STATE.dbId;
    if(STATE.masterKey) pl.masterKey = STATE.masterKey;
    try {
        const r = await fetch(CONFIG.API, {method:"POST", body:JSON.stringify({action:act, payload:pl})});
        return await r.json();
    } catch(e) { console.error(e); return {status:"error", message:"Error de Red"}; }
};

const app = {
    init: () => {
        // AL INICIAR SIEMPRE BORRAMOS SESION ANTERIOR PARA EVITAR EL ERROR DE "GERENCIA"
        sessionStorage.clear();
        app.loadCompanies();
    },

    loadCompanies: () => {
        api("get_public_list").then(j => {
            const s = document.getElementById('login-empresa');
            s.innerHTML = '<option value="" disabled selected>Seleccione...</option>';
            if(j.data) j.data.forEach(e => s.innerHTML+=`<option value="${e.id}">${e.nombre}</option>`);
        });
    },

    toggleAdminLogin: () => document.getElementById('admin-login-area').classList.toggle('d-none'),

    login: () => {
        const empId = document.getElementById('login-empresa').value;
        const pass = document.getElementById('login-pass').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        if(!empId || !pass) return alert("Complete los datos");

        document.getElementById('loader').classList.remove('d-none');
        
        // Autenticamos
        api("login", {user:empId, pass:pass}).then(j => {
            document.getElementById('loader').classList.add('d-none');
            const d = j.data||j;
            
            if(j.status === 'success') {
                if(d.role === 'ADMIN') {
                    // Si entró con master key en el login normal, lo redirigimos
                    alert("Por favor use el acceso de Gerencia abajo.");
                    return;
                }
                
                // Configurar Estado
                STATE.dbId = d.dbId;
                STATE.nombreEmpresa = d.nombre;
                STATE.role = role; // Forzamos el rol seleccionado en el radio button
                
                app.startSession();
            } else {
                alert(j.message);
            }
        });
    },

    loginAdmin: () => {
        const key = document.getElementById('master-key').value;
        api("login", {user:"ADMIN", pass:key}).then(j => {
            if(j.status === 'success') {
                STATE.role = 'ADMIN';
                STATE.masterKey = key;
                app.startSession();
            } else alert("Clave Maestra Incorrecta");
        });
    },

    logout: () => { location.reload(); },

    startSession: () => {
        document.getElementById('view-login').classList.add('d-none');
        document.getElementById('view-app').classList.remove('d-none');
        document.getElementById('user-display').innerText = `${STATE.role} - ${STATE.nombreEmpresa || 'Gerencia'}`;
        
        // Cargar vista según rol
        if(STATE.role === 'DIGITADOR') app.loadView('digitador');
        else if(STATE.role === 'CONTADOR') app.loadView('contador');
        else if(STATE.role === 'ADMIN') app.loadView('admin');
    },

    loadView: (viewName) => {
        const content = document.getElementById('app-content');
        const tpl = document.getElementById('tpl-' + viewName);
        if(!tpl) return;
        content.innerHTML = "";
        content.appendChild(tpl.content.cloneNode(true));

        // Inicializar lógica de la vista
        if(viewName === 'digitador') app.initDigitador();
        if(viewName === 'contador') app.initContador();
        if(viewName === 'config') app.initConfig();
        if(viewName === 'admin') app.initAdmin();
    },

    // ===========================
    // LÓGICA DIGITADOR
    // ===========================
    initDigitador: () => {
        // Cargar Listas
        api("get_full_data").then(j => {
            const d = j.data;
            const fill = (id) => {
                document.querySelectorAll(id).forEach(s => {
                    s.innerHTML = '<option value="" disabled selected>...</option>';
                    d.empleados.forEach(x => s.innerHTML+=`<option>${x.nombre}</option>`);
                });
            };
            fill('#t-trab'); fill('#s-trab');
            
            const sCli = document.getElementById('t-cli');
            sCli.innerHTML = "";
            d.clientes.forEach(x => sCli.innerHTML+=`<option>${x}</option>`);
            
            app.digLoadTable();
        });

        // Submit Registro
        document.getElementById('form-turnos').onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const pl = {
                fecha: document.getElementById('t-fecha').value,
                trabajador: document.getElementById('t-trab').value,
                cliente: document.getElementById('t-cli').value,
                trabajo: document.getElementById('t-act').value,
                entrada: document.getElementById('t-in').value,
                salida: document.getElementById('t-out').value,
                almuerzo: document.getElementById('t-alm').checked
            };
            
            const action = id ? "edit_entry" : "save_entry";
            if(id) pl.idRegistro = id;

            api(action, id ? {idRegistro:id, datos:pl} : {registros:[pl]}).then(() => {
                alert("Guardado Exitosamente");
                app.digCancel();
                app.digLoadTable();
            });
        };
    },

    digLoadTable: () => {
        api("get_grid").then(j => {
            const tb = document.getElementById('dig-table'); tb.innerHTML = "";
            const data = j.data.data.slice(0, 50); // Últimos 50
            window.cacheData = data;
            data.forEach(r => {
                tb.innerHTML += `<tr><td>${r.fecha}</td><td>${r.trabajador}</td><td>${r.cliente}</td><td>${r.total}</td>
                <td><span class="badge bg-${r.estado==='APROBADO'?'success':'warning'}">${r.estado}</span></td>
                <td>
                    ${r.estado === 'PENDIENTE' ? `
                    <button class="btn btn-sm btn-outline-primary" onclick="app.digEdit('${r.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.digDel('${r.id}')"><i class="bi bi-trash"></i></button>
                    ` : '<small class="text-muted">Bloqueado</small>'}
                </td></tr>`;
            });
        });
    },

    digEdit: (id) => {
        const r = window.cacheData.find(x => x.id === id);
        document.getElementById('edit-id').value = id;
        document.getElementById('t-fecha').value = r.fechaRaw;
        document.getElementById('t-trab').value = r.trabajador;
        document.getElementById('t-cli').value = r.cliente;
        document.getElementById('t-act').value = r.actividad;
        document.getElementById('t-in').value = r.entrada;
        document.getElementById('t-out').value = r.salida;
        document.getElementById('btn-save').innerText = "ACTUALIZAR REGISTRO";
        document.getElementById('btn-cancel').classList.remove('d-none');
    },

    digCancel: () => {
        document.getElementById('form-turnos').reset();
        document.getElementById('edit-id').value = "";
        document.getElementById('btn-save').innerText = "GUARDAR";
        document.getElementById('btn-cancel').classList.add('d-none');
    },

    digDel: (id) => { if(confirm("¿Borrar?")) api("delete_entry", {idRegistro:id}).then(()=>app.digLoadTable()); },
    
    digUpdateSalario: () => {
        const n = document.getElementById('s-trab').value;
        const v = document.getElementById('s-val').value;
        if(n && v) api("actualizar_salario", {nombre:n, nuevoSalario:v}).then(()=>alert("Salario Actualizado"));
    },

    // ===========================
    // LÓGICA CONTADOR
    // ===========================
    initContador: () => {
        // Set dates default (Current Month)
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        document.getElementById('c-inicio').value = firstDay;
        document.getElementById('c-fin').value = lastDay;
        app.contLoad();
    },

    contLoad: () => {
        const i = document.getElementById('c-inicio').value;
        const f = document.getElementById('c-fin').value;
        api("get_finance", {inicio:i, fin:f}).then(j => {
            const d = j.data;
            const t = document.getElementById('cont-table'); t.innerHTML = "";
            window.pendingIds = []; // Reset para aprobación masiva
            
            d.pendientes.forEach(r => {
                window.pendingIds.push(r.rowId);
                t.innerHTML += `<tr><td>${r.fecha}</td><td>${r.trab}</td><td>${r.total}</td><td>${r.ord}</td><td>${r.rn}</td><td>${r.ed}</td><td>${r.en}</td><td>${r.df}</td><td>${r.edom}</td><td class="fw-bold text-success">$${Math.round(r.valor).toLocaleString()}</td></tr>`;
            });

            const rT = document.getElementById('cont-resumen'); rT.innerHTML = "";
            window.exportData = d.resumen;
            d.resumen.forEach(r => {
                rT.innerHTML += `<tr><td>${r.nombre}</td><td>${r.horas.toFixed(2)}</td><td>$${Math.round(r.dinero).toLocaleString()}</td></tr>`;
            });
        });
    },

    contExport: () => {
        if(!window.exportData) return;
        let csv = "TRABAJADOR,HORAS,A_PAGAR\n";
        window.exportData.forEach(x => csv += `${x.nombre},${x.horas.toFixed(2)},${Math.round(x.dinero)}\n`);
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        a.download = 'nomina.csv';
        a.click();
    },

    contApproveAll: () => {
        if(!window.pendingIds || window.pendingIds.length === 0) return alert("Nada por aprobar");
        if(confirm(`¿Aprobar ${window.pendingIds.length} registros y cerrar nómina?`)) {
            api("aprobar_lote", {ids: window.pendingIds}).then(() => {
                alert("Lote Aprobado");
                app.contLoad();
            });
        }
    },

    // ===========================
    // LÓGICA CONFIG
    // ===========================
    initConfig: () => {
        api("get_full_data").then(j => {
            const c = j.data.config;
            document.getElementById('f-base').value = c.HORAS_BASE_MES;
            document.getElementById('f-rn').value = c.FACTOR_REC_NOC;
            document.getElementById('f-ed').value = c.FACTOR_EXT_DIU;
            document.getElementById('f-en').value = c.FACTOR_EXT_NOC;
            document.getElementById('f-df').value = c.FACTOR_DOM_FES;
            document.getElementById('f-edom').value = c.FACTOR_EXT_DOM;
            
            const days = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
            let rules = JSON.parse(c.REGLAS_JORNADA);
            const dC = document.getElementById('cfg-days'); dC.innerHTML="";
            days.forEach((d, i) => {
                dC.innerHTML += `<div class="d-flex justify-content-between mb-1"><span>${d}</span><input type="number" class="form-control form-control-sm w-25 d-rule" data-d="${i}" value="${rules[i]||0}"></div>`;
            });
        });
    },

    cfgSave: () => {
        const j = {}; document.querySelectorAll('.d-rule').forEach(i => j[i.dataset.d] = Number(i.value));
        const factors = {
            HORAS_BASE_MES: document.getElementById('f-base').value,
            FACTOR_REC_NOC: document.getElementById('f-rn').value,
            FACTOR_EXT_DIU: document.getElementById('f-ed').value,
            FACTOR_EXT_NOC: document.getElementById('f-en').value,
            FACTOR_DOM_FES: document.getElementById('f-df').value,
            FACTOR_EXT_DOM: document.getElementById('f-edom').value
        };
        api("save_config", {jornada:j, factores:factors}).then(()=>alert("Configuración Guardada"));
    },

    // ===========================
    // ADMIN (OCULTO)
    // ===========================
    initAdmin: () => {
        api("get_public_list").then(j => {
            const l = document.getElementById('adm-list'); l.innerHTML="";
            j.data.forEach(e => l.innerHTML += `<li class="list-group-item d-flex justify-content-between"><span>${e.nombre}</span><button class="btn btn-sm btn-danger" onclick="app.admDel('${e.id}')">X</button></li>`);
        });
    },
    admCreate: () => {
        const n = document.getElementById('new-name').value;
        const t = document.getElementById('new-token').value;
        if(n && t) api("create_company", {name:n, token:t}).then(()=>{ alert("Creada"); app.initAdmin(); });
    },
    admDel: (id) => { if(confirm("Eliminar?")) api("delete_company", {id:id}).then(()=>app.initAdmin()); }
};

document.addEventListener('DOMContentLoaded', app.init);
