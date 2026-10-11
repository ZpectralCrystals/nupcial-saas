const DB_KEY = "nupcial-demo-v1";
const AUTH_KEY = "nupcial-auth";
const Core = window.NupcialCore;

const seed = {
  event: {
    bride: "Valentina",
    groom: "Mateo",
    date: "2027-09-18",
    ceremonyTime: "16:30",
    receptionTime: "18:00",
    venue: "Casa del Lago",
    address: "Av. de los Jardines 245, Arequipa",
    phrase: "Que este día sea el comienzo de todas nuestras aventuras.",
    dressCode: "Etiqueta elegante",
    deadline: "2027-08-30",
    giftMethod: "Transferencia bancaria o regalo libre",
    primary: "#875c46",
    format24h: true,
    adultsOnly: false,
    avoidColors: "Blanco, marfil",
    thanksTitle: "Gracias",
    thanksMessage: "Gracias por ser parte de este momento tan especial.",
    backgroundMusic: "Nuestra canción",
    parentsBride: "Familia de Valentina",
    parentsGroom: "Familia de Mateo",
    godparents: "Nuestros padrinos",
  },
  itinerary: [
    { id: 1, time: "16:30", icon: "💍", title: "Ceremonia", description: "Intercambio de votos" },
    { id: 2, time: "18:00", icon: "✨", title: "Recepción", description: "Bienvenida y cóctel" },
    { id: 3, time: "20:00", icon: "🍽️", title: "Cena", description: "Cena y brindis" },
    { id: 4, time: "22:00", icon: "🎉", title: "Fiesta", description: "Baile y celebración" },
  ],
  gifts: [
    { id: 1, type: "Billetera digital", title: "Yape / Plin", detail: "Número configurado por los novios" },
    { id: 2, type: "Transferencia", title: "Cuenta bancaria", detail: "Datos visibles solo para invitados" },
  ],
  guests: [
    { id: 1, name: "Familia Torres", phone: "+51 987 111 111", passes: 4, status: "confirmed", side: "Novia", table: 1, message: "Felices de acompañarlos" },
    { id: 2, name: "Lucía Mendoza", phone: "+51 987 222 222", passes: 2, status: "confirmed", side: "Novio", table: 2, message: "" },
    { id: 3, name: "Carlos Rivas", phone: "+51 987 333 333", passes: 2, status: "pending", side: "Novio", table: null, message: "" },
    { id: 4, name: "Ana Salazar", phone: "+51 987 444 444", passes: 1, status: "declined", side: "Novia", table: null, message: "Los abrazo a la distancia" },
    { id: 5, name: "Diego & Camila", phone: "+51 987 555 555", passes: 2, status: "confirmed", side: "Amigos", table: 2, message: "¡Ahí estaremos!" },
    { id: 6, name: "Familia Núñez", phone: "+51 987 666 666", passes: 3, status: "pending", side: "Familia", table: null, message: "" },
  ],
  songs: [
    { id: 1, title: "September", artist: "Earth, Wind & Fire", requester: "Diego", status: "approved" },
    { id: 2, title: "Eres", artist: "Café Tacvba", requester: "Lucía", status: "approved" },
    { id: 3, title: "Vivir mi vida", artist: "Marc Anthony", requester: "Carlos", status: "pending" },
  ],
  tables: [
    { id: 1, name: "Mesa Jardín", seats: 8, shape: "round" },
    { id: 2, name: "Mesa Terraza", seats: 10, shape: "rect" },
  ],
  floorObjects: [],
  gallery: [
    { id: 1, src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='700'%3E%3Cdefs%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop stop-color='%23c8a58d'/%3E%3Cstop offset='1' stop-color='%236f493c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='700' height='700' fill='url(%23g)'/%3E%3Ccircle cx='350' cy='280' r='125' fill='none' stroke='%23fff' stroke-opacity='.65' stroke-width='4'/%3E%3Cpath d='M250 310 Q350 420 450 310' fill='none' stroke='%23fff' stroke-width='9' stroke-linecap='round'/%3E%3Ctext x='350' y='540' text-anchor='middle' fill='%23fff' font-family='Georgia' font-size='42'%3EValentina %26 Mateo%3C/text%3E%3C/svg%3E", by: "Organizadores" },
  ],
  galleryEnabled: true,
};

let db = loadDB();
let savedDBSnapshot = JSON.stringify(db);
let apiMode = false;
let apiDemoMode = true;
let tenantMode = false;
let tenantEvents = [];
let currentAccountEmail = '';
let startupError = '';
let remotePublic = false;
let publicLoadError = "";
let paymentMode = "mock";
let serverStateVersion = 0;
let remoteConflict = false;
let remoteSaveQueue = Promise.resolve();
let mobileOpen = false;
let modal = null;
let pendingImport = [];
let editorTab = "data";
let floorZoom = 1;
let floorHistory = [];
let floorDrag = null;
let floorPan = null;
let floorView = "plan";
let floorSearch = "";
let floorUnassignedOnly = false;
let floorMultiSelect = false;
let floorMiniMapOpen = true;
let floorCleanMode = false;
let floorReview = false;
let floorPanMode = false;
let floorSelectedTables = new Set();
let floorSelectedGuestId = null;
let mockPaymentMethod = "card";
let guestPage = 1;
let guestPageSize = 10;
let guestSort = "recent";
let selectedGuestIds = new Set();
let selectedPhotoIds = new Set();
let rsvpSort = "recent";
const FLOOR_OBJECT_TYPES = {
  entrance: { label: "Entrada", icon: "⇢" },
  dance: { label: "Pista", icon: "✦" },
  dj: { label: "DJ", icon: "♫" },
  stage: { label: "Escenario", icon: "▰" },
  sweets: { label: "Mesa de dulces", icon: "◇" },
  cheese: { label: "Mesa de quesos", icon: "◌" },
  bar: { label: "Barra", icon: "▱" },
};

function loadDB() {
  try { return normalizeDB(JSON.parse(localStorage.getItem(DB_KEY)) || structuredClone(seed)); }
  catch { return normalizeDB(structuredClone(seed)); }
}

function normalizeDB(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Respaldo no válido.");
  const normalized = { ...structuredClone(seed), ...data, event: { ...seed.event, ...(data.event || {}) } };
  for (const key of ["itinerary", "gifts", "guests", "tables", "songs", "gallery"]) {
    if (data[key] != null && !Array.isArray(data[key])) throw new Error(`Lista ${key} no válida.`);
    normalized[key] = structuredClone(data[key] ?? seed[key]);
  }
  if (data.floorObjects != null && !Array.isArray(data.floorObjects)) throw new Error("Lista floorObjects no válida.");
  normalized.tables = normalized.tables.map((table, index, tables) => ({
    ...table,
    ...Core.floorPosition(table, index, tables.length),
    shape: table.shape === "rect" ? "rect" : "round",
  }));
  normalized.floorObjects = (data.floorObjects ?? []).filter(item => FLOOR_OBJECT_TYPES[item.type]).map((item, index, objects) => ({
    id: Core.integerCount(item.id, { min: 1, max: Number.MAX_SAFE_INTEGER, label: "ID de elemento" }),
    type: item.type,
    ...Core.floorPosition(item, index, objects.length),
  }));
  normalized.guests = normalized.guests.map((g,index) => {
    const guest=Core.normalizeGuestRecord({code:`INV-${String(g.id).slice(-6)}`,...g});
    return {...guest,createdAt:Number.isFinite(Number(guest.createdAt))?Number(guest.createdAt):-index,attendanceType:guest.attendanceType==="ceremony"?"ceremony":"full",responseAt:guest.responseAt&&Number.isFinite(Date.parse(guest.responseAt))?new Date(guest.responseAt).toISOString():null};
  });
  normalized.songs=normalized.songs.map((song,index)=>({...song,createdAt:Number.isFinite(Number(song.createdAt))?Number(song.createdAt):-index}));
  for (const [key, value] of Object.entries(seed.event)) {
    if (typeof value === "string" && typeof normalized.event[key] !== "string") throw new Error(`Dato de evento ${key} no válido.`);
  }
  if (!/^#[0-9a-f]{6}$/i.test(normalized.event.primary)) normalized.event.primary = seed.event.primary;
  if (normalized.event.coverPhoto && !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(normalized.event.coverPhoto)) delete normalized.event.coverPhoto;
  if (normalized.event.musicData && !/^data:audio\/(?:mpeg|mp3|wav|x-wav|ogg|mp4);base64,[a-z0-9+/=\s]+$/i.test(normalized.event.musicData)) delete normalized.event.musicData;
  normalized.gallery = normalized.gallery.filter(photo => typeof photo.src === "string" && (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(photo.src) || photo.src === seed.gallery[0].src));
  Core.validateBackup(normalized);
  return normalized;
}

function saveDB(message = "Cambios guardados") {
  try {
    const next = JSON.stringify(db);
    if (!(apiMode && tenantMode && isAuthed())) localStorage.setItem(DB_KEY, next);
    savedDBSnapshot = next;
    if (apiMode && isAuthed() && !remotePublic && !remoteConflict) {
      const snapshot = JSON.parse(next);
      remoteSaveQueue = remoteSaveQueue.catch(() => {}).then(async () => {
        if (remoteConflict) return;
        const response = await fetch("/api/state", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: snapshot, version: serverStateVersion }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 401) { sessionStorage.removeItem(AUTH_KEY); }
          if (response.status === 409) { remoteConflict = true; if (Number.isSafeInteger(result.version)) serverStateVersion = result.version; }
          throw new Error(result.error || "No se sincronizaron los cambios con el servidor.");
        }
        serverStateVersion = result.version;
      }).catch(error => toast(`${error.message} Se conserva una copia en este navegador.`));
    } else if (remoteConflict) {
      toast("Conflicto de otra pestaña: esta copia queda local. Recarga antes de seguir.");
    }
    document.documentElement.style.setProperty("--brand", db.event.primary);
    toast(apiMode && isAuthed() && !remotePublic ? `${message} · sincronizando` : message);
    return true;
  } catch {
    db = JSON.parse(savedDBSnapshot);
    toast("No se pudo guardar. El navegador no dispone de espacio o bloquea el almacenamiento. El cambio se revirtió.");
    return false;
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();
}

function route() { return location.hash.replace(/^#\/?/, "").split("?")[0] || "home"; }
function hashParams() { return new URLSearchParams(location.hash.split("?")[1] || ""); }
function publicEventSlug() { return new URLSearchParams(location.search).get('event') || hashParams().get('event') || ''; }
function isAuthed() { return sessionStorage.getItem(AUTH_KEY) === "1"; }
function go(path) { modal=null;location.hash = `#/${path}`; mobileOpen = false; }

async function apiRequest(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
  return result;
}

async function loadRemotePublic() {
  if (!apiMode || isAuthed()) return false;
  remotePublic = false;
  publicLoadError = "";
  const code = hashParams().get("guest") || "";
  const slug = publicEventSlug();
  try {
    const query = new URLSearchParams({ ...(slug ? { event: slug } : {}), ...(code ? { guest: code } : {}) });
    const result = await apiRequest(`/api/public/state?${query}`);
    if (!result.state?.event) { publicLoadError = "Esta invitación todavía no está publicada."; return false; }
    if (code && !(result.state.guests || []).some(guest => guest.code === code)) { publicLoadError = "Este enlace personalizado no es válido o ya no está activo."; return false; }
    db = { ...structuredClone(seed), ...result.state, event: { ...structuredClone(seed.event), ...result.state.event } };
    remotePublic = true;
    return true;
  } catch (error) {
    const message = String(error.message || "");
    publicLoadError = message.includes("no encontrada")
      ? "Este enlace personalizado no es válido o ya no está activo. Pide a los organizadores un enlace actualizado."
      : message.includes("no está configurada") || message.includes("no publicada")
        ? "Esta invitación todavía no está publicada."
        : "No pudimos cargar esta invitación. Revisa tu conexión e inténtalo de nuevo.";
    return false;
  }
}

async function initializeApp() {
  remotePublic = false;
  publicLoadError = "";
  startupError = '';
  try {
    const session = await apiRequest("/api/auth/session");
    apiMode = true;
    const config = await apiRequest("/api/config");
    apiDemoMode = Boolean(config.demo);
    paymentMode = config.paymentMode || "mock";
    if (session.authenticated) {
      remotePublic = false;
      sessionStorage.setItem(AUTH_KEY, "1");
      currentAccountEmail = session.email || '';
      tenantMode = !session.legacy;
      if (tenantMode) await restoreTenantWorkspace(session.activeEventId);
      else {
        const result = await apiRequest("/api/state");
        serverStateVersion = result.version || 0; remoteConflict = false;
        if (result.state) db = normalizeDB(result.state);
        else { const saved = await apiRequest("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: db, version: serverStateVersion }) }); serverStateVersion = saved.version; }
      }
      if (tenantMode && route() === 'login') go(db.event.slug ? 'dashboard' : tenantEvents.length ? 'events' : 'start?tema=versalles&paleta=dorado&plan=essential');
    } else {
      sessionStorage.removeItem(AUTH_KEY); tenantMode = false; currentAccountEmail = '';
      if (route() === "public") await loadRemotePublic();
    }
  } catch (error) {
    if (!apiMode) apiMode = false;
    else startupError = 'No pudimos conectar con tus datos guardados. Recarga cuando el servicio vuelva a estar disponible.';
    remotePublic = false;
  }
  if (!tenantMode) savedDBSnapshot = JSON.stringify(db);
  document.documentElement.style.setProperty("--brand", db.event.primary);
  render();
  if (route() === "checkout") refreshCheckoutPage();
  if (route() === "payment-result") refreshPaymentResult();
}

function emptyTenantState() {
  const state = structuredClone(seed);
  state.event = { ...state.event, bride: '', groom: '', date: '', venue: '', address: '', phrase: '', theme: 'versalles', palette: 'dorado', plan: 'essential', planStatus: 'demo', sections: {} };
  state.itinerary=[];state.gifts=[];state.guests=[];state.tables=[];state.floorObjects=[];state.songs=[];state.gallery=[];state.galleryEnabled=true;
  return state;
}
async function restoreTenantWorkspace(activeEventId = null) {
  tenantEvents = (await apiRequest('/api/events')).events || [];
  let chosen = activeEventId;
  if (!chosen && tenantEvents.length === 1) {
    const selected = await apiRequest(`/api/events/${tenantEvents[0].id}/select`, { method: 'POST' });
    chosen = selected.eventId;
  }
  if (chosen) {
    const result = await apiRequest('/api/state');
    if (!result.state) throw new Error('La celebración seleccionada no está disponible.');
    serverStateVersion=result.version;db=normalizeDB(result.state);db.event.slug=result.slug;db.event.id=result.eventId;db.event.status=result.eventStatus;remoteConflict=false;
    if (tenantEvents.length > 1 && !activeEventId && tenantEvents.some(event=>event.id!==chosen)) go('events');
  } else {
    serverStateVersion=0;db=emptyTenantState();
    if (tenantEvents.length) go('events'); else go('start?tema=versalles&paleta=dorado&plan=essential');
  }
  savedDBSnapshot=JSON.stringify(db);
}
async function createTenantWorkspace(state) {
  const response = await apiRequest('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }) });
  const result = await apiRequest('/api/state');
  if (!result.state) throw new Error('La celebración no se pudo abrir.');
  tenantMode=true;currentAccountEmail ||= '';serverStateVersion=result.version;db=normalizeDB(result.state);db.event.slug=result.slug;db.event.id=result.eventId;db.event.status=result.eventStatus;
  tenantEvents=(await apiRequest('/api/events')).events||[];savedDBSnapshot=JSON.stringify(db);
  sessionStorage.removeItem('nupcial-pending-setup');go('dashboard');toast(`Celebración creada · ${response.event.title}`);
}

function toast(message) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

function formatDate(date) {
  if (!Core.isCalendarDate(date)) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function statusLabel(status) { return { confirmed: "Confirmado", pending: "Pendiente", declined: "No asistirá", approved: "Aprobada", rejected: "Rechazada" }[status] || status; }
function statusChip(status) { return `<span class="chip ${["confirmed","approved"].includes(status) ? "ok" : ["declined","rejected"].includes(status) ? "no" : "wait"}">${escapeHtml(statusLabel(status))}</span>`; }

function metrics() {
  const total = db.guests.reduce((sum, g) => sum + Number(g.passes), 0);
  const confirmed = db.guests.reduce((sum, g) => sum + Core.attendanceCount(g), 0);
  const pending = db.guests.filter(g => g.status === "pending").reduce((sum, g) => sum + Number(g.passes), 0);
  const declined = db.guests.filter(g => g.status === "declined").reduce((sum, g) => sum + Number(g.passes), 0);
  return { total, confirmed, pending, declined };
}

const nav = [
  ["dashboard", "⌂", "Inicio"], ["guests", "♙", "Invitados"], ["rsvp", "✓", "Confirmaciones"],
  ["tables", "◉", "Plano de mesas"], ["songs", "♫", "Canciones"], ["invitation", "✦", "Mi invitación"], ["gallery", "▧", "Galería"],
  ["settings", "⚙", "Configuración"],
];

function shell(content, title = "Panel") {
  const current = route();
  const visibleNav = tenantMode ? [["events", "♢", "Celebraciones"], ...nav] : nav;
  return `<div class="app-shell" data-theme="${localStorage.getItem("nupcial-theme") || "light"}">
    <aside class="sidebar ${mobileOpen ? "open" : ""}">
      <a class="brand" href="#/dashboard"><span class="brand-mark">N</span><span>Nupcial</span></a>
      <nav class="nav" aria-label="Principal">
        ${visibleNav.map(([path, icon, label]) => `${path==='guests'?'<div class="sidebar-label">Gestión</div>':path==='tables'?'<div class="sidebar-label">Evento</div>':path==='settings'?'<div class="sidebar-label">Sistema</div>':''}<a class="${current === path ? "active" : ""}" href="#/${path}"><span class="nav-icon">${icon}</span>${label}</a>`).join("")}
      </nav>
      <div class="sidebar-foot">
        <a class="btn ghost" href="#/home">← Página de inicio</a>
        <a class="btn ghost" href="./docs/system-map.html">Mapa de flujos ↗</a>
        <a class="btn secondary" href="${escapeHtml(publicInviteUrl())}" target="_blank" rel="noopener">Ver invitación ↗</a>
        <div class="profile"><strong>${escapeHtml(tenantMode?currentAccountEmail:'Cuenta demo')}</strong><span>Plan ${escapeHtml(clientPlan().name)} · ${tenantMode?'Cuenta privada':'Local'}</span></div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="topbar-actions"><button class="btn secondary icon-btn mobile-menu" data-action="mobile-menu" aria-label="Abrir menú">☰</button><span class="topbar-title">${escapeHtml(title)}</span></div><div class="topbar-actions"><button class="btn secondary icon-btn" data-action="theme" aria-label="Cambiar tema">◐</button><button class="btn ghost" data-action="logout">Salir</button></div></header>
      <div class="content">${content}</div>
    </main>
    ${renderModal()}
  </div>`;
}

function pageHead(eyebrow, title, subtitle, actions = "") {
  return `<header class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${actions}</div></header>`;
}

function renderModal() {
  if (!modal) return "";
  let title = ""; let subtitle = ""; let body = "";
  if (modal.type === "guest") {
    const g = modal.id ? db.guests.find(x => x.id === modal.id) : null;
    title = g ? "Editar grupo" : "Crear invitado";
    subtitle = "Grupo familiar o titular con acompañantes.";
    body = `<form id="guest-modal-form" class="form-grid">
      <input type="hidden" name="id" value="${g?.id || ""}">
      <div class="field"><label>Tipo de invitación</label><select class="select" name="type"><option value="group" ${g?.type!=="individual"?'selected':''}>Grupo / familia</option><option value="individual" ${g?.type==='individual'?'selected':''}>Individual + acompañantes</option></select></div>
      <div class="field"><label>Nombre del grupo o titular *</label><input class="input" name="name" required value="${escapeHtml(g?.name || "")}"></div>
      <div class="field"><label>Teléfono</label><input class="input" name="phone" value="${escapeHtml(g?.phone || "")}" placeholder="+51 999 999 999"></div>
      <div class="field"><label>Pases disponibles *</label><input class="input" name="passes" type="number" min="1" max="10" value="${g?.passes || 1}" required></div>
      <div class="field"><label>Categoría</label><input class="input" name="category" value="${escapeHtml(g?.category || "")}" placeholder="Familia, Amigos…"></div>
      <div class="field"><label>Lado</label><select class="select" name="side">${["Novia","Novio","Ambos","Amigos","Trabajo"].map(x=>`<option ${g?.side===x?'selected':''}>${x}</option>`).join("")}</select></div>
      <div class="field wide"><label>Personas del grupo · una por línea</label><textarea class="textarea" name="members" placeholder="Nombre del titular">${escapeHtml((g?.members || [g?.name || ""]).join("\n"))}</textarea></div>
      <div class="field wide"><label>Notas internas</label><textarea class="textarea" name="notes" placeholder="Solo visible en el panel">${escapeHtml(g?.notes || "")}</textarea></div>
      <div class="wide actions"><button class="btn secondary" type="button" data-action="close-modal">Cancelar</button><button class="btn" type="submit">${g ? "Guardar cambios" : "Crear invitado"}</button></div>
    </form>`;
  }
  if (modal.type === "import") {
    title = "Subir invitados"; subtitle = "Importa CSV o Excel (.xlsx) y revisa antes de guardar.";
    body = `<div class="note"><strong>Columnas:</strong> <span class="code">nombre_grupo</span>, <span class="code">numero_pases</span>, <span class="code">tipo_invitacion</span>, <span class="code">categoria_invitado</span>, <span class="code">lado_evento</span>, <span class="code">telefono</span></div>
      <label class="upload-zone" for="guest-import"><div><strong>Seleccionar CSV o Excel</strong><p>CSV o libro .xlsx · primera fila con encabezados.</p></div><input id="guest-import" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label>
      <div id="import-preview">${importPreview()}</div>
      <div class="actions" style="margin-top:18px"><button class="btn secondary" data-action="download-template">Descargar plantilla</button>${pendingImport.length ? '<button class="btn" data-action="confirm-import">Importar invitados</button>' : ''}</div>`;
  }
  if (modal.type === "manual") {
    const g = db.guests.find(x => x.id === modal.id); if (!g) return "";
    title = "Confirmación manual"; subtitle = "Registra respuesta como formulario RSVP.";
    body = `<form id="manual-rsvp-form" class="grid"><input type="hidden" name="id" value="${g.id}">
      <div class="field"><label>Respuesta</label><select class="select" name="status"><option value="confirmed" ${g.status==='confirmed'?'selected':''}>Sí asistirá</option><option value="declined" ${g.status==='declined'?'selected':''}>No asistirá</option><option value="pending" ${g.status==='pending'?'selected':''}>Pendiente</option></select></div>
      <div class="field"><label>Tipo de evento</label><select class="select" name="attendanceType"><option value="full" ${g.attendanceType!=='ceremony'?'selected':''}>Evento completo</option><option value="ceremony" ${g.attendanceType==='ceremony'?'selected':''}>Solo ceremonia</option></select></div>
      <div class="field"><label>Personas que asistirán · máximo ${g.passes}</label><input class="input" name="confirmedCount" type="number" min="1" max="${g.passes}" value="${Core.attendanceCount(g)||g.passes}" required></div>
      <div class="field"><label>Nombres de invitados · máximo ${g.passes}</label><textarea class="textarea" name="members">${escapeHtml((g.members || [g.name]).join("\n"))}</textarea></div>
      <div class="field"><label>Mensaje</label><textarea class="textarea" name="message">${escapeHtml(g.message || "")}</textarea></div>
      <div class="actions"><button class="btn secondary" type="button" data-action="close-modal">Cancelar</button><button class="btn">Guardar confirmación</button></div></form>`;
  }
  if (modal.type === "qr") {
    const url = galleryLink();
    title = "Compartir galería"; subtitle = "QR para acceso rápido.";
    body = `<div class="qr-card"><img alt="Código QR de galería" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}"></div><div class="note code">${escapeHtml(url)}</div><div class="actions" style="margin-top:16px"><button class="btn" data-action="copy-gallery-link">Copiar enlace</button></div>`;
  }
  return `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><header class="modal-head"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="btn ghost icon-btn" data-action="close-modal" aria-label="Cerrar">×</button></header><div class="modal-body">${body}</div></section></div>`;
}

function importPreview() {
  if (!pendingImport.length) return "";
  return `<div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Nombre</th><th>Pases</th><th>Tipo</th><th>Lado</th></tr></thead><tbody>${pendingImport.slice(0,20).map(g=>`<tr><td>${escapeHtml(g.name)}</td><td>${g.passes}</td><td>${g.type}</td><td>${escapeHtml(g.side)}</td></tr>`).join("")}</tbody></table></div><p class="note">${pendingImport.length} registros listos.</p>`;
}

function loginPage() {
  const showDemo = !apiMode || apiDemoMode;
  return `<main class="login-page">
    <section class="login-panel">
      <a class="brand" href="#/home"><span class="brand-mark">N</span><span>Nupcial</span></a>
      <h1>Qué bonito verte</h1><p class="subtitle">Tu celebración, cada vez más cerca. Entra para organizar cada detalle.</p>
      <form id="login-form" class="grid">
        <div class="field"><label for="email">Correo electrónico</label><input class="input" id="email" name="email" type="email" ${showDemo?'value="demo@boda.local"':''} required autocomplete="username"></div>
        <div class="field"><label for="password">Contraseña</label><input class="input" id="password" name="password" type="password" ${showDemo?'value="demo123"':''} required autocomplete="current-password"></div>
        <div id="login-error" class="error"></div><button class="btn" type="submit">Ingresar al panel</button>
      </form>
      ${showDemo?'<div class="demo-note"><strong>Demo local</strong><br>Usuario: demo@boda.local · Clave: demo123<br>También puedes crear una cuenta aislada para probar el recorrido.</div>':'<div class="demo-note"><strong>Acceso seguro</strong><br>Inicia sesión con tu cuenta o crea una nueva.</div>'}
      <nav class="auth-links" aria-label="Acceso a la cuenta"><a href="#/register">Crear cuenta</a><a href="#/forgot-password">Olvidé mi contraseña</a></nav>
    </section>
    <section class="login-art"><div><div class="eyebrow" style="color:#fff">Todo en un lugar</div><h2>Organiza el sí más importante.</h2><p>Invitados, confirmaciones, mesas, música, galería e invitación editable.</p></div></section>
  </main>`;
}

function registerPage() {
  return `<main class="login-page"><section class="login-panel"><a class="brand" href="#/home"><span class="brand-mark">N</span><span>Nupcial</span></a><h1>Comencemos</h1><p class="subtitle">Crea tu cuenta privada. Luego podrás administrar varias celebraciones por separado.</p><form id="register-form" class="grid"><div class="field"><label for="register-email">Correo electrónico</label><input class="input" id="register-email" name="email" type="email" required maxlength="254" autocomplete="email"></div><div class="field"><label for="register-password">Contraseña</label><input class="input" id="register-password" name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"><small>12 caracteres o más.</small></div><div class="field"><label for="register-confirm">Repite la contraseña</label><input class="input" id="register-confirm" name="confirm" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></div><p id="register-status" class="demo-note" role="status" aria-live="polite"></p><button class="btn">Crear cuenta</button></form><nav class="auth-links"><a href="#/login">Ya tengo cuenta</a><a href="#/home">Volver al inicio</a></nav></section><section class="login-art"><div><div class="eyebrow" style="color:#fff">Tus celebraciones, separadas</div><h2>Un espacio propio para cada historia.</h2><p>Invitados, confirmaciones, mesas y recuerdos quedan bajo tu cuenta.</p></div></section></main>`;
}
function verifyPage() { return `<main class="login-page"><section class="login-panel"><a class="brand" href="#/home"><span class="brand-mark">N</span><span>Nupcial</span></a><h1>Confirma tu correo</h1><p id="verify-status" role="status" aria-live="polite">Validando enlace…</p><a class="btn" href="#/login">Ir a iniciar sesión</a></section></main>`; }
function forgotPasswordPage() { return `<main class="login-page"><section class="login-panel"><a class="brand" href="#/home"><span class="brand-mark">N</span><span>Nupcial</span></a><h1>Recuperar acceso</h1><p class="subtitle">Si existe una cuenta activa, enviaremos un enlace temporal.</p><form id="forgot-form" class="grid"><label class="field">Correo electrónico<input class="input" name="email" type="email" required autocomplete="email"></label><p id="forgot-status" role="status" aria-live="polite"></p><button class="btn">Enviar instrucciones</button></form><nav class="auth-links"><a href="#/login">Volver a iniciar sesión</a></nav></section></main>`; }
function resetPasswordPage() { return `<main class="login-page"><section class="login-panel"><a class="brand" href="#/home"><span class="brand-mark">N</span><span>Nupcial</span></a><h1>Elige una clave nueva</h1><form id="reset-form" class="grid"><label class="field">Nueva contraseña<input class="input" name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label><label class="field">Repite la contraseña<input class="input" name="confirm" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label><p id="reset-status" role="status" aria-live="polite"></p><button class="btn">Guardar contraseña</button></form></section></main>`; }
function eventsPage() {
  return `<main class="content"><header class="page-head"><div><div class="eyebrow">Tu cuenta · ${escapeHtml(currentAccountEmail)}</div><h1>Tus celebraciones</h1><p>Cada evento tiene invitados, respuestas y enlace propios.</p></div><div class="actions"><a class="btn" href="#/start?tema=versalles&paleta=dorado&plan=essential">＋ Crear celebración</a></div></header><section class="grid two">${tenantEvents.map(event=>`<article class="card"><span class="chip ${event.status==='published'?'ok':'wait'}">${event.status==='published'?'Publicada':'Borrador'} · ${escapeHtml(event.role||'owner')}</span><h2>${escapeHtml(event.title||`${event.bride||''} & ${event.groom||''}`)}</h2><p>${escapeHtml(event.date||'Fecha pendiente')}</p><button class="btn" type="button" data-event-select="${escapeHtml(event.id)}">Abrir celebración →</button></article>`).join('')||'<article class="card"><h2>Aún no tienes celebraciones</h2><p>Elige un diseño y crea la primera.</p><a class="btn" href="#/bodas">Ver diseños</a></article>'}</section></main>`;
}

function checkoutPage() {
  const isMock=paymentMode==="mock";
  const billingExternal=paymentMode==="external";
  return `<div class="mkt-page payment-page"><main class="payment-demo-shell"><nav class="payment-topline"><a href="#/plans" class="mkt-text-link">← Volver a planes</a><a href="#/dashboard" class="payment-brand">nupcial<span>✳</span></a><span class="payment-secure">${isMock?'<i class="demo-dot"></i> Entorno de prueba':'Billing externo · no conectado'}</span></nav>
    <section class="payment-intro"><p class="mkt-eyebrow">${isMock?'SIMULADOR DE COMPRA · SIN COBRO':'COBRO EXTERNO · NO DISPONIBLE'}</p><h1>${isMock?'Prueba el recorrido<br><em>antes de publicarlo.</em>':'El cobro vive<br><em>en otro servicio.</em>'}</h1><p>${isMock?'Esta compra es ficticia. Elige una forma de pago de muestra y selecciona el resultado para continuar al panel.':'El servicio externo de billing no está conectado. No puedes contratar ni activar un plan desde esta app.'}</p></section>
    <ol class="payment-steps" aria-label="Pasos de compra"><li class="is-done"><span>1</span><div><strong>Elige</strong><small>Tu plan</small></div></li><li class="is-active"><span>2</span><div><strong>Confirma</strong><small>Checkout</small></div></li><li><span>3</span><div><strong>Continúa</strong><small>Organiza tu boda</small></div></li></ol>
    <div class="payment-layout"><section class="payment-main card"><div id="checkout-status" class="payment-dynamic-status" aria-live="polite">Cargando tu compra…</div><div id="checkout-actions" class="payment-dynamic-actions"></div></section><aside id="checkout-summary" class="payment-summary card"><span class="mkt-eyebrow">RESUMEN DE COMPRA</span><div class="payment-skeleton">Cargando pedido…</div></aside></div>
    <p class="payment-footnote">${isMock?'No ingreses datos bancarios ni de tarjeta. Nada sale de esta demo y no se realiza ningún cobro.':billingExternal?'No se conectó proveedor. No hay cobro ni activación en esta aplicación.':'El proveedor externo administra el pago fuera de esta app.'}</p></main></div>`;
}

function paymentResultPage() {
  return `<div class="mkt-page payment-page"><main class="payment-demo-shell payment-result-shell"><nav class="payment-topline"><a href="#/plans" class="mkt-text-link">← Planes</a><a href="#/dashboard" class="payment-brand">nupcial<span>✳</span></a><span class="payment-secure">Estado consultado en servidor</span></nav><section class="payment-result-card card"><span class="payment-result-seal" aria-hidden="true">✳</span><p class="mkt-eyebrow">RESULTADO DE LA COMPRA</p><h1>Un paso más<br><em>para celebrar.</em></h1><div id="payment-result-status" class="payment-dynamic-status" aria-live="polite">Consultando el estado del servidor…</div><div id="payment-result-actions" class="payment-dynamic-actions"></div><p class="payment-footnote">El regreso desde una pasarela no confirma un pago. El estado se consulta en el servidor; las compras de demo son ficticias.</p></section></main></div>`;
}

async function refreshCheckoutPage() {
  const status = document.querySelector("#checkout-status");
  const actions = document.querySelector("#checkout-actions");
  const summary = document.querySelector("#checkout-summary");
  if (!status || !actions || !summary) return;
  if (paymentMode === "external") {
    status.innerHTML = '<div class="payment-state-icon is-muted">↗</div><h2>Servicio externo no conectado</h2><p>Este sistema no procesa cobros. Conecta el servicio de billing aparte antes de habilitar contratación.</p>';
    actions.innerHTML = '<a class="mkt-button" href="#/plans">Volver a planes</a>';
    summary.innerHTML = '<span class="mkt-eyebrow">ESTADO</span><p>Sin intento de pago ni movimiento de dinero.</p>';
    return;
  }
  const id = hashParams().get("id");
  if (!id) { status.innerHTML = '<div class="payment-state-icon is-error">!</div><h2>No encontramos esta compra</h2><p>Vuelve a elegir un plan para crear un intento de demo nuevo.</p>';actions.innerHTML='<a class="mkt-button" href="#/plans">Ver planes ↗</a>';summary.innerHTML='<span class="mkt-eyebrow">RESUMEN DE COMPRA</span><p>Este enlace no tiene un pedido asociado.</p>';return; }
  try {
    const { payment } = await apiRequest(`/api/payments/${encodeURIComponent(id)}`);
    if (!payment) { status.innerHTML = '<div class="payment-state-icon is-error">!</div><h2>No encontramos esta compra</h2><p>Inicia un nuevo recorrido desde Planes.</p>';actions.innerHTML='<a class="mkt-button" href="#/plans">Ver planes ↗</a>';return; }
    if (payment.status === "approved") {
      const latest = await apiRequest("/api/state");
      if (latest.state) { db = normalizeDB(latest.state);db.event.id=latest.eventId;db.event.slug=latest.slug;db.event.status=latest.eventStatus;serverStateVersion = latest.version;if(!tenantMode)localStorage.setItem(DB_KEY, JSON.stringify(db)); savedDBSnapshot = JSON.stringify(db); }
    }
    const amount = new Intl.NumberFormat("es-PE", { style: "currency", currency: payment.currency || "PEN" }).format(payment.amount);
    const formattedDate=new Intl.DateTimeFormat("es-PE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(payment.createdAt||Date.now()));
    const labels={pending:"Pendiente",approved:"Aprobado",rejected:"Rechazado",cancelled:"Cancelado",failed:"No completado",refunded:"Reembolsado",charged_back:"Desconocido"};
    const statusLabel=labels[payment.status]||payment.status;
    summary.innerHTML=`<span class="mkt-eyebrow">RESUMEN DE COMPRA</span><div class="payment-summary-plan"><span class="payment-plan-symbol">✳</span><div><strong>Plan ${escapeHtml(payment.planName)}</strong><small>Acceso para una celebración</small></div></div><div class="payment-summary-line"><span>Importe de demo</span><strong>${amount}</strong></div><div class="payment-summary-line"><span>Moneda</span><strong>${escapeHtml(payment.currency||"PEN")}</strong></div><div class="payment-summary-line"><span>Pedido</span><strong class="payment-reference">${escapeHtml(payment.id.slice(0,8).toUpperCase())}</strong></div><div class="payment-summary-line"><span>Creado</span><strong>${escapeHtml(formattedDate)}</strong></div><div class="payment-summary-total"><span>Total simulado</span><strong>${amount}</strong></div><div class="payment-summary-note"><span>✓</span><p>Importe de muestra. No se realizará ningún cargo.</p></div>`;
    const icon=payment.status==='approved'?'✓':payment.status==='rejected'||payment.status==='failed'?'×':payment.status==='cancelled'?'↶':'…';
    const statusCopy={pending:'Elige cómo quieres simular el resultado. No se recopilan datos de pago.',approved:'Compra ficticia aprobada por el simulador. El servidor activó el plan.',rejected:'El simulador rechazó esta compra. No se cambió tu plan.',cancelled:'Cancelaste este intento. No se cambió tu plan.',failed:'No se pudo iniciar este intento. Puedes probar de nuevo.'};
    status.innerHTML=`<div class="payment-state-icon ${payment.status==='approved'?'is-success':['rejected','failed'].includes(payment.status)?'is-error':payment.status==='cancelled'?'is-muted':''}">${icon}</div><span class="payment-status-pill is-${escapeHtml(payment.status)}">${escapeHtml(statusLabel)}</span><h2>${payment.status==='pending'?'Elige un resultado':payment.status==='approved'?'¡Plan activado!':payment.status==='rejected'?'Compra no aprobada':payment.status==='cancelled'?'Compra cancelada':'Revisa este intento'}</h2><p>${escapeHtml(statusCopy[payment.status]||'Consulta el estado de esta compra de demostración.')}</p>`;
    if(payment.status==='pending'&&paymentMode==='mock'){
      const methods=[["card","Tarjeta de muestra","VISA ·•• 4242"],["wallet","Billetera demo","Saldo ficticio"],["transfer","Transferencia","En revisión"]];
      actions.innerHTML=`<div class="mock-payment-label"><span class="mkt-eyebrow">ELIGE UN MÉTODO DE PRUEBA</span><span class="mock-only-pill">SOLO SIMULACIÓN</span></div><div class="mock-methods" role="group" aria-label="Método de pago de muestra">${methods.map(([key,title,detail])=>`<button type="button" class="mock-method ${mockPaymentMethod===key?'is-selected':''}" data-mock-method="${key}" aria-pressed="${mockPaymentMethod===key}"><span class="mock-method-mark">${key==='card'?'▰':key==='wallet'?'◉':'↔'}</span><span><strong>${title}</strong><small>${detail}</small></span><i>${mockPaymentMethod===key?'✓':'○'}</i></button>`).join('')}</div><div class="mock-card-preview ${mockPaymentMethod==='wallet'?'is-wallet':mockPaymentMethod==='transfer'?'is-transfer':''}"><div class="mock-card-top"><span>NU̇PCIAL <i>DEMO</i></span><span>${mockPaymentMethod==='card'?'VISA':mockPaymentMethod==='wallet'?'BILLETERA':'BANCO'}</span></div><div class="mock-card-number">${mockPaymentMethod==='card'?'••••  ••••  ••••  4242':mockPaymentMethod==='wallet'?'Saldo de muestra':'Referencia de prueba'}</div><div class="mock-card-foot"><span>${mockPaymentMethod==='card'?'TARJETA NO REAL':mockPaymentMethod==='wallet'?'SIN CONEXIÓN A BILLETERAS':'SIN TRANSFERENCIA REAL'}</span><span>SOLO DEMO</span></div></div><p class="mock-no-input">No ingreses tarjeta, clave, CVV ni datos bancarios.</p><div class="mock-result-actions"><button class="mkt-button mock-approve" data-demo-payment="approved" data-payment-id="${escapeHtml(payment.id)}">Simular compra aprobada <span aria-hidden="true">↗</span></button><div class="mock-secondary-actions"><button class="btn secondary" data-demo-payment="pending" data-payment-id="${escapeHtml(payment.id)}">Dejar pendiente</button><button class="btn secondary" data-demo-payment="rejected" data-payment-id="${escapeHtml(payment.id)}">Simular rechazo</button><button class="btn ghost" data-demo-payment="cancelled" data-payment-id="${escapeHtml(payment.id)}">Cancelar intento</button></div></div>`;
    } else if(payment.status==='approved') actions.innerHTML=`<a class="mkt-button" href="#/payment-result?id=${encodeURIComponent(payment.id)}">Ver resultado verificado <span aria-hidden="true">↗</span></a>`;
    else if(['failed','rejected','cancelled'].includes(payment.status)) actions.innerHTML=`<a class="mkt-button" href="#/plans">Elegir otro plan <span aria-hidden="true">↗</span></a><a class="mkt-text-link" href="#/payment-result?id=${encodeURIComponent(payment.id)}">Ver estado de este intento</a>`;
    else actions.innerHTML=`<a class="mkt-button" href="#/payment-result?id=${encodeURIComponent(payment.id)}">Consultar estado <span aria-hidden="true">↗</span></a>`;
  } catch (error) { status.textContent = error.message; }
}

async function refreshPaymentResult() {
  const target = document.querySelector("#payment-result-status");
  const actions=document.querySelector("#payment-result-actions");
  if (!target||!actions) return;
  const id = hashParams().get("id");
  if (!id || !apiMode) { target.innerHTML = '<h2>Necesitamos el servidor</h2><p>Abre la demo con <code>npm start</code> para consultar una compra.</p>';return; }
  try {
    const { payment } = await apiRequest(`/api/payments/${encodeURIComponent(id)}`);
    if (!payment) { target.innerHTML = '<h2>Compra no encontrada</h2><p>Vuelve a Planes para empezar un intento nuevo.</p>';actions.innerHTML='<a class="mkt-button" href="#/plans">Volver a planes ↗</a>';return; }
    if (payment.status === "approved") {
      const latest = await apiRequest("/api/state");
      if (latest.state) { db = normalizeDB(latest.state);db.event.id=latest.eventId;db.event.slug=latest.slug;db.event.status=latest.eventStatus;serverStateVersion = latest.version;if(!tenantMode)localStorage.setItem(DB_KEY, JSON.stringify(db)); savedDBSnapshot = JSON.stringify(db); }
    }
    const amount=new Intl.NumberFormat("es-PE",{style:"currency",currency:payment.currency||"PEN"}).format(payment.amount);
    const statusLabel={approved:"Aprobado",pending:"Pendiente",rejected:"Rechazado",cancelled:"Cancelado",failed:"No completado",refunded:"Reembolsado",charged_back:"Desconocido"}[payment.status]||payment.status;
    target.innerHTML=`<div class="payment-state-icon ${payment.status==='approved'?'is-success':['rejected','failed'].includes(payment.status)?'is-error':payment.status==='cancelled'?'is-muted':''}">${payment.status==='approved'?'✓':payment.status==='rejected'?'×':payment.status==='cancelled'?'↶':'…'}</div><span class="payment-status-pill is-${escapeHtml(payment.status)}">${escapeHtml(statusLabel)}</span><h2>${payment.status==='approved'?'Plan activado':payment.status==='pending'?'Tu pago sigue pendiente':payment.status==='rejected'?'No se aprobó esta compra':'Este intento finalizó'}</h2><p>${payment.status==='approved'?`Compra de demostración confirmada en servidor. Plan ${escapeHtml(payment.planName)} activo; puedes seguir al módulo de mesas.`:payment.status==='pending'?'El plan no cambia hasta que la compra quede aprobada. En demo puedes retomar la simulación.':`No se realizó ningún cobro. El plan no se cambió.`}</p><div class="payment-result-reference"><span>Pedido ${escapeHtml(payment.id.slice(0,8).toUpperCase())}</span><strong>${amount}</strong></div>`;
    if(payment.status==='approved')actions.innerHTML=`<a class="mkt-button" href="#/tables">Continuar al plano de mesas <span aria-hidden="true">↗</span></a><a class="mkt-text-link" href="#/dashboard">Ir al panel</a>`;
    else if(payment.status==='pending'&&paymentMode==='mock')actions.innerHTML=`<a class="mkt-button" href="#/checkout?id=${encodeURIComponent(payment.id)}">Continuar simulación <span aria-hidden="true">↗</span></a><a class="mkt-text-link" href="#/plans">Ver planes</a>`;
    else actions.innerHTML=`<a class="mkt-button" href="#/plans">Intentar otra compra <span aria-hidden="true">↗</span></a><a class="mkt-text-link" href="#/dashboard">Volver al panel</a>`;
  } catch (error) { target.textContent = error.message; }
}

async function startPlanCheckout(planId) {
  if (!isAuthed()) { go("login?next=plans"); return; }
  if (!apiMode) { toast("El checkout requiere ejecutar la aplicación con npm start."); return; }
  try {
    const result = await apiRequest("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
    if (result.mode === "mock") { go(`checkout?id=${encodeURIComponent(result.payment.id)}`); refreshCheckoutPage(); }
    else location.assign(result.checkoutUrl);
  } catch (error) { toast(error.message); }
}

function dashboardPage() {
  const m = metrics();
  const plan = clientPlan();
  const used = Math.min(100, Math.round(m.total / plan.passes * 100));
  const publication=db.event.status==='published';
  const dashboardActions=tenantMode?`${publication?`<button class="btn secondary" type="button" data-event-copy-link>Copiar enlace</button><a class="btn secondary" href="${escapeHtml(publicInviteUrl())}" target="_blank" rel="noopener">Ver invitación ↗</a>`:''}<button class="btn ${publication?'secondary':''}" type="button" data-event-publish="${publication?'false':'true'}">${publication?'Despublicar':'Publicar invitación'}</button>`:'<a class="btn secondary" href="#/public">Vista previa</a>';
  return shell(`${pageHead("Resumen", `Bienvenidos, ${escapeHtml(db.event.bride)} & ${escapeHtml(db.event.groom)}`, "Tu evento de un vistazo.", dashboardActions)}
    <section class="hero-card card">
      <span class="chip" style="background:rgba(255,255,255,.16);color:white">${tenantMode?(publication?'Enlace público activo':'Borrador privado'):apiMode?'Servidor conectado · Demo':'Vista local'}</span>
      <h1>${escapeHtml(db.event.bride)} & ${escapeHtml(db.event.groom)}</h1><p>${escapeHtml(db.event.phrase)}</p>
      <div class="hero-meta"><div><span>Fecha</span><strong>${formatDate(db.event.date)}</strong></div><div><span>Lugar</span><strong>${escapeHtml(db.event.venue)}</strong></div><div><span>Plan · ${db.event.planStatus==='active'?'activo':'demo'}</span><strong>${escapeHtml(plan.name)}</strong></div><div><a class="btn secondary" href="#/plans">Ver planes / contratar</a></div></div>
    </section>
    <section class="grid four" style="margin-top:18px">
      ${[["Pases asignados", m.total, m.total>plan.passes?`${m.total-plan.passes} sobre el plan`:`${plan.passes-m.total} disponibles`],["Confirmados",m.confirmed,"Asistirán"],["Pendientes",m.pending,"Sin respuesta"],["Fotos",db.gallery.length,"Compartidas"]].map(([label,num,small],i)=>`<article class="card metric"><span class="chip ${i===1?'ok':i===2?'wait':''}">${label}</span><div><div class="number">${num}</div><small>${small}</small></div></article>`).join("")}
    </section>
    <section class="grid two" style="margin-top:18px">
      <article class="card"><h2>Uso de pases</h2><p>${m.total} de ${plan.passes} pases asignados.</p><div class="progress"><span style="width:${used}%"></span></div><p style="margin-top:10px;color:var(--muted)">${used}% utilizado</p></article>
      <article class="card"><h2>Próximo paso</h2><p>${m.pending ? `Tienes ${m.pending} pases pendientes de confirmación.` : "Todas las respuestas están listas."}</p><a class="btn secondary" href="#/rsvp">Revisar respuestas</a></article>
    </section>
    <h2 style="margin:34px 0 16px">Accesos rápidos</h2>
    <section class="grid three">
      ${[["guests","♙","Gestionar invitados","Crea grupos, asigna pases y exporta tu lista."],["tables","◉","Organizar mesas","Ubica a tus invitados confirmados."],["invitation","✦","Editar invitación","Actualiza fecha, lugar, estilo y textos."]].map(([path,icon,title,text])=>`<a class="card quick-card" href="#/${path}"><div class="quick-icon">${icon}</div><h3>${title}</h3><p>${text}</p></a>`).join("")}
    </section>`, "Inicio");
}

function guestsPage() {
  const m = metrics();
  return shell(`${pageHead("Gestión", "Tus invitados", "Administra grupos, pases, acompañantes y mensajes.", '<button class="btn secondary" data-action="export-guests">Descargar CSV</button><button class="btn secondary" data-action="open-import">Subir invitados</button><button class="btn" data-action="new-guest">Crear invitado</button>')}
    <section class="grid four" style="margin-bottom:18px">${[["Grupos",db.guests.length,""],["Pases",m.total,""],["Confirmados",m.confirmed,"ok"],["Pendientes",m.pending,"wait"]].map(([a,b,c])=>`<div class="card"><span class="chip ${c}">${a}</span><div class="number" style="font-size:34px;margin-top:18px">${b}</div></div>`).join("")}</section>
    <div class="toolbar"><input id="guest-search" class="input" style="max-width:250px" placeholder="Buscar invitado…"><select id="guest-filter" class="select" style="max-width:175px"><option value="all">Todos los estados</option><option value="confirmed">Confirmados</option><option value="pending">Pendientes</option><option value="declined">No asistirán</option></select><select id="guest-category-filter" class="select" style="max-width:165px"><option value="all">Todas categorías</option>${[...new Set(db.guests.map(g=>g.category).filter(Boolean))].map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("")}</select><select id="guest-side-filter" class="select" style="max-width:150px"><option value="all">Todos los lados</option>${[...new Set(db.guests.map(g=>g.side))].map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("")}</select><select id="guest-sort" class="select" style="max-width:150px"><option value="recent">Más recientes</option><option value="name">Nombre A–Z</option></select><select id="guest-page-size" class="select" style="max-width:100px"><option value="10">10 / pág.</option><option value="25">25 / pág.</option><option value="50">50 / pág.</option></select></div>
    <div class="toolbar guest-bulk-actions"><span id="guest-selection-count" class="note">0 seleccionados</span><button class="btn small secondary" data-action="select-visible-guests">Seleccionar página</button><button class="btn small secondary" data-action="export-selected-guests">Exportar selección</button><button class="btn small ghost" data-action="clear-guest-selection">Limpiar</button></div>
    <div class="table-wrap"><table><thead><tr><th><input type="checkbox" id="guest-select-page" aria-label="Seleccionar página"></th><th>Grupo</th><th>Contacto / envío</th><th>Pases</th><th>Estado</th><th>Lado</th><th>Mesa</th><th>Acciones</th></tr></thead><tbody id="guest-rows"></tbody></table></div><div id="guest-pagination" class="pagination"></div>`, "Invitados");
}

function guestRows(list) {
  return list.length ? list.map(g => {const memberCount=(g.members||[]).length;return `<tr><td><input type="checkbox" data-select-guest="${g.id}" ${selectedGuestIds.has(g.id)?'checked':''} aria-label="Seleccionar ${escapeHtml(g.name)}"></td><td><div class="person"><span class="avatar">${escapeHtml(initials(g.name))}</span><div><strong>${escapeHtml(g.name)}</strong><small style="display:block;color:var(--muted)">${g.type==='individual'?'Individual':'Grupo'} · ${memberCount} nombre${memberCount===1?'':'s'} registrado${memberCount===1?'':'s'}</small></div></div></td><td>${escapeHtml(g.phone || "—")}<small style="display:block;color:var(--muted)">Envío por WhatsApp externo</small></td><td>${Core.attendanceCount(g)} / ${g.passes}</td><td>${statusChip(g.status)}</td><td>${escapeHtml(g.side)}</td><td>${g.table ? escapeHtml(db.tables.find(t=>t.id===g.table)?.name || "—") : "—"}</td><td><div class="row-actions"><button class="btn small secondary" data-manual-rsvp="${g.id}" title="Confirmación manual" aria-label="Registrar respuesta de ${escapeHtml(g.name)}">✓</button><button class="btn small secondary" data-copy-invite="${g.id}" title="Copiar mensaje personalizado" aria-label="Copiar mensaje para ${escapeHtml(g.name)}">⧉</button><button class="btn small secondary" data-copy-link="${g.id}" title="Copiar enlace personalizado" aria-label="Copiar enlace de ${escapeHtml(g.name)}">↗</button><a class="btn small secondary" href="#/public?guest=${encodeURIComponent(g.code)}" title="Ver invitación personalizada" aria-label="Abrir invitación de ${escapeHtml(g.name)}">◉</a><button class="btn small secondary" data-whatsapp="${g.id}" title="Preparar WhatsApp" aria-label="Preparar WhatsApp para ${escapeHtml(g.name)}">◍</button><button class="btn small secondary" data-edit-guest="${g.id}" title="Editar">✎</button><button class="btn danger small" data-delete-guest="${g.id}" title="Eliminar">×</button></div></td></tr>`;}).join("") : '<tr><td colspan="8" class="empty">Sin resultados.</td></tr>';
}

function rsvpPage() {
  const m = metrics();
  const confirmed = db.guests.filter(g => g.status === "confirmed");
  const declined = db.guests.filter(g => g.status === "declined");
  const pending = db.guests.filter(g => g.status === "pending");
  return shell(`${pageHead("RSVP", "Confirmaciones", "Quién viene, quién no y quién falta de responder.", '<button class="btn secondary" data-action="export-rsvp-confirmed">Exportar asistentes</button><button class="btn secondary" data-action="export-rsvp-declined">Exportar no asistentes</button>')}
    <section class="grid three" style="margin-bottom:20px"><article class="card metric"><span class="chip ok">Asistirán</span><div><div class="number">${m.confirmed}</div><small>${confirmed.length} ${confirmed.length===1?'grupo':'grupos'}</small></div></article><article class="card metric"><span class="chip no">No asistirán</span><div><div class="number">${m.declined}</div><small>${declined.length} ${declined.length===1?'grupo':'grupos'}</small></div></article><article class="card metric"><span class="chip wait">Faltan confirmar</span><div><div class="number">${m.pending}</div><small>Requieren seguimiento</small></div></article></section>
    <div class="toolbar"><input id="rsvp-search" class="input" placeholder="Buscar respuesta…" style="max-width:300px"><select id="rsvp-type-filter" class="select" style="max-width:210px"><option value="all">Ceremonia y evento</option><option value="ceremony">Solo ceremonia</option><option value="full">Evento completo</option></select><select id="rsvp-status-filter" class="select" style="max-width:180px"><option value="all">Todos los estados</option><option value="confirmed">Asistirán</option><option value="declined">No asistirán</option><option value="pending">Pendientes</option></select><select id="rsvp-sort" class="select" style="max-width:180px"><option value="recent">Más recientes</option><option value="name">Nombre A–Z</option></select></div>
    <section class="grid three"><article><h2>Asistentes</h2><div class="rsvp-list" id="rsvp-confirmed-list">${confirmed.map(g=>rsvpRow(g)).join("") || '<div class="empty card">Aún sin confirmaciones.</div>'}</div></article><article><h2>No asistentes</h2><div class="rsvp-list" id="rsvp-declined-list">${declined.map(g=>rsvpRow(g)).join("") || '<div class="empty card">Sin respuestas negativas.</div>'}</div></article><article><h2>Pendientes</h2><div class="rsvp-list" id="rsvp-pending-list">${pending.map(g=>rsvpRow(g)).join("") || '<div class="empty card">No hay respuestas pendientes.</div>'}</div></article></section>`, "Confirmaciones");
}

function rsvpRow(g) { const type=g.attendanceType==='ceremony'?'Solo ceremonia':'Evento completo';const answered=g.responseAt?new Date(g.responseAt).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short'}):'Fecha no disponible';return `<div class="list-row"><div><strong>${escapeHtml(g.name)}</strong><p>${g.message ? `“${escapeHtml(g.message)}”` : `${Core.attendanceCount(g)} de ${g.passes} pases`}</p><small class="muted">${type} · ${answered}</small></div>${statusChip(g.status)}</div>`; }

function renderGuestTable() {
  const q=(document.querySelector("#guest-search")?.value||"").trim().toLocaleLowerCase("es");
  const status=document.querySelector("#guest-filter")?.value||"all";
  const category=document.querySelector("#guest-category-filter")?.value||"all";
  const side=document.querySelector("#guest-side-filter")?.value||"all";
  const rows=db.guests.filter(g=>(g.name.toLocaleLowerCase("es").includes(q)||g.phone.toLowerCase().includes(q)||(g.category||"").toLocaleLowerCase("es").includes(q)||(g.members||[]).some(name=>name.toLocaleLowerCase("es").includes(q)))&&(status==="all"||g.status===status)&&(category==="all"||g.category===category)&&(side==="all"||g.side===side));
  if(guestSort==="name")rows.sort((a,b)=>a.name.localeCompare(b.name,"es"));
  const pages=Math.max(1,Math.ceil(rows.length/guestPageSize));guestPage=Math.min(guestPage,pages);
  const start=(guestPage-1)*guestPageSize;const pageRows=rows.slice(start,start+guestPageSize);
  document.querySelector("#guest-rows").innerHTML=guestRows(pageRows);
  document.querySelector("#guest-selection-count").textContent=`${selectedGuestIds.size} seleccionados`;
  const selectPage=document.querySelector("#guest-select-page");if(selectPage){selectPage.checked=pageRows.length>0&&pageRows.every(g=>selectedGuestIds.has(g.id));selectPage.indeterminate=pageRows.some(g=>selectedGuestIds.has(g.id))&&!selectPage.checked;}
  document.querySelector("#guest-pagination").innerHTML=`<span>${rows.length?start+1:0}–${Math.min(start+guestPageSize,rows.length)} de ${rows.length}</span><div class="actions"><button class="btn small secondary" data-action="guest-page-prev" ${guestPage<=1?"disabled":""}>Anterior</button><span>Página ${guestPage} de ${pages}</span><button class="btn small secondary" data-action="guest-page-next" ${guestPage>=pages?"disabled":""}>Siguiente</button></div>`;
}

function tablesPage() {
  const confirmed = db.guests.filter(g => g.status === "confirmed");
  const people = confirmed.reduce((sum, guest) => sum + Core.attendanceCount(guest), 0);
  const assigned = confirmed.filter(g => g.table).reduce((sum, guest) => sum + Core.attendanceCount(guest), 0);
  const unassigned = confirmed.filter(g => !g.table);
  const seats = db.tables.reduce((sum, table) => sum + Number(table.seats), 0);
  const overflow = db.tables.filter(table => floorTableUsage(table.id) > Number(table.seats));
  const viewLabels = [["plan", "Plano del salón"], ["tables", "Mesas"], ["guests", "Invitados"]];
  const createForm = `<form id="table-form" class="floor-create-form"><div class="field"><label for="new-table-name">Nombre de mesa</label><input class="input" id="new-table-name" name="name" required maxlength="36" placeholder="Ej. Mesa Jardín"></div><div class="field"><label for="new-table-seats">Capacidad</label><input class="input" id="new-table-seats" name="seats" type="number" min="1" max="20" value="8" required></div><div class="field"><label for="new-table-shape">Forma</label><select class="select" id="new-table-shape" name="shape"><option value="round">Redonda</option><option value="rect">Rectangular</option></select></div><button class="btn" type="submit">＋ Crear mesa</button></form>`;
  let body = "";
  if (floorView === "plan") {
    const selected = db.tables.find(table => floorSelectedTables.has(table.id));
    body = `<div class="floor-workspace ${floorCleanMode ? "is-clean" : ""}">
      <section class="floor-main floor-print-section">
        <div class="floor-tools card">
          <div class="floor-tools-main"><strong>Plano del salón</strong><span>${floorMultiSelect ? "Selecciona varias mesas para revisarlas juntas." : "Arrastra las mesas para ubicarlas. Suelta un grupo sobre una mesa para asignarlo."}</span></div>
          <div class="floor-tool-groups">
            <div class="actions" aria-label="Edición del plano">
              <button class="btn small ${floorMultiSelect ? "" : "secondary"}" data-floor-action="multi-select" aria-pressed="${floorMultiSelect}">${floorMultiSelect ? "✓ Selección múltiple" : "Seleccionar varias"}</button>
              <button class="btn small ${floorPanMode ? "" : "secondary"}" data-floor-action="pan" aria-pressed="${floorPanMode}">${floorPanMode ? "✓ Mover plano" : "Mover plano"}</button>
              <button class="btn small secondary" data-floor-action="undo" ${floorHistory.length ? "" : "disabled"} aria-label="Deshacer último movimiento">↶ Deshacer</button>
              <button class="btn small secondary" data-floor-action="arrange">Ordenar mesas</button>
              <button class="btn small secondary" data-floor-action="zoom-out" aria-label="Alejar">−</button><span id="floor-zoom-label" class="floor-zoom-label">${Math.round(floorZoom * 100)}%</span><button class="btn small secondary" data-floor-action="zoom-in" aria-label="Acercar">＋</button>
              <button class="btn small secondary" data-floor-action="fit">Ver todo</button>
              <button class="btn small secondary" data-floor-action="minimap">${floorMiniMapOpen ? "Ocultar" : "Mostrar"} minimapa</button>
              <button class="btn small secondary" data-floor-action="clean">${floorCleanMode ? "Salir de vista limpia" : "Vista limpia"}</button>
              <button class="btn small secondary" data-floor-action="review">${floorReview ? "Cerrar revisión" : "Revisar plano"}</button>
              <button class="btn small secondary" data-floor-action="print">Imprimir plano / PDF</button>
            </div>
          </div>
        </div>
        ${floorReview ? `<div class="floor-review ${unassigned.length || overflow.length ? "has-issues" : "is-ready"}" role="status"><strong>${unassigned.length || overflow.length ? "Revisa antes de cerrar el plano" : "Plano listo para compartir"}</strong><span>${unassigned.length} grupos sin asignar · ${overflow.length} mesas exceden capacidad</span>${unassigned.length ? '<button class="btn small secondary" data-floor-view="guests">Asignar pendientes</button>' : ""}</div>` : ""}
        <div class="floor-object-tools" aria-label="Elementos del salón">${Object.entries(FLOOR_OBJECT_TYPES).map(([type, item]) => `<button class="btn small secondary" data-add-floor-object="${type}" title="Agregar ${escapeHtml(item.label)} al salón">${item.icon} ${item.label} <span aria-hidden="true">＋</span></button>`).join("")}</div>
        <div class="floor-viewport ${floorPanMode?'is-panning':''}"><div class="floor-canvas" style="--floor-zoom:${floorZoom}" aria-label="Plano de distribución del salón"><div class="floor-zone-label zone-entrance">Entrada principal</div><div class="floor-zone-label zone-exit">Salida</div>${db.floorObjects.map(floorObjectCard).join("")}${db.tables.map((table,index)=>floorTableMatchesSearch(table)?floorTableCard(table,index):"").join("") || `<div class="floor-empty">${floorSearch?'No encontramos mesas para esta búsqueda.':'Aún no hay mesas.<br>Agrega una mesa para empezar a dibujar el salón.'}</div>`}</div></div>
        <div class="floor-legend"><span><i class="legend-table"></i>Mesa redonda</span><span><i class="legend-table rect"></i>Mesa rectangular</span><span><i class="legend-object">✦</i>Elemento del salón</span><span>↔ Arrastra para mover · Arrastra invitados a una mesa</span></div>
      </section>
      <aside class="floor-inspector">
        <section class="card floor-guest-pool"><div class="floor-panel-head"><div><span class="eyebrow">ASIGNACIÓN</span><h2>Invitados confirmados</h2></div><span class="chip ${unassigned.length ? "wait" : "ok"}">${unassigned.length} sin mesa</span></div>
          <input class="input floor-search" id="floor-guest-search" type="search" value="${escapeHtml(floorSearch)}" placeholder="Buscar mesa o invitado…" aria-label="Buscar mesa o invitado del plano">
          <label class="floor-check-filter"><input type="checkbox" id="floor-unassigned-only" ${floorUnassignedOnly ? "checked" : ""}> Mostrar solo sin asignar</label>
          <div class="floor-guest-list" id="floor-guest-list">${floorGuestRows(confirmed)}</div>
          <p class="floor-assign-hint">Elige un grupo y toca una silla libre; también puedes arrastrarlo hasta la mesa.</p>
          ${unassigned.length ? `<button class="btn secondary floor-wide-action" data-floor-view="guests">Ver lista completa ↗</button>` : ""}
        </section>
        ${selected ? floorTableInspector(selected) : `<section class="card floor-selected-empty"><span class="floor-inspector-icon">◉</span><h3>Selecciona una mesa</h3><p>Elige una mesa del plano para cambiar nombre, forma o capacidad.</p></section>`}
        ${floorMiniMapOpen ? `<section class="card floor-minimap"><div class="floor-panel-head"><div><span class="eyebrow">VISTA GENERAL</span><h2>Minimapa</h2></div><span class="muted">${db.tables.length} mesas</span></div><div class="floor-minimap-map" aria-label="Minimapa de mesas">${db.floorObjects.map(object => { const point = Core.floorPosition(object, 0, 1); return `<span class="floor-minimap-object" style="left:${point.x}%;top:${point.y}%" aria-label="${escapeHtml(FLOOR_OBJECT_TYPES[object.type]?.label || "Elemento")}"></span>`; }).join("")}${db.tables.map((table,index) => { const point = Core.floorPosition(table,index,db.tables.length); return `<button type="button" class="floor-minimap-table ${floorSelectedTables.has(table.id) ? "is-selected" : ""}" style="left:${point.x}%;top:${point.y}%" data-floor-select="${table.id}" aria-label="Seleccionar ${escapeHtml(table.name)}">${index + 1}</button>`; }).join("")}</div><p class="muted">Selecciona un punto para ubicar la mesa en el plano.</p></section>` : ""}
      </aside>
    </div>`;
  } else if (floorView === "tables") {
    body = `<div class="floor-view-heading"><div><span class="eyebrow">DISEÑO DEL SALÓN</span><h2>Tus mesas</h2><p>Capacidad, personas asignadas y ubicación en un vistazo.</p></div>${createForm}</div><div class="toolbar floor-list-search"><input class="input" id="floor-guest-search" type="search" value="${escapeHtml(floorSearch)}" placeholder="Buscar mesa o invitado…" aria-label="Buscar mesa o invitado"><label class="floor-check-filter"><input type="checkbox" id="floor-unassigned-only" ${floorUnassignedOnly?"checked":""}> Mesas con lugares libres</label></div><div class="floor-table-grid">${db.tables.map((table,index) => floorTableMatchesSearch(table)&&(!floorUnassignedOnly||floorTableUsage(table.id)<table.seats)?floorTableSummaryCard(table,index):"").join("") || '<div class="card empty">No hay mesas con este filtro. Cambia tu búsqueda o crea una mesa.</div>'}</div>`;
  } else {
    body = `<section class="card floor-assignments"><div class="floor-view-heading"><div><span class="eyebrow">ACOMODO</span><h2>Lista de invitados</h2><p>Asigna grupos completos. Las personas que confirmaron ocupan asientos; pendientes no reservan lugar.</p></div><div class="actions"><button class="btn secondary" data-action="export-tables">Exportar CSV</button><button class="btn" data-action="auto-tables">Distribuir automáticamente</button></div></div><div class="toolbar"><input class="input" id="floor-guest-search" type="search" value="${escapeHtml(floorSearch)}" placeholder="Buscar grupo o persona…" aria-label="Buscar invitados"><label class="floor-check-filter"><input type="checkbox" id="floor-unassigned-only" ${floorUnassignedOnly ? "checked" : ""}> Solo sin asignar</label></div><div class="floor-guest-list floor-guest-list-wide" id="floor-guest-list">${floorGuestRows(confirmed,{wide:true})}</div><div class="floor-footer-actions"><button class="btn secondary" data-action="reset-tables">Desasignar todas las mesas</button><span class="muted">${assigned} de ${people} personas con mesa · ${seats} lugares disponibles</span></div></section>`;
  }
  const tabs = viewLabels.map(([id,label]) => `<button class="floor-tab ${floorView === id ? "is-active" : ""}" type="button" role="tab" aria-selected="${floorView === id}" data-floor-view="${id}">${label}${id === "guests" && unassigned.length ? `<span class="floor-tab-count">${unassigned.length}</span>` : ""}</button>`).join("");
  return shell(`${pageHead("Organización", "Plano de mesas", "Diseña el salón, acomoda grupos y revisa cada lugar.", '<button class="btn secondary" data-action="export-tables">Exportar lista</button><button class="btn secondary" data-action="reset-tables">Desasignar</button><button class="btn" data-action="auto-tables">Auto-distribuir</button>')}
    <section class="floor-summary" aria-label="Resumen de distribución">${[["Mesas",db.tables.length,"◉"],["Capacidad · asignadas",`${assigned}/${seats}`,"⌂"],["Personas ubicadas",`${assigned}/${people}`,"✓"],["Grupos por ubicar",unassigned.length,"↗"]].map(([label,value,icon])=>`<article class="card floor-stat"><span class="floor-stat-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong>${label === "Capacidad · asignadas" ? `<span>${Math.max(0,seats-assigned)} lugares libres</span>` : label === "Grupos por ubicar" ? `<span>${unassigned.reduce((sum,g)=>sum+Core.attendanceCount(g),0)} personas</span>` : ""}</div></article>`).join("")}</section>
    ${floorView !== "tables" ? `<section class="card floor-create-card"><div><span class="eyebrow">CONFIGURA EL ESPACIO</span><h2>Agregar una mesa</h2><p>Hasta 20 asientos por mesa. También puedes agregar pista, entrada y otras zonas.</p></div>${createForm}</section>` : ""}
    <section class="floor-section"><div class="floor-tabs" role="tablist" aria-label="Vistas del plano">${tabs}</div>${body}</section>`, "Plano de mesas");
}

function floorTableCard(table, index) {
  const position = Core.floorPosition(table, index, db.tables.length);
  const seated = db.guests.filter(g => g.table === table.id && g.status === "confirmed");
  const used = floorTableUsage(table.id);
  const remaining = Math.max(0, Number(table.seats) - used);
  const chairs=Array.from({length:Number(table.seats)},(_,seat)=>{
    const angle=(seat/Number(table.seats))*Math.PI*2-Math.PI/2;
    const rect=table.shape==='rect';
    const x=50+Math.cos(angle)*(rect?55:52),y=50+Math.sin(angle)*(rect?68:52);
    const occupied=seat<used;
    const label=occupied?`Silla ${seat+1}, ocupada`:`Asignar grupo a silla ${seat+1} de ${escapeHtml(table.name)}`;
    return `<button type="button" class="floor-chair ${occupied?'is-occupied':'is-empty'} ${floorSelectedGuestId&&!occupied&&remaining>=Core.attendanceCount(db.guests.find(g=>g.id===floorSelectedGuestId)||{passes:0})?'is-available':''}" style="left:${x}%;top:${y}%" data-floor-seat="${table.id}" data-seat-index="${seat}" aria-label="${label}" title="${label}" ${occupied?'disabled':''}></button>`;
  }).join("");
  return `<article class="table-card ${table.shape === "rect" ? "rect" : "round"} ${floorSelectedTables.has(table.id) ? "is-selected" : ""} ${used > table.seats ? "is-over-capacity" : ""}" data-floor-kind="table" data-floor-id="${table.id}" style="left:${position.x}%;top:${position.y}%" aria-label="${escapeHtml(table.name)}, ${used} de ${table.seats} lugares ocupados">
    <button class="floor-drag-handle" type="button" data-floor-drag="table" data-floor-id="${table.id}" aria-label="Mover ${escapeHtml(table.name)}" title="Arrastrar para mover">⠿</button>
    ${chairs}<button class="floor-table-select" type="button" data-floor-select="${table.id}" aria-label="${floorSelectedTables.has(table.id) ? "Deseleccionar" : "Seleccionar"} ${escapeHtml(table.name)}"><span class="floor-table-number">${String(index + 1).padStart(2,"0")}</span><strong>${escapeHtml(table.name)}</strong><span class="chip ${used>table.seats ? "no" : used===table.seats ? "ok" : ""}">${used} / ${table.seats}</span><small>${remaining ? `${remaining} lugares libres` : "Completa"}</small><span class="table-guest-names">${seated.slice(0,3).map(guest=>`<i>${escapeHtml(guest.name)}</i>`).join("") || '<i class="table-empty">Mesa vacía</i>'}${seated.length>3?`<i>+${seated.length-3} grupos</i>`:""}</span></button>
    <button class="floor-delete-table" type="button" data-delete-table="${table.id}" aria-label="Eliminar ${escapeHtml(table.name)}" title="Eliminar mesa">×</button>${used>table.seats?'<div class="capacity-error">Capacidad excedida</div>':''}</article>`;
}

function floorTableUsage(tableId) { return db.guests.filter(guest => guest.table === tableId && guest.status === "confirmed").reduce((sum, guest) => sum + Core.attendanceCount(guest), 0); }

function floorTableMatchesSearch(table) { const q=floorSearch.trim().toLocaleLowerCase("es");return !q||table.name.toLocaleLowerCase("es").includes(q)||db.guests.some(guest=>guest.table===table.id&&guest.status==="confirmed"&&(guest.name.toLocaleLowerCase("es").includes(q)||(guest.members||[]).some(name=>name.toLocaleLowerCase("es").includes(q)))); }

function floorTableSummaryCard(table,index) {
  const used=floorTableUsage(table.id), seated=db.guests.filter(g=>g.table===table.id&&g.status==="confirmed"), ratio=table.seats?Math.min(100,Math.round(used/table.seats*100)):0;
  return `<article class="card floor-table-summary" data-floor-summary-id="${table.id}"><div class="floor-table-summary-head"><span class="floor-table-shape ${table.shape==='rect'?'rect':''}">◉</span><div><span class="eyebrow">MESA ${String(index+1).padStart(2,"0")}</span><h3>${escapeHtml(table.name)}</h3></div><button class="btn small secondary" data-floor-select="${table.id}" data-floor-open-plan="true">Ver en plano ↗</button></div><div class="floor-capacity-line"><span>${used} de ${table.seats} personas</span><strong class="${used>table.seats?'is-over':''}">${table.seats-used>=0?`${table.seats-used} libres`:`${used-table.seats} excedidos`}</strong></div><div class="progress ${used>table.seats?'is-over-capacity':''}"><span style="width:${ratio}%"></span></div><div class="floor-summary-guests">${seated.map(guest=>`<span>${escapeHtml(guest.name)} <small>· ${Core.attendanceCount(guest)}</small></span>`).join("")||'<span class="muted">Aún sin invitados</span>'}</div><button class="btn ghost small" data-delete-table="${table.id}">Eliminar mesa</button></article>`;
}

function floorGuestRows(list,{wide=false}={}) {
  const q=floorSearch.trim().toLocaleLowerCase("es");
  const rows=list.filter(guest=>(!floorUnassignedOnly||!guest.table)&&(!q||guest.name.toLocaleLowerCase("es").includes(q)||(guest.members||[]).some(name=>name.toLocaleLowerCase("es").includes(q))));
  if(!rows.length)return '<div class="floor-guest-empty">No hay invitados que coincidan con esta búsqueda.</div>';
  return rows.map(guest=>`<article class="floor-guest-row ${wide?'is-wide':''} ${floorSelectedGuestId===guest.id?'is-picked':''}" draggable="true" data-drag-guest="${guest.id}" title="Arrastra ${escapeHtml(guest.name)} sobre una mesa para asignar"><span class="floor-guest-avatar">${escapeHtml(initials(guest.name))}</span><div class="floor-guest-info"><button type="button" class="floor-guest-pick" data-select-floor-guest="${guest.id}" aria-pressed="${floorSelectedGuestId===guest.id}"><strong>${escapeHtml(guest.name)}</strong><span>${floorSelectedGuestId===guest.id?'Elegido para asignar':'Elegir para sentar'}</span></button><small>${Core.attendanceCount(guest)} ${Core.attendanceCount(guest)===1?'persona':'personas'} · ${guest.members?.length||0} nombres registrados</small></div><span class="floor-assignment-status ${guest.table?'is-assigned':''}">${guest.table?escapeHtml(db.tables.find(t=>t.id===guest.table)?.name||'Mesa eliminada'):'Sin mesa'}</span><select class="select" data-assign-table="${guest.id}" aria-label="Asignar ${escapeHtml(guest.name)} a una mesa"><option value="">Sin mesa</option>${db.tables.map(table=>`<option value="${table.id}" ${guest.table===table.id?'selected':''}>${escapeHtml(table.name)} · ${Math.max(0,table.seats-floorTableUsage(table.id))} libres</option>`).join("")}</select></article>`).join("");
}

function floorTableInspector(table) {
  const used=floorTableUsage(table.id), selectedCount=floorSelectedTables.size;
  if(floorMultiSelect&&selectedCount>1)return `<section class="card floor-table-inspector"><span class="eyebrow">SELECCIÓN</span><h2>${selectedCount} mesas elegidas</h2><p>${[...floorSelectedTables].map(id=>db.tables.find(item=>item.id===id)?.name).filter(Boolean).map(escapeHtml).join(" · ")}</p><button class="btn secondary floor-wide-action" data-floor-action="clear-selection">Limpiar selección</button></section>`;
  return `<section class="card floor-table-inspector"><div class="floor-panel-head"><div><span class="eyebrow">MESA SELECCIONADA</span><h2>${escapeHtml(table.name)}</h2></div><span class="chip ${used>table.seats?'no':used===table.seats?'ok':'wait'}">${used}/${table.seats}</span></div><div class="floor-selected-guests">${db.guests.filter(g=>g.table===table.id&&g.status==='confirmed').map(g=>`<div><span>${escapeHtml(g.name)}</span><small>${Core.attendanceCount(g)} personas</small><button type="button" class="btn ghost small" data-unassign-guest="${g.id}" aria-label="Quitar ${escapeHtml(g.name)} de esta mesa">Quitar</button></div>`).join("")||'<p class="muted">Esta mesa aún no tiene invitados.</p>'}</div><form id="floor-edit-form" class="floor-edit-form" data-table-id="${table.id}"><label>Nombre<input class="input" name="name" required maxlength="36" value="${escapeHtml(table.name)}"></label><label>Capacidad<input class="input" name="seats" type="number" min="1" max="20" required value="${table.seats}"></label><label>Forma<select class="select" name="shape"><option value="round" ${table.shape==='round'?'selected':''}>Redonda</option><option value="rect" ${table.shape==='rect'?'selected':''}>Rectangular</option></select></label><button class="btn floor-wide-action" type="submit">Guardar cambios de mesa</button></form></section>`;
}

function refreshFloorGuestList() {
  const list=document.querySelector("#floor-guest-list");if(!list)return;
  list.innerHTML=floorGuestRows(db.guests.filter(guest=>guest.status==='confirmed'),{wide:floorView==='guests'});
}

function refreshFloorSearchViews(){
  document.querySelectorAll('[data-floor-kind="table"]').forEach(card=>{const table=db.tables.find(item=>item.id===Number(card.dataset.floorId));card.hidden=Boolean(table&&!floorTableMatchesSearch(table));});
  document.querySelectorAll('[data-floor-summary-id]').forEach(card=>{const table=db.tables.find(item=>item.id===Number(card.dataset.floorSummaryId));card.hidden=Boolean(table&&(!floorTableMatchesSearch(table)||(floorUnassignedOnly&&floorTableUsage(table.id)>=table.seats)));});
}

function floorObjectCard(object, index) {
  const type = FLOOR_OBJECT_TYPES[object.type];
  if (!type) return "";
  const position = Core.floorPosition(object, index, db.floorObjects.length);
  return `<article class="floor-object" data-floor-kind="object" data-floor-id="${object.id}" style="left:${position.x}%;top:${position.y}%"><button class="floor-drag-handle" type="button" data-floor-drag="object" data-floor-id="${object.id}" aria-label="Mover ${type.label}" title="Arrastrar para mover">⠿</button><span class="floor-object-icon">${type.icon}</span><strong>${type.label}</strong><button class="floor-object-delete" data-delete-floor-object="${object.id}" aria-label="Quitar ${type.label}">×</button></article>`;
}

function songsPage() {
  const counts = key => db.songs.filter(s=>s.status===key).length;
  return shell(`${pageHead("Música", "Sugerencias de canciones", "Playlist colaborativa para compartir con el DJ.", '<button class="btn secondary" data-action="export-songs">Exportar playlist</button>')}
    <section class="grid three" style="margin-bottom:18px"><div class="card"><span class="chip ok">Aprobadas</span><div class="number" style="font-size:36px;margin-top:18px">${counts('approved')}</div></div><div class="card"><span class="chip wait">Pendientes</span><div class="number" style="font-size:36px;margin-top:18px">${counts('pending')}</div></div><div class="card"><span class="chip no">Rechazadas</span><div class="number" style="font-size:36px;margin-top:18px">${counts('rejected')}</div></div></section>
    <section class="card" style="margin-bottom:18px"><h2>Agregar sugerencia</h2><form id="song-form" class="form-grid"><div class="field"><label>Canción</label><input class="input" name="title" required></div><div class="field"><label>Artista</label><input class="input" name="artist" required></div><div class="field"><label>Solicitada por</label><input class="input" name="requester" required></div><div class="field" style="align-self:end"><button class="btn">Agregar</button></div></form></section>
    <div class="toolbar"><input id="song-search" class="input" placeholder="Buscar canción o artista…" style="max-width:340px"><select id="song-filter" class="select" style="max-width:190px"><option value="all">Todos los estados</option><option value="approved">Aprobadas</option><option value="pending">Pendientes</option><option value="rejected">Rechazadas</option></select><select id="song-sort" class="select" style="max-width:180px"><option value="recent">Más recientes</option><option value="name">Canción A–Z</option></select></div><div class="song-list" id="song-list">${songRows(db.songs)}</div>`, "Canciones");
}

function songRows(list) { return list.map(s=>`<div class="list-row"><div><strong>${escapeHtml(s.title)}</strong><p>${escapeHtml(s.artist)} · ${escapeHtml(s.requester)}</p></div><div class="list-row-actions">${statusChip(s.status)}<button class="btn small secondary" data-song="${s.id}" data-status="approved">Aprobar</button><button class="btn small danger" data-song="${s.id}" data-status="rejected">Rechazar</button><button class="btn small ghost" data-delete-song="${s.id}" aria-label="Eliminar ${escapeHtml(s.title)}">Eliminar</button></div></div>`).join("") || '<div class="empty card">Sin resultados.</div>'; }

function invitationPage() {
  const e = db.event;
  const photo = typeof themePhoto === "function" ? themePhoto(weddingSelection(new URLSearchParams()).theme,e) : e.coverPhoto;
  const previewStyle = photo ? `background-image:linear-gradient(rgba(45,30,24,.3),rgba(45,30,24,.3)),url(${JSON.stringify(photo)});background-size:cover;background-position:center` : `background:linear-gradient(145deg,#cab19b,${e.primary})`;
  return shell(`${pageHead("Evento", "Mi invitación", "Edita la información y revisa cambios en vivo.", '<a class="btn secondary" href="#/public">Abrir invitación</a>')}
    <div class="tabs" role="tablist">${[["design","Diseño"],["data","Datos"],["itinerary","Itinerario"],["family","Familia"],["details","Detalles"],["gifts","Regalos"],["music","Música"],["photos","Fotos"]].map(([id,label])=>`<button class="tab ${editorTab===id?'active':''}" data-editor-tab="${id}">${label}</button>`).join("")}</div>
    <div class="editor-layout"><section class="card editor-form">${editorPanel(e)}</section><div class="phone"><div class="invite-preview"><div class="invite-hero" id="preview-hero" style="${escapeHtml(previewStyle)}"><div><span>NUESTRA BODA</span><h2 id="preview-names">${escapeHtml(e.bride)} &<br>${escapeHtml(e.groom)}</h2><p id="preview-date">${formatDate(e.date)}</p></div></div><div class="invite-body"><p id="preview-phrase">${escapeHtml(e.phrase)}</p><div class="line"></div><h3 id="preview-venue">${escapeHtml(e.venue)}</h3><p id="preview-address">${escapeHtml(e.address)}</p><p><strong id="preview-time">${escapeHtml(e.ceremonyTime)}</strong> · Ceremonia</p><span class="chip" id="preview-dress">${escapeHtml(e.dressCode)}</span></div></div></div></div>`, "Mi invitación");
}

function editorPanel(e) {
  if (editorTab === "design" && typeof clientDesignPanel === "function") return clientDesignPanel();
  if (editorTab === "data") return `<form id="event-form" class="editor-form"><h2>Datos del evento</h2><div class="form-grid"><div class="field"><label>Nombre 1</label><input class="input" name="bride" value="${escapeHtml(e.bride)}" required></div><div class="field"><label>Nombre 2</label><input class="input" name="groom" value="${escapeHtml(e.groom)}" required></div><div class="field"><label>Fecha</label><input class="input" name="date" type="date" value="${e.date}" required></div><div class="field"><label>Fecha límite RSVP</label><input class="input" name="deadline" type="date" value="${e.deadline}"></div><div class="field"><label>Hora ceremonia</label><input class="input" name="ceremonyTime" type="time" value="${e.ceremonyTime}"></div><div class="field"><label>Hora recepción</label><input class="input" name="receptionTime" type="time" value="${e.receptionTime}"></div><div class="field"><label>Lugar</label><input class="input" name="venue" value="${escapeHtml(e.venue)}"></div><div class="field"><label>Dirección</label><input class="input" name="address" value="${escapeHtml(e.address)}"></div><div class="field wide"><label>Frase</label><textarea class="textarea" name="phrase">${escapeHtml(e.phrase)}</textarea></div><div class="field"><label>Vestimenta</label><input class="input" name="dressCode" value="${escapeHtml(e.dressCode)}"></div><div class="field"><label>Color principal</label><input class="input" name="primary" type="color" value="${e.primary}"></div></div><button class="btn" type="submit">Guardar cambios</button></form>`;
  if (editorTab === "itinerary") return `<h2>Itinerario</h2><p>Hasta 10 momentos, en orden.</p><form id="itinerary-form" class="itinerary-list">${db.itinerary.map(item=>`<div class="itinerary-item"><input class="input" type="time" name="time-${item.id}" value="${item.time}"><input class="input" name="icon-${item.id}" value="${escapeHtml(item.icon)}" maxlength="3"><input class="input" name="title-${item.id}" value="${escapeHtml(item.title)}" placeholder="Momento"><button class="btn danger small" type="button" data-delete-moment="${item.id}">×</button><textarea class="textarea" style="grid-column:1/-1;min-height:55px" name="description-${item.id}" placeholder="Descripción">${escapeHtml(item.description||"")}</textarea></div>`).join("")}<div class="actions"><button class="btn secondary" type="button" data-action="add-moment" ${db.itinerary.length>=10?'disabled':''}>Agregar momento</button><button class="btn">Guardar itinerario</button></div></form>`;
  if (editorTab === "family") return `<form id="family-form" class="editor-form"><h2>Familia y padrinos</h2><div class="field"><label>Padres de ${escapeHtml(e.bride)}</label><textarea class="textarea" name="parentsBride">${escapeHtml(e.parentsBride)}</textarea></div><div class="field"><label>Padres de ${escapeHtml(e.groom)}</label><textarea class="textarea" name="parentsGroom">${escapeHtml(e.parentsGroom)}</textarea></div><div class="field"><label>Padrinos</label><textarea class="textarea" name="godparents">${escapeHtml(e.godparents)}</textarea></div><button class="btn">Guardar familia</button></form>`;
  if (editorTab === "details") return `<form id="details-form" class="editor-form"><h2>Detalles</h2><div class="field"><label>Código de vestimenta</label><input class="input" name="dressCode" value="${escapeHtml(e.dressCode)}"></div><div class="field"><label>Colores a evitar</label><input class="input" name="avoidColors" value="${escapeHtml(e.avoidColors)}"></div><label class="list-row"><span><strong>Solo adultos</strong><p>Mostrar aviso en invitación.</p></span><input type="checkbox" name="adultsOnly" ${e.adultsOnly?'checked':''}></label><div class="field"><label>Título de agradecimiento</label><input class="input" name="thanksTitle" value="${escapeHtml(e.thanksTitle)}"></div><div class="field"><label>Mensaje final</label><textarea class="textarea" name="thanksMessage">${escapeHtml(e.thanksMessage)}</textarea></div><button class="btn">Guardar detalles</button></form>`;
  if (editorTab === "gifts") return `<h2>Mesa de regalos</h2><p>${escapeHtml(e.giftMethod)}</p><div class="settings-list">${db.gifts.map(g=>`<div class="setting-row"><div><strong>${escapeHtml(g.title)}</strong><p>${escapeHtml(g.type)} · ${escapeHtml(g.detail)}</p></div><button class="btn danger small" data-delete-gift="${g.id}">Eliminar</button></div>`).join("")}</div><div class="split-line"></div><form id="gift-form" class="form-grid"><div class="field"><label>Tipo</label><select class="select" name="type"><option>Billetera digital</option><option>Transferencia</option><option>Lista externa</option><option>Regalo físico</option></select></div><div class="field"><label>Título</label><input class="input" name="title" required></div><div class="field wide"><label>Descripción / datos</label><textarea class="textarea" name="detail"></textarea></div><button class="btn">Agregar opción</button></form>`;
  if (editorTab === "music") return `<form id="music-form" class="editor-form"><h2>Música de invitación</h2><div class="field"><label>Nombre de canción</label><input class="input" name="backgroundMusic" value="${escapeHtml(e.backgroundMusic)}"></div><label class="upload-zone" for="music-upload"><div><strong>${e.musicData?'Cambiar audio':'Subir audio'}</strong><p>MP3, WAV, OGG o M4A · máximo 2 MB en demo</p></div><input id="music-upload" type="file" accept="audio/*" hidden></label>${e.musicData?`<audio controls src="${e.musicData}" style="width:100%"></audio>`:''}<button class="btn">Guardar nombre</button></form>`;
  return `<h2>Fotos de invitación</h2><p>Portada principal de la invitación.</p><label class="upload-zone" for="cover-upload"><div><strong>${e.coverPhoto?'Cambiar portada':'Subir portada'}</strong><p>JPG, PNG o WebP · máximo 2 MB</p></div><input id="cover-upload" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>${e.coverPhoto?'<button class="btn danger" data-action="remove-cover">Quitar portada</button>':''}`;
}

function galleryPage() {
  return shell(`${pageHead("Recuerdos", "Galería interactiva", "Invitados pueden compartir fotos del evento.", '<button class="btn secondary" data-action="gallery-qr">Código QR</button><button class="btn secondary" data-action="copy-gallery-link">Copiar enlace</button>')}
    <label class="list-row" style="margin-bottom:18px"><span><strong>Habilitar galería</strong><p>Permite cargas desde invitación pública.</p></span><input id="gallery-enabled" type="checkbox" ${db.galleryEnabled?'checked':''}></label>
    <label class="upload-zone" for="gallery-upload"><div><div style="font-size:30px">＋</div><strong>Subir fotos</strong><p>JPG, PNG o WebP · máximo 2 MB por archivo</p></div><input id="gallery-upload" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden></label>
    <div class="card" style="margin:18px 0"><div style="display:flex;justify-content:space-between;gap:16px;align-items:center"><div><strong>${db.gallery.length} ${db.gallery.length===1?'foto compartida':'fotos compartidas'}</strong><p style="margin:2px 0 0;color:var(--muted)">Demo local · referencia 250; espacio real depende del navegador</p></div><span class="chip">${Math.round(db.gallery.length/250*100)}% de referencia</span></div></div>
    <div class="toolbar gallery-bulk-actions"><label class="list-row photo-select-all"><span><strong>Seleccionar todo</strong></span><input type="checkbox" id="photo-select-all" ${db.gallery.length&&selectedPhotoIds.size===db.gallery.length?'checked':''}></label><span id="photo-selection-count" class="note">${selectedPhotoIds.size} seleccionadas</span><button class="btn small secondary" data-action="download-selected-photos" ${selectedPhotoIds.size?'':'disabled'}>Descargar ZIP</button><button class="btn small danger" data-action="delete-selected-photos" ${selectedPhotoIds.size?'':'disabled'}>Eliminar selección</button></div>
    <section class="gallery-grid">${db.gallery.map(p=>`<figure class="photo ${selectedPhotoIds.has(p.id)?'selected':''}"><img src="${p.src}" alt="Foto compartida por ${escapeHtml(p.by)}"><label class="photo-check"><input type="checkbox" data-select-photo="${p.id}" ${selectedPhotoIds.has(p.id)?'checked':''} aria-label="Seleccionar foto"></label><button class="btn danger small" data-delete-photo="${p.id}">Eliminar</button></figure>`).join("") || '<div class="empty card">Aún no hay fotos.</div>'}</section>`, "Galería");
}

function settingsPage() {
  const size = new Blob([JSON.stringify(db)]).size;
  return shell(`${pageHead("Sistema", "Configuración", "Respaldo y portabilidad de datos.")}
    <section class="card settings-list"><div class="setting-row"><div><strong>Exportar respaldo</strong><p>Descarga evento, invitados, mesas, canciones y ajustes.</p></div><button class="btn secondary" data-action="export-backup">Descargar JSON</button></div><div class="setting-row"><div><strong>Importar respaldo</strong><p>Restaura un archivo generado por Nupcial.</p></div><label class="btn secondary" for="backup-import">Seleccionar JSON<input id="backup-import" type="file" accept="application/json,.json" hidden></label></div><div class="setting-row"><div><strong>${apiMode?'Estado del servidor':'Uso local'}</strong><p>${apiMode?`${Math.round(size/1024)} KB en la copia del navegador; el servidor es la fuente compartida.`:`${Math.round(size/1024)} KB almacenados en este navegador.`}</p></div><span class="chip">${apiMode?'API · '+(paymentMode==='mock'?'pago simulado':'billing externo'):'localStorage'}</span></div><div class="setting-row"><div><strong>Reiniciar demo</strong><p>Elimina cambios locales y recupera datos iniciales.</p></div><button class="btn danger" data-action="reset-demo">Restablecer</button></div></section>`, "Configuración");
}

function publicPage() {
  const e = db.event;
  const guest = db.guests.find(g => g.code === hashParams().get("guest"));
  return `<main class="public-page"><nav class="public-nav"><strong>Nupcial</strong><a class="btn small" href="#/login">Panel</a></nav>
    <section class="public-hero" style="${e.coverPhoto?`background-image:linear-gradient(rgba(36,24,20,.58),rgba(92,55,39,.5)),url('${e.coverPhoto}');background-size:cover;background-position:center`:`background:radial-gradient(circle at 75% 20%,rgba(255,255,255,.2),transparent 22%),linear-gradient(145deg,#342a25,${e.primary} 58%,#c49b79)`}"><div><div class="eyebrow" style="color:white">Nos casamos</div><h1>${escapeHtml(e.bride)}<br><i>&</i> ${escapeHtml(e.groom)}</h1><p>${formatDate(e.date)} · ${escapeHtml(e.venue)}</p>${guest?`<p>Invitación para <strong>${escapeHtml(guest.name)}</strong> · ${guest.passes} pases</p>`:''}<button class="btn" data-action="scroll-rsvp" style="background:white;color:#342a25">Confirmar asistencia</button></div></section>
    <section class="public-section"><div class="eyebrow">Nuestra historia continúa</div><h2>${escapeHtml(e.phrase)}</h2><div class="public-details"><article><div>◷</div><h3>Ceremonia</h3><p>${e.ceremonyTime}<br>${escapeHtml(e.venue)}</p></article><article><div>⌖</div><h3>Ubicación</h3><p>${escapeHtml(e.address)}</p></article><article><div>✦</div><h3>Vestimenta</h3><p>${escapeHtml(e.dressCode)}</p></article></div></section>
    <section class="public-section"><div class="eyebrow">Programa</div><h2>Itinerario</h2><div class="public-details">${db.itinerary.map(x=>`<article><div style="font-size:28px">${escapeHtml(x.icon)}</div><h3>${escapeHtml(x.time)} · ${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description||"")}</p></article>`).join("")}</div></section>
    <section class="public-section"><div class="eyebrow">Con nuestra familia</div><h2>Con la bendición de quienes amamos</h2><div class="public-details"><article><h3>Familia de ${escapeHtml(e.bride)}</h3><p>${escapeHtml(e.parentsBride)}</p></article><article><h3>Familia de ${escapeHtml(e.groom)}</h3><p>${escapeHtml(e.parentsGroom)}</p></article><article><h3>Padrinos</h3><p>${escapeHtml(e.godparents)}</p></article></div>${e.adultsOnly?'<p class="note" style="margin-top:20px">Celebración solo para adultos.</p>':''}</section>
    <section class="public-section" id="rsvp-public"><div class="eyebrow">RSVP</div><h2>¿Nos acompañas?</h2><p>Confirma hasta el ${formatDate(e.deadline)}.</p><form id="public-rsvp" class="rsvp-box form-grid"><input type="hidden" name="guestId" value="${guest?.id || ""}"><div class="field wide"><label>Nombre completo</label><input class="input" name="name" value="${escapeHtml(guest?.name||"")}" required></div><div class="field"><label>Respuesta</label><select class="select" name="status"><option value="confirmed" ${guest?.status!=='declined'?'selected':''}>Sí, asistiré</option><option value="declined" ${guest?.status==='declined'?'selected':''}>No podré asistir</option></select></div><div class="field"><label>Tipo de evento</label><select class="select" name="attendanceType"><option value="full" ${guest?.attendanceType!=='ceremony'?'selected':''}>Evento completo</option><option value="ceremony" ${guest?.attendanceType==='ceremony'?'selected':''}>Solo ceremonia</option></select></div><div class="field"><label>Número de personas</label><input class="input" name="passes" type="number" min="1" max="${guest?.passes || 10}" value="${guest?.passes || 1}"></div><div class="field wide"><label>Nombres · uno por línea</label><textarea class="textarea" name="members">${escapeHtml((guest?.members||[]).join("\n"))}</textarea></div><div class="field wide"><label>Mensaje para los novios</label><textarea class="textarea" name="message">${escapeHtml(guest?.message||"")}</textarea></div><button class="btn wide" type="submit">Enviar confirmación</button></form></section>
    <section class="public-section"><div class="eyebrow">Mesa de regalos</div><h2>Tu presencia es nuestro mejor regalo</h2><p>${escapeHtml(e.giftMethod)}</p><div class="public-details">${db.gifts.map(g=>`<article><h3>${escapeHtml(g.title)}</h3><p>${escapeHtml(g.detail)}</p></article>`).join("")}</div></section>
    <section class="public-section"><div class="eyebrow">Música</div><h2>¿Qué canción no puede faltar?</h2><form id="public-song" class="rsvp-box form-grid"><div class="field"><label>Canción</label><input class="input" name="title" required></div><div class="field"><label>Artista</label><input class="input" name="artist" required></div><div class="field wide"><label>Tu nombre</label><input class="input" name="requester" value="${escapeHtml(guest?.name||"")}" required></div><button class="btn wide">Sugerir canción</button></form></section>
    ${db.galleryEnabled?`<section class="public-section"><div class="eyebrow">Recuerdos</div><h2>Comparte tus fotos</h2><label class="upload-zone" for="public-gallery-upload"><div><strong>Subir fotos</strong><p>JPG, PNG o WebP · máximo 2 MB</p></div><input id="public-gallery-upload" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden></label><div class="gallery-grid" style="margin-top:20px">${db.gallery.slice(0,6).map(p=>`<figure class="photo"><img src="${p.src}" alt="Foto compartida"></figure>`).join("")}</div></section>`:''}
    <section class="public-section"><h2>${escapeHtml(e.thanksTitle)}</h2><p>${escapeHtml(e.thanksMessage)}</p></section><footer class="footer">Hecho con cariño en Nupcial</footer></main>`;
}

function render() {
  if (typeof weddingTimer !== "undefined") clearInterval(weddingTimer);
  const current = route();
  if (startupError) { document.querySelector('#app').innerHTML = `<main class="login-page"><section class="login-panel"><h1>Servicio no disponible</h1><p role="alert">${escapeHtml(startupError)}</p><button class="btn" onclick="location.reload()">Reintentar</button></section></main>`;return; }
  if (current === "start" && isAuthed() && !tenantMode) { go("dashboard"); return; }
  if (current === 'events' && isAuthed() && !tenantMode) { go('dashboard'); return; }
  const publicRoutes = ["home", "bodas", "plans", "playground", "start", "public", "login", "register", "verify", "forgot-password", "reset-password", "payment-result"];
  if (!publicRoutes.includes(current) && !isAuthed()) { go("login"); return; }
  if (tenantMode && isAuthed() && !['events','start'].includes(current) && !db.event.slug && current !== 'login') { go(tenantEvents.length ? 'events' : 'start'); return; }
  const pages = { login: loginPage, register: registerPage, verify: verifyPage, 'forgot-password': forgotPasswordPage, 'reset-password': resetPasswordPage, events: eventsPage, dashboard: dashboardPage, guests: guestsPage, rsvp: rsvpPage, tables: tablesPage, songs: songsPage, invitation: invitationPage, gallery: galleryPage, settings: settingsPage, checkout: checkoutPage, "payment-result": paymentResultPage, public: typeof weddingPage === "function" ? weddingPage : publicPage };
  if (typeof homePage === "function") pages.home = homePage;
  if (typeof bodasPage === "function") pages.bodas = bodasPage;
  if (typeof pricingPage === "function") pages.plans = pricingPage;
  if (typeof playgroundPage === "function") pages.playground = playgroundPage;
  if (typeof startPage === "function") pages.start = startPage;
  if (current === "public" && hashParams().has("guest") && !db.guests.some(g => g.code === hashParams().get("guest"))) {
    document.querySelector("#app").innerHTML = '<main class="public-section"><h1>Invitación no encontrada</h1><p>Revisa el enlace o solicita uno actualizado a los organizadores.</p><a class="btn" href="#/home">Ir al inicio</a></main>';
    return;
  }
  if (current === "public" && hashParams().get("section") === "gallery" && typeof weddingEnvelopeOpen !== "undefined") weddingEnvelopeOpen = true;
  document.querySelector("#app").innerHTML = (pages[current] || pages.home || loginPage)();
  bindPage(current);
  if (typeof bindMarketingPage === "function") bindMarketingPage(current);
  if (typeof bindExperiencePage === "function") bindExperiencePage(current);
  if (current === "public" && hashParams().get("section") === "gallery") requestAnimationFrame(() => document.querySelector("#public-gallery, .w-photos")?.scrollIntoView({ block: "start" }));
}

function bindPage(current) {
  if (current === "login") document.querySelector("#login-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const error = document.querySelector("#login-error");
    try {
      let login = null;
      if (apiMode) login = await apiRequest("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      else if (data.get("email") !== "demo@boda.local" || data.get("password") !== "demo123") throw new Error("Credenciales de demo incorrectas.");
      remotePublic = false;
      if (apiMode) {
        const pendingSetup = sessionStorage.getItem("nupcial-pending-setup");
        tenantMode = !login.legacy;
        currentAccountEmail = login.email || '';
        sessionStorage.setItem(AUTH_KEY, "1");
        if (tenantMode) {
          if (pendingSetup) await createTenantWorkspace(newCustomerState(JSON.parse(pendingSetup)));
          else {
            await restoreTenantWorkspace();
            if (route() === 'login') go(hashParams().get('next') === 'plans' ? 'plans' : 'dashboard');
          }
          return;
        }
        const result = await apiRequest("/api/state");
        serverStateVersion = result.version || 0;remoteConflict=false;
        if (pendingSetup && result.state) {
          db=normalizeDB(result.state);sessionStorage.removeItem('nupcial-pending-setup');savedDBSnapshot=JSON.stringify(db);localStorage.setItem(DB_KEY,savedDBSnapshot);go('dashboard');toast('La instalación demo conserva su evento actual. Para separar clientes, crea una cuenta.');return;
        }
        if (result.state) db = normalizeDB(result.state);
        if (pendingSetup) {
          const event = JSON.parse(pendingSetup);
          db = newCustomerState(event);
          const saved = await apiRequest("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: db, version: serverStateVersion }) });
          serverStateVersion = saved.version;
          sessionStorage.removeItem("nupcial-pending-setup");
          localStorage.setItem(DB_KEY, JSON.stringify(db));
        } else if (!result.state) {
          const saved = await apiRequest("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: db, version: serverStateVersion }) });
          serverStateVersion = saved.version;
        }
        savedDBSnapshot = JSON.stringify(db);
        localStorage.setItem(DB_KEY, savedDBSnapshot);
      }
      sessionStorage.setItem(AUTH_KEY, "1");
      go(hashParams().get("next") === "plans" ? "plans" : "dashboard");
    } catch (failure) {
      sessionStorage.removeItem(AUTH_KEY);
      tenantMode=false;
      if (apiMode) { try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch { /* Preserve the original login error. */ } }
      if(error)error.textContent = failure.message || "No se pudo iniciar sesión.";
    }
  });
  document.querySelector('#register-form')?.addEventListener('submit', async e=>{
    e.preventDefault();const data=new FormData(e.currentTarget),status=document.querySelector('#register-status');
    if(!apiMode){status.textContent='Activa el servidor con npm start para crear cuentas.';return;}
    if(data.get('password')!==data.get('confirm')){status.textContent='Las contraseñas no coinciden.';return;}
    try{const result=await apiRequest('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),password:data.get('password')})});status.innerHTML=`${escapeHtml(result.message)} ${result.verificationUrl?`<a href="${escapeHtml(result.verificationUrl)}">Confirmar correo (enlace local)</a>`:''}`;}
    catch(error){status.textContent=error.message;}
  });
  if(current==='verify'){
    const status=document.querySelector('#verify-status'),token=hashParams().get('token')||'';
    if(!apiMode){status.textContent='Activa el servidor para validar este enlace.';}
    else apiRequest('/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}).then(result=>{status.textContent=`Correo confirmado para ${result.email}. Ya puedes iniciar sesión.`;}).catch(error=>{status.textContent=error.message;});
  }
  document.querySelector('#forgot-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const status=document.querySelector('#forgot-status');
    try{const result=await apiRequest('/api/auth/password-reset/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:new FormData(e.currentTarget).get('email')})});status.innerHTML=`${escapeHtml(result.message)} ${result.resetUrl?`<a href="${escapeHtml(result.resetUrl)}">Restablecer (enlace local)</a>`:''}`;}
    catch(error){status.textContent=error.message;}
  });
  document.querySelector('#reset-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const data=new FormData(e.currentTarget),status=document.querySelector('#reset-status');
    if(data.get('password')!==data.get('confirm')){status.textContent='Las contraseñas no coinciden.';return;}
    try{await apiRequest('/api/auth/password-reset/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:hashParams().get('token'),password:data.get('password')})});status.textContent='Contraseña actualizada. Inicia sesión con tu nueva clave.';}
    catch(error){status.textContent=error.message;}
  });
  document.querySelectorAll?.('[data-event-select]')?.forEach(button=>button.addEventListener('click',async()=>{
    try{const result=await apiRequest(`/api/events/${button.dataset.eventSelect}/select`,{method:'POST'});db=normalizeDB(result.state);db.event.slug=result.slug;db.event.id=result.eventId;db.event.status=result.eventStatus;serverStateVersion=result.version;remoteConflict=false;savedDBSnapshot=JSON.stringify(db);tenantEvents=(await apiRequest('/api/events')).events||[];go('dashboard');}
    catch(error){toast(error.message);}
  }));
  if (current === "checkout") refreshCheckoutPage();
  if (current === "payment-result") refreshPaymentResult();

  document.querySelector("#guest-modal-form")?.addEventListener("submit", e => {
    e.preventDefault(); const d=Object.fromEntries(new FormData(e.currentTarget)); const id=Number(d.id); const existing=db.guests.find(g=>g.id===id);
    try {
      const passes=Core.integerCount(d.passes,{label:"Pases"});
      const members=memberNames(d.members,passes);
      const next=Core.normalizeGuestRecord({id:id||nextRecordId(),createdAt:existing?.createdAt||Date.now(),name:d.name.trim(),phone:d.phone.trim(),passes,type:d.type,category:d.category.trim(),side:d.side,members:members.length?members:[d.name.trim()],notes:d.notes.trim(),status:existing?.status||"pending",confirmedCount:existing?Math.min(Core.attendanceCount(existing),passes):0,table:existing?.table||null,message:existing?.message||"",sentCount:existing?.sentCount||0,attendanceType:existing?.attendanceType||"full",responseAt:existing?.responseAt||null,code:existing?.code||newInvitationCode()});
      ensureTableCapacity(next);
      if(existing) Object.assign(existing,next); else db.guests.unshift(next);
      if(saveDB(existing?"Invitado actualizado":"Invitado creado")) { modal=null; render(); }
    } catch(error) { toast(error.message); }
  });
  document.querySelector("#manual-rsvp-form")?.addEventListener("submit", e => {
    e.preventDefault(); const d=Object.fromEntries(new FormData(e.currentTarget)); const g=db.guests.find(x=>x.id===Number(d.id)); if(!g)return;
    try {
      if(!["confirmed","declined","pending"].includes(d.status)) throw new Error("Respuesta no válida.");
      const count=d.status==="confirmed"?Core.integerCount(d.confirmedCount,{max:g.passes,label:"Asistentes"}):0;
      const next={...g,status:d.status,confirmedCount:count,members:memberNames(d.members,d.status==="confirmed"?count:g.passes),message:d.message.trim(),table:d.status==="confirmed"?g.table:null,attendanceType:d.attendanceType==="ceremony"?"ceremony":"full",responseAt:d.status==="pending"?null:new Date().toISOString()};
      ensureTableCapacity(next);Object.assign(g,next);
      if(saveDB("Confirmación registrada")){modal=null;render();}
    } catch(error) {toast(error.message);}
  });
  document.querySelector("#guest-import")?.addEventListener("change", async e => {
    const file=e.target.files[0];if(!file)return;pendingImport=[];
    try {if(file.size>2*1024*1024)throw new Error("El archivo supera 2 MB.");const name=file.name.toLowerCase();if(name.endsWith(".xls"))throw new Error("Formato .xls antiguo no soportado. Guarda como .xlsx o CSV.");if(name.endsWith(".xlsx"))pendingImport=parseGuestCSV(await parseXlsxGuestCSV(file));else if(name.endsWith(".csv"))pendingImport=parseGuestCSV(await file.text());else throw new Error("Usa un archivo CSV o Excel .xlsx.");render();}
    catch(error){render();toast(error.message);}
  });

  if (current === "guests") {
    renderGuestTable();
    ["#guest-search","#guest-filter","#guest-category-filter","#guest-side-filter"].forEach(s=>document.querySelector(s)?.addEventListener(s==="#guest-search"?"input":"change",()=>{guestPage=1;renderGuestTable();}));
    document.querySelector("#guest-sort")?.addEventListener("change",e=>{guestSort=e.target.value;guestPage=1;renderGuestTable();});
    document.querySelector("#guest-page-size")?.addEventListener("change",e=>{guestPageSize=Number(e.target.value);guestPage=1;renderGuestTable();});
    document.querySelector("#guest-select-page")?.addEventListener("change",e=>{document.querySelectorAll("[data-select-guest]").forEach(input=>{const id=Number(input.dataset.selectGuest);if(e.target.checked)selectedGuestIds.add(id);else selectedGuestIds.delete(id);});renderGuestTable();});
  }
  if (current === "rsvp") {
    const filterResponses=()=>{
      const q=(document.querySelector("#rsvp-search")?.value||"").toLocaleLowerCase("es");const type=document.querySelector("#rsvp-type-filter")?.value||"all";const status=document.querySelector("#rsvp-status-filter")?.value||"all";
      const filtered=db.guests.filter(g=>(g.name.toLocaleLowerCase("es").includes(q)||(g.message||"").toLocaleLowerCase("es").includes(q))&&(type==="all"||(g.attendanceType||"full")===type)&&(status==="all"||g.status===status));
      filtered.sort(rsvpSort==="name"?(a,b)=>a.name.localeCompare(b.name,"es"):(a,b)=>(Date.parse(b.responseAt)||0)-(Date.parse(a.responseAt)||0));
      for(const [state,id] of [["confirmed","#rsvp-confirmed-list"],["declined","#rsvp-declined-list"],["pending","#rsvp-pending-list"]]){const section=document.querySelector(id);if(!section)continue;const list=filtered.filter(g=>g.status===state);section.innerHTML=list.map(rsvpRow).join("")||`<div class="empty card">${state==="confirmed"?"Aún sin confirmaciones.":state==="declined"?"Sin respuestas negativas.":"No hay respuestas pendientes."}</div>`;}
    };
    document.querySelector("#rsvp-search")?.addEventListener("input",filterResponses);document.querySelector("#rsvp-type-filter")?.addEventListener("change",filterResponses);document.querySelector("#rsvp-status-filter")?.addEventListener("change",filterResponses);document.querySelector("#rsvp-sort")?.addEventListener("change",e=>{rsvpSort=e.target.value;filterResponses();});
  }
  if (current === "tables") document.querySelector("#table-form")?.addEventListener("submit", e => {
    e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));
    try {if(!d.name.trim())throw new Error("Escribe el nombre de la mesa.");const seats=Core.integerCount(d.seats,{min:1,max:20,label:"Capacidad"});const position=Core.floorPosition({},db.tables.length,db.tables.length+1);const table={id:nextRecordId(),name:d.name.trim(),seats,shape:d.shape==="rect"?"rect":"round",...position};db.tables.push(table);floorView="plan";floorSelectedTables=new Set([table.id]);if(saveDB("Mesa creada"))render();}catch(error){toast(error.message);}
  });
  if (current === "tables") document.querySelector("#floor-edit-form")?.addEventListener("submit", e => {
    e.preventDefault();const form=e.currentTarget;const d=Object.fromEntries(new FormData(form));const table=db.tables.find(item=>item.id===Number(form.dataset.tableId));if(!table)return;
    try {if(!d.name.trim())throw new Error("Escribe el nombre de la mesa.");const seats=Core.integerCount(d.seats,{min:1,max:20,label:"Capacidad"});const used=floorTableUsage(table.id);if(seats<used)throw new Error(`La mesa ya tiene ${used} personas asignadas. Aumenta su capacidad o reasigna invitados antes de reducirla.`);Object.assign(table,{name:d.name.trim(),seats,shape:d.shape==="rect"?"rect":"round"});if(saveDB("Mesa actualizada"))render();}catch(error){toast(error.message);}
  });
  if(current==="tables"){
    document.querySelector("#floor-guest-search")?.addEventListener("input",e=>{floorSearch=e.target.value;refreshFloorGuestList();refreshFloorSearchViews();});
    document.querySelector("#floor-unassigned-only")?.addEventListener("change",e=>{floorUnassignedOnly=e.target.checked;refreshFloorGuestList();refreshFloorSearchViews();});
  }
  if (current === "songs") {
    document.querySelector("#song-form")?.addEventListener("submit", e => { e.preventDefault(); const d=Object.fromEntries(new FormData(e.currentTarget)); db.songs.unshift({id:nextRecordId(),createdAt:Date.now(),title:d.title.trim(),artist:d.artist.trim(),requester:d.requester.trim(),status:"pending"}); saveDB("Canción agregada"); render(); });
    const filterSongs=()=>{const q=document.querySelector("#song-search").value.toLocaleLowerCase("es");const status=document.querySelector("#song-filter").value;const sort=document.querySelector("#song-sort")?.value||"recent";const list=db.songs.filter(s=>(s.title.toLocaleLowerCase("es").includes(q)||s.artist.toLocaleLowerCase("es").includes(q)||s.requester.toLocaleLowerCase("es").includes(q))&&(status==='all'||s.status===status));if(sort==="name")list.sort((a,b)=>a.title.localeCompare(b.title,"es"));document.querySelector("#song-list").innerHTML=songRows(list);};
    document.querySelector("#song-search")?.addEventListener("input",filterSongs); document.querySelector("#song-filter")?.addEventListener("change",filterSongs);document.querySelector("#song-sort")?.addEventListener("change",filterSongs);
  }
  if (current === "invitation") {
    const form=document.querySelector("#event-form"); const updatePreview=()=>{const d=Object.fromEntries(new FormData(form)); document.querySelector("#preview-names").innerHTML=`${escapeHtml(d.bride)} &<br>${escapeHtml(d.groom)}`; if(d.date)document.querySelector("#preview-date").textContent=formatDate(d.date); document.querySelector("#preview-phrase").textContent=d.phrase; document.querySelector("#preview-venue").textContent=d.venue; document.querySelector("#preview-address").textContent=d.address; document.querySelector("#preview-time").textContent=d.ceremonyTime; document.querySelector("#preview-dress").textContent=d.dressCode; document.querySelector("#preview-hero").style.background=`linear-gradient(145deg,#cab19b,${d.primary})`;}; form?.addEventListener("input",updatePreview); form?.addEventListener("submit",e=>{e.preventDefault();db.event={...db.event,...Object.fromEntries(new FormData(form))};saveDB("Invitación actualizada");render();});
    document.querySelector("#itinerary-form")?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));db.itinerary=db.itinerary.map(x=>({...x,time:d[`time-${x.id}`],icon:d[`icon-${x.id}`],title:d[`title-${x.id}`],description:d[`description-${x.id}`]}));saveDB("Itinerario actualizado");render();});
    document.querySelector("#family-form")?.addEventListener("submit",e=>{e.preventDefault();db.event={...db.event,...Object.fromEntries(new FormData(e.currentTarget))};saveDB("Familia actualizada");render();});
    document.querySelector("#details-form")?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));d.adultsOnly=e.currentTarget.elements.adultsOnly.checked;db.event={...db.event,...d};saveDB("Detalles actualizados");render();});
    document.querySelector("#gift-form")?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));db.gifts.push({id:Date.now(),...d});saveDB("Opción de regalo agregada");render();});
    document.querySelector("#music-form")?.addEventListener("submit",e=>{e.preventDefault();db.event.backgroundMusic=new FormData(e.currentTarget).get("backgroundMusic");saveDB("Música actualizada");render();});
    document.querySelector("#music-upload")?.addEventListener("change",e=>readSingleFile(e.target.files[0],data=>{db.event.musicData=data;saveDB("Audio cargado");render();}));
    document.querySelector("#cover-upload")?.addEventListener("change",e=>readSingleFile(e.target.files[0],data=>{db.event.coverPhoto=data;saveDB("Portada cargada");render();}));
  }
  if (current === "gallery") {
    selectedPhotoIds=new Set([...selectedPhotoIds].filter(id=>db.gallery.some(photo=>photo.id===id)));
    document.querySelector("#gallery-upload")?.addEventListener("change", e => addGalleryFiles(e.target.files,"Cuenta demo"));
    document.querySelector("#gallery-enabled")?.addEventListener("change",e=>{db.galleryEnabled=e.target.checked;saveDB("Galería actualizada");});
    document.querySelector("#photo-select-all")?.addEventListener("change",e=>{selectedPhotoIds=e.target.checked?new Set(db.gallery.map(photo=>photo.id)):new Set();render();});
    const selectAllPhotos=document.querySelector("#photo-select-all");if(selectAllPhotos)selectAllPhotos.indeterminate=selectedPhotoIds.size>0&&selectedPhotoIds.size<db.gallery.length;
    document.querySelectorAll("[data-select-photo]").forEach(input=>input.addEventListener("change",()=>{const id=Number(input.dataset.selectPhoto);if(input.checked)selectedPhotoIds.add(id);else selectedPhotoIds.delete(id);const count=document.querySelector("#photo-selection-count");if(count)count.textContent=`${selectedPhotoIds.size} seleccionadas`;const all=document.querySelector("#photo-select-all");if(all)all.checked=db.gallery.length>0&&selectedPhotoIds.size===db.gallery.length;for(const button of document.querySelectorAll("[data-action='download-selected-photos'],[data-action='delete-selected-photos']"))button.disabled=selectedPhotoIds.size===0;input.closest(".photo")?.classList.toggle("selected",input.checked);}));
  }
  if (current === "settings") document.querySelector("#backup-import")?.addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>20*1024*1024)throw new Error("El respaldo supera 20 MB.");
      const candidate=normalizeDB(Core.validateBackup(JSON.parse(await file.text())));
      if(!confirm("¿Restaurar este respaldo? Reemplazará los datos actuales del evento."))return;
      db=candidate;if(saveDB("Respaldo restaurado"))render();
    }catch(error){toast(error instanceof SyntaxError?"Archivo JSON inválido.":error.message);}
  });
  if (current === "public") {
    document.querySelector("#public-rsvp")?.addEventListener("submit",async e=>{
      e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));
      try {
        if(Core.isDeadlinePassed(db.event.deadline))throw new Error("El plazo para confirmar ha terminado. Contacta a los organizadores.");
        if(remotePublic){
          const result=await apiRequest('/api/public/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,event:db.event.slug||publicEventSlug(),code:hashParams().get('guest')||''})});
          db.guests=[result.guest];
          if(!hashParams().get('guest')){const params=hashParams();params.set('guest',result.guest.code);history.replaceState(null,'',`${location.pathname}${location.search}#/public?${params}`);}
          e.currentTarget.innerHTML='<div class="wide" style="text-align:center;padding:30px"><h3>¡Respuesta recibida!</h3><p>Gracias por responder. Puedes actualizar tu respuesta desde este enlace.</p><button class="btn secondary" type="button" data-action="edit-response">Editar respuesta</button></div>';
          return;
        }
        const code=hashParams().get("guest");let g=code?db.guests.find(x=>x.code===code):null;
        if(code&&!g)throw new Error("Invitación no encontrada. Solicita un enlace actualizado.");
        if(!["confirmed","declined"].includes(d.status))throw new Error("Selecciona una respuesta válida.");
        if(!d.name.trim())throw new Error("Escribe tu nombre.");
        const count=d.status==="confirmed"?Core.integerCount(d.passes,{max:g?.passes||10,label:"Asistentes"}):0;
        const members=memberNames(d.members,d.status==="confirmed"?count:g?.passes||10);
        if(!g){g={id:nextRecordId(),createdAt:Date.now(),code:newInvitationCode(),name:d.name.trim(),phone:"",passes:Math.max(count,1),status:"pending",side:"Invitación web",category:"Web",type:"individual",table:null,notes:"",sentCount:0};}
        const next={...g,status:d.status,confirmedCount:count,members,message:d.message.trim(),attendanceType:d.attendanceType==="ceremony"?"ceremony":"full",responseAt:new Date().toISOString(),table:d.status==="confirmed"?g.table:null};
        // Public responses remain valid even when organizers must re-seat a larger group.
        try{ensureTableCapacity(next);}catch{next.table=null;}
        const existing=db.guests.find(x=>x.id===g.id);if(existing)Object.assign(existing,next);else db.guests.unshift(next);
        if(!saveDB("Confirmación recibida"))return;
        if(!code){const params=hashParams();params.set("guest",g.code);history.replaceState(null,"",`${location.pathname}${location.search}#/public?${params}`);}
        e.currentTarget.innerHTML='<div class="wide" style="text-align:center;padding:30px"><h3>¡Respuesta recibida!</h3><p>Gracias por responder. Puedes actualizar tu respuesta desde este enlace.</p><button class="btn secondary" type="button" data-action="edit-response">Editar respuesta</button></div>';
      }catch(error){toast(error.message);}
    });
    document.querySelector("#public-song")?.addEventListener("submit",async e=>{
      e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));
      if(!d.title.trim()||!d.artist.trim()||!d.requester.trim()){toast("Completa canción, artista y nombre.");return;}
      if(remotePublic){
        try{await apiRequest('/api/public/songs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,event:db.event.slug||publicEventSlug()})});e.currentTarget.innerHTML='<div class="wide" style="text-align:center"><strong>¡Canción recibida!</strong></div>';}
        catch(error){toast(error.message);}
        return;
      }
      const repeated=db.songs.some(s=>s.title.toLowerCase()===d.title.trim().toLowerCase()&&s.artist.toLowerCase()===d.artist.trim().toLowerCase()&&s.requester.toLowerCase()===d.requester.trim().toLowerCase());
      if(repeated){toast("Esta sugerencia ya está registrada.");return;}
      db.songs.unshift({id:nextRecordId(),createdAt:Date.now(),title:d.title.trim(),artist:d.artist.trim(),requester:d.requester.trim(),status:"pending"});
      if(saveDB("Canción sugerida"))e.currentTarget.innerHTML='<div class="wide" style="text-align:center"><strong>¡Canción recibida!</strong></div>';
    });
    document.querySelector("#public-gallery-upload")?.addEventListener("change",e=>addGalleryFiles(e.target.files,"Invitado"));
  }
}

