const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../core.js');

const source = ['experience.js', 'marketing.js'].map(file => ({ file, code: fs.readFileSync(path.join(__dirname, '..', file), 'utf8') }));

function harness(hash = '#/playground?tema=versalles&paleta=dorado&plan=premium') {
  const event = {
    bride: 'Demo bride', groom: 'Demo groom', date: '2027-09-18', ceremonyTime: '16:30', receptionTime: '18:00',
    venue: 'Jardín de demostración', address: 'Una dirección de muestra', phrase: 'Una nueva historia',
    dressCode: 'Elegante', deadline: '2027-08-30', giftMethod: 'Un regalo de muestra', primary: '#875c46',
    avoidColors: 'Blanco', parentsBride: 'Familia de muestra', parentsGroom: 'Otra familia de muestra',
    godparents: 'Padrinos de muestra', thanksTitle: 'Gracias', thanksMessage: 'Por estar aquí',
  };
  const seed = {
    event,
    itinerary: [{ id: 1, time: '16:30', icon: '◇', title: 'Ceremonia de muestra', description: 'Un momento para compartir' }],
    gifts: [{ id: 1, title: 'Regalo de muestra', detail: 'Detalles de muestra' }],
    guests: [], songs: [], gallery: [], tables: [], galleryEnabled: true,
  };
  const db = structuredClone(seed);
  db.event = { ...db.event, bride: 'PRIVATE_BRIDE', groom: 'PRIVATE_GROOM', venue: 'PRIVATE_VENUE', address: 'PRIVATE_ADDRESS', phrase: 'PRIVATE_PHRASE', parentsBride: 'PRIVATE_FAMILY', coverPhoto: 'data:image/png;base64,UFJJVkFURQ==', theme: 'classic', palette: 'navy', plan: 'essential' };
  db.guests = [{ id: 5, name: 'PRIVATE_GUEST', code: 'PRIVATE_CODE', passes: 2, status: 'pending', members: [], message: '' }];
  db.gifts = [{ id: 1, title: 'PRIVATE_GIFT', detail: 'PRIVATE_ACCOUNT' }];
  db.itinerary = [{ id: 1, time: '18:00', icon: '◇', title: 'PRIVATE_ITINERARY', description: 'PRIVATE_DESCRIPTION' }];
  db.gallery = [{ id: 1, src: 'data:image/png;base64,UFJJVkFURQ==', by: 'PRIVATE_GUEST' }];
  const handlers = new Map();
  const elements = new Map();
  const storage = new Map();
  const state = { saves: [], routes: [], renderCount: 0, failSave: false };
  const document = {
    addEventListener(name, handler) { handlers.set(name, handler); },
    querySelector(selector) { return elements.get(selector) || null; },
    querySelectorAll() { return []; },
    getElementById(id) { return elements.get('#' + id) || null; },
  };
  const window = { NupcialCore: core, scrollTo() {}, matchMedia() { return { matches: true }; } };
  const location = { hash };
  const context = vm.createContext({
    URLSearchParams, console, document, window, location, seed, db, structuredClone,
    AUTH_KEY: 'nupcial-test-auth',
    escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); },
    formatDate(value) { return 'DATE:' + value; },
    hashParams() { return new URLSearchParams(location.hash.split('?')[1] || ''); },
    route() { return location.hash.replace(/^#\/?/, '').split('?')[0]; },
    isAuthed() { return storage.get('nupcial-test-auth') === '1'; },
    sessionStorage: { setItem(key, value) { storage.set(key, value); }, getItem(key) { return storage.get(key) || null; } },
    setInterval() { return 1; }, clearInterval() {}, requestAnimationFrame(callback) { callback(); },
    render() { state.renderCount++; },
    toast() {},
    go(route) { state.routes.push(route); location.hash = '#/' + route; },
    saveDB() { if (state.failSave) return false; state.saves.push(structuredClone(context.db)); return true; },
    downloadFile() {},
    FormData: class {
      constructor(form) { this.entries = Object.entries(form.formData); }
      [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
    },
  });
  source.forEach(({ file, code }) => vm.runInContext(code, context, { filename: file }));
  const evaluate = code => vm.runInContext(code, context);
  function element(selector) {
    const listeners = {};
    const value = { addEventListener(name, handler) { listeners[name] = handler; }, listeners };
    elements.set(selector, value);
    return value;
  }
  return { context, state, evaluate, location, document, storage, element, handlers };
}

test('all 27 design/palette combinations render correct styling, artwork and start URL', () => {
  const h = harness();
  const themes = h.evaluate('WEDDING_THEMES');
  const palettes = h.evaluate('WEDDING_PALETTES');
  let combinations = 0;
  for (const theme of themes) for (const palette of palettes) {
    h.location.hash = `#/playground?tema=${theme.id}&paleta=${palette.id}&plan=deluxe`;
    const html = h.evaluate('playgroundPage()');
    assert.ok(html.includes(`class="wedding w-${theme.id} w-demo`), `${theme.id}/${palette.id}: theme class`);
    assert.ok(html.includes(`--w-color:${palette.color};--w-paper:${palette.paper};--w-ink:${palette.ink};--w-accent:${palette.accent}`), `${theme.id}/${palette.id}: palette variables`);
    assert.ok(html.includes(`class="w-hero-image" src="${theme.image}"`), `${theme.id}/${palette.id}: hero artwork`);
    assert.ok(html.includes(`href="#/start?tema=${theme.id}&paleta=${palette.id}&plan=deluxe"`), `${theme.id}/${palette.id}: selected design survives navigation`);
    assert.equal((html.match(/data-play-palette=/g) || []).length, 9);
    assert.ok(fs.existsSync(path.join(__dirname, '..', theme.image)), `missing image ${theme.image}`);
    combinations++;
  }
  assert.equal(combinations, 27);
});

test('showroom and marketing pages never render current customer content or mutate it', () => {
  const h = harness('#/playground?tema=terra&paleta=rosado&plan=premium&guest=PRIVATE_CODE');
  const initial = JSON.stringify(h.context.db);
  for (const renderer of ['playgroundPage()', 'homePage()', 'bodasPage()', 'pricingPage()']) {
    const html = h.evaluate(renderer);
    assert.doesNotMatch(html, /PRIVATE_|UFJJVkFURQ==/, renderer);
    assert.doesNotMatch(html, /undefined|NaN/, renderer);
  }
  assert.equal(JSON.stringify(h.context.db), initial);
  assert.equal(h.state.saves.length, 0);
});

test('catalog presents exactly three designs, nine accessible palette choices per design', () => {
  const h = harness();
  const html = h.evaluate('bodasPage()');
  assert.equal((html.match(/data-design="/g) || []).length, 3);
  assert.equal((html.match(/data-theme-swatch=/g) || []).length, 27);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 3);
  assert.ok(html.includes('href="#/playground?tema=versalles&paleta=dorado"'));
  assert.ok(html.includes('href="#/playground?tema=terra&paleta=terracota"'));
  assert.ok(html.includes('href="#/playground?tema=classic&paleta=navy"'));
  for (const palette of h.evaluate('WEDDING_PALETTES')) assert.ok(html.includes(`aria-label="Probar paleta ${palette.name}"`));
});

test('plan links and chooser use the same three plan identities', () => {
  const h = harness();
  const expected = ['essential', 'premium', 'deluxe'];
  assert.deepEqual(Array.from(h.evaluate('WEDDING_PLANS'), p => p.id), expected);
  const pricing = h.evaluate('pricingPage()');
  for (const id of expected) {
    assert.ok(pricing.includes(`href="#/start?tema=versalles&paleta=dorado&plan=${id}"`));
    h.location.hash = `#/playground?tema=classic&paleta=celeste&plan=${id}`;
    const playground = h.evaluate('playgroundPage()');
    assert.ok(playground.includes(`href="#/start?tema=classic&paleta=celeste&plan=${id}"`));
  }
});

test('external billing plan UI is informational and cannot start checkout', () => {
  const h = harness('#/plans');
  h.context.apiMode = true;
  h.context.paymentMode = 'external';
  h.storage.set('nupcial-test-auth', '1');
  const html = h.evaluate('pricingPage()');
  assert.match(html, /Contratación deshabilitada/);
  assert.match(html, /Cobro externo no conectado/);
  assert.match(html, /disabled/);
  assert.doesNotMatch(html, /data-plan-checkout=/);
  assert.match(html, /precio informativo/);
});

test('unknown showroom query values resolve to valid stored or default choices', () => {
  const h = harness('#/playground?tema=missing&paleta=missing&plan=missing');
  const selected = h.evaluate('weddingSelection()');
  assert.equal(selected.theme.id, 'classic');
  assert.equal(selected.palette.id, 'navy');
  assert.equal(selected.plan.id, 'essential');
  h.context.db.event.theme = 'missing';
  h.context.db.event.palette = 'missing';
  h.context.db.event.plan = 'missing';
  const fallback = h.evaluate('weddingSelection()');
  assert.equal(fallback.theme.id, 'versalles');
  assert.equal(fallback.palette.id, 'dorado');
  assert.equal(fallback.plan.id, 'premium');
  assert.doesNotThrow(() => h.evaluate('playgroundPage()'));
});

test('onboarding renders all three steps and escapes user-entered event data', () => {
  const h = harness('#/start?tema=terra&paleta=verde_olivo&plan=deluxe');
  const first = h.evaluate('startPage()');
  assert.ok(first.includes('id="start-details"'));
  assert.ok(first.includes('name="bride" autocomplete="off" value=""'));
  assert.doesNotMatch(first, /PRIVATE_/);
  assert.equal(h.evaluate('startDraft.theme'), 'terra');
  assert.equal(h.evaluate('startDraft.palette'), 'verde_olivo');
  assert.equal(h.evaluate('startDraft.plan'), 'deluxe');
  h.evaluate('startStep = 2');
  const second = h.evaluate('startPage()');
  assert.equal((second.match(/data-start-theme=/g) || []).length, 3);
  assert.equal((second.match(/data-start-palette=/g) || []).length, 9);
  assert.equal((second.match(/data-start-plan=/g) || []).length, 3);
  h.evaluate(`Object.assign(startDraft, {bride: '<img src=x onerror=alert(1)>', groom: 'Mateo', date: '2027-10-10', venue: 'Nuestro jardín'}); startStep = 3;`);
  const third = h.evaluate('startPage()');
  assert.ok(third.includes('id="start-finish"'));
  assert.ok(third.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!third.includes('<img src=x onerror=alert(1)>'));
  assert.ok(third.includes('DATE:2027-10-10'));
  assert.ok(third.includes('Deluxe · 350 pases'));
});

test('new-customer onboarding creates clean workspace and keeps selected design', () => {
  const h = harness('#/start?tema=terra&paleta=rojo&plan=deluxe');
  h.evaluate('startPage()');
  const form = h.element('#start-details');
  const finish = h.element('#start-finish');
  h.evaluate('bindExperiencePage("start")');
  form.listeners.submit({ preventDefault() {}, currentTarget: { formData: { bride: 'Ana', groom: 'Luis', date: '2028-05-20', venue: 'Casa Jardín', address: 'Lima' } } });
  assert.equal(h.evaluate('startStep'), 2);
  assert.equal(h.evaluate('startDraft.bride'), 'Ana');
  h.evaluate('startStep = 3');
  finish.listeners.click();
  assert.equal(h.state.saves.length, 1);
  const saved = h.state.saves[0];
  assert.equal(saved.event.theme, 'terra');
  assert.equal(saved.event.palette, 'rojo');
  assert.equal(saved.event.plan, 'deluxe');
  assert.equal(saved.event.primary, '#8c2323');
  assert.equal(saved.event.bride, 'Ana');
  assert.equal(saved.event.date, '2028-05-20');
  assert.deepEqual(JSON.parse(JSON.stringify(saved.guests)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.gallery)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.tables)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.songs)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.itinerary)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(saved.gifts)), []);
  assert.equal(saved.event.phrase, '');
  assert.equal(saved.event.parentsBride, '');
  assert.equal(h.storage.get('nupcial-test-auth'), '1');
  assert.deepEqual(h.state.routes, ['dashboard']);
  assert.equal(h.evaluate('startDraft'), null);
});

