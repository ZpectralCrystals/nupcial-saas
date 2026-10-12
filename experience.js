/* Shared catalog: the same design selection travels from storefront to client. */
const WEDDING_PALETTES = [
  {id:'dorado',name:'Dorado Elegante',color:'#a66b0a',paper:'#faf5eb',ink:'#342c23',accent:'#d9c398'},
  {id:'navy',name:'Azul Navy',color:'#1b2a4a',paper:'#f3f4f7',ink:'#19243b',accent:'#b8c2d1'},
  {id:'verde_olivo',name:'Verde Olivo',color:'#6b7840',paper:'#f4f5eb',ink:'#303a26',accent:'#b6bf94'},
  {id:'celeste',name:'Celeste',color:'#4d78a8',paper:'#f1f7fb',ink:'#263d54',accent:'#b4cfe2'},
  {id:'terracota',name:'Terracota',color:'#b5684a',paper:'#fbf1e9',ink:'#492e26',accent:'#d9ae8e'},
  {id:'rojo',name:'Rojo Clásico',color:'#8c2323',paper:'#fbf3ef',ink:'#472526',accent:'#d6aaaa'},
  {id:'verde_esmeralda',name:'Verde Esmeralda',color:'#27895a',paper:'#eef7f1',ink:'#1e3d2c',accent:'#a9d3b6'},
  {id:'rosado',name:'Rosado',color:'#ac517c',swatch:'#e7a0bd',paper:'#fff4f7',ink:'#593044',accent:'#e7b8ca'},
  {id:'multicolor',name:'Multicolor',color:'#ba4664',swatch:'#e65d74',paper:'#fff5ea',ink:'#4c3546',accent:'#e7b173'},
];
const WEDDING_THEMES = [
  {id:'versalles',name:'Versalles',description:'Romance clásico, detalles ornamentales y un aire de celebración atemporal.',image:'assets/wedding-versalles.png',defaultPalette:'dorado'},
  {id:'terra',name:'Terra',description:'Texturas cálidas, formas orgánicas y la belleza de lo natural.',image:'assets/wedding-terra.png',defaultPalette:'terracota'},
  {id:'classic',name:'Classic',description:'Composición editorial, líneas limpias y elegancia contemporánea.',image:'assets/wedding-classic.png',defaultPalette:'navy'},
];
const WEDDING_PLANS = [
  {id:'essential',name:'Esencial',passes:50,price:69},
  {id:'premium',name:'Premium',passes:150,price:119},
  {id:'deluxe',name:'Deluxe',passes:350,price:199},
];
const WEDDING_SECTIONS = [
  {id:'family',name:'Familia y padrinos',selector:'.w-family'},
  {id:'countdown',name:'Cuenta regresiva y calendario',selector:'.w-count-section'},
  {id:'itinerary',name:'Itinerario',selector:'.w-itinerary',parent:true},
  {id:'dress',name:'Código de vestimenta',selector:'.w-dress'},
  {id:'rsvp',name:'Confirmación de asistencia',selector:'.w-rsvp'},
  {id:'gifts',name:'Mesa de regalos',selector:'.w-gifts'},
  {id:'songs',name:'Sugerencias musicales',selector:'#public-song',parent:true},
];
let weddingEnvelopeOpen = false;
let playgroundDevice = 'desktop';
let weddingTimer = null;
let startDraft = null;
let startStep = 1;
let startSelectionKey = '';

