// Public-facing discovery pages. All event/account mutations live in the app flow.
const mktSelections = Object.create(null);

function mktThemeList() { return WEDDING_THEMES; }
function mktPaletteList() { return WEDDING_PALETTES; }
function mktSelectedPalette(theme) {
  return mktPaletteList().find(p => p.id === (mktSelections[theme.id] || theme.defaultPalette)) || mktPaletteList()[0];
}
function mktPlaygroundLink(theme, palette) {
  return `#/playground?tema=${encodeURIComponent(theme.id)}&paleta=${encodeURIComponent(palette.id)}`;
}
function mktThemeImage(theme) { return theme.image || `assets/${theme.id}.jpg`; }

function mktHeader(active = "home") {
  const account = typeof isAuthed === "function" && isAuthed() ? "#/dashboard" : "#/login";
  return `<header class="mkt-header"><div class="mkt-nav-wrap">
    <a href="#/home" class="mkt-brand" aria-label="Nupcial, inicio">nupcial<span class="mkt-brand-dot">✳</span></a>
    <nav class="mkt-nav" aria-label="Navegación principal">
      <a href="#/bodas" ${active === "bodas" ? 'aria-current="page"' : ""}>Diseños de boda</a>
      <a href="#/home?section=platform" data-mkt-section="platform">La plataforma</a>
      <a href="#/home?section=how" data-mkt-section="how">Cómo funciona</a>
      <a href="#/plans" ${active === "plans" ? 'aria-current="page"' : ""}>Planes</a>
    </nav>
    <div class="mkt-nav-end"><a href="${account}" class="mkt-account">Mi cuenta <span aria-hidden="true">↗</span></a><a class="mkt-button mkt-button-small" href="#/bodas">Crear invitación <span aria-hidden="true">↗</span></a></div>
  </div></header>`;
}

function mktFooter() {
  return `<footer class="mkt-footer"><div class="mkt-container"><div class="mkt-footer-top"><a href="#/home" class="mkt-brand">nupcial<span class="mkt-brand-dot">✳</span></a><p>El comienzo de algo inolvidable.</p><a href="#/bodas" class="mkt-text-link">Encuentra tu diseño <span aria-hidden="true">↗</span></a></div><div class="mkt-footer-bottom"><span>© ${new Date().getFullYear()} Nupcial</span><span>Hecho para celebrar, juntos.</span><nav aria-label="Enlaces de pie de página"><a href="#/plans">Planes</a><a href="#/login">Mi cuenta</a><a href="#/home?section=faq" data-mkt-section="faq">Preguntas frecuentes</a></nav></div></div></footer>`;
}

function mktThemeCard(theme, index = 0) {
  const selected = mktSelectedPalette(theme);
  const link = mktPlaygroundLink(theme, selected);
  return `<article class="mkt-design-card" data-design="${escapeHtml(theme.id)}" style="--card-accent:${escapeHtml(selected.color)};--card-paper:${escapeHtml(selected.paper || '#f8f4ed')}">
    <a class="mkt-design-photo" href="${link}" data-design-link aria-label="Ver invitación ${escapeHtml(theme.name)} en ${escapeHtml(selected.name)}"><img src="${escapeHtml(mktThemeImage(theme))}" alt="Inspiración para una boda de estilo ${escapeHtml(theme.name)}" loading="${index < 3 ? 'eager' : 'lazy'}" width="600" height="820"><span class="mkt-design-number">0${index + 1} / COLECCIÓN</span><span class="mkt-photo-cta">Ver invitación <span aria-hidden="true">↗</span></span></a>
    <div class="mkt-design-heading"><h3>${escapeHtml(theme.name)}</h3><span>${mktPaletteList().length} colores</span></div>
    <p class="mkt-design-description">${escapeHtml(theme.description)}</p>
    <div class="mkt-swatches" role="group" aria-label="Paleta de ${escapeHtml(theme.name)}">${mktPaletteList().map(p => `<button class="mkt-swatch ${p.id === selected.id ? 'is-selected' : ''}" type="button" data-theme-swatch="${escapeHtml(theme.id)}" data-palette="${escapeHtml(p.id)}" style="--swatch:${escapeHtml(p.swatch || p.color)}" title="${escapeHtml(p.name)}" aria-label="${escapeHtml(p.name)} para ${escapeHtml(theme.name)}" aria-pressed="${p.id === selected.id}"><span></span></button>`).join("")}</div>
    <div class="mkt-palette-caption"><span>Tu paleta: <strong data-palette-label>${escapeHtml(selected.name)}</strong></span><a href="${link}" data-design-link>Personalizar <span aria-hidden="true">↗</span></a></div>
  </article>`;
}

