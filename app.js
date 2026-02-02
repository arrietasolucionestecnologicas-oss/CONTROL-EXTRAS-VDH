/** APP.JS V11 - FLUID UX & PERSISTENCE */
const CONFIG = {
    // 🔴 PEGA LA NUEVA URL AQUÍ
    API: "https://script.google.com/macros/s/AKfycbyubr3wxCftRobp80h3KUgzZymjqrnasvB5HaJfi81Hn3XDh0sP28uoIuOU3B46cPpP/exec"
};

// Cargar estado de sesión persistente
let S = JSON.parse(sessionStorage.getItem('vdh_v11')) || { dbId: null, role: null, master: null };

const api = async (act, pl={}) => {
    if(S.dbId) pl.dbId = S.dbId;
    if(S.master) pl.masterKey = S.master;
    try {
        const r = await fetch(CONFIG.API, {method:"POST", body:JSON.stringify({action:act, payload:pl})});
        const j = await r.json();
        return j;
    } catch(e) { 
        console.error(e); 
        toast("Error de conexión", "bg-danger"); 
        return {status:"error"}; 
    }
};

const toast = (msg, bg="bg-success") => {
    const el = document.getElementById('liveToast');
    el.className = `toast align-items-center text-white border-0 ${bg}`;
    document.getElementById('toast-msg').innerText = msg;
    new bootstrap.Toast(el).show();
};