test('server-backed onboarding holds new-customer setup until successful login', () => {
  const h = harness('#/start?tema=versalles&paleta=dorado&plan=premium');
  h.evaluate('startPage()');
  const finish = h.element('#start-finish');
  h.evaluate('bindExperiencePage("start")');
  const original = JSON.stringify(h.context.db);
  h.context.apiMode = true;
  h.evaluate('startStep=3; Object.assign(startDraft,{bride:"Ana",groom:"Luis",date:"2028-05-20",venue:"Casa Jardín"})');
  finish.listeners.click();
  assert.equal(JSON.stringify(h.context.db), original, 'existing browser snapshot stays untouched before login');
  assert.equal(h.state.saves.length, 0);
  assert.equal(h.storage.get('nupcial-pending-setup') && JSON.parse(h.storage.get('nupcial-pending-setup')).bride, 'Ana');
  assert.deepEqual(h.state.routes, ['register']);
});

test('fresh public invitation hides optional sections until client adds their content', () => {
  const h = harness('#/public');
  h.evaluate(`db=newCustomerState({bride:'Ana',groom:'Luis',date:'2028-05-20',venue:'Casa Jardín',address:'Lima',theme:'versalles',palette:'dorado',plan:'premium'});`);
  const html = h.evaluate('weddingMarkup(weddingSelection(new URLSearchParams()), false)');
  for (const emptySection of ['class="w-family"', 'class="w-itinerary"', 'class="w-dress"', 'class="w-gifts"']) assert.ok(!html.includes(emptySection), emptySection);
  assert.ok(html.includes('id="rsvp-public"'), 'RSVP remains available in new invite');
  assert.ok(html.includes('Jardín') || html.includes('Casa Jardín'));
});

