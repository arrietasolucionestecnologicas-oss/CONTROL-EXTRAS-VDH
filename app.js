/** APP.JS V22.0 (FINAL) */
const CONFIG = {
    // 🔴 PEGA LA NUEVA URL DEL DEPLOY AQUÍ
    API: "https://script.google.com/macros/s/AKfycbwkFaP_G5bSYnalTk4w92OZ3FuSBMaSTF3x2z5TDGGqiR0R1Oa6V4hlxmcH0XvDTzyl/exec"
};

let S = JSON.parse(sessionStorage.getItem('vdh_v22')) || { dbId: null, role: null, viewRole: null };

const api = async (act, pl={}) => {
    if(S.dbId) pl.dbId = S.dbId;
    if(S.isMaster) pl.masterKey = "VDH_MASTER_2026"; // Auto-inyeccion de credencial para Master
    try {
        const r = await fetch(CONFIG.API, {method:"POST", body:JSON.stringify({action:act, payload:pl})});
        return await r.json();
    } catch(e) { console.error(e); return {status:"error", message: "Error Red"}; }
};

const toast = (m) => { document.getElementById('toast-msg').innerText=m; new bootstrap.Toast(document.getElementById('liveToast')).show(); };

const app = {
    init: () => {
        if(S.role) app.setupInterface();
        else { app.switchView('view-login'); app.loadLogin(); }
    },

    loadLogin: () => {
        api("get_public_list").then(j => {
            const s = document.getElementById('login-empresa');
            s.innerHTML = '<option value="" disabled selected>Seleccione...</option>';
            if(j.data) j.data.forEach(e => s.innerHTML+=`<option value="${e.id}">${e.nombre}</option>`);
        });
    },

    login: () => {
        const u = document.getElementById('login-empresa').value;
        const p = document.getElementById('login-pass').value;
        const roleType = document.querySelector('input[name="role_radio"]:checked').value; 
        
        document.getElementById('loader').classList.remove('d-none');
        
        api("login", {user:u, pass:p, roleType: roleType}).then(j => {
            const d = j.data||j;
            if(j.status==='success') {
                S.role = d.role; 
                S.dbId = d.dbId; S.nombre = d.nombre; S.isMaster = d.isMaster;
                sessionStorage.setItem('vdh_v22', JSON.stringify(S));
                app.setupInterface();
            } else alert(j.message);
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },

    logout: () => { sessionStorage.clear(); location.reload(); },

    switchView: (id) => {
        document.querySelectorAll('.app-view').forEach(e=>e.classList.add('d-none'));
        document.getElementById(id).classList.remove('d-none');
    },

    setupInterface: () => {
        app.switchView('view-app');
        document.getElementById('user-label').innerText = `${S.nombre} (${S.role})`;
        const m = document.getElementById('menu-container'); m.innerHTML = "";
        
        if(S.role === 'DIGITADOR') {
            m.innerHTML += `<button class="menu-btn active" onclick="app.loadModule('registro')"><i class="bi bi-pencil"></i> Registro</button>`;
            app.loadModule('registro');
        } else if (S.role === 'CONTADOR') {
            m.innerHTML += `<button class="menu-btn active" onclick="app.loadModule('finanzas')"><i class="bi bi-cash-coin"></i> Finanzas</button>`;
            m.innerHTML += `<button class="menu-btn" onclick="app.loadModule('config')"><i class="bi bi-gear"></i> Configuración</button>`;
            if(S.isMaster) m.innerHTML += `<button class="menu-btn" onclick="app.loadModule('empresas')"><i class="bi bi-buildings"></i> Empresas</button>`;
            app.loadModule('finanzas');
        }
    },

    loadModule: (mod) => {
        document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
        if(event && event.target) event.target.closest('button').classList.add('active');
        const content = document.getElementById('panel-content');
        const tpl = document.getElementById('tpl-'+mod);
        content.innerHTML = ""; content.appendChild(tpl.content.cloneNode(true));
        
        if(mod === 'registro') app.modRegistro();
        if(mod === 'finanzas') app.modFinanzas();
        if(mod === 'config') app.modConfig();
        if(mod === 'empresas') app.modEmpresas();
    },

    // --- DIGITADOR ---
    modRegistro: () => {
        api("get_full_data").then(j => {
            const d = j.data;
            const fill = (id, arr) => { const s = document.querySelector(`#${id}`); if(!s)return; s.innerHTML=""; arr.forEach(x => s.innerHTML+=`<option>${x.nombre||x}</option>`); };
            fill('reg-trabajador', d.empleados); fill('reg-cliente', d.clientes); fill('sal-trabajador', d.empleados);
            app.loadGridDigitador();
        });
        document.getElementById('form-registro').onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('reg-id').value;
            const pl = { fecha: document.getElementById('reg-fecha').value, trabajador: document.getElementById('reg-trabajador').value, cliente: document.getElementById('reg-cliente').value, trabajo: document.getElementById('reg-actividad').value, entrada: document.getElementById('reg-entrada').value, salida: document.getElementById('reg-salida').value, almuerzo: document.getElementById('reg-almuerzo').checked };
            const act = id ? "edit_entry" : "save_entry"; if(id) pl.idRegistro = id;
            api(act, id ? {idRegistro:id, datos:pl} : {registros:[pl]}).then(() => { toast(id?"Actualizado":"Guardado"); app.cancelEdit(); app.loadGridDigitador(); });
        };
    },
    loadGridDigitador: () => {
        api("get_grid").then(j => {
            const t = document.getElementById('grid-digitador'); if(!t) return;
            t.innerHTML=""; const data = (j.data && j.data.data) ? j.data.data.slice(0,50) : [];
            window.lastData = data; 
            data.forEach(r => t.innerHTML += `<tr><td>${r.fecha}</td><td>${r.trabajador}</td><td>${r.total}h</td><td><button class="btn btn-sm btn-outline-primary" onclick="app.edit('${r.id}')">✏️</button> <button class="btn btn-sm btn-outline-danger" onclick="app.del('${r.id}')">🗑️</button></td></tr>`);
        });
    },
    edit: (id) => {
        const r = window.lastData.find(x => x.id === id);
        document.getElementById('reg-id').value = id; document.getElementById('reg-fecha').value = r.fechaRaw; document.getElementById('reg-trabajador').value = r.trabajador; document.getElementById('reg-cliente').value = r.cliente; document.getElementById('reg-actividad').value = r.actividad; document.getElementById('reg-entrada').value = r.entrada; document.getElementById('reg-salida').value = r.salida; document.getElementById('reg-almuerzo').checked = r.almuerzo;
        document.getElementById('btn-save').innerText = "ACTUALIZAR"; document.getElementById('btn-save').classList.replace('btn-gold','btn-warning'); document.getElementById('btn-cancel').classList.remove('d-none');
    },
    cancelEdit: () => { document.getElementById('form-registro').reset(); document.getElementById('reg-id').value = ""; document.getElementById('btn-save').innerText = "GUARDAR"; document.getElementById('btn-save').classList.replace('btn-warning','btn-gold'); document.getElementById('btn-cancel').classList.add('d-none'); },
    del: (id) => { if(confirm("¿Borrar?")) api("delete_entry", {idRegistro:id}).then(()=>{ toast("Eliminado"); app.loadGridDigitador(); }); },
    updateSalary: () => { const t = document.getElementById('sal-trabajador').value; const m = document.getElementById('sal-monto').value; if(t && m) api("actualizar_salario", {nombre:t, nuevoSalario:m}).then(()=>{ toast("Salario Actualizado"); }); },

    // --- FINANZAS (6 ITEMS) ---
    modFinanzas: () => {
        const fI = document.getElementById('filter-start').value;
        const fF = document.getElementById('filter-end').value;
        
        api("get_grid", {inicio:fI, fin:fF}).then(j => {
            const t = document.getElementById('grid-db'); if(t) t.innerHTML="";
            if(j.data && j.data.data) j.data.data.forEach(r => t.innerHTML+=`<tr><td>${r.fecha}</td><td>${r.trabajador}</td><td>${r.cliente}</td><td>${r.actividad}</td><td>${r.total}</td><td>${r.estado}</td></tr>`);
        });

        api("get_finance", {inicio:fI, fin:fF}).then(j => {
            const d = j.data; if(!d) return;
            const tVal = document.getElementById('grid-valorizacion'); 
            const tHor = document.getElementById('grid-resumen-horas');
            if(tVal) tVal.innerHTML=""; if(tHor) tHor.innerHTML="";
            window.exportData = d.resumen;
            
            // Guardamos IDs pendientes para aprobar
            window.pendingIds = [];
            if(d.pendientes) d.pendientes.forEach(p => window.pendingIds.push(p.rowId));

            d.resumen.forEach(r => {
                tVal.innerHTML+=`<tr><td>${r.nombre}</td>
                <td>$${r.v_rn.toLocaleString()}</td><td>$${r.v_ed.toLocaleString()}</td><td>$${r.v_en.toLocaleString()}</td>
                <td>$${r.v_df.toLocaleString()}</td><td>$${r.v_edd.toLocaleString()}</td><td>$${r.v_edn.toLocaleString()}</td>
                <td class="fw-bold text-success">$${r.total_dinero.toLocaleString()}</td></tr>`;
                
                tHor.innerHTML+=`<tr><td>${r.nombre}</td><td>${r.h_rn}</td><td>${r.h_ed}</td><td>${r.h_en}</td><td>${r.h_df}</td><td>${r.h_edd}</td><td>${r.h_edn}</td></tr>`;
            });
        });
    },

    approveAll: () => {
        if(!window.pendingIds || window.pendingIds.length === 0) return alert("Nada por aprobar");
        if(confirm("¿Aprobar y Bloquear registros?")) {
            api("aprobar_lote", {ids: window.pendingIds}).then(()=>{ toast("Aprobado"); app.modFinanzas(); });
        }
    },

    exportExcel: () => {
        if(!window.exportData) return alert("Sin datos");
        let csv = "TRABAJADOR,TOTAL A PAGAR\n";
        window.exportData.forEach(x => csv += `${x.nombre},${x.total_dinero}\n`);
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        a.download = 'nomina.csv';
        a.click();
    },

    // --- CONFIG ---
    modConfig: () => {
        api("get_full_data").then(j => {
            const c = j.data.config; 
            document.getElementById('cfg-rn').value=c.FACTOR_REC_NOC;
            document.getElementById('cfg-ed').value=c.FACTOR_EXT_DIU;
            document.getElementById('cfg-en').value=c.FACTOR_EXT_NOC;
            document.getElementById('cfg-df').value=c.FACTOR_DOM_FES;
            document.getElementById('cfg-edom').value=c.FACTOR_EXT_DOM;
            document.getElementById('cfg-edom-n').value=c.FACTOR_EXT_DOM_NOC; // Nuevo campo
            
            const days=["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];
            let r={1:9,2:9,3:9,4:9,5:9,6:4,0:8}; try{r=JSON.parse(c.REGLAS_JORNADA)}catch(e){}
            const div = document.getElementById('cfg-jornada'); div.innerHTML="";
            days.forEach((d,i)=>div.innerHTML+=`<div class="d-flex justify-content-between mb-2"><span>${d}</span><input type="number" class="form-control form-control-sm w-25 dr" data-d="${i}" value="${r[i]||0}"></div>`);
        });
    },
    saveConfig: () => {
        const j={}; document.querySelectorAll('.dr').forEach(i=>j[i.dataset.d]=Number(i.value));
        const pl = { jornada:j, factores:{ 
            FACTOR_REC_NOC:document.getElementById('cfg-rn').value, 
            FACTOR_EXT_DIU:document.getElementById('cfg-ed').value, 
            FACTOR_EXT_NOC:document.getElementById('cfg-en').value, 
            FACTOR_DOM_FES:document.getElementById('cfg-df').value, 
            FACTOR_EXT_DOM:document.getElementById('cfg-edom').value,
            FACTOR_EXT_DOM_NOC:document.getElementById('cfg-edom-n').value
        }};
        api("save_config", pl).then(()=>toast("Guardado"));
    },

    // --- EMPRESAS (MASTER) ---
    modEmpresas: () => {
        api("get_public_list").then(j => {
            const l = document.getElementById('emp-list'); l.innerHTML="";
            j.data.forEach(e => l.innerHTML+=`<li class="list-group-item">${e.nombre} - <small class="text-muted">${e.id}</small></li>`);
        });
    },
    createCompany: () => {
        const n = document.getElementById('new-emp-name').value;
        const t = document.getElementById('new-emp-token').value;
        if(n && t) api("crear_empresa", {name:n, token:t}).then(()=>{ toast("Empresa Creada"); app.modEmpresas(); });
    }
};

document.addEventListener('DOMContentLoaded', app.init);