function mktDesignSection(compact = false) {
  return `<section class="mkt-section mkt-design-section" id="designs"><div class="mkt-container"><div class="mkt-section-head"><div><p class="mkt-eyebrow">UNA INVITACIÓN TAN ÚNICA COMO SU HISTORIA</p><h2>Su historia,<br><em>con su propio estilo.</em></h2></div><p class="mkt-section-intro">Tres formas de decir «nos casamos». Exploren cada diseño, cambien la paleta y descubran cómo se verá su gran día.</p></div><div class="mkt-design-grid">${mktThemeList().map(mktThemeCard).join("")}</div>${compact ? '<div class="mkt-section-bottom"><p>Un diseño, nueve maneras de hacerlo suyo.</p><a href="#/bodas" class="mkt-text-link">Explorar la colección completa <span aria-hidden="true">↗</span></a></div>' : '<div class="mkt-catalog-note"><span aria-hidden="true">✳</span><p>Todos los diseños incluyen versiones para móvil y escritorio. Puedes probar cada combinación antes de elegir.</p></div>'}</div></section>`;
}

function mktPlatformPanel(key = "guests") {
  if (key === "tables") return `<div class="mkt-demo-top"><div><small>LA CELEBRACIÓN</small><h3>Un lugar para cada persona</h3></div><span class="mkt-demo-tag">Ejemplo</span></div><div class="mkt-table-preview"><div class="mkt-table-circle"><span>01</span><strong>Familia</strong><small>6 de 8 lugares</small></div><div class="mkt-table-circle"><span>02</span><strong>Amigos</strong><small>8 de 10 lugares</small></div><div class="mkt-table-circle"><span>03</span><strong>Compañeros</strong><small>4 de 8 lugares</small></div></div><div class="mkt-demo-foot"><span>La distribución, bajo control.</span><a href="#/start?tema=terra&paleta=terracota&plan=premium">Crear mi evento ↗</a></div>`;
  if (key === "memories") return `<div class="mkt-demo-top"><div><small>EL DÍA DESPUÉS</small><h3>Los momentos se quedan</h3></div><span class="mkt-demo-tag">Ejemplo</span></div><div class="mkt-memory-preview">${mktThemeList().map(t => `<img src="${escapeHtml(mktThemeImage(t))}" alt="Foto de inspiración ${escapeHtml(t.name)}" loading="lazy" width="180" height="220">`).join("")}</div><div class="mkt-demo-foot"><span>Una galería para volver a ese día.</span><a href="#/start?tema=classic&paleta=navy&plan=premium">Crear mi evento ↗</a></div>`;
  return `<div class="mkt-demo-top"><div><small>SU BODA, EN ORDEN</small><h3>Lista de invitados</h3></div><span class="mkt-demo-tag">Ejemplo</span></div><div class="mkt-demo-metrics"><div><strong>36</strong><span>Invitaciones</span></div><div><strong>24</strong><span>Confirmadas</span></div><div><strong>12</strong><span>Por responder</span></div></div><div class="mkt-demo-guests"><div><span class="mkt-mini-avatar">AT</span><strong>Ana Torres <small>2 pases · Familia</small></strong><span class="mkt-demo-status">Confirmado</span></div><div><span class="mkt-mini-avatar">DL</span><strong>Diego López <small>1 pase · Amigos</small></strong><span class="mkt-demo-status mkt-pending">Pendiente</span></div><div><span class="mkt-mini-avatar">SR</span><strong>Sofía Rivera <small>2 pases · Familia</small></strong><span class="mkt-demo-status">Confirmado</span></div></div><div class="mkt-demo-foot"><span>Menos pendientes. Más emoción.</span><a href="#/start?tema=versalles&paleta=dorado&plan=premium">Crear mi evento ↗</a></div>`;
}

