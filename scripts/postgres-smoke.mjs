import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

const databaseUrl = process.env.DATABASE_URL || '';
if (process.env.SMOKE_CONFIRM !== 'isolated-database') {
  throw new Error('Define SMOKE_CONFIRM=isolated-database para confirmar una DB desechable.');
}
let databaseName = '';
try { databaseName = new URL(databaseUrl).pathname.slice(1); } catch { /* Validated below. */ }
if (!databaseUrl || !/(smoke|test|audit)/i.test(databaseName)) {
  throw new Error('DATABASE_URL debe apuntar a una DB aislada cuyo nombre contenga smoke, test o audit.');
}

const app = await createApp({ env: {
  ...process.env,
  NODE_ENV: 'development',
  PAYMENT_PROVIDER: 'mock',
  SESSION_SECRET: 'postgres-smoke-session-secret-000000000000',
} });

await new Promise((resolve, reject) => {
  app.server.once('error', reject);
  app.server.listen(0, '127.0.0.1', resolve);
});
const { port } = app.server.address();
const base = `http://127.0.0.1:${port}`;

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0] || '',
  };
}

async function createAccount(label) {
  const email = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const password = 'SmokePassword-2026';
  const registration = await request('/api/auth/register', { method: 'POST', body: { email } });
  assert.equal(registration.status, 202);
  const tokenMatch = registration.data.verificationUrl?.match(/[?&]token=([^&]+)/);
  assert.ok(tokenMatch, 'development registration returns verification URL');
  const verification = await request('/api/auth/verify', { method: 'POST', body: { token: decodeURIComponent(tokenMatch[1]), password } });
  assert.equal(verification.status, 200);
  const login = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200);
  assert.ok(login.cookie);
  return { email, password, cookie: login.cookie };
}

const state = {
  event: {
    bride: 'Cuenta', groom: 'Prueba', date: '2027-10-10', ceremonyTime: '17:00', receptionTime: '19:00',
    venue: 'Lugar de prueba', address: 'Lima', phrase: 'Evento aislado', dressCode: 'Formal', deadline: '2027-10-01',
    theme: 'versalles', palette: 'dorado', plan: 'essential', planStatus: 'demo', sections: { rsvp: true, songs: true, gallery: true },
  },
  itinerary: [], gifts: [], tables: [], floorObjects: [], songs: [], gallery: [], galleryEnabled: true,
  guests: [{ id: 1, code: 'INV-POSTGRES-SMOKE', name: 'Invitado Prueba', phone: '', passes: 2, status: 'pending', members: [], table: null }],
};

try {
  assert.equal((await request('/api/ready')).data.storage, 'postgres');
  const accountA = await createAccount('tenant-a');
  const created = await request('/api/events', { method: 'POST', cookie: accountA.cookie, body: { state } });
  assert.equal(created.status, 201);
  const event = created.data.event;
  assert.ok(event.id && event.slug);

  const published = await request(`/api/events/${event.id}/publish`, { method: 'POST', cookie: accountA.cookie, body: { published: true } });
  assert.equal(published.status, 200);
  assert.equal((await request(`/api/public/state?event=${event.slug}`)).status, 200);

  const rsvp = await request('/api/public/rsvp', { method: 'POST', body: {
    event: event.slug, code: 'INV-POSTGRES-SMOKE', name: 'Invitado Prueba', status: 'confirmed', passes: 1, members: 'Invitado Prueba', attendanceType: 'full',
  } });
  assert.equal(rsvp.status, 200);
  const stored = await request('/api/state', { cookie: accountA.cookie });
  assert.equal(stored.data.state.guests[0].status, 'confirmed');

  const checkout = await request('/api/payments/checkout', { method: 'POST', cookie: accountA.cookie, body: { planId: 'premium' } });
  assert.equal(checkout.status, 201);
  const approved = await request(`/api/payments/${checkout.data.payment.id}/demo-result`, { method: 'POST', cookie: accountA.cookie, body: { status: 'approved' } });
  assert.equal(approved.status, 200);
  assert.equal((await request('/api/state', { cookie: accountA.cookie })).data.state.event.plan, 'premium');

  const accountB = await createAccount('tenant-b');
  const crossed = await request(`/api/events/${event.id}/select`, { method: 'POST', cookie: accountB.cookie });
  assert.equal(crossed.status, 404);
  const crossedPayment = await request(`/api/payments/${checkout.data.payment.id}`, { cookie: accountB.cookie });
  assert.equal(crossedPayment.status, 200);
  assert.equal(crossedPayment.data.payment, null);

  console.log('PostgreSQL smoke OK: migrations, auth, event, publish, public writes, mock payment, tenant isolation.');
} finally {
  await app.close();
}
