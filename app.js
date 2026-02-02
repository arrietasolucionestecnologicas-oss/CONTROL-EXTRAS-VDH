/** APP.JS V14.0 - CONEXIÓN ESTÁNDAR */
const CONFIG = {
    // 🔴 PEGA TU NUEVA URL AQUÍ (V14.0)
    API: "https://script.google.com/macros/s/AKfycbylf2bAabbTly6RM4_NuqxGuSGbkxGfrGuCXYEYuzWa6UQ5lXoDMJ-y3nv0FGADPyeP/exec" 
};

// Cargar estado
let S = JSON.parse(sessionStorage.getItem('vdh_v14')) || { dbId: null, role: null, viewRole: null };

const api = async (act, pl={}) => {
    // Inyectar credenciales si existen
    if(S.dbId) pl.dbId = S.dbId;
    if(S.master) pl.masterKey = S.master;
    
    // Método estándar robusto
    const options = {
        method: "POST",
        // 'application/json' dispara CORS pre-flight, pero como pusimos "Cualquier usuario",
        // Google lo maneja bien SIEMPRE Y CUANDO el script no falle internamente.
        // Como blindamos API.gs, esto debe funcionar.
        body: JSON.stringify({ action: act, payload: pl })
    };

    try {
        // Fetch sin headers manuales para dejar que el navegador maneje el Content-Type simple si es posible
        // o añadir explícitamente si se requiere. Google Apps Script prefiere "text/plain" a veces
        // para evitar OPTIONS, así que usaremos un truco híbrido:
        // Enviamos stringify pero sin header 'application/json' forzado.
        const r = await fetch(CONFIG.API, options);
        
        if (!r.ok) throw new Error(`HTTP ${r.status} - ${r.statusText}`);
        
        const t = await r.text();
        try {
            return JSON.parse(t);
        } catch (e) {
            console.error("Respuesta no es JSON:", t);
            throw new Error("El servidor respondió basura HTML (Posible error de script no capturado).");
        }
    } catch(e) { 
        console.error("RED:", e); 
        if(act === 'get_public_list') return { status:'error', message: 'Sin conexión al servidor.' };
        toast("Error de Conexión", "bg-danger"); 
        return { status: "error", message: e.message }; 
    }
};

const toast = (m, bg="bg-success") => { 
    const el = document.getElementById('liveToast');
    if(el) {
        el.className = `toast align-items-center text-white border-0 ${bg}`;
        const b = document.getElementById('toast-msg'); if(b) b.innerText=m;
        new bootstrap.Toast(el).show();
    } else alert(m);
};