function homePage() {
  const themes = mktThemeList();
  const heroTheme = themes.find(t => t.id === "terra") || themes[0];
  const smallTheme = themes.find(t => t.id === "versalles") || themes[0];
  return `<div class="mkt-page">${mktHeader("home")}<main>
    <section class="mkt-hero mkt-container"><div class="mkt-hero-copy"><p class="mkt-eyebrow"><span class="mkt-tiny-star" aria-hidden="true">✳</span> SU GRAN DÍA EMPIEZA AQUÍ</p><h1>Su historia<br>merece un<br><em>gran comienzo.</em></h1><p>Una invitación que emociona.<br>Un espacio que reúne todo.<br>Más tiempo para disfrutar lo que viene.</p><div class="mkt-hero-actions"><a class="mkt-button" href="#/bodas">Encontrar nuestro diseño <span aria-hidden="true">↗</span></a><a class="mkt-text-link" href="#/home?section=platform" data-mkt-section="platform">Conocer la plataforma <span aria-hidden="true">↓</span></a></div><div class="mkt-hero-note"><span aria-hidden="true">♡</span><span>Diseñada para ustedes.<br>Compartida con quienes más quieren.</span></div></div><div class="mkt-hero-art"><img class="mkt-hero-photo" src="${escapeHtml(mktThemeImage(heroTheme))}" alt="Pareja celebrando su boda en un paisaje natural" width="700" height="900" fetchpriority="high"><span class="mkt-art-caption">AQUÍ COMIENZA NUESTRO SIEMPRE</span><div class="mkt-invitation-paper"><span class="mkt-paper-flower" aria-hidden="true">✳</span><small>NOS CASAMOS</small><strong>Valentina<br><i>&</i> Mateo</strong><span class="mkt-paper-line"></span><span>18 · SEPTIEMBRE · 2027</span><small>UNA NUEVA HISTORIA</small></div><a href="${mktPlaygroundLink(smallTheme, mktSelectedPalette(smallTheme))}" class="mkt-floating-preview"><img src="${escapeHtml(mktThemeImage(smallTheme))}" alt="" width="90" height="110"><span>El primer vistazo<br><strong>Ver invitación <span aria-hidden="true">↗</span></strong></span></a><span class="mkt-art-star" aria-hidden="true">✳</span></div></section>
    <div class="mkt-ribbon"><div class="mkt-container"><span>Invitaciones con personalidad</span><i aria-hidden="true">✳</i><span>Todo en un solo lugar</span><i aria-hidden="true">✳</i><span>Recuerdos para siempre</span></div></div>
    ${mktDesignSection(true)}
    <section class="mkt-platform mkt-section" id="platform"><div class="mkt-container mkt-platform-layout"><div class="mkt-platform-copy"><p class="mkt-eyebrow">MUCHO MÁS QUE UNA INVITACIÓN</p><h2>Para vivir la boda.<br><em>No los pendientes.</em></h2><p>Desde el primer «¡ahí estaremos!» hasta la última foto de la fiesta. Cada detalle, en su lugar.</p><div class="mkt-feature-tabs" role="tablist" aria-label="Funciones de la plataforma"><button id="mkt-tab-guests" class="is-selected" role="tab" aria-selected="true" aria-controls="mkt-platform-panel" data-feature="guests" tabindex="0"><span>01</span><div><strong>Invitados y confirmaciones</strong><small>Sus respuestas, pases y mensajes, juntos.</small></div><i aria-hidden="true">↗</i></button><button id="mkt-tab-tables" role="tab" aria-selected="false" aria-controls="mkt-platform-panel" data-feature="tables" tabindex="-1"><span>02</span><div><strong>Mesas y organización</strong><small>Encuentren el lugar ideal para todos.</small></div><i aria-hidden="true">↗</i></button><button id="mkt-tab-memories" role="tab" aria-selected="false" aria-controls="mkt-platform-panel" data-feature="memories" tabindex="-1"><span>03</span><div><strong>Música y recuerdos</strong><small>La canción favorita. La foto inolvidable.</small></div><i aria-hidden="true">↗</i></button></div></div><div class="mkt-demo-surround"><div class="mkt-demo-window"><div class="mkt-window-bar"><span></span><span></span><span></span><small>nupcial / nuestro espacio</small></div><div id="mkt-platform-panel" role="tabpanel" aria-labelledby="mkt-tab-guests" tabindex="0">${mktPlatformPanel()}</div></div><div class="mkt-handwritten">Lo importante, siempre cerca.</div></div></div></section>
    <section class="mkt-how mkt-section" id="how"><div class="mkt-container"><div class="mkt-section-head"><div><p class="mkt-eyebrow">DEL «SÍ» A LA CELEBRACIÓN</p><h2>Se siente suyo.<br><em>Desde el primer paso.</em></h2></div><a href="#/bodas" class="mkt-text-link">Comenzar ahora <span aria-hidden="true">↗</span></a></div><div class="mkt-steps"><article><span>01</span><h3>Encuentren su estilo</h3><p>Exploren los diseños y prueben los colores hasta encontrar esa combinación que dice «somos nosotros».</p></article><article><span>02</span><h3>Denle su toque</h3><p>Nombres, fotos, lugares y los detalles de su historia. Personalicen su invitación y revisen cómo se ve.</p></article><article><span>03</span><h3>Que empiece la emoción</h3><p>Preparen sus invitados, organicen las respuestas y reúnan los recuerdos de una celebración irrepetible.</p></article></div></div></section>
    <section class="mkt-story-banner"><img src="${escapeHtml(mktThemeImage(themes.find(t => t.id === 'classic') || themes[0]))}" alt="Una pareja comparte un momento especial el día de su boda" loading="lazy" width="900" height="800"><div><p class="mkt-eyebrow">LOS DETALLES HACEN LA DIFERENCIA</p><h2>Un día pasa.<br><em>Lo que se siente,<br>se queda.</em></h2><p>Su canción. Sus fotos. Las personas que hacen que todo valga la pena. Diseñen una invitación con espacio para todo eso.</p><a href="#/bodas" class="mkt-button mkt-button-cream">Diseñar nuestra invitación <span aria-hidden="true">↗</span></a></div></section>
    <section class="mkt-faq mkt-section" id="faq"><div class="mkt-container mkt-faq-layout"><div><p class="mkt-eyebrow">ANTES DE EMPEZAR</p><h2>Pequeñas dudas.<br><em>Respuestas claras.</em></h2><p>Todo empieza con elegir cómo quieren contar su historia.</p></div><div class="mkt-accordion"><details><summary>¿Puedo probar los diseños antes de elegir?<span aria-hidden="true">+</span></summary><p>Sí. Cada modelo tiene una vista completa y nueve paletas. Cambien el diseño o el color y revisen el resultado en formato móvil o escritorio antes de crear su evento.</p></details><details><summary>¿Qué puedo personalizar?<span aria-hidden="true">+</span></summary><p>Los nombres, la fecha, los lugares, la historia, el itinerario, las fotos, los regalos y los detalles de la celebración. También pueden elegir qué secciones mostrar.</p></details><details><summary>¿Cómo organizo a mis invitados?<span aria-hidden="true">+</span></summary><p>Desde su panel pueden crear invitados y grupos, asignar pases, registrar confirmaciones, importar una lista y organizar las mesas según su capacidad.</p></details><details><summary>¿La invitación funciona en celulares?<span aria-hidden="true">+</span></summary><p>Sí. Los tres diseños se adaptan a pantallas pequeñas. En el probador pueden revisar la vista móvil y volver a escritorio en cualquier momento.</p></details><details><summary>¿Qué ocurre al crear un evento en esta demo?<span aria-hidden="true">+</span></summary><p>Se prepara su evento en este navegador para explorar el editor y la gestión de invitados. No se realiza ningún cobro ni se publica automáticamente en internet. Pueden conservar sus cambios con una copia de respaldo desde el panel.</p></details></div></div></section>
    <section class="mkt-final-cta mkt-container"><span aria-hidden="true">✳</span><p class="mkt-eyebrow">SU HISTORIA ESTÁ POR EMPEZAR</p><h2>Hagamos que el primer<br><em>detalle sea inolvidable.</em></h2><a class="mkt-button" href="#/bodas">Elegir nuestro diseño <span aria-hidden="true">↗</span></a></section>
  </main>${mktFooter()}</div>`;
}