test('returning from the showroom with a new selection updates the draft without losing names', () => {
  const h = harness('#/start?tema=versalles&paleta=dorado&plan=essential');
  h.evaluate('startPage()');
  h.evaluate("startDraft.bride = 'Ana'; startDraft.groom = 'Luis';");
  h.location.hash = '#/start?tema=classic&paleta=verde_esmeralda&plan=deluxe';
  const html = h.evaluate('startPage()');
  assert.equal(h.evaluate('startDraft.theme'), 'classic');
  assert.equal(h.evaluate('startDraft.palette'), 'verde_esmeralda');
  assert.equal(h.evaluate('startDraft.plan'), 'deluxe');
  assert.equal(h.evaluate('startDraft.bride'), 'Ana');
  assert.equal(h.evaluate('startDraft.groom'), 'Luis');
  assert.ok(html.includes('value="Ana"'));
});

test('live invitation consumes saved event data and guest context while showroom uses sample names', () => {
  const h = harness('#/public?guest=PRIVATE_CODE');
  const html = h.evaluate('weddingPage()');
  assert.ok(html.includes('PRIVATE_BRIDE'));
  assert.ok(html.includes('PRIVATE_GROOM'));
  assert.ok(html.includes('Para PRIVATE_GUEST'));
  assert.ok(html.includes('PRIVATE_ACCOUNT'));
  assert.ok(html.includes('class="w-hero-image" src="data:image/png;base64,UFJJVkFURQ=="'));
  assert.ok(html.includes('class="wedding w-classic'));
  assert.ok(html.includes('name="attendanceType"'));
  assert.ok(html.includes('<option value="full" selected>Evento completo</option>'));
  h.location.hash = '#/playground?tema=terra&paleta=terracota';
  const demo = h.evaluate('playgroundPage()');
  assert.ok(demo.includes('Valentina'));
  assert.ok(demo.includes('Mateo'));
  assert.doesNotMatch(demo, /PRIVATE_|UFJJVkFURQ==/);
});