const app = {
    init: () => {
        console.log("VDH v14 Init");
        if(S.role) app.setupInterface(S.viewRole);
        else { app.switchView('view-login'); app.loadLogin(); }
    },

    loadLogin: () => {
        const s = document.getElementById('login-empresa');
        if(!s) return;
        s.innerHTML = '<option disabled selected>Conectando...</option>';
        api("get_public_list").then(j => {
            if(j.status === 'error') {
                s.innerHTML = '<option disabled selected>⚠️ Offline</option>';
                alert("No se pudo conectar. Verifica la URL en app.js y los permisos de implementación.");
            } else {
                s.innerHTML = '<option value="">Soy Administrador</option>';
                if(j.data) j.data.forEach(e => s.innerHTML+=`<option value="${e.id}">${e.nombre}</option>`);
            }
        });
    },

    login: () => {
        const u = document.getElementById('login-empresa').value;
        const p = document.getElementById('login-pass').value;
        const rt = document.querySelector('input[name="role_radio"]:checked').value;
        
        document.getElementById('loader').classList.remove('d-none');
        api("login", {user:u, pass:p}).then(j => {
            const d = j.data||j;
            if(j.status==='success') {
                S.role = d.role;
                if(d.role === 'ADMIN') { S.master=p; S.viewRole='ADMIN'; }
                else { S.dbId=d.dbId; S.nombre=d.nombre; S.viewRole=rt; }
                sessionStorage.setItem('vdh_v14', JSON.stringify(S));
                app.setupInterface(S.viewRole);
            } else alert(j.message);
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },

    logout: () => { sessionStorage.clear(); location.reload(); },

    switchView: (id) => {
        document.querySelectorAll('.app-view').forEach(e=>e.classList.add('d-none'));
        document.getElementById(id).classList.remove('d-none');
    },

    setupInterface: (role) => {
        app.switchView('view-app');
        document.getElementById('user-label').innerText = S.nombre || "Gerencia";
        const m = document.getElementById('menu-container'); m.innerHTML="";
        
        if(role==='DIGITADOR') m.innerHTML += `<button class="menu-btn active" onclick="app.nav('registro')"><i class="bi bi-pencil"></i> Registro</button>`;
        else if(role==='CONTADOR') {
            m.innerHTML += `<button class="menu-btn active" onclick="app.nav('finanzas')"><i class="bi bi-cash"></i> Finanzas</button>`;
            m.innerHTML += `<button class="menu-btn" onclick="app.nav('config')"><i class="bi bi-gear"></i> Configuración</button>`;
            m.innerHTML += `<button class="menu-btn" onclick="app.nav('registro')"><i class="bi bi-eye"></i> Auditoría</button>`;
        } else if(role==='ADMIN') m.innerHTML += `<button class="menu-btn active" onclick="app.nav('admin')"><i class="bi bi-buildings"></i> Empresas</button>`;
        
        const first = m.querySelector('.menu-btn'); if(first) app.nav(role==='ADMIN'?'admin':(role==='DIGITADOR'?'registro':'finanzas'));
    },

    nav: (mod) => {
        document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
        if(event && event.target) event.target.closest('button').classList.add('active');
        const c = document.getElementById('panel-content'); c.innerHTML="";
        c.appendChild(document.getElementById('tpl-'+mod).content.cloneNode(true));
        if(mod==='registro') app.modRegistro();
        if(mod==='finanzas') app.modFinanzas();
        if(mod==='config') app.modConfig();
        if(mod==='admin') app.modAdmin();
    },

    // --- MODULO REGISTRO ---
    modRegistro: () => {
        api("get_full_data").then(j => {
            const d=j.data; if(!d)return;
            const f=(id,l)=>{const s=document.querySelector(`#${id}`);if(s){s.innerHTML="";l.forEach(x=>s.innerHTML+=`<option>${x.nombre||x}</option>`)}};
            f('reg-trabajador', d.empleados); f('reg-cliente', d.clientes);
            app.loadGrid();
        });
        const frm = document.getElementById('form-registro');
        if(frm) frm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('reg-id').value;
            const pl = {
                fecha: document.getElementById('reg-fecha').value,
                trabajador: document.getElementById('reg-trabajador').value,
                cliente: document.getElementById('reg-cliente').value,
                trabajo: document.getElementById('reg-actividad').value,
                entrada: document.getElementById('reg-entrada').value,
                salida: document.getElementById('reg-salida').value,
                almuerzo: document.getElementById('reg-almuerzo').checked
            };
            const act = id ? "edit_entry" : "save_entry";
            if(id) pl.idRegistro = id;
            api(act, id ? {idRegistro:id, datos:pl} : {registros:[pl]}).then(()=>{ toast("Guardado"); app.cancelEdit(); app.loadGrid(); });
        };
    },
    loadGrid: () => {
        api("get_grid").then(j => {
            const t = document.getElementById(S.viewRole==='DIGITADOR'?'grid-digitador':'grid-digitador'); // Reusar logica si existe
            // Nota: En tpl-registro de digitador el ID es grid-digitador
            const el = document.getElementById('grid-digitador');
            if(!el) return;
            el.innerHTML="";
            const data = (j.data && j.data.data) ? j.data.data.slice(0,50) : [];
            window.lastData = data;
            data.forEach(r => {
                el.innerHTML += `<tr><td>${r.fecha}</td><td>${r.trabajador}</td><td>${r.cliente}</td><td>${r.total}h</td><td>
                <button class="btn btn-sm btn-outline-primary" onclick="app.edit('${r.id}')">✏️</button>
                <button class="btn btn-sm btn-outline-danger" onclick="app.del('${r.id}')">🗑️</button></td></tr>`;
            });
        });
    },
    edit: (id) => {
        const r = window.lastData.find(x=>x.id===id);
        document.getElementById('reg-id').value=id;
        document.getElementById('reg-fecha').value=r.fechaRaw;
        document.getElementById('reg-trabajador').value=r.trabajador;
        document.getElementById('reg-cliente').value=r.cliente;
        document.getElementById('reg-actividad').value=r.actividad;
        document.getElementById('reg-entrada').value=r.entrada;
        document.getElementById('reg-salida').value=r.salida;
        document.getElementById('reg-almuerzo').checked=r.almuerzo;
        document.getElementById('btn-save').innerText="ACTUALIZAR";
        document.getElementById('btn-cancel').classList.remove('d-none');
    },
    cancelEdit: () => {
        document.getElementById('form-registro').reset();
        document.getElementById('reg-id').value="";
        document.getElementById('btn-save').innerText="GUARDAR";
        document.getElementById('btn-cancel').classList.add('d-none');
    },
    del: (id) => { if(confirm("¿Borrar?")) api("delete_entry", {idRegistro:id}).then(()=>{toast("Borrado");app.loadGrid()}); },

    // --- MODULO FINANZAS ---
    modFinanzas: () => {
        api("get_finance").then(j => {
            const d=j.data; if(!d) return;
            const t=document.getElementById('grid-finanzas'); t.innerHTML="";
            if(d.pendientes) d.pendientes.forEach(r => t.innerHTML+=`<tr><td>${r.fecha}</td><td>${r.trab}</td><td>${r.total}</td><td>${r.ord}</td><td>${r.rn}</td><td>${r.ed}</td><td>${r.en}</td><td>${r.df}</td><td>${r.edom}</td><td class="text-end fw-bold text-success">$${r.valor.toLocaleString()}</td></tr>`);
            const tr=document.getElementById('grid-resumen'); tr.innerHTML="";
            if(d.resumen) d.resumen.forEach(r => tr.innerHTML+=`<tr><td>${r.nombre}</td><td>${r.horas.toFixed(2)}</td><td class="text-success fw-bold">$${r.dinero.toLocaleString()}</td></tr>`);
        });
    },

    // --- CONFIG ---
    modConfig: () => {
        api("get_full_data").then(j => {
            const c=j.data.config; const days=["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];
            let r={1:9,2:9,3:9,4:9,5:9,6:4,0:8}; try{r=JSON.parse(c.REGLAS_JORNADA)}catch(e){}
            const div=document.getElementById('cfg-jornada'); div.innerHTML="";
            days.forEach((d,i)=>div.innerHTML+=`<div class="d-flex justify-content-between mb-2"><span>${d}</span><input type="number" class="form-control form-control-sm w-25 dr" data-d="${i}" value="${r[i]||0}"></div>`);
            document.getElementById('cfg-base').value=c.HORAS_BASE_MES||240;
            document.getElementById('cfg-rn').value=c.FACTOR_REC_NOC||0.35;
            document.getElementById('cfg-ed').value=c.FACTOR_EXT_DIU||1.25;
            document.getElementById('cfg-en').value=c.FACTOR_EXT_NOC||1.75;
            document.getElementById('cfg-df').value=c.FACTOR_DOM_FES||1.75;
            document.getElementById('cfg-edom').value=c.FACTOR_EXT_DOM||2.00;
        });
    },
    saveConfig: () => {
        const j={}; document.querySelectorAll('.dr').forEach(i=>j[i.dataset.d]=Number(i.value));
        const pl={jornada:j, factores:{
            HORAS_BASE_MES:document.getElementById('cfg-base').value, FACTOR_REC_NOC:document.getElementById('cfg-rn').value,
            FACTOR_EXT_DIU:document.getElementById('cfg-ed').value, FACTOR_EXT_NOC:document.getElementById('cfg-en').value,
            FACTOR_DOM_FES:document.getElementById('cfg-df').value, FACTOR_EXT_DOM:document.getElementById('cfg-edom').value
        }};
        api("save_config", pl).then(()=>toast("Guardado"));
    },

    // --- ADMIN ---
    modAdmin: () => {
        api("get_public_list").then(j => {
            const t=document.getElementById('adm-list'); t.innerHTML="";
            if(j.data) j.data.forEach(e => t.innerHTML+=`<tr><td>${e.nombre}</td><td><small>${e.token}</small></td><td><button class="btn btn-sm btn-danger" onclick="app.admDel('${e.id}')">X</button></td></tr>`);
        });
    },
    admCreate: () => {
        const n=document.getElementById('adm-name').value; const t=document.getElementById('adm-token').value;
        if(n&&t) api("create_company",{name:n,token:t}).then(()=>{toast("Creada");app.modAdmin()});
    },
    admDel: (id) => { if(confirm("¿Eliminar?")) api("delete_company",{id:id}).then(()=>{toast("Eliminada");app.modAdmin()}); }
};

document.addEventListener('DOMContentLoaded', app.init);