function bodasPage() {
  return `<div class="mkt-page">${mktHeader("bodas")}<main><section class="mkt-catalog-hero mkt-container"><p class="mkt-eyebrow">LA COLECCIÓN · BODAS</p><h1>No hay dos historias iguales.<br><em>Tampoco sus invitaciones.</em></h1><p>Románticos, naturales o contemporáneos.<br>Encuentren su estilo y háganlo suyo, detalle a detalle.</p><div class="mkt-catalog-meta"><span>03 diseños</span><span>09 paletas</span><span>Infinitas historias</span></div></section>${mktDesignSection(false)}<section class="mkt-palette-editorial mkt-container"><div><p class="mkt-eyebrow">EL COLOR TAMBIÉN CUENTA SU HISTORIA</p><h2>Una misma emoción.<br><em>Nueve maneras de expresarla.</em></h2><p>Del dorado atemporal a un rosado suave. Cada paleta transforma fondos, detalles y tipografía de su invitación.</p><a class="mkt-text-link" href="#/playground?tema=versalles&paleta=dorado">Probar las combinaciones <span aria-hidden="true">↗</span></a></div><div class="mkt-palette-board">${mktPaletteList().map(p => `<a href="#/playground?tema=versalles&paleta=${encodeURIComponent(p.id)}" aria-label="Probar paleta ${escapeHtml(p.name)}" style="--palette-color:${escapeHtml(p.color)};--palette-paper:${escapeHtml(p.paper || '#f7f3ec')}"><span class="mkt-palette-sample"><i>V<span>&</span>M</i></span><span>${escapeHtml(p.name)}</span></a>`).join("")}</div></section><section class="mkt-catalog-features mkt-container"><div><span aria-hidden="true">♡</span><h3>Su esencia, en cada detalle</h3><p>Textos, imágenes y secciones pensados para contar su historia.</p></div><div><span aria-hidden="true">↗</span><h3>Una experiencia completa</h3><p>De la invitación al panel de invitados, todo conectado.</p></div><div><span aria-hidden="true">✳</span><h3>Bonita en cualquier pantalla</h3><p>Diseños que acompañan a sus invitados donde estén.</p></div></section><section class="mkt-final-cta mkt-container"><p class="mkt-eyebrow">YA ENCONTRARON SU ESTILO</p><h2>Ahora viene<br><em>la parte más suya.</em></h2><a class="mkt-button" href="#/start?tema=versalles&paleta=dorado&plan=premium">Crear nuestro evento <span aria-hidden="true">↗</span></a><a class="mkt-secondary-cta" href="#/plans">Ver qué incluye cada plan</a></section></main>${mktFooter()}</div>`;
}