function weddingSelection(params = hashParams()) {
  const theme = WEDDING_THEMES.find(t => t.id === params.get('tema')) || WEDDING_THEMES.find(t=>t.id===db.event.theme) || WEDDING_THEMES[0];
  const palette = WEDDING_PALETTES.find(p => p.id === params.get('paleta')) || (!params.has('tema') && WEDDING_PALETTES.find(p=>p.id===db.event.palette)) || WEDDING_PALETTES.find(p=>p.id===theme.defaultPalette);
  const plan = WEDDING_PLANS.find(p => p.id === params.get('plan')) || WEDDING_PLANS.find(p=>p.id===db.event.plan) || WEDDING_PLANS[1];
  return {theme,palette,plan};
}
function designQuery(selection) {
  return new URLSearchParams({tema:selection.theme.id,paleta:selection.palette.id,plan:selection.plan.id}).toString();
}
function newCustomerState(setup) {
  const palette=WEDDING_PALETTES.find(item=>item.id===setup.palette)||WEDDING_PALETTES[0];
  const theme=WEDDING_THEMES.find(item=>item.id===setup.theme)||WEDDING_THEMES[0];
  const plan=WEDDING_PLANS.find(item=>item.id===setup.plan)||WEDDING_PLANS[0];
  return {
    ...structuredClone(seed),
    event:{
      ...structuredClone(seed.event),...setup,
      ceremonyTime:'16:00',receptionTime:'18:00',phrase:'',dressCode:'',deadline:'',giftMethod:'',avoidColors:'',adultsOnly:false,
      parentsBride:'',parentsGroom:'',godparents:'',backgroundMusic:'',thanksTitle:'Gracias',
      thanksMessage:'Gracias por acompañarnos en este día tan especial.',
      theme:theme.id,palette:palette.id,primary:palette.color,plan:plan.id,planStatus:'demo',sections:{},
    },
    itinerary:[],gifts:[],guests:[],tables:[],floorObjects:[],songs:[],gallery:[],galleryEnabled:true,
  };
}
function paletteStyle(p) { return `--w-color:${p.color};--w-paper:${p.paper};--w-ink:${p.ink};--w-accent:${p.accent}`; }
function themePhoto(theme, event) {
  const custom=event.coverPhoto;
  return typeof custom==='string' && /^data:image\/(png|jpeg|webp);base64,/.test(custom) ? custom : theme.image;
}
function paletteButtons(selected, attr='data-play-palette') {
  return WEDDING_PALETTES.map(p=>`<button type="button" class="w-swatch ${p.id===selected?'selected':''}" style="--swatch:${p.swatch||p.color}" ${attr}="${p.id}" aria-label="${p.name}" aria-pressed="${p.id===selected}" title="${p.name}"><span></span></button>`).join('');
}
function playgroundPage() {
  const s=weddingSelection();
  return `<main class="playground"><header class="play-toolbar"><a href="#/bodas" class="play-back">← <span>Modelos</span></a><div class="play-title"><strong>${s.theme.name}</strong><span>${s.palette.name} · ${s.plan.name}</span></div><div class="play-devices" aria-label="Tamaño de vista previa"><button data-play-device="desktop" aria-pressed="${playgroundDevice==='desktop'}" title="Vista escritorio">▱ <span>Escritorio</span></button><button data-play-device="mobile" aria-pressed="${playgroundDevice==='mobile'}" title="Vista móvil">▯ <span>Móvil</span></button></div><a class="btn" href="#/start?${designQuery(s)}">Elegir este diseño <span>↗</span></a></header>
    <div class="play-layout"><aside class="play-options"><a class="brand" href="#/home"><span class="brand-mark">N</span>Nupcial</a><p class="eyebrow">Hazlo tuyo</p><h1>Un estilo.<br>Su historia.</h1><p class="play-caption">Explora cada combinación y abre el sobre para vivir la invitación.</p><fieldset><legend>01 · Diseño</legend><div class="play-theme-list">${WEDDING_THEMES.map(t=>`<button class="play-theme ${s.theme.id===t.id?'selected':''}" data-play-theme="${t.id}" aria-pressed="${s.theme.id===t.id}"><img src="${t.image}" alt=""><span><strong>${t.name}</strong><small>${t.id==='versalles'?'Clásico y romántico':t.id==='terra'?'Orgánico y cálido':'Editorial y minimal'}</small></span><span>${s.theme.id===t.id?'✓':'↗'}</span></button>`).join('')}</div></fieldset><fieldset><legend>02 · Paleta de color</legend><div class="w-swatches">${paletteButtons(s.palette.id)}</div><p class="play-palette-name">${s.palette.name}</p><div class="palette-strip"><span style="background:${s.palette.color}"></span><span style="background:${s.palette.accent}"></span><span style="background:${s.palette.paper}"></span></div></fieldset><fieldset><legend>03 · Plan de referencia</legend><select class="select" id="play-plan" aria-label="Plan de referencia">${WEDDING_PLANS.map(p=>`<option value="${p.id}" ${s.plan.id===p.id?'selected':''}>${p.name} · ${p.passes} pases</option>`).join('')}</select><small>Selección de demostración. No se realiza ningún cobro.</small></fieldset><button class="btn secondary" data-wedding="replay">↻ Volver a ver el sobre</button><p class="play-hint">3 diseños · 9 paletas · 27 combinaciones</p></aside>
    <section class="play-stage"><div class="play-frame ${playgroundDevice==='mobile'?'is-mobile':''}" id="wedding-scroll">${weddingMarkup(s, true)}</div><div class="play-stage-caption"><span>VISTA INTERACTIVA</span><span>Personaliza nombres, fotos y detalles después de elegir.</span></div></section></div></main>`;
}

