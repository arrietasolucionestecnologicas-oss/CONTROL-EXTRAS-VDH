/** APP.JS V7.1 - GESTIÓN TOTAL */
const CONFIG = {
    // 🔴 PEGA TU URL DE LA NUEVA VERSIÓN
    API_URL: "https://script.google.com/macros/s/AKfycbyubr3wxCftRobp80h3KUgzZymjqrnasvB5HaJfi81Hn3XDh0sP28uoIuOU3B46cPpP/exec"
};

const state = { dbId: null, role: null, masterKey: null, listaAdmin: [] };

async function req(action, payload={}) {
    if(state.dbId) payload.dbId = state.dbId;
    if(state.masterKey) payload.masterKey = state.masterKey;
    try {
        const r = await fetch(CONFIG.API_URL, {method:"POST",body:JSON.stringify({action,payload})});
        const t = await r.text();
        return JSON.parse(t);
    } catch(e) { throw e.message; }
}

const app = {
    init: () => { console.log("VDH v7.1"); app.verificarSesion(); },
    verificarSesion: () => { app.show('view-login'); app.loadLoginList(); },
    show: (id) => { document.querySelectorAll('.app-view').forEach(e=>e.classList.add('d-none')); document.getElementById(id).classList.remove('d-none'); },
    logout: () => location.reload(),
    
    // LOGIN
    loadLoginList: () => {
        const s = document.getElementById('login-empresa-select');
        req("get_empresas_list").then(j => {
            s.innerHTML = '<option value="" selected>Soy Administrador</option>';
            if(j.data) j.data.forEach(e => s.innerHTML+=`<option value="${e.id}">${e.nombre}</option>`);
        });
    },
    login: () => {
        const id=document.getElementById('login-empresa-select').value;
        const tk=document.getElementById('login-token').value;
        if(!tk) return alert("Clave requerida");
        document.getElementById('loader').classList.remove('d-none');
        req("login_empresa", {empresaId:id, token:tk}).then(j => {
            const d = j.data || j;
            if(j.status === 'success') {
                state.role = d.role;
                if(d.role === 'ADMIN') { state.masterKey=tk; state.listaAdmin=d.listaEmpresas; app.show('view-admin'); app.renderAdminList(); }
                else { state.dbId=d.dbId; document.getElementById('nav-empresa-label').innerText=d.nombre; app.show('view-digitador'); app.fetchMetadata(); }
            } else alert(j.message);
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },

    // ADMIN
    renderAdminList: () => {
        const l = document.getElementById('admin-company-list'); l.innerHTML="";
        state.listaAdmin.forEach(e => {
            l.innerHTML += `<li class="list-group-item d-flex justify-content-between"><div><strong>${e.nombre}</strong> <small class="text-muted">${e.token}</small></div><div><button class="btn btn-sm btn-success" onclick="app.adminEnter('${e.dbId}','${e.nombre}')">→</button> <button class="btn btn-sm btn-danger" onclick="app.adminDel('${e.id}')">X</button></div></li>`;
        });
    },
    adminCrearEmpresa: () => {
        const n=document.getElementById('admin-new-name').value;
        const t=document.getElementById('admin-new-token').value;
        if(n&&t) req("crear_empresa_saas",{nombre:n,tokenNuevo:t}).then(j=>{if(j.status==='success'){alert("Creada");app.logout()}});
    },
    adminDel: (id) => { if(confirm("¿Borrar?")) req("eliminar_empresa",{idEmpresa:id}).then(()=>app.logout()); },
    adminEnter: (id,n) => { state.dbId=id; document.getElementById('contador-empresa-label').innerText=n; app.show('view-contador'); app.contadorLoad(); },
    volverAlPanel: () => { state.dbId=null; app.show('view-admin'); },

    // CONTADOR
    contadorLoad: () => {
        document.getElementById('loader').classList.remove('d-none');
        req("obtener_reporte_contable").then(j => {
            const d=j.data||j; app.renderValuation(d.pendientes); app.renderSummary(d.resumen); app.renderConfig(d.config);
            // Cargar lista de festivos actual
            req("obtener_festivos").then(f => {
                const list = document.getElementById('lista-festivos-actuales');
                list.innerHTML = f.data.length ? "" : "Sin festivos registrados";
                f.data.forEach(x => list.innerHTML += `<div><small>${x.fecha}: ${x.nombre}</small></div>`);
            });
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },
    
    // Generar Festivos
    generarFestivos: () => {
        const anio = document.getElementById('input-anio-festivos').value;
        if(confirm(`¿Generar festivos automáticos para ${anio}?`)) {
            req("generar_festivos", {anio: anio}).then(j => { alert(j.message); app.contadorLoad(); });
        }
    },

    renderValuation: (l) => {
        const t = document.getElementById('tabla-valorizacion'); t.innerHTML = l.length?"":"<tr><td colspan='11' class='text-center'>Sin pendientes</td></tr>";
        l.forEach(r => t.innerHTML += `<tr><td>${r.fechaFmt}</td><td>${r.trabajador}</td><td>${r.total}</td><td>${r.h_ord}</td><td>${r.h_rec_noc}</td><td>${r.h_ext_diu}</td><td>${r.h_ext_noc}</td><td>${r.h_dom}</td><td>${r.h_ext_dom}</td><td class="money-val">$${r.valorTotal.toLocaleString()}</td><td><button onclick="app.aprobarHora(${r.row})" class="btn btn-sm btn-outline-success">✓</button></td></tr>`);
    },
    
    renderSummary: (l) => {
        const t = document.getElementById('tabla-resumen'); t.innerHTML="";
        l.forEach(r => t.innerHTML += `<tr><td>${r.nombre}</td><td>${r.breakdown.rec_noc.toFixed(1)}</td><td>${r.breakdown.ext_diu.toFixed(1)}</td><td>${r.breakdown.ext_noc.toFixed(1)}</td><td>${r.breakdown.dom.toFixed(1)}</td><td>${r.breakdown.ext_dom.toFixed(1)}</td><td class="fw-bold text-success">$${r.din_total.toLocaleString()}</td></tr>`);
    },

    renderConfig: (c) => {
        let j={1:9,2:9,3:9,4:9,5:9,6:4,0:8}; try{j=JSON.parse(c.REGLAS_JORNADA)}catch(e){}
        const days=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
        document.getElementById('config-jornada-container').innerHTML = days.map((d,i)=>`<div class="d-flex justify-content-between mb-1"><small>${d}</small><input type="number" class="form-control form-control-sm w-25 inp-jornada" data-day="${i}" value="${j[i]||0}"></div>`).join('');
        document.getElementById('cfg-base-mes').value = c.HORAS_BASE_MES||240;
        document.getElementById('cfg-rec-noc').value = c.FACTOR_REC_NOC||0.35;
        document.getElementById('cfg-ext-diu').value = c.FACTOR_EXT_DIU||1.25;
        document.getElementById('cfg-ext-noc').value = c.FACTOR_EXT_NOC||1.75;
        document.getElementById('cfg-dom-fes').value = c.FACTOR_DOM_FES||1.75;
        document.getElementById('cfg-ext-dom').value = c.FACTOR_EXT_DOM||2.00;
    },

    guardarConfiguracionAvanzada: () => {
        const j={}; document.querySelectorAll('.inp-jornada').forEach(i=>j[i.dataset.day]=Number(i.value));
        req("guardar_config_avanzada", {
            jornada:j, factores:{
                HORAS_BASE_MES:document.getElementById('cfg-base-mes').value, FACTOR_REC_NOC:document.getElementById('cfg-rec-noc').value,
                FACTOR_EXT_DIU:document.getElementById('cfg-ext-diu').value, FACTOR_EXT_NOC:document.getElementById('cfg-ext-noc').value,
                FACTOR_DOM_FES:document.getElementById('cfg-dom-fes').value, FACTOR_EXT_DOM:document.getElementById('cfg-ext-dom').value
            }
        }).then(()=>alert("Guardado"));
    },
    aprobarHora: (r) => req("aprobar_hora",{row:r}).then(()=>app.contadorLoad()),
    
    // DIGITADOR
    fetchMetadata: () => req("get_metadata").then(j => { 
        const d=j.data||j; 
        ['inputTrabajador','inputCliente'].forEach((id,i) => {
            const s=document.getElementById(id); s.innerHTML='<option selected disabled>...</option>';
            (i===0?d.empleados:d.clientes).forEach(x=>s.innerHTML+=`<option>${x}</option>`);
        });
    }),
};

document.getElementById('form-horas')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = {registros:[{
        fecha:document.getElementById('inputFecha').value, trabajador:document.getElementById('inputTrabajador').value, cliente:document.getElementById('inputCliente').value, trabajo:document.getElementById('inputActividad').value, entrada:document.getElementById('inputEntrada').value, salida:document.getElementById('inputSalida').value, almuerzo:document.getElementById('checkAlmuerzo').checked
    }]};
    req("registrar_horas", d).then(j => { alert("Guardado"); document.getElementById('form-horas').reset(); });
});

const modals = {
    nuevoTrabajador: () => new bootstrap.Modal(document.getElementById('modalTrabajador')).show(),
    guardarTrabajador: () => { const n=document.getElementById('new-worker-name').value; const s=document.getElementById('new-worker-salary').value; if(n&&s) req("crear_trabajador", {nombre:n, salario:s}).then(()=>{ alert("Creado"); app.fetchMetadata(); }); },
    nuevoCliente: () => new bootstrap.Modal(document.getElementById('modalCliente')).show(),
    guardarCliente: () => { const n=document.getElementById('new-client-name').value; if(n) req("crear_cliente", {nombre:n}).then(()=>{ alert("Creado"); app.fetchMetadata(); }); }
};

document.addEventListener('DOMContentLoaded', app.init);