function pricingPage() {
  const liveCheckout = typeof apiMode !== 'undefined' && apiMode;
  const signedIn = typeof isAuthed === 'function' && isAuthed();
  const billingAvailable = typeof paymentMode !== 'undefined' && paymentMode === 'mock';
  const plans = [
    {id: 'essential', name: 'Esencial', intro: 'El primer detalle de su gran día.', label: 'Para empezar a soñar', features: ['3 diseños y 9 paletas', 'Datos, fotos e historia de la pareja', 'Itinerario y lugares del evento', 'Confirmación de asistencia', 'Vista móvil y escritorio']},
    {id: 'premium', name: 'Premium', intro: 'Su invitación y la organización, juntas.', label: 'La experiencia completa', features: ['Todo lo incluido en Esencial', 'Gestión de invitados y grupos', 'Pases y enlaces personalizados', 'Importación y exportación de listas', 'Distribución de mesas', 'Música y galería de recuerdos']},
    {id: 'deluxe', name: 'Deluxe', intro: 'Cada detalle merece su propio espacio.', label: 'Una celebración muy suya', features: ['Todo lo incluido en Premium', 'Secciones de familia y padrinos', 'Opciones y lista de regalos', 'Notas privadas por invitado', 'Respaldo y restauración del evento', 'Control de secciones de la invitación']}
  ];
  return `<div class="mkt-page">${mktHeader("plans")}<main><section class="mkt-catalog-hero mkt-container"><p class="mkt-eyebrow">UNA EXPERIENCIA A SU MEDIDA</p><h1>Elijan cómo quieren<br><em>comenzar su historia.</em></h1><p>${liveCheckout ? billingAvailable ? 'El checkout de esta instalación es solo una simulación local.' : 'La contratación está deshabilitada aquí. El cobro se realiza en un servicio externo aún no conectado.' : 'Conozcan las opciones y preparen su evento. En esta demostración pueden explorar las funciones sin cobros.'}</p></section><section class="mkt-pricing mkt-container"><div class="mkt-plan-grid">${plans.map(plan => {
    const product = WEDDING_PLANS.find(item => item.id === plan.id);
    const price = product ? new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',maximumFractionDigits:0}).format(product.price) : '';
    const action = liveCheckout
      ? !billingAvailable ? `<button class="mkt-button ${plan.id !== 'premium' ? 'mkt-button-outline' : ''}" type="button" disabled aria-describedby="billing-unavailable">Cobro externo no conectado</button>` : signedIn ? `<button class="mkt-button ${plan.id !== 'premium' ? 'mkt-button-outline' : ''}" data-plan-checkout="${plan.id}">Probar compra ficticia <span aria-hidden="true">↗</span></button>` : `<a class="mkt-button ${plan.id !== 'premium' ? 'mkt-button-outline' : ''}" href="#/login?next=plans">Ingresa para probar</a>`
      : `<a class="mkt-button ${plan.id !== 'premium' ? 'mkt-button-outline' : ''}" href="#/start?tema=versalles&paleta=dorado&plan=${plan.id}">Elegir ${plan.name} <span aria-hidden="true">↗</span></a>`;
    return `<article class="mkt-plan ${plan.id === 'premium' ? 'mkt-plan-featured' : ''}">${plan.id === 'premium' ? '<span class="mkt-plan-ribbon">PARA TENERLO TODO EN UN LUGAR</span>' : ''}<p class="mkt-eyebrow">${plan.label}</p><h2>${plan.name}</h2><p class="mkt-plan-intro">${plan.intro}</p><div class="mkt-plan-price"><strong>${liveCheckout?price:'Explorar'}</strong><span>${liveCheckout ? billingAvailable ? 'PEN · simulación, sin cobro' : 'PEN · precio informativo' : 'Configuración de demostración · sin pago'}</span></div>${action}<ul>${plan.features.map(f => `<li><span aria-hidden="true">✓</span>${f}</li>`).join('')}</ul></article>`;
  }).join('')}</div><p class="mkt-plans-note" id="billing-unavailable">${liveCheckout ? billingAvailable ? 'La demo simula aprobación y rechazo; no mueve dinero ni se conecta a una pasarela.' : 'Contratación deshabilitada. El servicio externo de billing debe activarse por separado; estos precios son informativos.' : 'Planes ilustrativos. La selección guarda su preferencia; todas las funciones locales siguen disponibles para probar el sistema. No se procesa ninguna contratación.'}</p></section><section class="mkt-plan-help mkt-container"><div><p class="mkt-eyebrow">PRIMERO, ENCUENTREN SU ESTILO</p><h2>La elección empieza<br><em>con una emoción.</em></h2></div><div><p>Si todavía no saben por dónde empezar, recorran la colección. Prueben un color, cambien el diseño y dejen que su historia encuentre su forma.</p><a href="#/bodas" class="mkt-text-link">Volver a los diseños <span aria-hidden="true">↗</span></a></div></section></main>${mktFooter()}</div>`;
}