function weddingPage() {
  const s=weddingSelection(new URLSearchParams());
  const code=hashParams().get('guest');
  const guest=code&&db.guests.find(item=>item.code===code);
  const needsRemote=typeof apiMode!=='undefined'&&apiMode&&(typeof publicContextActive!=='undefined'?publicContextActive:!isAuthed());
  if((needsRemote&&!remotePublic)||(code&&!guest)){
    const message=(typeof publicLoadError!=='undefined'&&publicLoadError)||'Este enlace personalizado no es válido o ya no está activo. Pide a los organizadores un enlace actualizado.';
    return `<main class="wedding-live"><section class="w-public-error" role="alert"><span>◇</span><p class="w-eyebrow">INVITACIÓN NO DISPONIBLE</p><h1>No pudimos abrir<br><i>este enlace.</i></h1><p>${escapeHtml(message)}</p>${needsRemote?'<button class="w-button" type="button" data-public-retry>Intentar de nuevo</button>':''}<a class="w-button outline" href="#/home">Volver al inicio</a></section></main>`;
  }
  const notice=(typeof remotePublic!=='undefined'&&remotePublic)|| (typeof apiMode!=='undefined'&&apiMode)?'Demo servida por el sistema':'Vista local · No publicada';
  return `<main class="wedding-live"><div class="w-local-notice">${notice} <a href="#/${isAuthed()?'invitation':'home'}">${isAuthed()?'Volver al panel':'Conoce Nupcial'} ↗</a></div>${weddingMarkup(s,false)}</main>`;
}