test('invalid personalized links show unavailable state instead of sample wedding', () => {
  const h = harness('#/public?guest=NOT_FOUND');
  h.context.apiMode = true;
  h.context.remotePublic = false;
  h.context.publicLoadError = 'Este enlace personalizado no es válido.';
  const html = h.evaluate('weddingPage()');
  assert.match(html, /INVITACIÓN NO DISPONIBLE/);
  assert.match(html, /data-public-retry/);
  assert.match(html, /enlace personalizado no es válido/i);
  assert.doesNotMatch(html, /PRIVATE_BRIDE|PRIVATE_GUEST/);
});

test('malicious remote cover strings fall back to local theme artwork', () => {
  const h = harness();
  for (const coverPhoto of ['javascript:alert(1)', 'https://example.com/track.png', 'data:image/svg+xml,<svg/>', '<img src=x>']) {
    h.context.coverPhoto = coverPhoto;
    assert.equal(h.evaluate('themePhoto(WEDDING_THEMES[0], {coverPhoto})'), 'assets/wedding-versalles.png');
  }
});

test('imported ceremony time cannot escape the countdown attribute', () => {
  const h = harness('#/public');
  h.context.db.event.ceremonyTime = '16:30" onmouseover="alert(1)//';
  const html = h.evaluate('weddingPage()');
  assert.equal(/data-countdown="[^"]*" onmouseover=/.test(html), false, 'ceremony time must not introduce another HTML attribute');
});