function bindMarketingPage(current = "home") {
  document.querySelectorAll('[data-theme-swatch]').forEach(button => {
    button.addEventListener('click', () => {
      const theme = mktThemeList().find(t => t.id === button.dataset.themeSwatch);
      const palette = mktPaletteList().find(p => p.id === button.dataset.palette);
      if (!theme || !palette) return;
      mktSelections[theme.id] = palette.id;
      const card = button.closest('[data-design]');
      card.style.setProperty('--card-accent', palette.color);
      card.style.setProperty('--card-paper', palette.paper || '#f8f4ed');
      card.querySelectorAll('[data-theme-swatch]').forEach(item => {
        const selected = item.dataset.palette === palette.id;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      card.querySelector('[data-palette-label]').textContent = palette.name;
      card.querySelectorAll('[data-design-link]').forEach(link => {
        link.href = mktPlaygroundLink(theme, palette);
        if (link.classList.contains('mkt-design-photo')) link.setAttribute('aria-label', `Ver invitación ${theme.name} en ${palette.name}`);
      });
    });
  });
  document.querySelectorAll('[data-feature]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-feature]').forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      const panel = document.getElementById('mkt-platform-panel');
      panel.innerHTML = mktPlatformPanel(button.dataset.feature);
      panel.setAttribute('aria-labelledby', button.id);
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...document.querySelectorAll('[data-feature]')];
      let index = tabs.indexOf(button);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else index = (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      tabs[index].click();
      tabs[index].focus();
    });
  });
  document.querySelectorAll('[data-mkt-section]').forEach(link => {
    link.addEventListener('click', event => {
      const section = document.getElementById(link.dataset.mktSection);
      if (section) {
        event.preventDefault();
        section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const section = params.get('section');
  if (section && ['platform', 'how', 'faq'].includes(section)) requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }));
}