const app = {
    init: () => {
        console.log("VDH v11 Started");
        // Restaurar sesión si existe
        if(S.role) {
            app.loadRole(S.role);
        } else {
            app.view('view-login');
            app.loadEmpresasLogin();
        }
    },

    loadEmpresasLogin: () => {
        api("get_public_list").then(j => {
            const s = document.getElementById('login-empresa');
            s.innerHTML = '<option value="">Soy Administrador</option>';
            if(j.data) j.data.forEach(e => s.innerHTML+=`<option value="${e.id}">${e.nombre}</option>`);
        });
    },

    login: () => {
        const u = document.getElementById('login-empresa').value;
        const p = document.getElementById('login-pass').value;
        if(!p) return alert("Ingrese contraseña");
        
        document.getElementById('loader').classList.remove('d-none');
        api("login", {user:u, pass:p}).then(j => {
            const d = j.data||j;
            if(j.status==='success') {
                S.role = d.role;
                if(d.role==='ADMIN') { S.master=p; } else { S.dbId=d.dbId; S.nombre=d.nombre; }
                sessionStorage.setItem('vdh_v11', JSON.stringify(S));
                app.loadRole(d.role);
            } else alert(j.message);
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },

    logout: () => { sessionStorage.clear(); location.reload(); },

    view: (id) => {
        document.querySelectorAll('.app-view').forEach(e=>e.classList.add('d-none'));
        document.getElementById(id).classList.remove('d-none');
    },

    loadRole: (role) => {
        app.view('view-app');
        const tabs = document.getElementById('main-tabs');
        const content = document.getElementById('tab-content');
        tabs.innerHTML = ""; content.innerHTML = "";
        
        document.getElementById('app-user-label').innerText = role==='ADMIN' ? "GERENCIA" : S.nombre;

        if(role === 'ADMIN') {
            app.addTab("Gestión Empresas", "tpl-admin", app.admLoad);
        } else {
            // Software (Contador/Digitador)
            app.addTab("Registro Operativo", "tpl-registro", app.regLoad);
            app.addTab("Base de Datos (Excel)", "tpl-grid", app.gridLoad);
            app.addTab("Parametrización", "tpl-config", app.cfgLoad);
        }
        // Activar primer tab
        tabs.firstChild.querySelector('button').click();
    },

    addTab: (label, tplId, callback) => {
        const id = "tab-"+tplId;
        const li = document.createElement('li'); li.className="nav-item";
        li.innerHTML = `<button class="nav-link" data-bs-toggle="tab" data-bs-target="#${id}">${label}</button>`;
        li.querySelector('button').onclick = callback;
        document.getElementById('main-tabs').appendChild(li);
        
        const div = document.createElement('div'); div.className="tab-pane fade"; div.id = id;
        div.appendChild(document.getElementById(tplId).content.cloneNode(true));
        document.getElementById('tab-content').appendChild(div);
    },

    // --- MODULOS ---
    
    // 1. REGISTRO
    regLoad: () => {
        api("get_full_data").then(j => {
            const d = j.data;
            const fill = (id, arr) => {
                const s = document.querySelector(`#${id}`); if(!s)return; s.innerHTML="";
                arr.forEach(x => s.innerHTML+=`<option>${x.nombre||x}</option>`);
            };
            fill('reg-trabajador', d.empleados);
            fill('reg-cliente', d.clientes);
            app.gridLoadSimple();
        });
        
        const form = document.getElementById('form-registro');
        if(form) form.onsubmit = (e) => {
            e.preventDefault();
            const pl = { registros: [{
                fecha: document.getElementById('reg-fecha').value,
                trabajador: document.getElementById('reg-trabajador').value,
                cliente: document.getElementById('reg-cliente').value,
                trabajo: document.getElementById('reg-actividad').value,
                entrada: document.getElementById('reg-entrada').value,
                salida: document.getElementById('reg-salida').value,
                almuerzo: document.getElementById('reg-almuerzo').checked
            }]};
            api("save_entry", pl).then(() => { toast("Guardado Exitosamente"); app.gridLoadSimple(); });
        };
    },

    gridLoadSimple: () => {
        api("get_grid").then(j => {
            const t = document.getElementById('grid-historial-simple'); t.innerHTML="";
            j.data.data.slice(0,50).forEach(r => {
                t.innerHTML += `<tr><td>${r.fecha}</td><td>${r.trabajador}</td><td>${r.total}h</td><td><span class="badge bg-warning text-dark">${r.estado}</span></td>
                <td><button class="btn btn-sm btn-outline-danger" onclick="app.delEntry('${r.id}', true)">×</button></td></tr>`;
            });
        });
    },

    // 2. GRID TOTAL
    gridLoad: () => {
        document.getElementById('loader').classList.remove('d-none');
        api("get_grid").then(j => {
            const t = document.getElementById('grid-total-body'); t.innerHTML="";
            j.data.data.forEach(r => {
                t.innerHTML += `<tr><td><small>${r.id}</small></td><td>${r.fecha}</td><td>${r.trabajador}</td><td>${r.cliente}</td><td>${r.entrada}</td><td>${r.salida}</td>
                <td class="fw-bold">${r.total}</td><td>${r.ord}</td><td>${r.rec_noc}</td><td>${r.dom}</td><td>${r.ext_diu}</td><td>${r.ext_noc}</td><td>${r.estado}</td>
                <td><button class="btn btn-sm btn-danger py-0" onclick="app.delEntry('${r.id}')">Eliminar</button></td></tr>`;
            });
        }).finally(()=>document.getElementById('loader').classList.add('d-none'));
    },

    delEntry: (id, simple=false) => {
        if(confirm("¿Eliminar registro?")) {
            api("delete_entry", {idRegistro:id}).then(() => {
                toast("Eliminado", "bg-danger");
                simple ? app.gridLoadSimple() : app.gridLoad();
            });
        }
    },

    // 3. CONFIG
    cfgLoad: () => {
        api("get_full_data").then(j => {
            const c = j.data.config;
            const days = ["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];
            let rules = {1:9,2:9,3:9,4:9,5:9,6:4,0:8};
            try{ rules = JSON.parse(c.REGLAS_JORNADA); }catch(e){}
            
            const div = document.getElementById('cfg-jornada-list'); div.innerHTML="";
            days.forEach((d,i) => {
                div.innerHTML += `<div class="d-flex justify-content-between mb-1 align-items-center"><span>${d}</span><input type="number" class="form-control form-control-sm w-25 day-rule" data-day="${i}" value="${rules[i]||0}"></div>`;
            });

            document.getElementById('cfg-base').value = c.HORAS_BASE_MES||240;
            document.getElementById('cfg-rn').value = c.FACTOR_REC_NOC||0.35;
            document.getElementById('cfg-ed').value = c.FACTOR_EXT_DIU||1.25;
            document.getElementById('cfg-en').value = c.FACTOR_EXT_NOC||1.75;
            document.getElementById('cfg-df').value = c.FACTOR_DOM_FES||1.75;
            document.getElementById('cfg-edom').value = c.FACTOR_EXT_DOM||2.00;

            const divF = document.getElementById('cfg-festivos-list'); divF.innerHTML="";
            j.data.festivos.forEach(f => divF.innerHTML+=`<div class="small border-bottom py-1">${f.fecha} - ${f.nombre}</div>`);
        });
    },

    saveConfig: () => {
        const j={}; document.querySelectorAll('.day-rule').forEach(i=>j[i.dataset.day]=Number(i.value));
        const pl = {
            jornada: j,
            factores: {
                HORAS_BASE_MES: document.getElementById('cfg-base').value,
                FACTOR_REC_NOC: document.getElementById('cfg-rn').value,
                FACTOR_EXT_DIU: document.getElementById('cfg-ed').value,
                FACTOR_EXT_NOC: document.getElementById('cfg-en').value,
                FACTOR_DOM_FES: document.getElementById('cfg-df').value,
                FACTOR_EXT_DOM: document.getElementById('cfg-edom').value
            }
        };
        api("save_config", pl).then(()=>toast("Configuración Guardada"));
    },

    // 4. ADMIN PANEL
    admLoad: () => {
        api("get_public_list").then(j => {
            const ul = document.getElementById('adm-list'); ul.innerHTML="";
            j.data.forEach(e => {
                ul.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${e.nombre}</span>
                    <div>
                        <button class="btn btn-sm btn-success me-2" onclick="app.admEnter('${e.id}','${e.nombre}')">Entrar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.admDel('${e.id}')">X</button>
                    </div>
                </li>`;
            });
        });
    },
    admCreate: () => {
        const n = document.getElementById('adm-name').value;
        const t = document.getElementById('adm-token').value;
        if(n && t) api("create_company", {name:n, token:t, key:S.master}).then(()=>{ toast("Empresa Creada"); app.admLoad(); });
    },
    admDel: (id) => { if(confirm("¿Eliminar Empresa?")) api("delete_company", {id:id, key:S.master}).then(()=>{ toast("Empresa Eliminada", "bg-danger"); app.admLoad(); }); },
    admEnter: (id, nom) => {
        S.role = 'CLIENT'; S.dbId = id; S.nombre = nom;
        sessionStorage.setItem('vdh_v11', JSON.stringify(S));
        app.loadRole('CLIENT');
    }
};

document.addEventListener('DOMContentLoaded', app.init);
