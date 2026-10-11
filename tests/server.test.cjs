const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const fixture = () => ({
  event: { bride: 'Demo A', groom: 'Demo B', date: '2027-09-18', deadline: '2027-08-30', venue: 'Lugar de muestra', address: 'Ubicación pública', phrase: 'Historia de muestra', primary: '#875c46', plan: 'essential', planStatus: 'demo', secretInternal: 'DO_NOT_EXPOSE' },
  itinerary: [], gifts: [], guests: [{ id: 7, code: 'INV-DEMO7', name: 'Grupo de muestra', passes: 2, status: 'pending', phone: '+51000000000', notes: 'PRIVATE_NOTE', members: [], table: 1 }],
  tables: [{ id: 1, name: 'Mesa privada', seats: 2 }], songs: [{ id: 1, title: 'Aprobada', artist: 'Demo', requester: 'Invitado', status: 'approved' }, { id: 2, title: 'Pendiente privada', artist: 'Demo', requester: 'Otro', status: 'pending' }],
  gallery: [], galleryEnabled: true, floorObjects: [],
});

async function setup(t, envOverrides = {}) {
  const [{ createApp, FileStore }, temp] = await Promise.all([
    import('../server.mjs'), fs.mkdtemp(path.join(os.tmpdir(), 'nupcial-test-')),
  ]);
  const store = new FileStore(path.join(temp, 'state.json'));
  await store.init();
  const app = await createApp({ env: { NODE_ENV: 'test', PAYMENT_PROVIDER: 'mock', APP_EMAIL: 'demo@boda.local', APP_PASSWORD: 'secret-tests-only', SESSION_SECRET: 'session-secret-tests-only-0123456789', ...envOverrides }, store });
  app.server.listen(0, '127.0.0.1');
  await new Promise(resolve => app.server.once('listening', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(async () => { await app.close(); await fs.rm(temp, { recursive: true, force: true }); });
  async function request(route, { method = 'GET', body, cookie } = {}) {
    return fetch(`${base}${route}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function login() {
    const response = await request('/api/auth/login', { method: 'POST', body: { email: 'demo@boda.local', password: 'secret-tests-only' } });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  return { base, request, login, store };
}

test('owner API requires server-side credentials and cookie session; state updates use revisions', async t => {
  const app = await setup(t);
  assert.equal((await app.request('/api/state')).status, 401);
  assert.equal((await app.request('/api/auth/login', { method: 'POST', body: { email: 'demo@boda.local', password: 'wrong' } })).status, 401);
  const cookie = await app.login();
  const empty = await (await app.request('/api/state', { cookie })).json();
  assert.deepEqual(empty, { state: null, version: 0 });
  const first = await app.request('/api/state', { method: 'PUT', cookie, body: { state: fixture(), version: 0 } });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).version, 1);
  const update = fixture(); update.event.phrase = 'Cambio correcto';
  const accepted = await app.request('/api/state', { method: 'PUT', cookie, body: { state: update, version: 1 } });
  assert.equal(accepted.status, 200);
  const stale = await app.request('/api/state', { method: 'PUT', cookie, body: { state: fixture(), version: 1 } });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).version, 2);
  assert.equal((await (await app.request('/api/state', { cookie })).json()).state.event.phrase, 'Cambio correcto');
  assert.equal((await app.request('/api/auth/logout', { method: 'POST', cookie })).status, 200);
  assert.deepEqual(await (await app.request('/api/auth/session', { cookie })).json(), { authenticated: false, email: null, accountId: null, activeEventId: null, legacy: false });
  assert.equal((await app.request('/api/state', { cookie })).status, 401);
});

test('public event response redacts private fields; RSVP writes only validated fields to server state', async t => {
  const app = await setup(t);
  const cookie = await app.login();
  await app.request('/api/state', { method: 'PUT', cookie, body: { state: fixture(), version: 0 } });
  const response = await app.request('/api/public/state?guest=INV-DEMO7');
  assert.equal(response.status, 200);
  assert.equal((await app.request('/api/public/state?guest=UNKNOWN-CODE')).status, 404);
  const visible = await response.json();
  const publicText = JSON.stringify(visible);
  assert.doesNotMatch(publicText, /DO_NOT_EXPOSE|PRIVATE_NOTE|\+51000000000|Pendiente privada|Mesa privada/);
  assert.match(publicText, /Grupo de muestra/);
  const rejected = await app.request('/api/public/rsvp', { method: 'POST', body: { code: 'INV-DEMO7', name: 'Grupo de muestra', status: 'confirmed', passes: 3, members: 'Ana\nLuis' } });
  assert.equal(rejected.status, 400);
  const saved = await app.request('/api/public/rsvp', { method: 'POST', body: { code: 'INV-DEMO7', name: 'Grupo de muestra', status: 'confirmed', passes: 2, members: 'Ana\nLuis', message: '¡Nos vemos!', attendanceType: 'ceremony' } });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).guest.confirmedCount, 2);
  const stored = await (await app.request('/api/state', { cookie })).json();
  assert.equal(stored.state.guests[0].status, 'confirmed');
  assert.equal(stored.state.guests[0].attendanceType, 'ceremony');
  assert.equal(stored.state.guests[0].table, null);
  assert.equal(stored.state.guests[0].notes, 'PRIVATE_NOTE');
  const repeated = await app.request('/api/public/rsvp', { method: 'POST', body: { code: 'INV-DEMO7', name: 'Grupo actualizado', status: 'declined', passes: 0, attendanceType: 'full' } });
  assert.equal(repeated.status, 200);
  const afterRepeat = await (await app.request('/api/state', { cookie })).json();
  assert.equal(afterRepeat.state.guests.length, 1, 'same code updates same guest instead of duplicating');
  assert.equal(afterRepeat.state.guests[0].name, 'Grupo actualizado');
  assert.equal(afterRepeat.state.guests[0].status, 'declined');
});

test('general RSVP returns reusable personal code for future updates', async t => {
  const app = await setup(t);
  const cookie = await app.login();
  await app.request('/api/state', { method: 'PUT', cookie, body: { state: fixture(), version: 0 } });
  const created = await app.request('/api/public/rsvp', { method: 'POST', body: { name: 'Nuevo grupo', status: 'confirmed', passes: 2, members: 'Uno\nDos', attendanceType: 'ceremony' } });
  assert.equal(created.status, 200);
  const { guest } = await created.json();
  assert.match(guest.code, /^INV-[A-F0-9]{24}$/);
  const found = await app.request(`/api/public/state?guest=${encodeURIComponent(guest.code)}`);
  assert.equal(found.status, 200);
  const update = await app.request('/api/public/rsvp', { method: 'POST', body: { code: guest.code, name: 'Nuevo grupo', status: 'confirmed', passes: 1, members: 'Uno', attendanceType: 'full' } });
  assert.equal(update.status, 200);
  const stored = await (await app.request('/api/state', { cookie })).json();
  assert.equal(stored.state.guests.length, 2);
  assert.equal(stored.state.guests.find(item => item.code === guest.code).confirmedCount, 1);
});

test('public gallery validates image bytes and section switches are enforced by the API', async t => {
  const app = await setup(t);
  const cookie = await app.login();
  const state = fixture();
  await app.request('/api/state', { method: 'PUT', cookie, body: { state, version: 0 } });
  assert.equal((await app.request('/api/public/gallery', { method: 'POST', body: { src: 'data:image/png;base64,aGVsbG8=' } })).status, 400);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/dZsAAAAASUVORK5CYII=';
  assert.equal((await app.request('/api/public/gallery', { method: 'POST', body: { src: png } })).status, 201);
  state.event.sections = { songs: false, rsvp: false };
  const latest = await (await app.request('/api/state', { cookie })).json();
  assert.equal((await app.request('/api/state', { method: 'PUT', cookie, body: { state, version: latest.version } })).status, 200);
  assert.equal((await app.request('/api/public/songs', { method: 'POST', body: { title: 'Canción', artist: 'Demo', requester: 'Invitado' } })).status, 403);
  assert.equal((await app.request('/api/public/rsvp', { method: 'POST', body: { code: 'INV-DEMO7', name: 'Grupo', status: 'confirmed', passes: 1, members: 'Ana' } })).status, 403);
});

test('mock checkout uses server price and changes plan only after a pending checkout is approved', async t => {
  const app = await setup(t);
  const cookie = await app.login();
  await app.request('/api/state', { method: 'PUT', cookie, body: { state: fixture(), version: 0 } });
  const checkoutResponse = await app.request('/api/payments/checkout', { method: 'POST', cookie, body: { planId: 'premium', amount: 0, currency: 'USD' } });
  assert.equal(checkoutResponse.status, 201);
  const checkout = await checkoutResponse.json();
  assert.equal(checkout.payment.amount, 119);
  assert.equal(checkout.payment.currency, 'PEN');
  assert.equal(checkout.payment.status, 'pending');
  const refused = await app.request(`/api/payments/${checkout.payment.id}/demo-result`, { method: 'POST', cookie, body: { status: 'rejected' } });
  assert.equal((await refused.json()).payment.status, 'rejected');
  assert.equal((await (await app.request('/api/state', { cookie })).json()).state.event.plan, 'essential');
  const second = await (await app.request('/api/payments/checkout', { method: 'POST', cookie, body: { planId: 'deluxe' } })).json();
  const approved = await app.request(`/api/payments/${second.payment.id}/demo-result`, { method: 'POST', cookie, body: { status: 'approved' } });
  assert.equal((await approved.json()).payment.status, 'approved');
  const state = await (await app.request('/api/state', { cookie })).json();
  assert.equal(state.state.event.plan, 'deluxe');
  assert.equal(state.state.event.planStatus, 'active');
  const replay = await (await app.request(`/api/payments/${second.payment.id}/demo-result`, { method: 'POST', cookie, body: { status: 'rejected' } })).json();
  assert.equal(replay.payment.status, 'approved');
  assert.equal((await (await app.request('/api/state', { cookie })).json()).state.event.plan, 'deluxe');
});

test('mock checkout can be left pending or cancelled without activating a plan', async t => {
  const app = await setup(t);
  const cookie = await app.login();
  await app.request('/api/state', { method: 'PUT', cookie, body: { state: fixture(), version: 0 } });
  const checkout = await (await app.request('/api/payments/checkout', { method: 'POST', cookie, body: { planId: 'premium' } })).json();
  const pending = await app.request(`/api/payments/${checkout.payment.id}/demo-result`, { method: 'POST', cookie, body: { status: 'pending' } });
  assert.equal((await pending.json()).payment.status, 'pending');
  const cancelled = await app.request(`/api/payments/${checkout.payment.id}/demo-result`, { method: 'POST', cookie, body: { status: 'cancelled' } });
  assert.equal((await cancelled.json()).payment.status, 'cancelled');
  const state = await (await app.request('/api/state', { cookie })).json();
  assert.equal(state.state.event.plan, 'essential');
  assert.equal(state.state.event.planStatus, 'demo');
});

test('external billing mode rejects checkout without creating a payment record', async t => {
  const app = await setup(t, { PAYMENT_PROVIDER: 'external' });
  const cookie = await app.login();
  await app.request('/api/state', { method: 'PUT', cookie, body: { state: fixture(), version: 0 } });
  const response = await app.request('/api/payments/checkout', { method: 'POST', cookie, body: { planId: 'premium' } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /servicio externo de billing/);
  assert.deepEqual(await app.store.listPayments(), []);
  assert.equal((await app.request('/api/webhooks/mercadopago')).status, 404);
});

test('external billing mode creates no checkout and never calls a provider', async () => {
  const { createPaymentProvider } = await import('../server/payments.mjs');
  const provider = createPaymentProvider({ mode: 'external' });
  assert.equal(provider.mode, 'external');
  await assert.rejects(() => provider.createCheckout({ payment: { id: 'demo' } }), /Cobros deshabilitados/);
  await assert.rejects(() => provider.fetchPayment('demo'), /servicio externo/);
  assert.equal(provider.verifyWebhook({}), false);
});

function tokenFrom(url) {
  const hash = new URL(url).hash;
  return new URLSearchParams(hash.slice(hash.indexOf('?') + 1)).get('token');
}

async function createVerifiedAccount(app, email) {
  const password = 'account-password-long-A!';
  const registration = await app.request('/api/auth/register', { method: 'POST', body: { email, password } });
  assert.equal(registration.status, 202);
  const { verificationUrl } = await registration.json();
  assert.ok(verificationUrl);
  const token = tokenFrom(verificationUrl);
  assert.equal((await app.request('/api/auth/login', { method: 'POST', body: { email, password } })).status, 403);
  assert.equal((await app.request('/api/auth/verify', { method: 'POST', body: { token } })).status, 200);
  const login = await app.request('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200);
  return { password, verificationToken: token, cookie: login.headers.get('set-cookie').split(';')[0] };
}

test('account signup requires single-use email verification and password reset revokes old sessions', async t => {
  const app = await setup(t);
  const { password, verificationToken, cookie } = await createVerifiedAccount(app, 'owner-one@example.test');
  assert.equal((await app.request('/api/auth/verify', { method: 'POST', body: { token: verificationToken } })).status, 400);
  assert.equal((await app.request('/api/auth/session', { cookie })).status, 200);
  const requested = await app.request('/api/auth/password-reset/request', { method: 'POST', body: { email: 'owner-one@example.test' } });
  const resetUrl = (await requested.json()).resetUrl;
  assert.ok(resetUrl);
  const token = tokenFrom(resetUrl), nextPassword = 'new-account-password-long!';
  assert.equal((await app.request('/api/auth/password-reset/confirm', { method: 'POST', body: { token, password: nextPassword } })).status, 200);
  assert.equal((await app.request('/api/auth/password-reset/confirm', { method: 'POST', body: { token, password: nextPassword } })).status, 400);
  assert.equal((await (await app.request('/api/auth/session', { cookie })).json()).authenticated, false);
  assert.equal((await app.request('/api/auth/login', { method: 'POST', body: { email: 'owner-one@example.test', password } })).status, 401);
  assert.equal((await app.request('/api/auth/login', { method: 'POST', body: { email: 'owner-one@example.test', password: nextPassword } })).status, 200);
});

test('tenant events isolate state, public RSVP, publication and event selection across accounts', async t => {
  const app = await setup(t);
  const a = await createVerifiedAccount(app, 'tenant-a@example.test');
  const aState = fixture(); aState.event.bride = 'Tenant A'; aState.guests[0].code = 'INV-TENANTA';
  const createdA = await app.request('/api/events', { method: 'POST', cookie: a.cookie, body: { state: aState } });
  assert.equal(createdA.status, 201);
  const eventA = (await createdA.json()).event;
  const stateA = await (await app.request('/api/state', { cookie: a.cookie })).json();
  assert.equal(stateA.eventId, eventA.id); assert.equal(stateA.state.event.bride, 'Tenant A');
  const publishedA = await app.request(`/api/events/${eventA.id}/publish`, { method: 'POST', cookie: a.cookie, body: { published: true } });
  assert.equal((await publishedA.json()).event.status, 'published');

  const b = await createVerifiedAccount(app, 'tenant-b@example.test');
  const emptyB = await (await app.request('/api/state', { cookie: b.cookie })).json();
  assert.equal(emptyB.state, null);
  assert.equal((await app.request(`/api/events/${eventA.id}/select`, { method: 'POST', cookie: b.cookie })).status, 404);
  assert.equal((await app.request('/api/state', { method: 'PUT', cookie: b.cookie, body: { state: fixture(), version: 0 } })).status, 409);

  const bState = fixture(); bState.event.bride = 'Tenant B'; bState.guests[0].code = 'INV-TENANTB';
  const createdB = await app.request('/api/events', { method: 'POST', cookie: b.cookie, body: { state: bState } });
  assert.equal(createdB.status, 201);
  const eventB = (await createdB.json()).event;
  assert.notEqual(eventA.slug, eventB.slug);
  assert.equal((await app.request(`/api/public/state?event=${eventA.slug}&guest=INV-TENANTA`)).status, 200);
  assert.equal((await app.request(`/api/public/state?event=${eventB.slug}&guest=INV-TENANTA`)).status, 404);
  await app.request('/api/public/rsvp', { method: 'POST', body: { event: eventA.slug, code: 'INV-TENANTA', name: 'Tenant A', status: 'confirmed', passes: 1, members: 'A' } });
  const privateA = await (await app.request('/api/state', { cookie: a.cookie })).json();
  assert.equal(privateA.state.guests[0].status, 'confirmed');
  const privateB = await (await app.request('/api/state', { cookie: b.cookie })).json();
  assert.equal(privateB.state.guests[0].status, 'pending');
  const unpublish = await app.request(`/api/events/${eventA.id}/publish`, { method: 'POST', cookie: a.cookie, body: { published: false } });
  assert.equal((await unpublish.json()).event.status, 'draft');
  assert.equal((await app.request(`/api/public/state?event=${eventA.slug}`)).status, 404);
});

test('production refuses demo provider and incomplete deployment secrets', async () => {
  const { createApp } = await import('../server.mjs');
  await assert.rejects(() => createApp({ env: { NODE_ENV: 'production' }, store: {} }), /SESSION_SECRET/);
  await assert.rejects(() => createApp({ env: {
    NODE_ENV: 'production', EMAIL_API_URL: 'https://mail.example.test/send', EMAIL_API_KEY: 'secret', EMAIL_FROM: 'noreply@example.test',
    SESSION_SECRET: 'long-secret-session-key-with-at-least-32-chars', APP_URL: 'https://demo.example.test',
    DATABASE_URL: 'postgres://unused', PAYMENT_PROVIDER: 'mock',
  }, store: {} }), /No se permite PAYMENT_PROVIDER=mock/);
  const app = await createApp({ env: {
    NODE_ENV: 'production', EMAIL_API_URL: 'https://mail.example.test/send', EMAIL_API_KEY: 'secret', EMAIL_FROM: 'noreply@example.test',
    SESSION_SECRET: 'long-secret-session-key-with-at-least-32-chars', APP_URL: 'https://demo.example.test',
    DATABASE_URL: 'postgres://unused', PAYMENT_PROVIDER: 'external',
  }, store: {} });
  assert.equal(app.config.provider, 'external');
  await app.close();
});