function weddingMarkup(s, demo) {
  const event=demo?{...seed.event,bride:'Valentina',groom:'Mateo',theme:s.theme.id,palette:s.palette.id}:db.event;
  const itinerary=demo?seed.itinerary:db.itinerary;
  const gifts=demo?seed.gifts:db.gifts;
  const family=[[
    `Familia de ${event.bride}`,event.parentsBride,
  ],[
    `Familia de ${event.groom}`,event.parentsGroom,
  ],['Nuestros padrinos',event.godparents]].filter(([,details])=>String(details||'').trim());
  const showItinerary=demo||(event.sections?.itinerary!==false&&itinerary.length>0);
  const showDress=demo||Boolean(String(event.dressCode||'').trim()||String(event.avoidColors||'').trim()||event.adultsOnly);
  const showGifts=demo||(event.sections?.gifts!==false&&Boolean(String(event.giftMethod||'').trim()||gifts.length));
  const guest=demo?null:db.guests.find(g=>g.code===hashParams().get('guest'));
  const guestPasses=Number.isSafeInteger(guest?.passes)&&guest.passes>=1&&guest.passes<=20?guest.passes:10;
  const guestCount=Number.isSafeInteger(guest?.confirmedCount)&&guest.confirmedCount>=1&&guest.confirmedCount<=guestPasses?guest.confirmedCount:guestPasses;
  const photo=themePhoto(s.theme,event);
  const closed=!demo && window.NupcialCore?.isDeadlinePassed(event.deadline);
  const monogram=`${event.bride.slice(0,1)}${event.groom.slice(0,1)}`;
  const envelope=`<section class="w-envelope ${weddingEnvelopeOpen?'is-open':''}" aria-label="Sobre de invitación"><div class="w-envelope-inner"><div class="w-eyebrow">Una invitación para celebrar</div><div class="w-envelope-monogram">${escapeHtml(monogram)}</div><p class="w-envelope-to">${guest?`Para ${escapeHtml(guest.name)}`:'Estás cordialmente invitado'}</p><h2>Nuestra boda</h2><p>${escapeHtml(event.bride)} & ${escapeHtml(event.groom)}</p><button class="w-seal" data-wedding="open" aria-label="Abrir invitación"><span>${escapeHtml(monogram)}</span></button><p class="w-envelope-instruction">Toca el sello para abrir</p><time>${formatDate(event.date)}</time></div><div class="w-envelope-flap"></div></section>`;
  return `<article class="wedding w-${s.theme.id} ${demo?'w-demo':''} ${playgroundDevice==='mobile'&&demo?'w-narrow':''}" style="${paletteStyle(s.palette)}">${envelope}
    <div class="w-content ${weddingEnvelopeOpen?'is-open':''}" ${weddingEnvelopeOpen?'':'inert'}>
      <section class="w-hero"><img class="w-hero-image" src="${escapeHtml(photo)}" alt="Pareja celebrando su boda"><div class="w-hero-shade"></div><div class="w-hero-copy"><span class="w-eyebrow">Nos casamos</span><div class="w-ornament">◇</div><h1>${escapeHtml(event.bride)}<i>&</i>${escapeHtml(event.groom)}</h1><p class="w-date">${formatDate(event.date)}</p><p class="w-hero-phrase">${escapeHtml(event.phrase)}</p><button class="w-scroll" data-wedding="details" aria-label="Ver detalles de la boda">↓</button></div></section>
      <section class="w-section w-intro" id="w-details"><span class="w-eyebrow">Nuestra historia, un nuevo capítulo</span><h2>Hay momentos que<br><i>se viven mejor juntos.</i></h2><p>Con mucha ilusión queremos compartir este día con las personas que forman parte de nuestra vida.</p>${family.length?`<div class="w-family">${family.map(([title,details])=>`<div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(details)}</p></div>`).join('')}</div>`:''}<div class="w-ornament">✧</div></section>
      <section class="w-count-section"><span class="w-eyebrow">Cada vez falta menos</span><h2>El gran día</h2><div class="w-countdown" data-countdown="${escapeHtml(`${event.date}T${event.ceremonyTime||'16:00'}:00-05:00`)}"></div>${weddingCalendarMarkup(event.date)}<button class="w-button" data-wedding="calendar">＋ Guardar la fecha</button><span class="w-small">${formatDate(event.date)}</span></section>
      <section class="w-section"><span class="w-eyebrow">Nos vemos aquí</span><h2>Un lugar para<br><i>recordar siempre.</i></h2><div class="w-venues">${[['Ceremonia',event.ceremonyTime,'◇'],['Recepción',event.receptionTime,'♧']].map(([name,time,icon])=>`<div><span class="w-line-icon">${icon}</span><h3>${name}</h3><p class="w-venue-name">${escapeHtml(event.venue)}</p><p>${escapeHtml(event.address)}</p><strong>${escapeHtml(time)} h</strong><a class="w-button outline" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}" target="_blank" rel="noopener">Ver ubicación ↗</a></div>`).join('')}</div></section>
      <section class="w-story-image"><img src="${escapeHtml(photo)}" alt="Retrato de la pareja" loading="lazy"><div><span>El comienzo de</span><h2>nuestro siempre.</h2></div></section>
      ${showItinerary?`<section class="w-section"><span class="w-eyebrow">Así será nuestro día</span><h2>Momentos para<br><i>celebrar.</i></h2><div class="w-itinerary">${itinerary.map(x=>`<div><span class="w-moment-icon">${escapeHtml(x.icon)}</span><time>${escapeHtml(x.time)}</time><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description||'')}</p></div>`).join('')}</div></section>`:''}
      ${showDress?`<section class="w-dress"><span class="w-eyebrow">Código de vestimenta</span><h2>${escapeHtml(event.dressCode)}</h2>${event.dressCode?'<p>Nos encantará verte con tu mejor estilo.</p>':''}${event.avoidColors?`<div class="w-colors"><span></span><span></span><span></span></div><p>Colores a evitar: ${escapeHtml(event.avoidColors)}</p>`:''}${event.adultsOnly?'<p class="w-adults">Una celebración solo para adultos.</p>':''}</section>`:''}
      <section class="w-section w-rsvp" id="rsvp-public"><span class="w-eyebrow">Tu lugar está reservado</span><h2>¿Nos<br><i>acompañas?</i></h2>${guest?`<p>${escapeHtml(guest.name)} · ${guestPasses} pases reservados</p>`:''}${closed?'<div class="w-response-box"><h3>Confirmaciones cerradas</h3><p>El plazo para responder ha terminado.</p></div>':`<p>${event.deadline?`Confirma antes del ${formatDate(event.deadline)}.`:'Nos encantará saber si vienes.'}</p><form id="${demo?'demo-rsvp':'public-rsvp'}" class="w-form"><input type="hidden" name="guestId" value="${escapeHtml(guest?.id||'')}"><label>Tu nombre<input class="input" name="name" required maxlength="120" value="${escapeHtml(guest?.name||'')}"></label><div class="w-form-row"><label>Respuesta<select class="select" name="status"><option value="confirmed">Sí, allí estaremos</option><option value="declined">No podremos asistir</option></select></label><label>Tipo de evento<select class="select" name="attendanceType"><option value="full" ${guest?.attendanceType==='ceremony'?'':'selected'}>Evento completo</option><option value="ceremony" ${guest?.attendanceType==='ceremony'?'selected':''}>Solo ceremonia</option></select></label><label>Personas<input class="input" type="number" min="1" max="${guestPasses}" name="passes" value="${guestCount}" required></label></div><label>Nombres de acompañantes<textarea class="textarea" name="members" placeholder="Un nombre por línea">${escapeHtml((guest?.members||[]).join('\n'))}</textarea></label><label>Un mensaje para nosotros<textarea class="textarea" name="message" placeholder="Nos hará ilusión leerte">${escapeHtml(guest?.message||'')}</textarea></label><button class="w-button" type="submit">Confirmar asistencia ↗</button>${demo?'<small>Formulario de muestra. Puedes probarlo.</small>':''}</form>`}</section>
      ${showGifts?`<section class="w-section w-gifts"><span class="w-eyebrow">Con mucho cariño</span><h2>El mejor regalo<br><i>es tenerte cerca.</i></h2>${event.giftMethod?`<p>${escapeHtml(event.giftMethod)}</p>`:''}<div class="w-gift-grid">${gifts.map(g=>`<article><span class="w-line-icon">♧</span><h3>${escapeHtml(g.title)}</h3><p>${escapeHtml(g.detail)}</p></article>`).join('')}</div></section>`:''}
      <section class="w-section"><span class="w-eyebrow">La banda sonora</span><h2>Una canción,<br><i>un recuerdo.</i></h2><p>¿Cuál no puede faltar en la pista?</p><form id="${demo?'demo-song':'public-song'}" class="w-form"><label>Canción<input class="input" name="title" required maxlength="160"></label><label>Artista<input class="input" name="artist" required maxlength="160"></label><label>Tu nombre<input class="input" name="requester" required value="${escapeHtml(guest?.name||'')}" maxlength="120"></label><button class="w-button">Sugerir canción ♫</button></form></section>
      ${(demo||db.galleryEnabled)?`<section class="w-section w-photos"><span class="w-eyebrow">Desde tu mirada</span><h2>Lo bonito<br><i>se comparte.</i></h2><p>Reúne aquí tus fotos favoritas de la celebración.</p><div class="w-photo-grid">${(demo?[{src:photo},{src:WEDDING_THEMES[1].image},{src:WEDDING_THEMES[2].image}]:db.gallery).slice(0,6).map(p=>`<img src="${escapeHtml(p.src)}" alt="Recuerdo de boda" loading="lazy">`).join('')}</div>${demo?'<button class="w-button outline" data-wedding="demo-photo">Probar galería</button>':'<label class="w-button outline">＋ Compartir fotos<input type="file" id="public-gallery-upload" accept="image/png,image/jpeg,image/webp" multiple hidden></label>'}</section>`:''}
      <footer class="w-footer"><div class="w-ornament">◇</div><h2>${escapeHtml(event.thanksTitle)}</h2><p>${escapeHtml(event.thanksMessage)}</p><div class="w-signature">${escapeHtml(event.bride)} & ${escapeHtml(event.groom)}</div><a href="#/home">Hecho con cariño · Nupcial</a></footer>
      ${event.musicData&&!demo?`<audio id="w-audio" src="${escapeHtml(event.musicData)}" loop></audio><button class="w-music" data-wedding="music" aria-label="Reproducir o pausar música">♫</button>`:''}
    </div>
  </article>`;
}

function updateCountdown() {
  document.querySelectorAll('[data-countdown]').forEach(el=>{
    let secs=Math.max(0,Math.floor((new Date(el.dataset.countdown).getTime()-Date.now())/1000)) || 0;
    const parts=[Math.floor(secs/86400),Math.floor(secs%86400/3600),Math.floor(secs%3600/60),secs%60];
    el.innerHTML=parts.map((value,i)=>`<div><strong>${String(value).padStart(2,'0')}</strong><span>${['Días','Horas','Minutos','Segundos'][i]}</span></div>`).join('');
  });
}

function weddingCalendarMarkup(value) {
  if(!window.NupcialCore.isCalendarDate(value)) return '';
  const [year,month,day]=value.split('-').map(Number);
  const first=new Date(year,month-1,1);
  const blank=(first.getDay()+6)%7;
  const count=new Date(year,month,0).getDate();
  const title=first.toLocaleDateString('es-PE',{month:'long',year:'numeric'});
  return `<div class="w-calendar" aria-label="Calendario de la boda"><h3>${title}</h3><div class="w-calendar-grid">${['L','M','M','J','V','S','D'].map(d=>`<span class="w-calendar-day">${d}</span>`).join('')}${'<span></span>'.repeat(blank)}${Array.from({length:count},(_,i)=>`<span class="${i+1===day?'w-calendar-selected':''}" ${i+1===day?'aria-label="Día de la boda"':''}>${i+1}</span>`).join('')}</div></div>`;
}

function startPage() {
  const requestedSelection=designQuery(weddingSelection());
  if(!startDraft || startSelectionKey!==requestedSelection){const s=weddingSelection();startSelectionKey=requestedSelection;startDraft={bride:'',groom:'',date:'',venue:'',address:'',...startDraft,theme:s.theme.id,palette:s.palette.id,plan:s.plan.id};startStep=1;}
  const theme=WEDDING_THEMES.find(t=>t.id===startDraft.theme);
  const palette=WEDDING_PALETTES.find(p=>p.id===startDraft.palette);
  const plan=WEDDING_PLANS.find(p=>p.id===startDraft.plan);
  return `<main class="start-page">${mktHeader('')}<section class="start-layout"><aside class="start-photo"><img src="${theme.image}" alt="Estilo ${theme.name}"><div><span class="eyebrow">Una historia que empieza aquí</span><h2>Hagámoslo<br><i>muy ustedes.</i></h2><p>${theme.name} · ${palette.name}</p></div></aside><section class="start-form-wrap"><a href="#/playground?tema=${theme.id}&paleta=${palette.id}&plan=${plan.id}" class="start-back">← Volver al diseño</a><ol class="start-steps">${['Sus datos','Su estilo','Todo listo'].map((x,i)=>`<li class="${startStep>=i+1?'active':''}"><span>${i+1}</span>${x}</li>`).join('')}</ol><p class="eyebrow">Paso ${startStep} de 3</p><h1>${startStep===1?'Cuéntennos de ustedes.':startStep===2?'Los pequeños detalles.':'Su invitación toma forma.'}</h1>
    ${startStep===1?`<p>Empecemos con lo esencial. Podrán cambiar cada detalle desde su panel.</p><form id="start-details" class="form-grid"><label class="field">Nombre de persona 1<input class="input" name="bride" autocomplete="off" value="${escapeHtml(startDraft.bride)}" required maxlength="60" placeholder="Valentina"></label><label class="field">Nombre de persona 2<input class="input" name="groom" autocomplete="off" value="${escapeHtml(startDraft.groom)}" required maxlength="60" placeholder="Mateo"></label><label class="field wide">Fecha de la boda<input class="input" name="date" type="date" value="${startDraft.date}" required></label><label class="field wide">Lugar de celebración<input class="input" name="venue" value="${escapeHtml(startDraft.venue)}" placeholder="Nombre del lugar" required maxlength="160"></label><label class="field wide">Dirección<input class="input" name="address" value="${escapeHtml(startDraft.address)}" placeholder="Ciudad y dirección" maxlength="200"></label><button class="btn wide">Continuar →</button></form>`:''}
    ${startStep===2?`<p>Elijan su combinación. La selección llegará a su panel y a su invitación.</p><fieldset class="start-fieldset"><legend>Diseño</legend><div class="start-theme-options">${WEDDING_THEMES.map(t=>`<button data-start-theme="${t.id}" aria-pressed="${theme.id===t.id}"><img src="${t.image}" alt=""><strong>${t.name}</strong></button>`).join('')}</div></fieldset><fieldset class="start-fieldset"><legend>Paleta · ${palette.name}</legend><div class="w-swatches">${paletteButtons(palette.id,'data-start-palette')}</div></fieldset><fieldset class="start-fieldset"><legend>Plan de muestra</legend><div class="start-plan-options">${WEDDING_PLANS.map(p=>`<button data-start-plan="${p.id}" aria-pressed="${p.id===plan.id}"><span>${p.name}</span><small>${p.passes} pases</small></button>`).join('')}</div></fieldset><div class="actions"><button class="btn secondary" data-start-step="1">Atrás</button><button class="btn" data-start-step="3">Continuar →</button></div>`:''}
    ${startStep===3?`<p>Revisen su celebración antes de crear su espacio.</p><div class="start-summary"><div><span>Celebración</span><strong>${escapeHtml(startDraft.bride)} & ${escapeHtml(startDraft.groom)}</strong></div><div><span>Fecha</span><strong>${formatDate(startDraft.date)}</strong></div><div><span>Lugar</span><strong>${escapeHtml(startDraft.venue)}</strong></div><div><span>Diseño</span><strong>${theme.name} · ${palette.name}</strong></div><div><span>Plan elegido</span><strong>${plan.name} · ${plan.passes} pases</strong></div></div><p class="note">Se creará un espacio privado y vacío bajo tu cuenta. Confirmar correo antes de entrar. Plan y pago siguen en modo demo; no se cobra.</p><div class="actions"><button class="btn secondary" data-start-step="2">Atrás</button><button class="btn" id="start-finish">Crear cuenta y celebración →</button></div>`:''}
    </section></section></main>`;
}

function clientDesignPanel() {
  const s=weddingSelection(new URLSearchParams());
  return `<h2>Diseño y paleta</h2><p>Esta selección se aplica a tu invitación pública.</p><div class="client-theme-grid">${WEDDING_THEMES.map(t=>`<button type="button" data-client-theme="${t.id}" aria-pressed="${s.theme.id===t.id}"><img src="${t.image}" alt=""><strong>${t.name}</strong></button>`).join('')}</div><h3>${s.palette.name}</h3><div class="w-swatches">${paletteButtons(s.palette.id,'data-client-palette')}</div><div class="palette-strip"><span style="background:${s.palette.color}"></span><span style="background:${s.palette.accent}"></span><span style="background:${s.palette.paper}"></span></div><a class="btn secondary" href="#/playground?${designQuery(s)}">Explorar diseño completo ↗</a><a class="btn" href="#/public">Abrir mi invitación</a>`;
}

function clientSectionsPanel() {
  return `<fieldset class="client-sections"><legend>Secciones de tu invitación</legend><p>Elige qué verán tus invitados. Los datos se conservan al ocultar una sección.</p>${WEDDING_SECTIONS.map(section=>`<label class="client-section-toggle"><span>${section.name}</span><input type="checkbox" data-wedding-section="${section.id}" ${db.event.sections?.[section.id]===false?'':'checked'}></label>`).join('')}<label class="client-section-toggle"><span>Galería colaborativa</span><input type="checkbox" data-wedding-section="gallery" ${db.galleryEnabled?'checked':''}></label></fieldset>`;
}

function bindExperiencePage(current) {
  clearInterval(weddingTimer);
  if(current==='invitation' && document.querySelector('.client-theme-grid')) document.querySelector('.client-theme-grid').closest('.editor-form').insertAdjacentHTML('beforeend',clientSectionsPanel());
  document.querySelectorAll('[data-wedding-section]').forEach(input=>input.addEventListener('change',()=>{
    if(input.dataset.weddingSection==='gallery')db.galleryEnabled=input.checked;
    else db.event.sections={...db.event.sections,[input.dataset.weddingSection]:input.checked};
    if(!saveDB('Secciones actualizadas'))render();
  }));
  if(['playground','public'].includes(current)) {
    if(current==='public') for(const section of WEDDING_SECTIONS){if(db.event.sections?.[section.id]===false){let element=document.querySelector(section.selector);if(section.parent)element=element?.closest('.w-section');if(element)element.style.display='none';}}
    document.querySelector('.w-photos')?.setAttribute('id','public-gallery');
    const guest=!['playground'].includes(current) && db.guests.find(g=>g.code===hashParams().get('guest'));
    const responseForm=document.getElementById('public-rsvp');
    if(responseForm && guest) responseForm.elements.status.value=guest.status==='declined'?'declined':'confirmed';
    if(responseForm){const syncCount=()=>{const declined=responseForm.elements.status.value==='declined';responseForm.elements.passes.disabled=declined;responseForm.elements.members.disabled=declined;};responseForm.elements.status.addEventListener('change',syncCount);syncCount();}
    updateCountdown(); weddingTimer=setInterval(updateCountdown,1000);
    document.querySelector('#play-plan')?.addEventListener('change',e=>changePlaySelection('plan',e.target.value));
    ['demo-rsvp','demo-song'].forEach(id=>document.getElementById(id)?.addEventListener('submit',e=>{e.preventDefault();e.currentTarget.innerHTML='<div class="w-demo-success"><span>✓</span><h3>¡Así de sencillo!</h3><p>En tu invitación, esta respuesta aparecerá en tu panel.</p><button class="w-button" type="button" data-wedding="demo-reset">Volver a probar</button></div>';}));
  }
  document.querySelector('#start-details')?.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));for(const key of ['bride','groom','venue','address'])data[key]=data[key].trim();if(!data.bride||!data.groom||!data.venue||!window.NupcialCore.isCalendarDate(data.date)){toast('Completa nombres, lugar y una fecha válida');return;}Object.assign(startDraft,data);startStep=2;render();window.scrollTo(0,0);});
  document.querySelector('#start-finish')?.addEventListener('click',()=>{
    const palette=WEDDING_PALETTES.find(p=>p.id===startDraft.palette);
    const customerSetup={...startDraft,primary:palette.color,planStatus:'demo'};
    if(isAuthed()&&typeof tenantMode!=='undefined'&&tenantMode){createTenantWorkspace(newCustomerState(customerSetup)).catch(error=>toast(error.message));return;}
    if(isAuthed()){toast('Esta instalación demo conserva su evento existente.');go('dashboard');return;}
    if(typeof apiMode!=='undefined' && apiMode && !isAuthed()){
      sessionStorage.setItem('nupcial-pending-setup',JSON.stringify(customerSetup));
      startDraft=null;go('register');return;
    }
    db=newCustomerState(customerSetup);
    if(saveDB('Tu espacio está listo')===false)return;
    sessionStorage.setItem(AUTH_KEY,'1');startDraft=null;go('dashboard');
  });
}
function changePlaySelection(key,value) {
  const params=hashParams();params.set(key,value);
  go(`playground?${params.toString()}`);
}
function scrollWedding(selector){document.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'});}
function saveWeddingCalendar() {
  const event=route()==='playground'?seed.event:db.event;
  const esc=v=>String(v).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const dt=`${event.date.replaceAll('-','')}T${(event.ceremonyTime||'16:00').replace(':','')}00`;
  const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nupcial//Boda//ES','BEGIN:VEVENT',`UID:nupcial-${event.date}@demo.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z')}`,`DTSTART;TZID=America/Lima:${dt}`,`SUMMARY:${esc(`Boda de ${event.bride} y ${event.groom}`)}`,`LOCATION:${esc(event.venue+', '+event.address)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  downloadFile('nuestra-boda.ics',content,'text/calendar;charset=utf-8');
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-play-theme],[data-play-palette],[data-play-device],[data-wedding],[data-start-step],[data-start-theme],[data-start-palette],[data-start-plan],[data-client-theme],[data-client-palette]');if(!b)return;
  if(b.dataset.playTheme)changePlaySelection('tema',b.dataset.playTheme);
  if(b.dataset.playPalette)changePlaySelection('paleta',b.dataset.playPalette);
  if(b.dataset.playDevice){playgroundDevice=b.dataset.playDevice;render();}
  if(b.dataset.wedding==='open'){weddingEnvelopeOpen=true;const root=b.closest('.wedding');root.querySelector('.w-envelope').classList.add('is-open');root.querySelector('.w-envelope').setAttribute('inert','');root.querySelector('.w-content').classList.add('is-open');root.querySelector('.w-content').removeAttribute('inert');root.querySelector('.w-scroll')?.focus({preventScroll:true});}
  if(b.dataset.wedding==='replay'){weddingEnvelopeOpen=false;render();}
  if(b.dataset.wedding==='details')scrollWedding('#w-details');
  if(b.dataset.wedding==='calendar')saveWeddingCalendar();
  if(b.dataset.wedding==='demo-photo')toast('La galería permite recibir fotos desde tu invitación. Actívala en tu panel.');
  if(b.dataset.wedding==='demo-reset')render();
  if(b.dataset.wedding==='music'){const audio=document.getElementById('w-audio');if(audio){if(audio.paused){try{await audio.play();b.textContent='Ⅱ';}catch{toast('No se pudo reproducir el audio');}}else{audio.pause();b.textContent='♫';}}}
  if(b.dataset.startStep){startStep=Number(b.dataset.startStep);render();window.scrollTo(0,0);}
  if(b.dataset.startTheme){startDraft.theme=b.dataset.startTheme;render();}
  if(b.dataset.startPalette){startDraft.palette=b.dataset.startPalette;render();}
  if(b.dataset.startPlan){startDraft.plan=b.dataset.startPlan;render();}
  if(b.dataset.clientTheme){db.event.theme=b.dataset.clientTheme;saveDB('Diseño actualizado');render();}
  if(b.dataset.clientPalette){db.event.palette=b.dataset.clientPalette;db.event.primary=WEDDING_PALETTES.find(p=>p.id===b.dataset.clientPalette).color;saveDB('Paleta actualizada');render();}
});
