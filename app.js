/**
 * APP.JS - MINISTERIO DE ALABANZA
 * Integridad Absoluta: Código Completo
 * Versión 5.3: Fix Visual (Altura Lista) + Categorías Restauradas
 */

// ================= CONFIGURACIÓN =================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyevrQgX1ifj-hKDnkZBXuoSA_M6blg3zz3rbC-9In7QrXbn5obsCxZZbDj7sl5aQMxxA/exec";

// ================= PUENTE DE CONEXIÓN =================
let showToastCallback = null;

async function callGasApi(action, payload = {}, password = "") {
    try {
        if(showToastCallback && (action.startsWith('save') || action.startsWith('delete'))) {
            showToastCallback("Procesando...", "loading");
        }
        
        const response = await fetch(GAS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" }, 
            body: JSON.stringify({ action, payload, password })
        });
        const result = await response.json();
        
        if(showToastCallback && result.status === 'success') {
            showToastCallback("¡Acción Exitosa!", "success");
        } else if (showToastCallback && result.status !== 'success') {
            showToastCallback("Error: " + result.message, "error");
        }
        
        return result;
    } catch (error) {
        if(showToastCallback) showToastCallback("Error de Red", "error");
        console.error("API Error:", error);
        return { status: "error", message: "Sin conexión" };
    }
}

// ================= INICIO LÓGICA REACT =================
const html = htm.bind(React.createElement);
const { useState, useEffect, useRef } = React;

// --- ICONOS SVG ---
const Icon = {
    ArrowLeft: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
    ArrowRight: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    ArrowUp: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
    ArrowDown: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
    Calendar: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>`,
    Music: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    Users: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    Plus: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
    Trash: () => html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    Check: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>`,
    Copy: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    Fire: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    Dove: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12c-4 0-7-4-7-4s4 4 2 9a4 4 0 0 1-4 4c-3 0-5-3-5-6s-2-4-5-5L2 9a2 2 0 0 1 0-3l3-3a6 6 0 0 1 6 0l4 4a5 5 0 0 1 5 5 2 2 0 0 1 2 0z"/></svg>`,
    Hand: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`, 
    Ring: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>`, 
    Gift: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.9 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>`,
    Info: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    List: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    WhatsApp: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`,
    Lock: () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
    Unlock: () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`,
    Activity: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    Wrench: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    History: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`,
    Mic: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`,
    Guitar: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18V2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><circle cx="12" cy="18" r="4"/><path d="M12 12v3"/></svg>`,
    Edit: () => html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
    Close: () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    Download: () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    BigPlus: () => html`<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`
};

// --- UTILIDADES ---
const SafeText = ({ content }) => {
    if (content === null || content === undefined) return "";
    return String(content);
};

const safeJoin = (list) => {
    if (!Array.isArray(list)) return "";
    return list.join(", ");
};

const formatTonoDisplay = (rawTono) => {
    try {
        if (!rawTono) return "";
        if (typeof rawTono === 'string' && rawTono.trim().startsWith('{')) {
            const obj = JSON.parse(rawTono);
            return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' | ');
        }
        return String(rawTono);
    } catch(e) { return String(rawTono); }
};

const getBestTone = (rawTono, currentVocalist) => {
    try {
        if (!rawTono) return "";
        let obj = rawTono;
        if (typeof rawTono === 'string' && rawTono.trim().startsWith('{')) {
            try { obj = JSON.parse(rawTono); } catch(e) { return rawTono; }
        }
        if (typeof obj === 'object' && obj !== null) {
            return String(obj[currentVocalist] || obj["Original"] || "");
        }
        return String(rawTono);
    } catch(e) { return ""; }
};

// ================= COMPONENTES BASE (DEFINIDOS PRIMERO) =================

// 1. SPLASH SCREEN
const SplashScreen = () => {
    return html`
        <div className="bg-[#020617] h-screen w-screen flex flex-col items-center justify-center fixed top-0 left-0 z-[100] fade-in text-center px-6">
            <div className="mb-6 animate-pulse text-yellow-500">
                <${Icon.Music} style=${{width: 60, height: 60}} />
            </div>
            <h1 className="text-3xl font-serif text-white mb-2 tracking-widest font-bold">GRUPO DE ALABANZA</h1>
            <h2 className="text-xl font-cinzel text-yellow-500 tracking-[0.2em] mb-12">ICC VILLA ROSARIO</h2>
            <div className="absolute bottom-10 left-0 right-0 text-center opacity-50">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Creado por</p>
                <p className="text-xs font-bold text-white uppercase tracking-wider mt-1">Gerson Arrieta</p>
            </div>
        </div>
    `;
};

// 2. TOAST
function Toast({ message, type }) {
    const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    return html`
        <div className="fixed top-4 right-4 z-[100] fade-in">
            <div className=${`${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10`}>
                ${type === 'loading' && html`<div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>`}
                <span className="font-bold text-sm">${message}</span>
            </div>
        </div>
    `;
}

// 3. MANUAL
function Manual({ onClose }) {
    return html`
        <div className="fixed inset-0 bg-black/90 z-[90] flex items-center justify-center p-4 fade-in">
            <div className="glass-gold p-6 rounded-2xl max-w-sm w-full text-center border border-yellow-500/30">
                <div className="text-yellow-500 mb-4 flex justify-center"><${Icon.Info} style=${{width: 40, height: 40}} /></div>
                <h2 className="text-xl font-serif text-white mb-4">Bienvenido al Sistema</h2>
                <div className="text-left space-y-4 text-sm text-slate-300 mb-6">
                    <div className="flex gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg h-fit"><${Icon.Music} /></div>
                        <div><strong className="text-white block">Banco de Canciones</strong>Agrega tus temas. Ahora soporta tonos por vocalista.</div>
                    </div>
                </div>
                <button onClick=${() => { localStorage.setItem('icc_tutorial_seen', 'true'); onClose(); }} className="w-full bg-yellow-600 py-3 rounded-xl font-bold text-black mb-2 shadow-lg">Entendido</button>
            </div>
        </div>
    `;
}

// 4. LOGS
function ActivityModal({ onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        callGasApi('getRecentActivity').then(res => {
            if(res.status === 'success') setLogs(res.data);
            setLoading(false);
        });
    }, []);

    return html`
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 fade-in">
            <div className="glass-gold p-6 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-serif text-white flex items-center gap-2"><${Icon.Activity} /> Bitácora</h2>
                    <button onClick=${onClose} className="text-slate-400 p-2">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
                    ${loading ? html`<div className="text-center text-yellow-500 mt-10">Cargando...</div>` :
                    logs.map((log, i) => html`
                        <div key=${i} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-xs">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span className="font-mono text-yellow-500"><${SafeText} content=${log.fecha} /> <${SafeText} content=${log.hora} /></span>
                                <span className="font-bold"><${SafeText} content=${log.accion} /></span>
                            </div>
                            <div className="text-slate-300"><${SafeText} content=${log.detalle} /></div>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
}