document.addEventListener("click", async e => {
  const el = e.target.closest("[data-action],[data-delete-guest],[data-song],[data-delete-photo],[data-delete-song],[data-edit-guest],[data-manual-rsvp],[data-copy-invite],[data-copy-link],[data-whatsapp],[data-delete-table],[data-editor-tab],[data-delete-moment],[data-delete-gift],[data-floor-action],[data-floor-view],[data-floor-select],[data-floor-seat],[data-select-floor-guest],[data-add-floor-object],[data-delete-floor-object],[data-unassign-guest],[data-plan-checkout],[data-demo-payment],[data-mock-method],[data-public-retry],[data-event-publish],[data-event-copy-link]"); if(!el) return;
  if(el.hasAttribute("data-public-retry")){publicLoadError="";await loadRemotePublic();render();return;}
  if(el.hasAttribute('data-event-copy-link')){await copyText(publicInviteUrl(),'Enlace de invitación copiado');return;}
  if(el.hasAttribute('data-event-publish')){
    try{const published=el.dataset.eventPublish==='true',result=await apiRequest(`/api/events/${db.event.id}/publish`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({published})});db.event.status=result.event.status;tenantEvents=(await apiRequest('/api/events')).events||[];render();toast(published?'Invitación publicada. Copia su enlace desde el panel.':'Invitación despublicada. El enlace dejó de abrirse.');}
    catch(error){toast(error.message);}return;
  }
  if(el.dataset.copyLink){const guest=db.guests.find(item=>item.id===Number(el.dataset.copyLink));if(guest)await copyText(personalizedInviteUrl(guest),"Enlace personalizado copiado");return;}
  if(el.dataset.planCheckout){await startPlanCheckout(el.dataset.planCheckout);return;}
  if(el.dataset.demoPayment){
    try { const id=el.dataset.paymentId;await apiRequest(`/api/payments/${encodeURIComponent(id)}/demo-result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: el.dataset.demoPayment }) });go(`payment-result?id=${encodeURIComponent(id)}`);await refreshPaymentResult(); }
    catch(error){toast(error.message);}
    return;
  }
  if(el.dataset.mockMethod){mockPaymentMethod=el.dataset.mockMethod;await refreshCheckoutPage();return;}
  if(el.dataset.floorView){floorView=el.dataset.floorView;floorCleanMode=false;render();return;}
  if(el.dataset.selectFloorGuest){const guest=db.guests.find(item=>item.id===Number(el.dataset.selectFloorGuest));if(!guest||guest.status!=="confirmed"){toast("Solo puedes sentar grupos confirmados.");return;}floorSelectedGuestId=floorSelectedGuestId===guest.id?null:guest.id;render();return;}
  if(el.dataset.floorSeat){const table=db.tables.find(item=>item.id===Number(el.dataset.floorSeat));const guest=db.guests.find(item=>item.id===floorSelectedGuestId);if(!table)return;if(!guest){toast("Primero elige un grupo confirmado en la lista.");return;}try{assignFloorGuest(guest.id,table.id);floorSelectedGuestId=null;if(saveDB(`${guest.name} asignado a ${table.name}`))render();}catch(error){toast(error.message);}return;}
  if(el.dataset.floorSelect){const id=Number(el.dataset.floorSelect);if(!db.tables.some(table=>table.id===id))return;if(el.dataset.floorOpenPlan){floorView="plan";floorCleanMode=false;}if(floorMultiSelect){if(floorSelectedTables.has(id))floorSelectedTables.delete(id);else floorSelectedTables.add(id);}else floorSelectedTables=new Set([id]);render();return;}
  if(el.dataset.unassignGuest){const guest=db.guests.find(item=>item.id===Number(el.dataset.unassignGuest));if(guest){guest.table=null;if(saveDB("Invitado liberado de la mesa"))render();}return;}
  if(el.dataset.action === "theme") { const root=document.querySelector(".app-shell"); const next=root.dataset.theme === "dark" ? "light" : "dark"; localStorage.setItem("nupcial-theme",next); root.dataset.theme=next; }
  if(el.dataset.action === "logout") { const hadTenant=tenantMode;try { if(apiMode) await apiRequest("/api/auth/logout",{method:"POST"}); } finally { sessionStorage.removeItem(AUTH_KEY); remotePublic=false;tenantMode=false;tenantEvents=[];currentAccountEmail='';if(hadTenant){db=emptyTenantState();savedDBSnapshot=JSON.stringify(db);}go("login"); } }
  if(el.dataset.action === "mobile-menu") { mobileOpen=!mobileOpen; document.querySelector(".sidebar")?.classList.toggle("open",mobileOpen); }
  if(el.dataset.action === "new-guest") { modal={type:"guest"}; render(); }
  if(el.dataset.action === "open-import") { pendingImport=[]; modal={type:"import"}; render(); }
  if(el.dataset.action === "close-modal") { modal=null; render(); }
  if(el.dataset.action === "confirm-import" && pendingImport.length) { db.guests.unshift(...pendingImport); const count=pendingImport.length; if(saveDB(`${count} invitados importados`)){pendingImport=[];modal=null;render();} }
  if(el.dataset.action === "download-template") downloadFile("plantilla-invitados.csv","nombre_grupo,numero_pases,tipo_invitacion,categoria_invitado,lado_evento,telefono\nFamilia Ejemplo,2,grupo,Familia,Ambos,+51999999999","text/csv");
  if(el.dataset.action === "export-guests") exportGuests();
  if(el.dataset.action === "export-selected-guests") { if(!selectedGuestIds.size)toast("Selecciona invitados primero.");else exportGuests(db.guests.filter(g=>selectedGuestIds.has(g.id)),"invitados-seleccion.csv"); }
  if(el.dataset.action === "clear-guest-selection") { selectedGuestIds.clear();renderGuestTable(); }
  if(el.dataset.action === "select-visible-guests") { document.querySelectorAll("[data-select-guest]").forEach(input=>selectedGuestIds.add(Number(input.dataset.selectGuest)));renderGuestTable(); }
  if(el.dataset.action === "guest-page-prev") { guestPage=Math.max(1,guestPage-1);renderGuestTable(); }
  if(el.dataset.action === "guest-page-next") { guestPage++;renderGuestTable(); }
  if(el.dataset.action === "export-rsvp-confirmed") exportRSVP("confirmed");
  if(el.dataset.action === "export-rsvp-declined") exportRSVP("declined");
  if(el.dataset.action === "download-selected-photos") downloadSelectedPhotos();
  if(el.dataset.action === "delete-selected-photos" && selectedPhotoIds.size && confirm(`¿Eliminar ${selectedPhotoIds.size} fotos seleccionadas?`)) { db.gallery=db.gallery.filter(photo=>!selectedPhotoIds.has(photo.id));selectedPhotoIds.clear();if(saveDB("Fotos eliminadas"))render(); }
  if(el.dataset.action === "export-songs") exportSongs();
  if(el.dataset.action === "export-tables") exportTables();
  if(el.dataset.action === "export-backup") downloadFile("respaldo-nupcial.json",JSON.stringify(db,null,2),"application/json");
  if(el.dataset.action === "auto-tables") autoAssignTables();
  if(el.dataset.action === "reset-tables" && confirm("¿Desasignar todos los invitados de sus mesas?")) { db.guests.forEach(g=>g.table=null); saveDB("Asignaciones eliminadas"); render(); }
  if(el.dataset.action === "gallery-qr") { modal={type:"qr"}; render(); }
  if(el.dataset.action === "copy-gallery-link") await copyText(galleryLink(),"Enlace de galería copiado");
  if(el.dataset.action === "edit-response") { render();document.querySelector("#rsvp-public")?.scrollIntoView({block:"start"}); }
  if(el.dataset.action === "scroll-rsvp") document.querySelector("#rsvp-public")?.scrollIntoView({behavior:"smooth"});
  if(el.dataset.action === "add-moment" && db.itinerary.length<10) { db.itinerary.push({id:Date.now(),time:"20:00",icon:"✨",title:"Nuevo momento",description:""}); saveDB("Momento agregado"); render(); }
  if(el.dataset.action === "remove-cover") { delete db.event.coverPhoto; saveDB("Portada eliminada"); render(); }
  if(el.dataset.action === "reset-demo" && confirm("Esto eliminará todos los cambios locales. ¿Continuar?")) { db=normalizeDB(structuredClone(seed)); saveDB("Demo restablecida"); render(); }
  if(el.dataset.editGuest) { modal={type:"guest",id:Number(el.dataset.editGuest)}; render(); }
  if(el.dataset.manualRsvp) { modal={type:"manual",id:Number(el.dataset.manualRsvp)}; render(); }
  if(el.dataset.copyInvite) { const g=db.guests.find(x=>x.id===Number(el.dataset.copyInvite)); if(g)await copyText(invitationMessage(g),"Mensaje copiado"); }
  if(el.dataset.whatsapp) { const g=db.guests.find(x=>x.id===Number(el.dataset.whatsapp)); if(g){const phone=g.phone.replace(/\D/g,"");if(!/^\d{8,15}$/.test(phone)){toast("Agrega un teléfono válido con código de país.");return;}window.open(`https://wa.me/${phone}?text=${encodeURIComponent(invitationMessage(g))}`,"_blank","noopener");toast("Mensaje preparado en WhatsApp. Confirma el envío allí.");} }
  if(el.dataset.editorTab) { editorTab=el.dataset.editorTab; render(); }
  if(el.dataset.deleteGuest) { const id=Number(el.dataset.deleteGuest); if(confirm("¿Eliminar este invitado?")){db.guests=db.guests.filter(g=>g.id!==id);selectedGuestIds.delete(id);saveDB("Invitado eliminado");render();} }
  if(el.dataset.deleteTable) { const id=Number(el.dataset.deleteTable); if(confirm("¿Eliminar mesa y liberar sus invitados?")){db.guests.forEach(g=>{if(g.table===id)g.table=null});db.tables=db.tables.filter(t=>t.id!==id);saveDB("Mesa eliminada");render();} }
  if(el.dataset.floorAction === "undo") undoFloorPlan();
  if(el.dataset.floorAction === "arrange") arrangeFloorTables();
  if(el.dataset.floorAction === "zoom-in") setFloorZoom(floorZoom + .1);
  if(el.dataset.floorAction === "zoom-out") setFloorZoom(floorZoom - .1);
  if(el.dataset.floorAction === "fit") fitFloorCanvas();
  if(el.dataset.floorAction === "print") printFloorPlan();
  if(el.dataset.floorAction === "multi-select") { floorMultiSelect=!floorMultiSelect;if(!floorMultiSelect&&floorSelectedTables.size>1)floorSelectedTables=new Set([[...floorSelectedTables][0]]);render(); }
  if(el.dataset.floorAction === "pan") { floorPanMode=!floorPanMode;render(); }
  if(el.dataset.floorAction === "minimap") { floorMiniMapOpen=!floorMiniMapOpen;render(); }
  if(el.dataset.floorAction === "clean") { floorCleanMode=!floorCleanMode;render(); }
  if(el.dataset.floorAction === "review") { floorReview=!floorReview;render(); }
  if(el.dataset.floorAction === "clear-selection") { floorSelectedTables.clear();render(); }
  if(el.dataset.addFloorObject) addFloorObject(el.dataset.addFloorObject);
  if(el.dataset.deleteFloorObject) { db.floorObjects=db.floorObjects.filter(item=>item.id!==Number(el.dataset.deleteFloorObject));saveDB("Elemento eliminado");render(); }
  if(el.dataset.deleteMoment) { db.itinerary=db.itinerary.filter(x=>x.id!==Number(el.dataset.deleteMoment));saveDB("Momento eliminado");render(); }
  if(el.dataset.deleteGift) { db.gifts=db.gifts.filter(x=>x.id!==Number(el.dataset.deleteGift));saveDB("Opción eliminada");render(); }
  if(el.dataset.song) { const song=db.songs.find(s=>s.id===Number(el.dataset.song)); if(song){song.status=el.dataset.status;saveDB("Estado actualizado");render();} }
  if(el.dataset.deleteSong) { const song=db.songs.find(s=>s.id===Number(el.dataset.deleteSong));if(song&&confirm(`¿Eliminar “${song.title}” de la playlist?`)){db.songs=db.songs.filter(s=>s.id!==song.id);saveDB("Canción eliminada");render();} }
  if(el.dataset.deletePhoto) { db.gallery=db.gallery.filter(p=>p.id!==Number(el.dataset.deletePhoto));saveDB("Foto eliminada");render(); }
});

document.addEventListener("pointerdown", event => {
  const viewport=event.target.closest(".floor-viewport");
  if(viewport&&floorPanMode&&event.button===0&&!event.target.closest("[data-floor-kind],button")){
    floorPan={viewport,startX:event.clientX,startY:event.clientY,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
    viewport.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }
  const handle = event.target.closest("[data-floor-drag]");
  if (!handle || event.button !== 0 || route() !== "tables") return;
  const card = handle.closest("[data-floor-kind]");
  const canvas = handle.closest(".floor-canvas");
  if (!card || !canvas) return;
  floorDrag = {
    kind: card.dataset.floorKind,
    id: Number(card.dataset.floorId),
    canvas,
    startX: event.clientX,
    startY: event.clientY,
    positions: (card.dataset.floorKind === "table" && floorMultiSelect && floorSelectedTables.has(Number(card.dataset.floorId))
      ? [...floorSelectedTables]
      : [Number(card.dataset.floorId)])
      .map(id => (card.dataset.floorKind === "table" ? db.tables : db.floorObjects).find(record => record.id === id))
      .filter(Boolean)
      .map(({ id, x, y }) => ({ id, x: Number(x) || 0, y: Number(y) || 0 })),
    cards: [],
    moved: false,
    before: floorSnapshot(),
  };
  floorDrag.cards = floorDrag.positions.map(position => canvas.querySelector(`[data-floor-kind="${floorDrag.kind}"][data-floor-id="${position.id}"]`)).filter(Boolean);
  handle.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

document.addEventListener("dragstart", event => {
  const token=event.target.closest("[data-drag-guest]");
  if(!token||!event.dataTransfer)return;
  event.dataTransfer.setData("text/plain",token.dataset.dragGuest);
  event.dataTransfer.effectAllowed="move";
  token.classList.add("is-dragging");
});

document.addEventListener("dragend", event => event.target.closest("[data-drag-guest]")?.classList.remove("is-dragging"));

document.addEventListener("dragover", event => {
  const target=event.target.closest('[data-floor-kind="table"]');
  if(target&&event.dataTransfer){event.preventDefault();event.dataTransfer.dropEffect="move";target.classList.add("is-drop-target");}
});

document.addEventListener("dragleave", event => {
  const target=event.target.closest('[data-floor-kind="table"]');
  if(target&&!target.contains(event.relatedTarget))target.classList.remove("is-drop-target");
});

document.addEventListener("drop", event => {
  const target=event.target.closest('[data-floor-kind="table"]');
  if(!target)return;
  event.preventDefault();target.classList.remove("is-drop-target");
  const guest=db.guests.find(item=>item.id===Number(event.dataTransfer?.getData("text/plain")));
  if(!guest||guest.status!=="confirmed")return;
  try{assignFloorGuest(guest.id,Number(target.dataset.floorId));if(saveDB(`${guest.name} asignado a ${db.tables.find(table=>table.id===guest.table)?.name||"mesa"}`))render();}
  catch(error){toast(error.message);}
});

document.addEventListener("pointermove", event => {
  if(floorPan){floorPan.viewport.scrollLeft=floorPan.scrollLeft-(event.clientX-floorPan.startX);floorPan.viewport.scrollTop=floorPan.scrollTop-(event.clientY-floorPan.startY);return;}
  if (!floorDrag) return;
  const rect = floorDrag.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const deltaX = ((event.clientX - floorDrag.startX) / rect.width) * 100;
  const deltaY = ((event.clientY - floorDrag.startY) / rect.height) * 100;
  moveFloorItems(floorDrag.kind, floorDrag.positions, deltaX, deltaY);
  const collection = floorDrag.kind === "table" ? db.tables : db.floorObjects;
  floorDrag.cards.forEach(card => {
    const item = collection.find(record => record.id === Number(card.dataset.floorId));
    if (item) { card.style.left = `${item.x}%`; card.style.top = `${item.y}%`; }
  });
  if (Math.hypot(event.clientX - floorDrag.startX, event.clientY - floorDrag.startY) > 3) floorDrag.moved = true;
});

document.addEventListener("pointerup", () => {
  if(floorPan){floorPan=null;return;}
  if (!floorDrag) return;
  const moved = floorDrag.moved;
  if (moved) {
    rememberFloorSnapshot(floorDrag.before);
    if (!saveDB("Ubicación del plano guardada")) render();
  } else {
    applyFloorSnapshot(floorDrag.before);
    floorDrag.cards.forEach(card => {
      const item = (floorDrag.kind === "table" ? db.tables : db.floorObjects).find(record => record.id === Number(card.dataset.floorId));
      if (item) { card.style.left = `${item.x}%`; card.style.top = `${item.y}%`; }
    });
  }
  floorDrag = null;
});

document.addEventListener("pointercancel", () => {
  if(floorPan){floorPan=null;return;}
  if (!floorDrag) return;
  applyFloorSnapshot(floorDrag.before);
  floorDrag = null;
  render();
});

document.addEventListener("change", e => {
  if(e.target.dataset.selectGuest){const id=Number(e.target.dataset.selectGuest);if(e.target.checked)selectedGuestIds.add(id);else selectedGuestIds.delete(id);renderGuestTable();}
  if(e.target.dataset.guestStatus){const guest=db.guests.find(g=>g.id===Number(e.target.dataset.guestStatus));if(guest&&["pending","confirmed","declined"].includes(e.target.value)){guest.status=e.target.value;guest.confirmedCount=guest.status==="confirmed"?guest.passes:0;guest.responseAt=guest.status==="pending"?null:new Date().toISOString();if(guest.status!=="confirmed")guest.table=null;saveDB("Confirmación actualizada");render();}}
  if(e.target.dataset.assignTable){
    const guest=db.guests.find(g=>g.id===Number(e.target.dataset.assignTable));if(!guest)return;
    try {const next={...guest,table:e.target.value?Number(e.target.value):null};ensureTableCapacity(next);Object.assign(guest,next);saveDB("Mesa actualizada");render();}
    catch(error){render();toast(error.message);}
  }
});

function csvText(rows){return Core.csvText(rows);}
function downloadFile(name,content,type){const blob=new Blob([type.includes("csv")?"\ufeff"+content:content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();const url=a.href;setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Archivo descargado");}
function exportGuests(list=db.guests,name="invitados-nupcial.csv"){const rows=[["Nombre","Teléfono","Pases","Asistentes","Estado","Tipo","Categoría","Lado","Personas","Mesa","Notas"],...list.map(g=>[g.name,g.phone,g.passes,Core.attendanceCount(g),statusLabel(g.status),g.type,g.category,g.side,(g.members||[]).join(" | "),db.tables.find(t=>t.id===g.table)?.name||"",g.notes])];downloadFile(name,csvText(rows),"text/csv;charset=utf-8");}
function exportRSVP(status){const list=db.guests.filter(g=>g.status===status);const rows=[["Nombre","Estado","Tipo de evento","Pases","Asistentes","Respuesta recibida","Mensaje"],...list.map(g=>[g.name,statusLabel(g.status),g.attendanceType==="ceremony"?"Solo ceremonia":"Evento completo",g.passes,Core.attendanceCount(g),g.responseAt||"",g.message||""])];downloadFile(status==="confirmed"?"confirmaciones-asistentes.csv":"confirmaciones-no-asistentes.csv",csvText(rows),"text/csv;charset=utf-8");}
function exportSongs(){const rows=[["Canción","Artista","Solicitada por","Estado"],...db.songs.map(s=>[s.title,s.artist,s.requester,statusLabel(s.status)])];downloadFile("playlist-nupcial.csv",csvText(rows),"text/csv;charset=utf-8");}
function exportTables(){const rows=[["Mesa","Capacidad","Invitado","Asistentes"],...db.tables.flatMap(t=>{const list=db.guests.filter(g=>g.table===t.id&&g.status==="confirmed");return list.length?list.map(g=>[t.name,t.seats,g.name,Core.attendanceCount(g)]):[[t.name,t.seats,"",0]]})];downloadFile("plano-mesas.csv",csvText(rows),"text/csv;charset=utf-8");}

function photoBytes(dataURL){
  const match=String(dataURL).match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/i);if(!match)throw new Error("Imagen de galería no válida.");
  if(match[2]){const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";const input=match[3].replace(/\s/g,"").replace(/=+$/,"");const output=[];let buffer=0,bits=0;for(const char of input){const value=alphabet.indexOf(char);if(value<0)throw new Error("Imagen codificada no válida.");buffer=(buffer<<6)|value;bits+=6;if(bits>=8){bits-=8;output.push((buffer>>bits)&255);}}return{bytes:Uint8Array.from(output),mime:match[1].toLowerCase()};}
  return{bytes:new TextEncoder().encode(decodeURIComponent(match[3])),mime:match[1].toLowerCase()};
}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function zipStoredFiles(files){
  const encoder=new TextEncoder();const localParts=[];const centralParts=[];let localOffset=0;
  for(const file of files){const name=encoder.encode(file.name);const payload=file.bytes;const crc=crc32(payload);if(payload.length>0xffffffff||name.length>0xffff)throw new Error("Una foto supera el tamaño permitido para ZIP.");
    const local=new Uint8Array(30+name.length);const l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0,true);l.setUint16(8,0,true);l.setUint16(10,0,true);l.setUint16(12,0x21,true);l.setUint32(14,crc,true);l.setUint32(18,payload.length,true);l.setUint32(22,payload.length,true);l.setUint16(26,name.length,true);l.setUint16(28,0,true);local.set(name,30);localParts.push(local,payload);
    const central=new Uint8Array(46+name.length);const c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0,true);c.setUint16(10,0,true);c.setUint16(12,0,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,payload.length,true);c.setUint32(24,payload.length,true);c.setUint16(28,name.length,true);c.setUint16(30,0,true);c.setUint16(32,0,true);c.setUint16(34,0,true);c.setUint16(36,0,true);c.setUint32(38,0,true);c.setUint32(42,localOffset,true);central.set(name,46);centralParts.push(central);localOffset+=local.length+payload.length;
  }
  const centralSize=centralParts.reduce((sum,part)=>sum+part.length,0);const end=new Uint8Array(22);const view=new DataView(end.buffer);view.setUint32(0,0x06054b50,true);view.setUint16(4,0,true);view.setUint16(6,0,true);view.setUint16(8,files.length,true);view.setUint16(10,files.length,true);view.setUint32(12,centralSize,true);view.setUint32(16,localOffset,true);view.setUint16(20,0,true);
  const parts=[...localParts,...centralParts,end];const result=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
function downloadSelectedPhotos(){
  const selected=db.gallery.filter(photo=>selectedPhotoIds.has(photo.id));if(!selected.length){toast("Selecciona fotos primero.");return;}
  try{const files=selected.map((photo,index)=>{const parsed=photoBytes(photo.src);const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/svg+xml":"svg"}[parsed.mime];if(!extension)throw new Error("Formato de foto no compatible con ZIP.");return{name:`foto-${String(index+1).padStart(3,"0")}.${extension}`,bytes:parsed.bytes};});downloadFile("fotos-galeria.zip",zipStoredFiles(files),"application/zip");}
  catch(error){toast(error.message||"No se pudo crear el ZIP.");}
}

function parseGuestCSV(text){
  const parsed=Core.parseGuestCSV(text,{idStart:nextRecordId()});const stamp=Date.now();return parsed.map((g,index)=>({...g,createdAt:stamp+parsed.length-index,code:newInvitationCode()}));
}

function zipEntryRecord(zipBytes,wantedPath){
  const view=new DataView(zipBytes.buffer,zipBytes.byteOffset,zipBytes.byteLength);const min=Math.max(0,zipBytes.length-65557);let eocd=-1;
  for(let offset=zipBytes.length-22;offset>=min;offset--){if(view.getUint32(offset,true)===0x06054b50){eocd=offset;break;}}
  if(eocd<0)throw new Error("Libro Excel dañado: faltan datos ZIP.");
  const count=view.getUint16(eocd+10,true);let offset=view.getUint32(eocd+16,true);
  for(let index=0;index<count;index++){
    if(view.getUint32(offset,true)!==0x02014b50)throw new Error("Libro Excel dañado: índice ZIP inválido.");
    const method=view.getUint16(offset+10,true);const compressedSize=view.getUint32(offset+20,true);const nameLength=view.getUint16(offset+28,true);const extraLength=view.getUint16(offset+30,true);const commentLength=view.getUint16(offset+32,true);const localOffset=view.getUint32(offset+42,true);
    const path=new TextDecoder().decode(zipBytes.subarray(offset+46,offset+46+nameLength));
    if(path===wantedPath){if(view.getUint16(offset+8,true)&1)throw new Error("Libro Excel cifrado no compatible.");if(view.getUint32(localOffset,true)!==0x04034b50)throw new Error("Libro Excel dañado: archivo interno inválido.");const localNameLength=view.getUint16(localOffset+26,true);const localExtraLength=view.getUint16(localOffset+28,true);const dataStart=localOffset+30+localNameLength+localExtraLength;return{method,compressed:zipBytes.slice(dataStart,dataStart+compressedSize),size:view.getUint32(offset+24,true)};}
    offset+=46+nameLength+extraLength+commentLength;
  }
  return null;
}
async function unzipXlsxEntry(zipBytes,path){
  const entry=zipEntryRecord(zipBytes,path);if(!entry)return null;if(entry.method===0)return entry.compressed;if(entry.method!==8)throw new Error(`Excel usa compresión no compatible (${entry.method}).`);
  if(typeof DecompressionStream==="undefined")throw new Error("Este navegador no puede descomprimir .xlsx. Guarda el archivo como CSV.");
  try{const stream=new Blob([entry.compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));const bytes=new Uint8Array(await new Response(stream).arrayBuffer());if(bytes.length!==entry.size)throw new Error();return bytes;}
  catch{throw new Error("No se pudo descomprimir el libro .xlsx. Guarda el archivo como CSV.");}
}
function parseXlsxXml(bytes){
  const xml=new TextDecoder().decode(bytes);if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error("Libro Excel incluye declaraciones XML no permitidas.");const doc=new DOMParser().parseFromString(xml,"application/xml");if(doc.querySelector("parsererror"))throw new Error("Libro Excel contiene XML inválido.");return doc;
}
function xlsxColumnIndex(reference){const letters=String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase();if(!letters)return-1;let value=0;for(const char of letters)value=value*26+char.charCodeAt(0)-64;return value-1;}
async function parseXlsxGuestCSV(file){
  const zip=new Uint8Array(await file.arrayBuffer());const workbookBytes=await unzipXlsxEntry(zip,"xl/workbook.xml");if(!workbookBytes)throw new Error("No se encontró libro válido en el archivo .xlsx.");const workbook=parseXlsxXml(workbookBytes);const sheets=workbook.getElementsByTagNameNS("*","sheet");if(!sheets.length)throw new Error("El libro Excel no tiene hojas.");
  const relationId=Array.from(sheets[0].attributes).find(attr=>attr.localName==="id")?.value;const relationships=await unzipXlsxEntry(zip,"xl/_rels/workbook.xml.rels");if(!relationships)throw new Error("El libro Excel no indica su hoja de invitados.");const relationDoc=parseXlsxXml(relationships);const relation=Array.from(relationDoc.getElementsByTagNameNS("*","Relationship")).find(item=>item.getAttribute("Id")===relationId);if(!relation)throw new Error("No se encontró la primera hoja del libro Excel.");
  const target=relation.getAttribute("Target");const pathParts=(target.startsWith("/")?target.slice(1):`xl/${target}`).split("/");const normalized=[];for(const part of pathParts){if(part==="..")normalized.pop();else if(part!=="."&&part)normalized.push(part);}const sheetPath=normalized.join("/");
  const sheetBytes=await unzipXlsxEntry(zip,sheetPath);if(!sheetBytes)throw new Error("No se pudo leer la hoja de datos del Excel.");const sheet=parseXlsxXml(sheetBytes);const stringsBytes=await unzipXlsxEntry(zip,"xl/sharedStrings.xml");const shared=stringsBytes?Array.from(parseXlsxXml(stringsBytes).getElementsByTagNameNS("*","si")).map(item=>Array.from(item.getElementsByTagNameNS("*","t")).map(t=>t.textContent||"").join("")):[];
  const rows=[];for(const row of Array.from(sheet.getElementsByTagNameNS("*","row"))){const values=[];for(const cell of Array.from(row.getElementsByTagNameNS("*","c"))){const column=xlsxColumnIndex(cell.getAttribute("r"));if(column<0)continue;const type=cell.getAttribute("t");let value="";if(type==="inlineStr")value=Array.from(cell.getElementsByTagNameNS("*","t")).map(t=>t.textContent||"").join("");else{const raw=cell.getElementsByTagNameNS("*","v")[0]?.textContent||"";value=type==="s"?(shared[Number(raw)]??""):type==="b"?(raw==="1"?"TRUE":"FALSE"):raw;}values[column]=value;}rows.push(values.map(value=>value??""));}
  if(!rows.length)throw new Error("La hoja Excel está vacía.");return Core.csvText(rows);
}

function publicInviteUrl(guestCode='',section=''){
  const slug=db.event.slug||publicEventSlug(),query=new URLSearchParams();
  if(guestCode)query.set('guest',guestCode);if(section)query.set('section',section);
  return `${location.origin}${location.pathname}${slug?`?event=${encodeURIComponent(slug)}`:''}#/public${query.toString()?`?${query}`:''}`;
}
function personalizedInviteUrl(g){return publicInviteUrl(g.code);}
function invitationMessage(g){return `Hola ${g.name}, ${db.event.bride} & ${db.event.groom} te invitan a su boda. Tienes ${g.passes} pase${g.passes>1?'s':''}. Confirma aquí: ${personalizedInviteUrl(g)}`;}

function autoAssignTables(){let assigned=0,groups=0;const waiting=db.guests.filter(g=>g.status==="confirmed"&&!g.table).sort((a,b)=>Core.attendanceCount(b)-Core.attendanceCount(a));for(const guest of waiting){const count=Core.attendanceCount(guest);const candidates=db.tables.map(table=>({table,free:Number(table.seats)-floorTableUsage(table.id)})).filter(item=>item.free>=count).sort((a,b)=>a.free-b.free);const target=candidates[0]?.table;if(target){guest.table=target.id;assigned+=count;groups++;}}if(saveDB(groups?`${groups} grupos · ${assigned} personas distribuidas`:"Sin capacidad suficiente para los grupos pendientes"))render();}
function floorSnapshot(){return{tables:db.tables.map(({id,x,y})=>({id,x,y})),objects:db.floorObjects.map(({id,x,y})=>({id,x,y}))};}
function rememberFloorSnapshot(snapshot=floorSnapshot()){floorHistory.push(structuredClone(snapshot));if(floorHistory.length>20)floorHistory.shift();}
function applyFloorSnapshot(snapshot){for(const item of snapshot.tables){const table=db.tables.find(record=>record.id===item.id);if(table){table.x=item.x;table.y=item.y;}}for(const item of snapshot.objects){const object=db.floorObjects.find(record=>record.id===item.id);if(object){object.x=item.x;object.y=item.y;}}}
function moveFloorItems(kind,positions,deltaX,deltaY){const collection=kind==="table"?db.tables:db.floorObjects;for(const origin of positions){const item=collection.find(record=>record.id===origin.id);if(!item)continue;const next=Core.clampFloorPosition(origin.x+deltaX,origin.y+deltaY);item.x=next.x;item.y=next.y;}}
function undoFloorPlan(){const previous=floorHistory.pop();if(!previous){toast("No hay movimientos para deshacer.");return;}applyFloorSnapshot(previous);saveDB("Último movimiento deshecho");render();}
function arrangeFloorTables(){rememberFloorSnapshot();db.tables=Core.distributeFloorTables(db.tables);saveDB("Mesas ordenadas");render();}
function addFloorObject(type){if(!FLOOR_OBJECT_TYPES[type])return;const index=db.floorObjects.length;const point=Core.clampFloorPosition(8+(index%4)*20,10+Math.floor(index/4)*20);db.floorObjects.push({id:nextRecordId(),type,...point});saveDB(`${FLOOR_OBJECT_TYPES[type].label} agregado`);render();}
function setFloorZoom(value){floorZoom=Math.max(.35,Math.min(1.4,Math.round(value*10)/10));const canvas=document.querySelector(".floor-canvas");canvas?.style.setProperty("--floor-zoom",floorZoom);const label=document.querySelector("#floor-zoom-label");if(label)label.textContent=`${Math.round(floorZoom*100)}%`;}
function fitFloorCanvas(){const viewport=document.querySelector(".floor-viewport");setFloorZoom(Math.min(1,(viewport?.clientWidth||760)/760));}
function printFloorPlan(){document.body.classList.add("floor-print-mode");const done=()=>{document.body.classList.remove("floor-print-mode");window.removeEventListener("afterprint",done);};window.addEventListener("afterprint",done);window.print();setTimeout(done,1500);}

function clientPlan(){return (typeof WEDDING_PLANS!=="undefined"&&WEDDING_PLANS.find(p=>p.id===db.event.plan))||{name:"Premium",passes:150};}
function memberNames(text,max){const names=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(names.length>max)throw new Error(`La lista de nombres supera las ${max} personas indicadas.`);return names;}
function nextRecordId(){return Math.max(Date.now(),...['guests','tables','songs','gallery','itinerary','gifts','floorObjects'].flatMap(key=>db[key].map(record=>Math.ceil(Number(record.id)||0)+1)));}
function newInvitationCode(){return `INV-${typeof crypto.randomUUID==='function'?crypto.randomUUID().replaceAll('-',''):Date.now().toString(36)+Math.random().toString(36).slice(2)}`.toUpperCase();}
function ensureTableCapacity(guest){if(!guest.table)return;const table=db.tables.find(t=>t.id===guest.table);if(!table)throw new Error("Mesa no encontrada.");const used=db.guests.filter(g=>g.table===table.id&&g.id!==guest.id).reduce((sum,g)=>sum+Core.attendanceCount(g),0);if(used+Core.attendanceCount(guest)>table.seats)throw new Error("Mesa sin capacidad para este grupo. Revisa la asignación.");}
function assignFloorGuest(guestId,tableId){const guest=db.guests.find(item=>item.id===Number(guestId)),table=db.tables.find(item=>item.id===Number(tableId));if(!guest||guest.status!=="confirmed")throw new Error("Solo puedes sentar invitados confirmados.");if(!table)throw new Error("Mesa no encontrada.");const next={...guest,table:table.id};ensureTableCapacity(next);guest.table=table.id;return guest;}
function galleryLink(){return publicInviteUrl('', 'gallery');}
async function copyText(text,message="Enlace copiado"){
  try {if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(text);toast(message);return true;}
  catch{toast("No se pudo copiar automáticamente. Selecciona el enlace o utiliza un navegador con acceso al portapapeles.");return false;}
}
function readSingleFile(file,onload){
  if(!file)return;
  if(file.size>2*1024*1024){toast(`${file.name}: supera 2 MB`);return;}
  if(!["image/png","image/jpeg","image/webp","audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/ogg","audio/mp4"].includes(file.type)){toast("Formato no permitido. Usa JPG, PNG, WebP o un archivo de audio.");return;}
  const reader=new FileReader();reader.onerror=()=>toast("No se pudo leer el archivo.");reader.onload=()=>onload(reader.result);reader.readAsDataURL(file);
}
async function addGalleryFiles(files,by){
  if(route()==="public"&&!db.galleryEnabled){toast("La galería está deshabilitada.");return;}
  let added=0;let error="";
  for(const file of [...files]){
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2*1024*1024){error=`${file.name}: usa JPG, PNG o WebP de hasta 2 MB.`;continue;}
    try{
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("No se pudo leer la foto."));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});
      if(remotePublic){
        await apiRequest('/api/public/gallery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:db.event.slug||publicEventSlug(),src:data})});
        db.gallery.unshift({id:Date.now(),src:data,by:'Invitado'});added++;continue;
      }
      db.gallery.unshift({id:nextRecordId(),src:data,by});if(!saveDB("Foto agregada")){render();return;}added++;
    }catch(failure){error=failure.message;}
  }
  render();toast(error?`${added} fotos guardadas. ${error}`:`${added} foto${added===1?'':'s'} guardada${added===1?'':'s'}.`);
}

window.addEventListener("hashchange",async()=>{
  modal=null;
  if(apiMode && route()==="public" && !isAuthed()) await loadRemotePublic();
  render();
  if(route()==="checkout") refreshCheckoutPage();
  if(route()==="payment-result") refreshPaymentResult();
});
document.documentElement.style.setProperty("--brand", db.event.primary);
initializeApp();
