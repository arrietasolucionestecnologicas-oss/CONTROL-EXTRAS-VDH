/**
 * VDH ENTERPRISE v7.0 - APP.JS
 * Lógica de Negocio: Nómina y Parametrización
 */
const CONFIG = {
    // 🔴 ACTUALIZA ESTA URL
    API_URL: "https://script.google.com/macros/s/AKfycbyubr3wxCftRobp80h3KUgzZymjqrnasvB5HaJfi81Hn3XDh0sP28uoIuOU3B46cPpP/exec"
};

const state = { dbId: null, role: null, masterKey: null, listaAdmin: [] };

async function req(action, payload={}) {
    if(state.dbId) payload.dbId = state.dbId;
    if(state.masterKey) payload.masterKey = state.masterKey;
    try {
        const res = await fetch(CONFIG.API_URL, { method:"POST", body:JSON.stringify({action, payload}) });
        const txt = await res.text();
        return JSON.parse(txt);
    } catch(e) { throw e.message; }
}

const app = {
    init: () => {
        console.log("VDH v7 Started");
        app.verificarSesion();
    },
    
    verificarSesion: () => {
        document.querySelectorAll('.app-view').forEach(e=>e.classList.add('d-none'));
        document.getElementById('view-login').classList.remove('d-none');
        app.loadLoginList();
    },

    loadLoginList: () => {
        const s = document.getElementById('login-empresa-select');
        s.innerHTML = '<option disabled selected>Cargando...</option>';
        req("get_empresas_list").then(j => {
            s.innerHTML = '<option value="" selected>Soy Administrador</option>';
            if(j.data) j.data.forEach(e => s.innerHTML += `<option value="${e.id}">${e.nombre}</option>`);
        });
    },

    login: () => {
        const id = document.getElementById('login-empresa-select').value;
        const tk = document.getElementById('login-token').value;
        if(!tk) return alert("Falta contraseña");
        
        document.getElementById('loader').classList.remove('d-none');
        req("login_empresa", {empresaId:id, token:tk}).then(j => {
            const d = j.data || j;
            if(j.status === 'success') {
                state.role = d.role;
                if(d.role === 'ADMIN') {
                    state.masterKey = tk;
                    state.listaAdmin = d.listaEmpresas;
                    app.show('view-admin');
                    app.renderAdminList();
                } else {
                    state.dbId = d.dbId;
                    document.getElementById('nav-empresa-label').innerText = d.nombre;
                    app.show('view-digitador');
                    app.fetchMetadata();
                }
            } else alert(j.message);
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },

    show: (id) => {
        document.querySelectorAll('.app-view').forEach(e=>e.classList.add('d-none'));
        document.getElementById(id).classList.remove('d-none');
    },
    logout: () => location.reload(),
    
    // ADMIN
    renderAdminList: () => {
        const l = document.getElementById('admin-company-list');
        l.innerHTML = "";
        state.listaAdmin.forEach(e => {
            l.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div><strong>${e.nombre}</strong> <small class="text-muted">Token: ${e.token}</small></div>
                <div>
                    <button class="btn btn-sm btn-success" onclick="app.adminEnter('${e.dbId}','${e.nombre}')">Entrar</button>
                    <button class="btn btn-sm btn-danger" onclick="app.adminDel('${e.id}')">X</button>
                </div>
            </li>`;
        });
    },
    adminCrearEmpresa: () => {
        const n = document.getElementById('admin-new-name').value;
        const t = document.getElementById('admin-new-token').value;
        if(n&&t) req("crear_empresa_saas", {nombre:n, tokenNuevo:t}).then(j=>{ 
            if(j.status==='success') { alert("Creada"); app.logout(); }
        });
    },
    adminDel: (id) => { if(confirm("¿Eliminar?")) req("eliminar_empresa", {idEmpresa:id}).then(()=>app.logout()); },
    adminEnter: (dbId, nom) => {
        state.dbId = dbId;
        document.getElementById('contador-empresa-label').innerText = nom;
        app.show('view-contador');
        app.contadorLoad();
    },
    volverAlPanel: () => { state.dbId = null; app.show('view-admin'); },

    // CONTADOR
    contadorLoad: () => {
        document.getElementById('loader').classList.remove('d-none');
        req("obtener_reporte_contable").then(j => {
            const d = j.data || j;
            app.renderValuation(d.pendientes);
            app.renderSummary(d.resumen);
            app.renderConfig(d.config);
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },

    renderValuation: (list) => {
        const t = document.getElementById('tabla-valorizacion');
        t.innerHTML = list.length ? "" : "<tr><td colspan='10' class='text-center'>Sin pendientes</td></tr>";
        list.forEach(r => {
            t.innerHTML += `
            <tr>
                <td>${r.fechaFmt}</td>
                <td>${r.trabajador}</td>
                <td>${r.total}</td>
                <td>${r.h_rec_noc}</td>
                <td>${r.h_ext_diu}</td>
                <td>${r.h_ext_noc}</td>
                <td>${r.h_dom}</td>
                <td>${r.h_ext_dom}</td>
                <td class="money-val text-end">$${r.valorTotal.toLocaleString()}</td>
                <td><button onclick="app.aprobarHora(${r.row})" class="btn btn-sm btn-outline-success">✓</button></td>
            </tr>`;
        });
    },

    renderSummary: (list) => {
        const t = document.getElementById('tabla-resumen');
        t.innerHTML = "";
        list.forEach(r => {
            t.innerHTML += `<tr><td>${r.nombre}</td><td>$${r.salario.toLocaleString()}</td><td>${r.h_total.toFixed(2)}</td><td class="fw-bold text-success">$${r.din_total.toLocaleString()}</td></tr>`;
        });
    },

    renderConfig: (cfg) => {
        // Render Jornada Diaria
        const days = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
        let j = {};
        try { j = JSON.parse(cfg.REGLAS_JORNADA); } catch(e){ j={1:9,2:9,3:9,4:9,5:9,6:4,0:8}; } // Default
        
        const c = document.getElementById('config-jornada-container');
        c.innerHTML = "";
        days.forEach((d, i) => {
            c.innerHTML += `
            <div class="day-config-row">
                <span class="small fw-bold">${d}</span>
                <div class="input-group input-group-sm w-50">
                    <span class="input-group-text">Max Hrs</span>
                    <input type="number" class="form-control inp-jornada" data-day="${i}" value="${j[i]||0}">
                </div>
            </div>`;
        });

        // Render Factores
        document.getElementById('cfg-base-mes').value = cfg.HORAS_BASE_MES || 240;
        document.getElementById('cfg-rec-noc').value = cfg.FACTOR_REC_NOC || 0.35;
        document.getElementById('cfg-ext-diu').value = cfg.FACTOR_EXT_DIU || 1.25;
        document.getElementById('cfg-ext-noc').value = cfg.FACTOR_EXT_NOC || 1.75;
        document.getElementById('cfg-dom-fes').value = cfg.FACTOR_DOM_FES || 1.75;
        document.getElementById('cfg-ext-dom').value = cfg.FACTOR_EXT_DOM || 2.00;
    },

    guardarConfiguracionAvanzada: () => {
        const inputs = document.querySelectorAll('.inp-jornada');
        const jornada = {};
        inputs.forEach(i => jornada[i.dataset.day] = Number(i.value));

        const payload = {
            jornada: jornada,
            factores: {
                HORAS_BASE_MES: document.getElementById('cfg-base-mes').value,
                FACTOR_REC_NOC: document.getElementById('cfg-rec-noc').value,
                FACTOR_EXT_DIU: document.getElementById('cfg-ext-diu').value,
                FACTOR_EXT_NOC: document.getElementById('cfg-ext-noc').value,
                FACTOR_DOM_FES: document.getElementById('cfg-dom-fes').value,
                FACTOR_EXT_DOM: document.getElementById('cfg-ext-dom').value
            }
        };
        req("guardar_config_avanzada", payload).then(j => alert("Guardado"));
    },

    aprobarHora: (r) => req("aprobar_hora", {row:r}).then(()=>app.contadorLoad()),

    // DIGITADOR
    fetchMetadata: () => req("get_metadata").then(j => { 
        const d=j.data||j; 
        ['inputTrabajador','inputCliente'].forEach((id,i) => {
            const s=document.getElementById(id); s.innerHTML='<option selected disabled>...</option>';
            (i===0?d.empleados:d.clientes).forEach(x=>s.innerHTML+=`<option>${x}</option>`);
        });
    }),
    
    // Submit digitador event listener is set in init via HTML ID binding if element exists
};

document.getElementById('form-horas')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = {registros:[{
        fecha:document.getElementById('inputFecha').value,
        trabajador:document.getElementById('inputTrabajador').value,
        cliente:document.getElementById('inputCliente').value,
        trabajo:document.getElementById('inputActividad').value,
        entrada:document.getElementById('inputEntrada').value,
        salida:document.getElementById('inputSalida').value,
        almuerzo:document.getElementById('checkAlmuerzo').checked
    }]};
    req("registrar_horas", d).then(j => { alert("Guardado"); document.getElementById('form-horas').reset(); });
});

const modals = {
    nuevoTrabajador: () => new bootstrap.Modal(document.getElementById('modalTrabajador')).show(),
    guardarTrabajador: () => {
        const n=document.getElementById('new-worker-name').value;
        const s=document.getElementById('new-worker-salary').value;
        if(n&&s) req("crear_trabajador", {nombre:n, salario:s}).then(()=>{ alert("Creado"); app.fetchMetadata(); });
    },
    nuevoCliente: () => new bootstrap.Modal(document.getElementById('modalCliente')).show(),
    guardarCliente: () => {
        const n=document.getElementById('new-client-name').value;
        if(n) req("crear_cliente", {nombre:n}).then(()=>{ alert("Creado"); app.fetchMetadata(); });
    }
};

document.addEventListener('DOMContentLoaded', app.init);