// 5. SEARCH SELECT
function SearchableUserSelect({ allUsers, selectedUsers, onAdd, onRemove, placeholder, icon }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);

    const handleSearch = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (val.length > 0) {
            const filtered = allUsers.filter(u => u.nombre.toLowerCase().includes(val.toLowerCase()) && !selectedUsers.includes(u.nombre));
            setResults(filtered);
        } else {
            setResults([]);
        }
    };

    const handleSelect = (user) => {
        onAdd(user.nombre);
        setQuery("");
        setResults([]);
    };

    return html`
        <div className="mb-4">
            <div className="relative">
                <input className="input-dark pl-10" placeholder=${placeholder} value=${query} onInput=${handleSearch} />
                <div className="absolute left-3 top-3 text-slate-500">${icon}</div>
            </div>
            ${results.length > 0 && html`
                <div className="bg-slate-800 border border-slate-700 rounded-lg mt-1 max-h-40 overflow-y-auto absolute z-10 w-full shadow-xl">
                    ${results.map(u => html`<div onClick=${() => handleSelect(u)} className="p-2 hover:bg-slate-700 cursor-pointer text-sm text-white border-b border-slate-700 last:border-0">${u.nombre}</div>`)}
                </div>
            `}
            <div className="mt-2 flex flex-wrap gap-2">
                ${selectedUsers.map(u => html`<div className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-xs text-slate-300 flex items-center gap-2">${u}<button onClick=${() => onRemove(u)} className="text-red-400 hover:text-red-300">✕</button></div>`)}
            </div>
        </div>
    `;
}

// ================= MANAGERS Y VISTAS =================

function TeamManager({ data, isAdmin, refresh }) {
    const [form, setForm] = useState({ id: '', nombre: '', rol: 'Corista', instrumento: '' });
    const [isEditing, setIsEditing] = useState(false);
    
    const save = () => { 
        if (!form.nombre) return; 
        callGasApi('saveMember', form, '1234').then(() => { setForm({ id: '', nombre: '', rol: 'Corista', instrumento: '' }); setIsEditing(false); refresh(); }); 
    };
    
    const edit = (member) => { setForm({ ...member }); setIsEditing(true); window.scrollTo(0,0); };
    const cancelEdit = () => { setForm({ id: '', nombre: '', rol: 'Corista', instrumento: '' }); setIsEditing(false); };
    const remove = (id) => { if (confirm('¿Eliminar?')) callGasApi('deleteMember', {id}, '1234').then(refresh); };

    return html`
        <div className="space-y-6">
            ${isAdmin ? html`
                <div className="glass p-4 rounded-xl space-y-3 border-t-2 border-teal-500">
                    <h3 className="text-xs font-bold text-teal-400 uppercase">${isEditing ? 'Editar' : 'Nuevo'}</h3>
                    <input className="input-dark" placeholder="Nombre" value=${form.nombre} onInput=${e => setForm({...form, nombre: e.target.value})} />
                    <div className="grid grid-cols-2 gap-2">
                        <select className="input-dark" value=${form.rol} onChange=${e => setForm({...form, rol: e.target.value})}><option>Líder</option><option>Corista</option><option>Músico</option></select>
                        <input className="input-dark" placeholder="Instrumento" value=${form.instrumento} onInput=${e => setForm({...form, instrumento: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                        ${isEditing && html`<button onClick=${cancelEdit} className="flex-1 py-3 bg-slate-800 rounded-lg text-slate-400">Cancelar</button>`}
                        <button onClick=${save} className="flex-1 bg-teal-600 py-3 rounded-lg font-bold text-sm shadow-lg btn-active">${isEditing ? 'Actualizar' : 'Guardar'}</button>
                    </div>
                </div>
            ` : html`<div className="p-3 bg-slate-900 rounded-xl text-center text-slate-500 text-xs italic"><${Icon.Lock} /> Solo el Director puede editar el equipo.</div>`}
            
            <div className="space-y-2 pb-10">
                ${data.map(m => html`
                    <div key=${m.id} className="glass p-3 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className=${`w-1 h-8 rounded-full ${m.rol==='Líder'?'bg-yellow-500':(m.rol==='Músico'?'bg-purple-500':'bg-blue-500')}`}></div>
                            <div><div className="font-bold text-sm text-white">${m.nombre}</div><div className="text-[10px] text-slate-400 uppercase">${m.rol}</div></div>
                        </div>
                        ${isAdmin && html`<div className="flex gap-2"><button onClick=${() => edit(m)} className="text-slate-400 p-2"><${Icon.Edit}/></button><button onClick=${() => remove(m.id)} className="text-red-400 p-2"><${Icon.Trash}/></button></div>`}
                    </div>
                `)}
            </div>
        </div>
    `;
}

function SongManager({ data, equipo, isAdmin, refresh, embedMode, onSelect, onSongsAdded, onDelete }) {
    const [mode, setMode] = useState('LIST'); 
    const [filterVocalist, setFilterVocalist] = useState("TODOS");
    const [search, setSearch] = useState("");
    const [song, setSong] = useState({ titulo: '', vocalista: '', ritmo: 'Rápida', letra: '', link: '', tono: '' });
    const [batchList, setBatchList] = useState([]);

    const categories = ["Rápida", "Lenta", "Ministración", "Matrimonio", "Eventos"];

    const saveSingle = () => { if(!song.titulo) return; callGasApi('saveSong', song).then(() => { refresh(); setMode('LIST'); }); };
    
    const startBatch = () => { setBatchList([{ id: Date.now().toString(), titulo: '', vocalista: '', ritmo: 'Rápida', tono: '', link: '', letra: '' }]); setMode('BATCH_ADD'); };
    const addBatchRow = () => { setBatchList([...batchList, { id: (Date.now()+batchList.length).toString(), titulo: '', vocalista: '', ritmo: 'Rápida', tono: '', link: '', letra: '' }]); };
    const updateBatchRow = (id, field, value) => { setBatchList(batchList.map(item => item.id === id ? { ...item, [field]: value } : item)); };
    const removeBatchRow = (id) => { if (batchList.length > 1) { setBatchList(batchList.filter(item => item.id !== id)); } };
    
    const saveBatch = () => { 
        const toSave = batchList.filter(s => s.titulo.trim() !== ""); 
        if (toSave.length === 0) return alert("Agrega al menos un título."); 
        callGasApi('saveSongsBatch', toSave).then(() => { 
            refresh(); setMode('LIST');
            if(embedMode && onSongsAdded) onSongsAdded(toSave);
        }); 
    };

    const uniqueVocalists = [...new Set([
        ...equipo.filter(e => e.rol === 'Líder').map(e => e.nombre),
        ...(data || []).map(s => s.vocalista).filter(v => v && v !== 'General')
    ])].sort();

    if (mode === 'BATCH_ADD') return html`
        <div className="pb-20 fade-in">
            <div className="flex justify-between items-center mb-4"><h2 className="font-serif text-xl text-white">Carga Masiva</h2><button onClick=${() => setMode('LIST')} className="text-xs text-slate-400">Cancelar</button></div>
            <div className="space-y-4">
                ${batchList.map((item, idx) => html`
                    <div key=${item.id} className="glass p-4 rounded-xl border border-slate-700 relative">
                        <div className="absolute top-2 right-2 text-xs text-slate-500 font-bold">#${idx+1}</div>
                        <input className="input-dark mb-2 text-sm font-bold" placeholder="Título Canción" value=${item.titulo} onInput=${e => updateBatchRow(item.id, 'titulo', e.target.value)} />
                        <div className="mb-2"><input className="input-dark text-xs mb-1" placeholder="Vocalista(s)" value=${item.vocalista} onInput=${e => updateBatchRow(item.id, 'vocalista', e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <select className="input-dark text-sm" value=${item.ritmo} onChange=${e => updateBatchRow(item.id, 'ritmo', e.target.value)}>
                                ${categories.map(c => html`<option value=${c}>${c}</option>`)}
                            </select>
                            <input className="input-dark text-sm" placeholder="Tono" value=${item.tono} onInput=${e => updateBatchRow(item.id, 'tono', e.target.value)} />
                        </div>
                        ${batchList.length > 1 && html`<button onClick=${() => removeBatchRow(item.id)} className="text-red-400 text-xs mt-2 underline">Eliminar</button>`}
                    </div>
                `)}
                <button onClick=${addBatchRow} className="w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 text-sm hover:bg-slate-800 transition">+ Agregar Fila</button>
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#020617]/95 border-t border-slate-800 flex gap-3 backdrop-blur z-50"><button onClick=${saveBatch} className="w-full py-3 bg-blue-600 rounded-xl font-bold shadow-lg text-white">GUARDAR TODAS</button></div>
        </div>
    `;

    if (mode === 'EDIT_SINGLE') return html`
        <div className="space-y-4 pb-10 fade-in">
            <button onClick=${() => setMode('LIST')} className="text-xs text-slate-400 mb-2">← Cancelar</button>
            <h2 className="font-serif text-xl text-white">Editar Canción</h2>
            <input className="input-dark" placeholder="Título" value=${song.titulo} onInput=${e => setSong({...song, titulo: e.target.value})} />
            <input className="input-dark" placeholder="Vocalista" value=${song.vocalista} onInput=${e => setSong({...song, vocalista: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
                <select className="input-dark" value=${song.ritmo} onChange=${e => setSong({...song, ritmo: e.target.value})}>
                    ${categories.map(c => html`<option value=${c}>${c}</option>`)}
                </select>
                <input className="input-dark" placeholder="Tono" value=${getBestTone(song.tono, filterVocalist !== "TODOS" ? filterVocalist : "Original")} onInput=${e => setSong({...song, tono: e.target.value})} />
            </div>
            <input className="input-dark" placeholder="Link YouTube" value=${song.link} onInput=${e => setSong({...song, link: e.target.value})} />
            <textarea className="input-dark h-32" placeholder="Letra..." value=${song.letra} onInput=${e => setSong({...song, letra: e.target.value})}></textarea>
            
            <div className="flex gap-2">
                ${isAdmin && song.id && html`<button onClick=${() => { onDelete(song.id); setMode('LIST'); }} className="px-4 bg-red-900/50 border border-red-500 text-red-400 rounded-lg"><${Icon.Trash}/></button>`}
                <button onClick=${saveSingle} className="flex-1 bg-blue-600 py-3 rounded-lg font-bold shadow-lg btn-active">Guardar</button>
            </div>
        </div>
    `;

    let filtered = (data || []).filter(s => s.titulo.toLowerCase().includes(search.toLowerCase()));
    if (filterVocalist !== "TODOS") { filtered = filtered.filter(s => (s.vocalista || "").toLowerCase().includes(filterVocalist.toLowerCase())); }

    return html`
        <div className="pb-20 space-y-4">
            <div className="flex gap-2">
                <input id="song-search-input" className="input-dark flex-1" placeholder="Buscar..." value=${search} onInput=${e => setSearch(e.target.value)} />
                <button onClick=${startBatch} className="bg-blue-600 px-4 rounded-xl shadow-lg flex items-center gap-1 font-bold text-xs"><${Icon.Plus}/> Masivo</button>
            </div>
            <select className="input-dark py-2 mt-1" value=${filterVocalist} onChange=${e => setFilterVocalist(e.target.value)}><option value="TODOS">Todos los Cantantes</option>${uniqueVocalists.map(v => html`<option value=${v}>${v}</option>`)}</select>
            
            <div className="space-y-2 pb-24">
                ${filtered.map(s => html`
                    <div key=${s.id} onClick=${() => { if (embedMode) { onSelect(s); } else if(isAdmin) { setSong({...s}); setMode('EDIT_SINGLE'); } }} className="glass p-3 rounded-xl flex items-center gap-3 mb-2 cursor-pointer border border-transparent hover:border-slate-500">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800 text-slate-400"><${Icon.Music}/></div>
                        <div className="flex-1"><div className="font-bold text-white text-sm">${s.titulo}</div><div className="text-[10px] text-slate-400 flex gap-2"><span>👤 ${s.vocalista}</span><span className="text-yellow-500 font-mono">${formatTonoDisplay(s.tono)}</span></div></div>
                        ${embedMode && html`<div className="text-green-500 font-bold text-lg">+</div>`}
                    </div>
                `)}
            </div>
        </div>
    `;
}

// ================= VISTAS DE NEGOCIO =================

function MonthPoster({ servicios }) {
    const [offset, setOffset] = useState(0);
    const date = new Date();
    date.setDate(1); 
    date.setMonth(date.getMonth() + offset);
    const monthName = date.toLocaleDateString('es-CO', { month: 'long' });
    const year = date.getFullYear();
    const posterRef = useRef(null);
    
    const monthServices = servicios.filter(s => {
        if(!s.fecha) return false;
        const d = new Date(s.fecha + "T00:00:00");
        return d.getMonth() === date.getMonth() && d.getFullYear() === year;
    }).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

    const generatePng = async () => {
        if (posterRef.current) {
            try {
                const canvas = await html2canvas(posterRef.current, { backgroundColor: "#0f172a", scale: 2 });
                const link = document.createElement('a');
                link.download = `Cronograma-${monthName}.png`;
                link.href = canvas.toDataURL();
                link.click();
            } catch (err) { alert("Error"); }
        }
    };

    return html`
        <div className="fade-in pb-10">
            <div className="flex justify-between items-center glass p-2 rounded-xl mb-4">
                <button onClick=${() => setOffset(offset - 1)} className="p-2"><${Icon.ArrowLeft}/></button><span className="font-bold uppercase text-sm">${monthName} ${year}</span><button onClick=${() => setOffset(offset + 1)} className="p-2"><${Icon.ArrowRight}/></button>
            </div>
            <button onClick=${generatePng} className="w-full bg-blue-600 mb-4 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg btn-active"><${Icon.Download} /> Guardar Imagen (PNG)</button>
            <div ref=${posterRef} className="glass-gold p-6 rounded-xl relative overflow-hidden bg-slate-900">
                <div className="text-center border-b border-yellow-500/30 pb-4 mb-4"><p className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.3em] mb-1">Cronograma Oficial</p><h2 className="text-2xl font-serif font-bold text-white uppercase">${monthName}</h2></div>
                <div className="space-y-6">
                    ${monthServices.map(s => {
                        const d = new Date(s.fecha + "T00:00:00");
                        return html`<div className="border-l-2 border-yellow-500 pl-4 relative"><div className="flex justify-between items-baseline mb-1"><h3 className="text-lg font-bold text-white capitalize">${d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' })}</h3><span className="text-[9px] uppercase font-bold text-yellow-500">${s.jornada}</span></div><div className="text-sm mb-2"><span className="text-slate-400 block text-xs">Dirige:</span><strong className="text-white text-base">${s.lider}</strong></div><div className="grid grid-cols-1 gap-1 text-xs text-slate-300"><div><span className="text-yellow-600 font-bold mr-1">Coros:</span>${safeJoin(s.coristas)||'Pendiente'}</div><div><span className="text-blue-500 font-bold mr-1">Músicos:</span>${safeJoin(s.musicos)||'Pendiente'}</div></div></div>`;
                    })}
                </div>
                <div className="mt-6 text-center opacity-50"><p className="text-[8px] text-slate-500 uppercase tracking-widest">ICC Villa Rosario • Ministerio de Alabanza</p></div>
            </div>
        </div>
    `;
}

function ServiceDetailModal({ service, teamData, onClose }) {
    if(!service) return null;
    const printRef = useRef(null);
    const getInstrument = (name) => { const member = teamData.find(m => m.nombre === name); return member ? member.instrumento : "Músico"; };
    const d = new Date(service.fecha + "T00:00:00");

    const generatePng = async () => {
        if (printRef.current) {
            try {
                const canvas = await html2canvas(printRef.current, { backgroundColor: "#0f172a", scale: 2, useCORS: true });
                const link = document.createElement('a');
                link.download = `Servicio-${service.fecha}.png`;
                link.href = canvas.toDataURL();
                link.click();
            } catch (err) { alert("Error imagen"); }
        }
    };

    return html`
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 fade-in backdrop-blur-sm">
            <div className="glass-gold w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl relative flex flex-col">
                <button onClick=${onClose} className="absolute top-4 right-4 text-white z-10 bg-black/50 rounded-full p-2"><${Icon.Close}/></button>
                <div ref=${printRef} className="bg-slate-900 pb-6 rounded-t-2xl">
                    <div className="relative h-32 bg-gradient-to-br from-yellow-700 to-yellow-900 flex flex-col items-center justify-center text-white shrink-0 rounded-t-2xl">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                        <h2 className="text-3xl font-serif font-bold z-10 drop-shadow-lg">${d.getDate()}</h2>
                        <p className="text-sm uppercase tracking-widest z-10 opacity-90">${d.toLocaleDateString('es-CO', {month:'long'}).toUpperCase()}</p>
                        <div className="absolute bottom-[-15px] bg-black border border-yellow-500 text-yellow-500 px-4 py-1 rounded-full text-xs font-bold shadow-lg z-20 uppercase tracking-widest">${service.jornada}</div>
                    </div>
                    <div className="p-6 pt-8 space-y-6">
                        <div className="text-center"><p className="text-[10px] uppercase text-slate-500 tracking-widest mb-1">Director de Alabanza</p><h3 className="text-xl font-bold text-white">${service.lider || "Por definir"}</h3></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="flex items-center gap-2 mb-3 text-yellow-500 border-b border-slate-700 pb-2"><${Icon.Mic}/> <span className="font-bold text-xs uppercase">Voces</span></div><ul className="space-y-2">${(service.coristas || []).map(c => html`<li className="text-xs text-slate-300">• ${c}</li>`)}</ul></div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700"><div className="flex items-center gap-2 mb-3 text-blue-500 border-b border-slate-700 pb-2"><${Icon.Guitar}/> <span className="font-bold text-xs uppercase">Banda</span></div><ul className="space-y-2">${(service.musicos || []).map(m => html`<li className="text-xs text-slate-300 flex justify-between"><span>${m}</span><span className="text-[9px] text-slate-500 uppercase">${getInstrument(m)}</span></li>`)}</ul></div>
                        </div>
                        <div><div className="flex items-center gap-2 mb-3 text-white"><${Icon.Music}/> <span className="font-bold text-sm uppercase">Repertorio</span></div><div className="space-y-2">${(service.repertorio||[]).map((s, i) => html`<div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition border-b border-white/5"><div className="text-slate-500 text-xs font-mono">0${i+1}</div><div className="flex-1"><div className="text-sm font-bold text-slate-200">${s.titulo}</div><div className="text-[10px] text-slate-500">${s.vocalista}</div></div><div className="text-xs font-bold text-yellow-600 border border-yellow-600/30 px-2 py-1 rounded">${getBestTone(s.tono, service.lider)}</div></div>`)}</div></div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-800 bg-[#020617]"><button onClick=${generatePng} className="w-full bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2"><${Icon.Download} /> Descargar Imagen (PNG)</button></div>
            </div>
        </div>
    `;
}

function MaintenanceView({ data, isAdmin, refresh }) {
    const [viewMode, setViewMode] = useState('LIST'); 
    const [selectedEq, setSelectedEq] = useState(null);
    const [formMant, setFormMant] = useState({ idEquipo: '', fecha: new Date().toISOString().split('T')[0], responsable: '', costo: 0, descripcion: '' });
    const [formEq, setFormEq] = useState({ id: '', nombre: '', ubicacion: '', frecuencia: 6, obs: '' });

    const getStatusColor = (fechaProx) => {
        if(!fechaProx) return 'text-slate-500';
        const days = (new Date(fechaProx) - new Date()) / (1000 * 60 * 60 * 24);
        if (days < 0) return 'text-red-500 font-bold'; 
        if (days < 30) return 'text-yellow-500'; 
        return 'text-green-500';
    };

    const handleSaveMant = () => { if(!selectedEq || !formMant.descripcion) return alert("Faltan datos"); callGasApi('saveMaintenance', { ...formMant, idEquipo: selectedEq.id }, '1234').then(() => { setViewMode('LIST'); refresh(); }); };
    const handleSaveEq = () => { if(!formEq.nombre) return alert("Nombre obligatorio"); callGasApi('saveEquipment', formEq, '1234').then(() => { setViewMode('LIST'); refresh(); }); };
    const handleDeleteEq = (id) => { if(confirm("¿Eliminar?")) callGasApi('deleteEquipment', {id}, '1234').then(refresh); };
    
    return html`
        <div className="space-y-6 pb-12 fade-in">
             <div className="text-center mb-4"><h2 className="font-serif text-xl text-white flex items-center justify-center gap-2"><${Icon.Wrench} className="text-purple-500"/> Gestión de Equipos</h2></div>
            ${isAdmin && viewMode === 'LIST' && html`<button onClick=${() => {setFormEq({id:'',nombre:'',ubicacion:'',frecuencia:6,obs:''}); setViewMode('NEW_EQ');}} className="w-full bg-slate-800 py-3 rounded-xl text-purple-400 font-bold text-sm border border-purple-500/30 mb-4">+ Nuevo Equipo</button>`}
            
            ${viewMode === 'LOG_MANT' && selectedEq && html`
                <div className="glass-gold p-4 rounded-xl border-t-2 border-yellow-500 fade-in"><h3 className="text-white font-bold mb-3">Registrar Mant: <span className="text-yellow-500">${selectedEq.nombre}</span></h3><div className="space-y-3"><input type="date" className="input-dark" value=${formMant.fecha} onInput=${e => setFormMant({...formMant, fecha: e.target.value})} /><input className="input-dark" placeholder="Responsable" value=${formMant.responsable} onInput=${e => setFormMant({...formMant, responsable: e.target.value})} /><textarea className="input-dark" placeholder="Descripción" value=${formMant.descripcion} onInput=${e => setFormMant({...formMant, descripcion: e.target.value})}></textarea><div className="flex gap-2"><button onClick=${() => setViewMode('LIST')} className="flex-1 py-2 bg-slate-800 rounded-lg text-slate-400">Cancelar</button><button onClick=${handleSaveMant} className="flex-1 py-2 bg-yellow-600 rounded-lg text-black font-bold">Guardar</button></div></div></div>
            `}

            ${(viewMode === 'NEW_EQ' || viewMode === 'EDIT_EQ') && html`
                 <div className="glass p-4 rounded-xl border-t-2 border-purple-500 fade-in"><h3 className="text-white font-bold mb-3">${viewMode === 'NEW_EQ' ? 'Nuevo Equipo' : 'Editar Equipo'}</h3><div className="space-y-3"><input className="input-dark" placeholder="Nombre" value=${formEq.nombre} onInput=${e => setFormEq({...formEq, nombre: e.target.value})} /><input className="input-dark" placeholder="Ubicación" value=${formEq.ubicacion} onInput=${e => setFormEq({...formEq, ubicacion: e.target.value})} /><input type="number" className="input-dark" placeholder="Frecuencia (Meses)" value=${formEq.frecuencia} onInput=${e => setFormEq({...formEq, frecuencia: e.target.value})} /><div className="flex gap-2"><button onClick=${() => setViewMode('LIST')} className="flex-1 py-2 bg-slate-800 rounded-lg text-slate-400">Cancelar</button><button onClick=${handleSaveEq} className="flex-1 py-2 bg-purple-600 rounded-lg text-white font-bold">Guardar</button></div></div></div>
            `}

            ${viewMode === 'LIST' && html`
                <div className="space-y-3">
                    ${data.map(eq => html`<div key=${eq.id} className="glass p-3 rounded-xl flex flex-col gap-2 border border-slate-800"><div className="flex justify-between items-start"><div><div className="font-bold text-white text-sm">${eq.nombre}</div><div className="text-[10px] text-slate-400">${eq.ubicacion} • Frec: ${eq.frecuencia}m</div></div><div className="text-right"><div className="text-[10px] text-slate-500">Próximo:</div><div className=${`text-xs ${getStatusColor(eq.proximoMant)}`}>${eq.proximoMant || 'N/A'}</div></div></div>${isAdmin && html`<div className="flex gap-2 pt-2 border-t border-slate-800"><button onClick=${() => { setSelectedEq(eq); setViewMode('LOG_MANT'); }} className="flex-1 bg-slate-800 text-purple-400 text-[10px] py-1 rounded hover:bg-purple-900 hover:text-white transition">Registrar Mant.</button><button onClick=${() => {setFormEq(eq); setViewMode('EDIT_EQ');}} className="px-3 bg-slate-800 text-slate-400 text-[10px] py-1 rounded"><${Icon.Edit}/></button><button onClick=${() => handleDeleteEq(eq.id)} className="px-3 bg-slate-800 text-red-400 text-[10px] py-1 rounded"><${Icon.Trash}/></button></div>`}</div>`)}
                </div>
            `}
        </div>
    `;
}

function HistoryView({ data }) {
    return html`
        <div className="space-y-4 pb-12 fade-in">
             <div className="text-center mb-4"><h2 className="font-serif text-xl text-white flex items-center justify-center gap-2"><${Icon.History} className="text-blue-500"/> Historial</h2></div>
            ${data.map(h => html`<div key=${h.id} className="glass p-4 rounded-xl border border-slate-700"><div className="flex justify-between items-baseline mb-2"><span className="text-yellow-500 font-bold text-sm">${h.fecha}</span><span className="text-[10px] text-slate-400 uppercase bg-slate-900 px-2 py-0.5 rounded">${h.tipo}</span></div><div className="bg-slate-900/50 p-3 rounded-lg text-xs text-slate-300 italic mb-3 whitespace-pre-line border-l-2 border-green-500">${h.canciones}</div></div>`)}
        </div>
    `;
}

function UpcomingServicesList({ servicios, isAdmin, onEdit, onViewDetail, onNew, onHistory }) {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = servicios.filter(s => s.fecha >= today).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    return html`
        <div className="mb-8">
            <div className="flex justify-between items-baseline px-1 mb-2"><h3 className="text-sm font-bold text-white uppercase tracking-wider">Próximos Servicios</h3>${isAdmin && html`<button onClick=${onNew} className="text-xs text-blue-400 font-bold">+ Nuevo</button>`}</div>
            <div className="space-y-3">
                ${upcoming.map(s => {
                    const d = new Date(s.fecha + "T00:00:00");
                    const songsCount = s.repertorio ? s.repertorio.length : 0;
                    return html`<div key=${s.id} className="glass p-4 rounded-xl flex justify-between items-center relative overflow-hidden group"><div className=${`absolute left-0 top-0 bottom-0 w-1 ${s.estado === 'Oficial' ? 'bg-yellow-500' : 'bg-slate-600'}`}></div><div className="pl-3 flex-1 cursor-pointer" onClick=${() => onEdit(s)}><div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-white leading-none">${d.getDate()}</span><span className="text-xs text-slate-400 uppercase font-bold">${d.toLocaleDateString('es-CO',{month:'short'})}</span>${s.estado === 'Borrador' && html`<span className="text-[8px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Borrador</span>`}</div><div className="text-sm text-slate-200"><span className="text-slate-500 text-xs mr-1">Dirige:</span><${SafeText} content=${s.lider || "Sin asignar"} /></div></div><div className="text-right flex flex-col items-end gap-2"><div className="text-[10px] font-bold text-yellow-500 uppercase mb-1">${s.jornada}</div><div className="flex gap-2 items-center">${isAdmin ? html`<button onClick=${(e) => {e.stopPropagation(); onHistory(s.id);}} className="text-green-500 hover:text-white text-[10px] border border-green-500/50 px-2 py-0.5 rounded">✔ Cerrar</button>` : (songsCount === 0 ? html`<button onClick=${() => onEdit(s)} className="bg-yellow-500/20 text-yellow-500 border border-yellow-500 text-[10px] px-2 py-1 rounded font-bold animate-pulse">⚠ Agregar Canciones</button>` : html`<div className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded inline-block">${songsCount} Canciones</div>`)}<button onClick=${(e) => {e.stopPropagation(); onViewDetail(s);}} className="text-blue-400 hover:text-white"><${Icon.Activity} /></button></div></div></div>`;
                })}
            </div>
        </div>
    `;
}

function ServiceEditor({ service, data, isAdmin, onSave, onDelete, onCancel, onViewDetail }) {
    const [form, setForm] = useState({ ...service });
    const [tab, setTab] = useState('REPERTORIO'); 
    
    // Optimistic UI & Logic
    const toggleList = (listName, item) => { if (!isAdmin) return; const list = form[listName] || []; setForm({ ...form, [listName]: list.includes(item) ? list.filter(i => i !== item) : [...list, item] }); };
    const addCorista = (n) => { if(!form.coristas.includes(n)) setForm({...form, coristas: [...form.coristas, n]}); };
    const removeCorista = (n) => { setForm({...form, coristas: form.coristas.filter(c => c !== n)}); };
    const addMusico = (n) => { if(!form.musicos.includes(n)) setForm({...form, musicos: [...form.musicos, n]}); };
    const removeMusico = (n) => { setForm({...form, musicos: form.musicos.filter(m => m !== n)}); };
    const moveItem = (index, dir) => { const newRep = [...form.repertorio]; if (dir === -1 && index > 0) [newRep[index], newRep[index-1]] = [newRep[index-1], newRep[index]]; else if (dir === 1 && index < newRep.length-1) [newRep[index], newRep[index+1]] = [newRep[index+1], newRep[index]]; setForm({ ...form, repertorio: newRep }); };
    const handleSongsAdded = (newSongs) => { const songsToAdd = newSongs.map(s => ({...s, tono: getBestTone(s.tono, form.lider)})); setForm({ ...form, repertorio: [...form.repertorio, ...songsToAdd] }); };
    const copySetlist = () => {
        let t = `*🎵 SETLIST ${form.jornada}*\n${form.fecha}\n👤 ${form.lider}\n\n`;
        form.repertorio.forEach((s,i)=> t+=`${i+1}. ${s.titulo} (${getBestTone(s.tono, form.lider)})\n`);
        navigator.clipboard.writeText(t); alert("Copiado");
    };

    return html`
        <div className="pb-24 fade-in">
            <div className="sticky top-0 z-40 bg-[#020617]/95 border-b border-white/5 p-2 flex justify-between items-center mb-4 backdrop-blur">
                <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 overflow-x-auto flex-1 mr-2">${['INFO', 'EQUIPO', 'REPERTORIO', 'SETLIST'].map(t => html`<button key=${t} onClick=${() => setTab(t)} className=${`flex-1 py-2 text-[10px] font-bold rounded-lg transition px-2 ${tab === t ? 'bg-slate-700 text-white shadow' : 'text-slate-500'}`}>${t}</button>`)}</div>
                <button onClick=${() => onViewDetail(form)} className="bg-blue-600 p-2 rounded-lg text-white shadow-lg text-xs font-bold flex items-center gap-1"><${Icon.Activity}/> PNG</button>
            </div>
            ${tab === 'INFO' && html`
                <div className="space-y-4">
                    <input type="date" className=${isAdmin ? "input-dark" : "input-dark bg-slate-900 text-slate-500"} value=${form.fecha} onInput=${e => isAdmin && setForm({...form, fecha: e.target.value})} readOnly=${!isAdmin} />
                    <div className="grid grid-cols-2 gap-2"><select className=${isAdmin?"input-dark":"input-dark bg-slate-900 text-slate-500"} value=${form.jornada} onChange=${e => isAdmin && setForm({...form, jornada: e.target.value})} disabled=${!isAdmin}><option>Mañana</option><option>Tarde</option><option>Noche</option><option>Vigilia</option></select><select className=${isAdmin?"input-dark":"input-dark bg-slate-900 text-slate-500"} value=${form.estado} onChange=${e => isAdmin && setForm({...form, estado: e.target.value})} disabled=${!isAdmin}><option>Borrador</option><option>Oficial</option></select></div>
                    <input className=${isAdmin?"input-dark":"input-dark bg-slate-900 text-slate-500"} value=${form.lider} onInput=${e => isAdmin && setForm({...form, lider: e.target.value})} readOnly=${!isAdmin} placeholder="Director (Libre)" />
                </div>
            `}
            ${tab === 'EQUIPO' && html`
                <div className="space-y-6">
                    <div><p className="text-xs text-yellow-500 uppercase font-bold mb-2">Coristas</p>${isAdmin ? html`<${SearchableUserSelect} allUsers=${data.equipo.filter(e=>e.rol==='Corista'||e.rol==='Líder')} selectedUsers=${form.coristas} onAdd=${addCorista} onRemove=${removeCorista} placeholder="Añadir..." icon=${html`<${Icon.Mic}/>`}/>` : html`<div className="flex flex-wrap gap-2">${form.coristas.map(c=>html`<div className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 border border-yellow-500/30">${c}</div>`)}</div>`}</div>
                    <div><p className="text-xs text-blue-500 uppercase font-bold mb-2">Músicos</p>${isAdmin ? html`<${SearchableUserSelect} allUsers=${data.equipo.filter(e=>e.rol==='Músico'||e.rol==='Líder')} selectedUsers=${form.musicos} onAdd=${addMusico} onRemove=${removeMusico} placeholder="Añadir..." icon=${html`<${Icon.Guitar}/>`}/>` : html`<div className="flex flex-wrap gap-2">${form.musicos.map(m=>html`<div className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 border border-blue-500/30">${m}</div>`)}</div>`}</div>
                </div>
            `}
            ${tab === 'REPERTORIO' && html`
                <div className="space-y-4">
                    ${(form.repertorio||[]).length === 0 && html`<div onClick=${() => document.getElementById('song-search-input').focus()} className="bg-slate-900 border-2 border-dashed border-yellow-500/50 rounded-xl p-10 text-center cursor-pointer hover:bg-slate-800 transition group flex flex-col items-center justify-center gap-3"><div className="bg-yellow-600 rounded-full p-3 mb-3 shadow-lg group-hover:scale-110 transition"><${Icon.Plus}/></div><h3 className="text-yellow-500 font-bold text-lg uppercase tracking-widest">AGREGAR CANCIONES</h3></div>`}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        ${form.repertorio.map((r, idx) => html`
                            <div key=${idx} className="bg-slate-800 p-2 rounded-lg flex justify-between items-center border-l-2 border-green-500 group">
                                <div className="flex flex-col gap-1 mr-2"><button onClick=${() => moveItem(idx, -1)} className="text-slate-500 hover:text-white text-[10px]"><${Icon.ArrowUp}/></button><button onClick=${() => moveItem(idx, 1)} className="text-slate-500 hover:text-white text-[10px]"><${Icon.ArrowDown}/></button></div>
                                <div className="flex-1 min-w-0"><div className="text-sm font-bold text-white truncate">${r.titulo}</div><div className="text-[10px] text-slate-400 truncate">${r.vocalista}</div></div>
                                <div className="flex items-center gap-2 ml-2"><input className="bg-slate-900 border border-slate-600 rounded w-10 text-center text-white text-xs py-1" value=${getBestTone(r.tono, form.lider)} onInput=${e => {const newRep = [...form.repertorio]; newRep[idx].tono = e.target.value; setForm({...form, repertorio: newRep});}} /><button onClick=${() => {const newRep = form.repertorio.filter((_, i) => i !== idx); setForm({...form, repertorio: newRep})}} className="text-red-400 p-1"><${Icon.Trash}/></button></div>
                            </div>
                        `)}
                    </div>
                    <div className="border-t border-slate-700 pt-4"><${SongManager} data=${data.canciones} equipo=${data.equipo} isAdmin=${true} refresh=${()=>{}} embedMode=${true} onSelect=${(song) => {const exists = form.repertorio.some(r => r.id === song.id); if(!exists) { const bestTone = getBestTone(song.tono, form.lider); setForm({...form, repertorio: [...form.repertorio, {...song, tono: bestTone}]}); }}} onSongsAdded=${handleSongsAdded} /></div>
                </div>
            `}
            ${tab === 'SETLIST' && html`<div className="space-y-6 text-center pt-4"><button onClick=${copySetlist} className="w-full bg-green-600 py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 btn-active"><${Icon.WhatsApp} /> Copiar Setlist</button></div>`}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#020617]/95 border-t border-slate-800 flex gap-3 backdrop-blur z-50">
                <button onClick=${onCancel} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400">Cancelar</button>
                <button onClick=${() => onSave(form)} className="flex-1 py-3 bg-blue-600 rounded-xl font-bold shadow-lg text-white">Guardar Cambios</button>
            </div>
        </div>
    `;
}

// ================= APP PRINCIPAL =================

function App() {
    const [view, setView] = useState('HOME');
    const [data, setData] = useState({ canciones: [], equipo: [], servicios: [], equiposMant: [], historial: [] });
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentService, setCurrentService] = useState(null);
    const [showLogin, setShowLogin] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [toast, setToast] = useState(null); 
    const [serviceDetail, setServiceDetail] = useState(null); 

    window.showToastCallback = (msg, type) => { setToast({ msg, type }); if(type !== 'loading') setTimeout(() => setToast(null), 3000); };

    useEffect(() => { 
        const savedSession = localStorage.getItem('icc_admin');
        if(savedSession === 'true') setIsAdmin(true);
        setTimeout(() => {
            if (!localStorage.getItem('icc_tutorial_seen')) setView('HOME'); // Just a trigger
        }, 3500);
        fetchData(); 
    }, []);

    const fetchData = () => { callGasApi('getInitialData').then(res => { if (res.status === 'success') setData(res.data); setLoading(false); }); };
    const handleLogin = () => { if(passwordInput === '1234' || passwordInput === '6991') { setIsAdmin(true); localStorage.setItem('icc_admin', 'true'); setShowLogin(false); setPasswordInput(""); } else { alert("Contraseña incorrecta"); } };
    const handleLogout = () => { setIsAdmin(false); localStorage.removeItem('icc_admin'); };
    const handleSaveService = (srv) => {
        // Optimistic UI: Update local state immediately
        const newData = {...data}; const idx = newData.servicios.findIndex(s => s.id === srv.id);
        if(idx >= 0) newData.servicios[idx] = srv; else newData.servicios.push(srv);
        setData(newData); setView('HOME'); callGasApi('saveService', srv, '1234');
    };
    const handleGenerateHistory = (id) => { if(confirm("¿Cerrar servicio?")) callGasApi('generateHistory', { idServicio: id }, '1234').then(() => { alert("Cerrado"); fetchData(); }); };
    
    // FIX DE LA FUNCIÓN COMPLEJA QUE ROMPÍA REACT
    const handleBatchSuccess = (newSongs) => {
        const newData = {...data, canciones: [...data.canciones, ...newSongs]};
        setData(newData);
    };

    const handleDeleteSong = (id) => {
        if(!confirm("¿Eliminar canción permanentemente?")) return;
        const newData = {...data, canciones: data.canciones.filter(s => s.id !== id)};
        setData(newData);
        callGasApi('deleteSong', {id}, '1234');
    };

    if (loading) return html`<${SplashScreen} />`;
    
    return html`
        <div className="bg-universe min-h-screen pb-12 font-sans text-slate-200">
            ${toast && html`<${Toast} message=${toast.msg} type=${toast.type} />`}
            ${serviceDetail && html`<${ServiceDetailModal} service=${serviceDetail} teamData=${data.equipo} onClose=${() => setServiceDetail(null)} />`}
            ${!localStorage.getItem('icc_tutorial_seen') && html`<${Manual} onClose=${() => localStorage.setItem('icc_tutorial_seen', 'true')} />`}
            
            ${view !== 'HOME' && html`<div className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur border-b border-white/5 p-4 flex items-center shadow-lg"><button onClick=${() => setView('HOME')} className="bg-slate-800 p-2 rounded-full mr-3 text-slate-300 btn-active"><${Icon.ArrowLeft} /></button><h2 className="font-bold text-white uppercase tracking-wider text-sm">${view === 'SONGS' ? 'Canciones' : view}</h2></div>`}

            <div className="px-4 pt-6 max-w-lg mx-auto fade-in">
                ${view === 'HOME' && html`
                    <div className="flex justify-between items-center mb-4">${!isAdmin ? html`<button onClick=${()=>setShowLogin(true)} className="text-xs text-slate-500 flex items-center gap-1 ml-auto"><${Icon.Lock}/> Director</button>` : html`<button onClick=${handleLogout} className="text-xs text-yellow-500 flex items-center gap-1 font-bold ml-auto"><${Icon.Unlock}/> Salir</button>`}</div>
                    <div className="text-center mb-6"><div className="inline-block px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 mb-3"><span className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.2em]">ICC Villa Rosario</span></div><h1 className="text-3xl font-serif text-white italic">Panel de <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 font-cinzel font-bold not-italic">Adoración</span></h1></div>
                    <${UpcomingServicesList} servicios=${data.servicios} onEdit=${(s) => { setCurrentService(s); setView('SERVICE_EDITOR'); }} onViewDetail=${(s) => setServiceDetail(s)} onNew=${() => { if(isAdmin) { setCurrentService({ id: null, fecha: new Date().toISOString().split('T')[0], jornada: 'Mañana', estado: 'Borrador', lider: '', coristas: [], musicos: [], repertorio: [] }); setView('SERVICE_EDITOR'); } else { alert("Solo Admin"); } }} onHistory=${handleGenerateHistory} isAdmin=${isAdmin} />
                    <div className="grid grid-cols-2 gap-3 mb-6"><button onClick=${() => setView('POSTER')} className="glass-gold p-4 rounded-xl flex flex-col items-center gap-2 btn-active"><${Icon.Calendar} /><span className="font-bold text-xs text-yellow-100">Cronograma</span></button><button onClick=${() => setView('HISTORY')} className="glass p-4 rounded-xl flex flex-col items-center gap-2 btn-active hover:bg-slate-800 border border-slate-700"><${Icon.History} /><span className="font-bold text-xs text-white">Historial</span></button></div>
                    <div className="space-y-3"><button onClick=${() => setView('SONGS')} className="w-full glass p-4 rounded-xl flex items-center justify-between btn-active"><div className="flex items-center gap-4"><div className="text-orange-400"><${Icon.Music} /></div><div className="text-left"><div className="font-bold text-white text-sm">Canciones</div></div></div></button><button onClick=${() => setView('TEAM')} className="w-full glass p-4 rounded-xl flex items-center justify-between btn-active"><div className="flex items-center gap-4"><div className="text-teal-400"><${Icon.Users} /></div><div className="text-left"><div className="font-bold text-white text-sm">Equipo</div></div></div></button><button onClick=${() => setView('MAINTENANCE')} className="w-full glass p-4 rounded-xl flex items-center justify-between btn-active border-l-4 border-l-purple-500"><div className="flex items-center gap-4"><div className="text-purple-400"><${Icon.Wrench} /></div><div className="text-left"><div className="font-bold text-white text-sm">Mantenimiento</div></div></div></button></div>
                `}
                ${view === 'TEAM' && html`<${TeamManager} data=${data.equipo} isAdmin=${isAdmin} refresh=${fetchData} />`}
                ${view === 'SONGS' && html`<${SongManager} data=${data.canciones} equipo=${data.equipo} isAdmin=${isAdmin} refresh=${fetchData} onDelete=${handleDeleteSong} onBatchSuccess=${handleBatchSuccess} />`}
                ${view === 'SERVICE_EDITOR' && html`<${ServiceEditor} service=${currentService} data=${data} isAdmin=${isAdmin} onSave=${handleSaveService} onCancel=${() => setView('HOME')} onViewDetail=${(s)=>setServiceDetail(s)} />`}
                ${view === 'POSTER' && html`<${MonthPoster} servicios=${data.servicios} />`}
                ${view === 'MAINTENANCE' && html`<${MaintenanceView} data=${data.equiposMant} isAdmin=${isAdmin} refresh=${fetchData} />`}
                ${view === 'HISTORY' && html`<${HistoryView} data=${data.historial} />`}
            </div>
            ${showLogin && html`<div className="bg-universe fixed inset-0 z-[80] flex flex-col items-center justify-center p-6 fade-in"><div className="glass p-8 rounded-2xl w-full max-w-sm text-center"><h2 className="text-white font-serif text-2xl mb-4">Acceso Director</h2><input type="password" className="input-dark mb-4 text-center text-xl tracking-widest" placeholder="PIN" value=${passwordInput} onInput=${e=>setPasswordInput(e.target.value)} /><div className="flex gap-2"><button onClick=${()=>setShowLogin(false)} className="flex-1 py-3 bg-slate-800 rounded-xl text-slate-400">Cancelar</button><button onClick=${handleLogin} className="flex-1 py-3 bg-yellow-600 rounded-xl text-black font-bold">Entrar</button></div></div></div>`}
        </div>
    `;
}

// ================= RENDER FINAL =================
ReactDOM.render(html`<${App} />`, document.getElementById('root'));
