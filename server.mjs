import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createPaymentProvider, PAYMENT_PLANS, PaymentError, safeEqualText } from './server/payments.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BODY_LIMIT = 16 * 1024 * 1024;
const SESSION_SECONDS = 60 * 60 * 12;
const COOKIE = 'nupcial_session';
const MIME = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

export class FileStore {
  constructor(filePath) { this.filePath = filePath; this.data = { state: null, payments: {}, sessions: {}, version: 0, accounts: {}, authTokens: {}, events: {}, rateLimits: {} }; }
  async init() {
    try {
      const data = JSON.parse(await readFile(this.filePath, 'utf8'));
      this.data = { state: data.state || null, payments: data.payments || {}, sessions: data.sessions || {}, version: Number.isSafeInteger(data.version) ? data.version : (data.state ? 1 : 0), accounts: data.accounts || {}, authTokens: data.authTokens || {}, events: data.events || {}, rateLimits: data.rateLimits || {} };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.flush();
    }
  }
  async ping() { return true; }
  async flush() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(this.data), { mode: 0o600 });
    await rename(temp, this.filePath);
  }
  async getState() { return structuredClone(this.data.state); }
  async getStateRecord() { return { state: structuredClone(this.data.state), version: this.data.version }; }
  async setState(state, expectedVersion) {
    if (expectedVersion != null && expectedVersion !== this.data.version) throw new PaymentError('El evento cambió en otra pestaña. Recarga antes de volver a guardar.', 409);
    this.data.state = structuredClone(state); this.data.version += 1; await this.flush(); return this.data.version;
  }
  async createPayment(payment) { this.data.payments[payment.id] = structuredClone(payment); await this.flush(); }
  async getPayment(id) { return structuredClone(this.data.payments[id] || null); }
  async getPaymentForSession(id, session) {
    const payment = this.data.payments[id];
    if (!payment) return null;
    if (session.legacy) return !payment.accountId && (!payment.ownerEmail || payment.ownerEmail === session.email) ? structuredClone(payment) : null;
    return payment.accountId === session.accountId && payment.eventId === session.activeEventId ? structuredClone(payment) : null;
  }
  async settlePayment(id, patch) {
    const payment = this.data.payments[id];
    if (!payment) return null;
    if (['approved', 'rejected', 'cancelled', 'failed', 'refunded', 'charged_back'].includes(payment.status)) {
      const allowedReversal = payment.status === 'approved' && ['refunded', 'charged_back'].includes(patch.status);
      if (!allowedReversal) return structuredClone(payment);
    }
    Object.assign(payment, patch, { updatedAt: new Date().toISOString() });
    const event = payment.eventId ? this.data.events[payment.eventId] : null, state = event?.state || this.data.state;
    if (patch.status === 'approved' && state?.event) {
      state.event.plan = payment.planId; state.event.planStatus = 'active'; state.event.lastPaymentId = payment.id;
      if (event) event.revision += 1; else this.data.version += 1;
    } else if (['refunded', 'charged_back'].includes(patch.status) && state?.event?.lastPaymentId === id) {
      state.event.plan = payment.previousPlan || 'essential'; state.event.planStatus = payment.previousPlanStatus || 'demo'; delete state.event.lastPaymentId;
      if (event) event.revision += 1; else this.data.version += 1;
    }
    await this.flush();
    return structuredClone(payment);
  }
  async listPayments() { return Object.values(this.data.payments); }
  async createSession(session) { this.data.sessions[session.id] = structuredClone(session); await this.flush(); }
  async getSession(id) { const session=this.data.sessions[id]; return session ? { ...structuredClone(session), legacy: !session.accountId } : null; }
  async deleteSession(id) { delete this.data.sessions[id]; await this.flush(); }
  async createAccount(account) {
    if (Object.values(this.data.accounts).some(item => item.email === account.email)) throw new PaymentError('No se pudo crear la cuenta. Verifica el correo o inicia sesión.', 409);
    this.data.accounts[account.id] = structuredClone(account); await this.flush();
  }
  async getAccountByEmail(email) { return structuredClone(Object.values(this.data.accounts).find(item => item.email === email) || null); }
  async putAuthToken(token) {
    for(const [key,value] of Object.entries(this.data.authTokens))if(value.accountId===token.accountId&&value.kind===token.kind)delete this.data.authTokens[key];
    this.data.authTokens[token.hash] = structuredClone(token); await this.flush();
  }
  async consumeAuthToken(hash, kind, now = Date.now()) {
    const token = this.data.authTokens[hash];
    if (!token || token.kind !== kind || token.expiresAt <= now || token.consumedAt) return null;
    token.consumedAt = now;
    const account = this.data.accounts[token.accountId];
    if (!account) return null;
    if (kind === 'verify') { account.status = 'active'; account.emailVerifiedAt = now; for(const item of Object.values(this.data.authTokens))if(item.accountId===account.id&&item.kind==='verify')item.consumedAt=now; }
    await this.flush();
    return structuredClone(account);
  }
  async resetAccountPassword(hash, passwordHash, now = Date.now()) {
    const token = this.data.authTokens[hash];
    if (!token || token.kind !== 'reset' || token.expiresAt <= now || token.consumedAt) return false;
    const account = this.data.accounts[token.accountId];
    if (!account || account.status !== 'active') return false;
    token.consumedAt = now; account.passwordHash = passwordHash;
    for (const [id, session] of Object.entries(this.data.sessions)) if (session.accountId === account.id) delete this.data.sessions[id];
    await this.flush(); return true;
  }
  async revokeAccountSessions(accountId) {
    for (const [id, session] of Object.entries(this.data.sessions)) if (session.accountId === accountId) delete this.data.sessions[id];
    await this.flush();
  }
  async createEvent(accountId, event) {
    const record = { ...structuredClone(event), accountId, revision: 1, createdAt: new Date().toISOString() };
    this.data.events[event.id] = record; await this.flush(); return structuredClone(record);
  }
  async listEvents(accountId) {
    return Object.values(this.data.events).filter(item => item.accountId === accountId).sort((a,b) => a.createdAt.localeCompare(b.createdAt)).map(({ id, slug, title, status, revision, createdAt, state }) => ({ id, slug, title, status, revision, createdAt, bride: state.event.bride, groom: state.event.groom, date: state.event.date, role: 'owner' }));
  }
  async setSessionEvent(sessionId, accountId, eventId) {
    const event = this.data.events[eventId], session = this.data.sessions[sessionId];
    if (!event || event.accountId !== accountId || !session || session.accountId !== accountId) return false;
    session.activeEventId = eventId; await this.flush(); return true;
  }
  async getStateForSession(session) {
    if (session.legacy) return this.getStateRecord();
    const event = this.data.events[session.activeEventId];
    if (!event || event.accountId !== session.accountId) return { state: null, version: 0, eventId: null, slug: null, eventStatus: null };
    return { state: structuredClone(event.state), version: event.revision, eventId: event.id, slug: event.slug, eventStatus: event.status };
  }
  async setStateForSession(session, state, expectedVersion) {
    if (session.legacy) return this.setState(state, expectedVersion);
    const event = this.data.events[session.activeEventId];
    if (!event || event.accountId !== session.accountId) throw new PaymentError('Selecciona una celebración antes de guardar.', 409);
    if (event.revision !== expectedVersion) throw new PaymentError('El evento cambió en otra pestaña. Recarga antes de volver a guardar.', 409);
    event.state = structuredClone(state); event.revision += 1; await this.flush(); return event.revision;
  }
  async publishEvent(session, eventId, published) {
    const event = this.data.events[eventId];
    if (!event || event.accountId !== session.accountId) return null;
    event.status = published ? 'published' : 'draft'; await this.flush();
    return { id: event.id, slug: event.slug, status: event.status };
  }
  async getPublicEvent(slug) {
    const event = Object.values(this.data.events).find(item => item.slug === slug && item.status === 'published');
    return event ? { state: structuredClone(event.state), version: event.revision, eventId: event.id, slug: event.slug, eventStatus: event.status } : null;
  }
  async updatePublicEvent(slug, mutator) {
    const event = Object.values(this.data.events).find(item => item.slug === slug && item.status === 'published');
    if (!event) throw new PaymentError('Invitación no publicada.', 404);
    const state = structuredClone(event.state), result = await mutator(state);
    event.state = state; event.revision += 1; await this.flush(); return result;
  }
  async consumeRateLimit(scope, fingerprint, limit, windowMs) {
    const key = `${scope}:${fingerprint}`, now = Date.now();
    let bucket = this.data.rateLimits[key];
    if (!bucket || now - bucket.startedAt >= windowMs) bucket = this.data.rateLimits[key] = { startedAt: now, count: 0 };
    bucket.count += 1;
    if (Object.keys(this.data.rateLimits).length > 5000) for (const [id, item] of Object.entries(this.data.rateLimits)) if (now - item.startedAt > windowMs * 2) delete this.data.rateLimits[id];
    await this.flush(); return bucket.count <= limit;
  }
  async clearRateLimit(scope, fingerprint) { delete this.data.rateLimits[`${scope}:${fingerprint}`]; await this.flush(); }
}

export class PostgresStore {
  constructor(pool) { this.pool = pool; }
  async init() {
    const migrationClient = await this.pool.connect();
    try {
      await migrationClient.query("SELECT pg_advisory_lock(hashtext('nupcial-schema-migrations'))");
      for (const migration of ['001_core_schema.sql', '002_tenant_runtime.sql']) {
        await migrationClient.query(await readFile(path.join(ROOT, 'db', 'migrations', migration), 'utf8'));
      }
    } catch (error) {
      try { await migrationClient.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      try { await migrationClient.query("SELECT pg_advisory_unlock(hashtext('nupcial-schema-migrations'))"); } catch {} finally { migrationClient.release(); }
    }
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS nupcial_demo_state (
        id smallint PRIMARY KEY CHECK (id = 1),
        payload jsonb NOT NULL,
        version bigint NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE nupcial_demo_state ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
      CREATE TABLE IF NOT EXISTS nupcial_demo_payments (
        id uuid PRIMARY KEY,
        payload jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS nupcial_demo_sessions (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }
  async ping() { await this.pool.query('SELECT 1'); return true; }
  async getState() {
    const result = await this.pool.query('SELECT payload FROM nupcial_demo_state WHERE id = 1');
    return result.rows[0]?.payload ?? null;
  }
  async getStateRecord() {
    const result = await this.pool.query('SELECT payload,version FROM nupcial_demo_state WHERE id = 1');
    return { state: result.rows[0]?.payload ?? null, version: Number(result.rows[0]?.version ?? 0) };
  }
  async setState(state, expectedVersion) {
    const result = expectedVersion == null
      ? await this.pool.query('INSERT INTO nupcial_demo_state(id,payload,version) VALUES (1,$1::jsonb,1) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,version=nupcial_demo_state.version+1,updated_at=now() RETURNING version', [JSON.stringify(state)])
      : await this.pool.query('INSERT INTO nupcial_demo_state(id,payload,version) VALUES (1,$1::jsonb,1) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,version=nupcial_demo_state.version+1,updated_at=now() WHERE nupcial_demo_state.version=$2 RETURNING version', [JSON.stringify(state), expectedVersion]);
    if (!result.rowCount) throw new PaymentError('El evento cambió en otra pestaña. Recarga antes de volver a guardar.', 409);
    return Number(result.rows[0].version);
  }
  async createPayment(payment) {
    await this.pool.query('INSERT INTO nupcial_demo_payments(id,payload) VALUES ($1,$2::jsonb)', [payment.id, JSON.stringify(payment)]);
  }
  async getPayment(id) {
    const result = await this.pool.query('SELECT payload FROM nupcial_demo_payments WHERE id=$1', [id]);
    return result.rows[0]?.payload ?? null;
  }
  async getPaymentForSession(id, session) {
    const payment = await this.getPayment(id);
    if (!payment) return null;
    if (session.legacy) return !payment.accountId && (!payment.ownerEmail || payment.ownerEmail === session.email) ? payment : null;
    return payment.accountId === session.accountId && payment.eventId === session.activeEventId ? payment : null;
  }
  async listPayments() {
    const result = await this.pool.query('SELECT payload FROM nupcial_demo_payments ORDER BY updated_at DESC LIMIT 100');
    return result.rows.map(row => row.payload);
  }
  async createSession(session) {
    if (session.accountId) {
      await this.pool.query('INSERT INTO account_sessions(id,account_id,token_hash,active_event_id,expires_at) VALUES ($1,$2,$3,$4,to_timestamp($5))', [session.id, session.accountId, session.tokenHash, session.activeEventId || null, session.expires]);
      return;
    }
    await this.pool.query('INSERT INTO nupcial_demo_sessions(id,email,expires_at) VALUES ($1,$2,to_timestamp($3))', [session.id, session.email, session.expires]);
  }
  async getSession(id) {
    const account = await this.pool.query(`SELECT s.id,a.email,extract(epoch from s.expires_at)::bigint AS expires,
      s.account_id AS "accountId",s.active_event_id AS "activeEventId"
      FROM account_sessions s JOIN accounts a ON a.id=s.account_id
      WHERE s.id=$1 AND s.token_hash=$2 AND s.expires_at>now() AND s.revoked_at IS NULL AND a.status='active'`, [id, tokenDigest(id)]);
    if (account.rows[0]) return account.rows[0];
    const result = await this.pool.query('SELECT id,email,extract(epoch from expires_at)::bigint AS expires FROM nupcial_demo_sessions WHERE id=$1 AND expires_at>now()', [id]);
    return result.rows[0] ? { ...result.rows[0], legacy: true } : null;
  }
  async deleteSession(id) { await this.pool.query('DELETE FROM nupcial_demo_sessions WHERE id=$1', [id]); await this.pool.query('DELETE FROM account_sessions WHERE id=$1', [id]); }
  async createAccount(account) {
    await this.pool.query(`INSERT INTO accounts(id,email,email_normalized,password_hash,status)
      VALUES ($1,$2,$3,$4,'pending_verification')`, [account.id, account.email, account.email, account.passwordHash]);
  }
  async getAccountByEmail(email) {
    const result = await this.pool.query(`SELECT id,email,password_hash AS "passwordHash",status,
      extract(epoch from email_verified_at)::bigint AS "emailVerifiedAt"
      FROM accounts WHERE email_normalized=$1 AND deleted_at IS NULL`, [email]);
    return result.rows[0] || null;
  }
  async putAuthToken(token) {
    const table = token.kind === 'verify' ? 'email_verification_tokens' : 'password_reset_tokens';
    await this.pool.query(`DELETE FROM ${table} WHERE account_id=$1 AND consumed_at IS NULL`, [token.accountId]);
    await this.pool.query(`INSERT INTO ${table}(id,account_id,token_hash,expires_at) VALUES ($1,$2,$3,to_timestamp($4))`, [randomUUID(), token.accountId, token.hash, token.expiresAt / 1000]);
  }
  async consumeAuthToken(hash, kind) {
    const table = kind === 'verify' ? 'email_verification_tokens' : 'password_reset_tokens';
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const token = await client.query(`SELECT id,account_id FROM ${table} WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`, [hash]);
      if (!token.rowCount) { await client.query('ROLLBACK'); return null; }
      const accountId = token.rows[0].account_id;
      if (kind === 'verify') {
        await client.query("UPDATE accounts SET status='active',email_verified_at=now(),updated_at=now() WHERE id=$1 AND status='pending_verification'", [accountId]);
        await client.query('UPDATE email_verification_tokens SET consumed_at=now() WHERE account_id=$1 AND consumed_at IS NULL', [accountId]);
      } else await client.query(`UPDATE ${table} SET consumed_at=now() WHERE id=$1`, [token.rows[0].id]);
      const account = await client.query('SELECT id,email,password_hash AS "passwordHash",status FROM accounts WHERE id=$1', [accountId]);
      await client.query('COMMIT'); return account.rows[0] || null;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async resetAccountPassword(hash, passwordHash) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const token = await client.query(`SELECT id,account_id FROM password_reset_tokens WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`, [hash]);
      if (!token.rowCount) { await client.query('ROLLBACK'); return false; }
      const accountId = token.rows[0].account_id;
      const changed = await client.query("UPDATE accounts SET password_hash=$2,updated_at=now() WHERE id=$1 AND status='active'", [accountId, passwordHash]);
      if (!changed.rowCount) { await client.query('ROLLBACK'); return false; }
      await client.query('UPDATE password_reset_tokens SET consumed_at=now() WHERE id=$1', [token.rows[0].id]);
      await client.query('UPDATE account_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL', [accountId]);
      await client.query('COMMIT'); return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async revokeAccountSessions(accountId) { await this.pool.query('UPDATE account_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL', [accountId]); }
  async createEvent(accountId, event) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO events(id,owner_account_id,slug,status,bride_name,groom_name,event_date,venue,venue_address,theme_key,palette_key,content,sections)
        VALUES ($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)`, [event.id, accountId, event.slug, event.state.event.bride, event.state.event.groom, event.state.event.date || null, event.state.event.venue, event.state.event.address, event.state.event.theme || 'versalles', event.state.event.palette || 'dorado', JSON.stringify({ applicationState: event.state }), JSON.stringify(event.state.event.sections || {})]);
      await client.query('INSERT INTO event_application_states(event_id,revision,payload) VALUES ($1,1,$2::jsonb)', [event.id, JSON.stringify(event.state)]);
      await client.query('COMMIT'); return { ...event, accountId, revision: 1, status: 'draft' };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async listEvents(accountId) {
    const result = await this.pool.query(`SELECT e.id,e.slug,e.status,e.bride_name AS bride,e.groom_name AS groom,e.event_date AS date,
      e.created_at AS "createdAt",s.revision,CASE WHEN e.owner_account_id=$1 THEN 'owner' ELSE m.role END AS role
      FROM events e JOIN event_application_states s ON s.event_id=e.id
      LEFT JOIN event_memberships m ON m.event_id=e.id AND m.account_id=$1
      WHERE e.owner_account_id=$1 OR m.account_id=$1 ORDER BY e.created_at`, [accountId]);
    return result.rows.map(row => ({ ...row, title: [row.bride, row.groom].filter(Boolean).join(' & ') || 'Nueva celebración' }));
  }
  async setSessionEvent(sessionId, accountId, eventId) {
    const result = await this.pool.query(`UPDATE account_sessions s SET active_event_id=$3
      WHERE s.id=$1 AND s.account_id=$2 AND s.revoked_at IS NULL AND EXISTS (
        SELECT 1 FROM events e LEFT JOIN event_memberships m ON m.event_id=e.id AND m.account_id=$2
        WHERE e.id=$3 AND (e.owner_account_id=$2 OR m.account_id=$2)) RETURNING id`, [sessionId, accountId, eventId]);
    return Boolean(result.rowCount);
  }
  async getStateForSession(session) {
    if (session.legacy) return this.getStateRecord();
    if (!session.activeEventId) return { state: null, version: 0, eventId: null, slug: null, eventStatus: null };
    const result = await this.pool.query(`SELECT s.payload,s.revision,e.id AS "eventId",e.slug,e.status AS "eventStatus"
      FROM events e JOIN event_application_states s ON s.event_id=e.id
      LEFT JOIN event_memberships m ON m.event_id=e.id AND m.account_id=$1
      WHERE e.id=$2 AND (e.owner_account_id=$1 OR m.account_id=$1)`, [session.accountId, session.activeEventId]);
    return result.rows[0] ? { state: result.rows[0].payload, version: Number(result.rows[0].revision), eventId: result.rows[0].eventId, slug: result.rows[0].slug, eventStatus: result.rows[0].eventStatus } : { state: null, version: 0, eventId: null, slug: null, eventStatus: null };
  }
  async setStateForSession(session, state, expectedVersion) {
    if (session.legacy) return this.setState(state, expectedVersion);
    if (!session.activeEventId) throw new PaymentError('Selecciona una celebración antes de guardar.', 409);
    const event = state.event, payload = JSON.stringify(state);
    const result = await this.pool.query(`WITH updated AS (
      UPDATE event_application_states s SET payload=$3::jsonb,revision=s.revision+1,updated_at=now()
      FROM events e WHERE s.event_id=e.id AND e.id=$1 AND s.revision=$4
      AND (e.owner_account_id=$2 OR EXISTS (SELECT 1 FROM event_memberships m WHERE m.event_id=e.id AND m.account_id=$2 AND m.role='editor'))
      RETURNING s.event_id,s.revision
    ), synced AS (
      UPDATE events e SET bride_name=$5,groom_name=$6,event_date=$7,ceremony_time=$8,reception_time=$9,venue=$10,venue_address=$11,
        phrase=$12,dress_code=$13,rsvp_deadline=$14,theme_key=$15,palette_key=$16,content=jsonb_build_object('applicationState',$3::jsonb),sections=$17::jsonb,updated_at=now()
      FROM updated u WHERE e.id=u.event_id RETURNING e.id
    ) SELECT u.revision FROM updated u JOIN synced x ON x.id=u.event_id`, [session.activeEventId, session.accountId, payload, expectedVersion, event.bride || '', event.groom || '', event.date || null, event.ceremonyTime || null, event.receptionTime || null, event.venue || '', event.address || '', event.phrase || '', event.dressCode || '', event.deadline || null, event.theme || 'versalles', event.palette || 'dorado', JSON.stringify(event.sections || {})]);
    if (!result.rowCount) {
      const access = await this.pool.query(`SELECT CASE WHEN e.owner_account_id=$2 THEN 'owner' ELSE m.role END AS role FROM events e LEFT JOIN event_memberships m ON m.event_id=e.id AND m.account_id=$2 WHERE e.id=$1 AND (e.owner_account_id=$2 OR m.account_id=$2)`, [session.activeEventId, session.accountId]);
      if (!access.rowCount) throw new PaymentError('Celebración no encontrada o acceso no autorizado.', 404);
      if (access.rows[0].role === 'viewer') throw new PaymentError('Tu rol no permite editar esta celebración.', 403);
      throw new PaymentError('El evento cambió en otra pestaña. Recarga antes de volver a guardar.', 409);
    }
    return Number(result.rows[0].revision);
  }
  async publishEvent(session, eventId, published) {
    const result = await this.pool.query(`UPDATE events e SET status=$3,updated_at=now()
      WHERE e.id=$1 AND (e.owner_account_id=$2 OR EXISTS (SELECT 1 FROM event_memberships m WHERE m.event_id=e.id AND m.account_id=$2 AND m.role='editor'))
      RETURNING id,slug,status`, [eventId, session.accountId, published ? 'published' : 'draft']);
    return result.rows[0] || null;
  }
  async getPublicEvent(slug) {
    const result = await this.pool.query(`SELECT s.payload,s.revision,e.id AS "eventId",e.slug,e.status AS "eventStatus"
      FROM events e JOIN event_application_states s ON s.event_id=e.id WHERE e.slug=$1 AND e.status='published'`, [slug]);
    return result.rows[0] ? { state: result.rows[0].payload, version: Number(result.rows[0].revision), eventId: result.rows[0].eventId, slug: result.rows[0].slug, eventStatus: result.rows[0].eventStatus } : null;
  }
  async updatePublicEvent(slug, mutator) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const row = await client.query(`SELECT s.event_id,s.payload FROM events e JOIN event_application_states s ON s.event_id=e.id
        WHERE e.slug=$1 AND e.status='published' FOR UPDATE OF s`, [slug]);
      if (!row.rowCount) { await client.query('ROLLBACK'); throw new PaymentError('Invitación no publicada.', 404); }
      const state = row.rows[0].payload, result = await mutator(state);
      await client.query('UPDATE event_application_states SET payload=$2::jsonb,revision=revision+1,updated_at=now() WHERE event_id=$1', [row.rows[0].event_id, JSON.stringify(state)]);
      await client.query('UPDATE events SET updated_at=now() WHERE id=$1', [row.rows[0].event_id]);
      await client.query('COMMIT'); return result;
    } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { client.release(); }
  }
  async consumeRateLimit(scope, fingerprint, limit, windowMs) {
    const result = await this.pool.query(`INSERT INTO auth_rate_limit_buckets(scope,fingerprint,window_started_at,hit_count)
      VALUES ($1,$2,now(),1) ON CONFLICT(scope,fingerprint) DO UPDATE SET
      hit_count=CASE WHEN auth_rate_limit_buckets.window_started_at <= now()-($3 * interval '1 millisecond') THEN 1 ELSE auth_rate_limit_buckets.hit_count+1 END,
      window_started_at=CASE WHEN auth_rate_limit_buckets.window_started_at <= now()-($3 * interval '1 millisecond') THEN now() ELSE auth_rate_limit_buckets.window_started_at END
      RETURNING hit_count`, [scope, fingerprint, windowMs]);
    return result.rows[0].hit_count <= limit;
  }
  async clearRateLimit(scope, fingerprint) { await this.pool.query('DELETE FROM auth_rate_limit_buckets WHERE scope=$1 AND fingerprint=$2', [scope, fingerprint]); }
  async settlePayment(id, patch) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT payload FROM nupcial_demo_payments WHERE id=$1 FOR UPDATE', [id]);
      const payment = result.rows[0]?.payload;
      if (!payment) { await client.query('ROLLBACK'); return null; }
      if (['approved', 'rejected', 'cancelled', 'failed', 'refunded', 'charged_back'].includes(payment.status)) {
        const allowedReversal = payment.status === 'approved' && ['refunded', 'charged_back'].includes(patch.status);
        if (!allowedReversal) { await client.query('COMMIT'); return payment; }
      }
      Object.assign(payment, patch, { updatedAt: new Date().toISOString() });
      if (patch.status === 'approved' && payment.eventId) {
        await client.query(`UPDATE event_application_states SET payload=jsonb_set(jsonb_set(jsonb_set(payload,'{event,plan}',to_jsonb($1::text),true),'{event,planStatus}','"active"'::jsonb,true),'{event,lastPaymentId}',to_jsonb($2::text),true),revision=revision+1,updated_at=now() WHERE event_id=$3`, [payment.planId, payment.id, payment.eventId]);
      } else if (patch.status === 'approved') {
        await client.query(`UPDATE nupcial_demo_state SET payload=jsonb_set(jsonb_set(jsonb_set(payload,'{event,plan}',to_jsonb($1::text),true),'{event,planStatus}','"active"'::jsonb,true),'{event,lastPaymentId}',to_jsonb($2::text),true),version=version+1,updated_at=now() WHERE id=1`, [payment.planId, payment.id]);
      } else if (['refunded', 'charged_back'].includes(patch.status) && payment.eventId) {
        await client.query(`UPDATE event_application_states SET payload=jsonb_set(jsonb_set(payload #- '{event,lastPaymentId}','{event,plan}',to_jsonb($1::text),true),'{event,planStatus}',to_jsonb($3::text),true),revision=revision+1,updated_at=now() WHERE event_id=$4 AND payload #>> '{event,lastPaymentId}'=$2`, [payment.previousPlan || 'essential', id, payment.previousPlanStatus || 'demo', payment.eventId]);
      } else if (['refunded', 'charged_back'].includes(patch.status)) {
        await client.query(`UPDATE nupcial_demo_state SET payload=jsonb_set(jsonb_set(payload #- '{event,lastPaymentId}','{event,plan}',to_jsonb($1::text),true),'{event,planStatus}',to_jsonb($3::text),true),version=version+1,updated_at=now() WHERE id=1 AND payload #>> '{event,lastPaymentId}'=$2`, [payment.previousPlan || 'essential', id, payment.previousPlanStatus || 'demo']);
      }
      await client.query('UPDATE nupcial_demo_payments SET payload=$2::jsonb,updated_at=now() WHERE id=$1', [id, JSON.stringify(payment)]);
      await client.query('COMMIT');
      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  async close() { await this.pool.end(); }
}

function configFrom(env) {
  const production = env.NODE_ENV === 'production';
  const provider = env.PAYMENT_PROVIDER || (production ? 'external' : 'mock');
  if (!['mock', 'external'].includes(provider)) throw new Error('PAYMENT_PROVIDER debe ser mock o external.');
  if (production) {
    for (const name of ['SESSION_SECRET', 'APP_URL', 'DATABASE_URL', 'EMAIL_API_URL', 'EMAIL_API_KEY', 'EMAIL_FROM']) {
      if (!env[name]) throw new Error(`Falta variable obligatoria ${name} para producción.`);
    }
    if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET debe contener al menos 32 caracteres.');
    if (!env.APP_URL.startsWith('https://')) throw new Error('APP_URL de producción debe usar HTTPS.');
    try { if (new URL(env.EMAIL_API_URL).protocol !== 'https:') throw new Error(); } catch { throw new Error('EMAIL_API_URL de producción debe ser HTTPS.'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EMAIL_FROM)) throw new Error('EMAIL_FROM no parece un correo válido.');
    if (provider === 'mock') throw new Error('No se permite PAYMENT_PROVIDER=mock en producción.');
  }
  return {
    production,
    provider,
    legacyAuthEnabled: !production,
    appEmail: (env.APP_EMAIL || 'demo@boda.local').trim().toLowerCase(),
    appPassword: env.APP_PASSWORD || 'demo123',
    sessionSecret: env.SESSION_SECRET || randomBytes(32).toString('hex'),
    appUrl: env.APP_URL?.replace(/\/$/, '') || '',
    emailApiUrl: env.EMAIL_API_URL || '',
    emailApiKey: env.EMAIL_API_KEY || '',
    emailFrom: env.EMAIL_FROM || 'demo@boda.local',
    port: Number(env.PORT || 4173),
    host: env.HOST || '0.0.0.0',
  };
}

function tokenDigest(token) { return createHash('sha256').update(token).digest('hex'); }
function hashPassword(password) {
  const salt = randomBytes(16), key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}
function verifyPassword(password, encoded) {
  try {
    const [scheme, saltText, keyText] = String(encoded || '').split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltText, 'base64url'), expected = Buffer.from(keyText, 'base64url');
    if (salt.length !== 16 || expected.length !== 64) return false;
    return timingSafeEqual(scryptSync(password, salt, expected.length), expected);
  } catch { return false; }
}
function validEmail(value) { return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validPassword(value) { return typeof value === 'string' && value.length >= 12 && value.length <= 128; }
function validIsoDate(value) { if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(`${value}T00:00:00Z`);return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value; }

export async function createApp({ env = process.env, store: suppliedStore } = {}) {
  const config = configFrom(env);
  let store = suppliedStore;
  if (!store) {
    if (env.DATABASE_URL) {
      const { Pool } = await import('pg');
      const ssl = env.PGSSLMODE === 'disable' ? false : env.PGSSLMODE ? { rejectUnauthorized: true } : undefined;
      const pool = new Pool({ connectionString: env.DATABASE_URL, ...(ssl === undefined ? {} : { ssl }), max: 5 });
      store = new PostgresStore(pool);
    } else {
      if (config.production) throw new Error('DATABASE_URL es obligatoria en producción; el disco local no es persistente en todas las nubes.');
      store = new FileStore(env.STATE_FILE ? path.resolve(env.STATE_FILE) : path.join(ROOT, '.data', 'demo-state.json'));
    }
    await store.init();
  }
  const passwordSalt = randomBytes(16);
  const passwordHash = scryptSync(config.appPassword, passwordSalt, 32);
  const provider = createPaymentProvider({ mode: config.provider });

  function sign(value) { return createHmac('sha256', config.sessionSecret).update(value).digest('base64url'); }
  function sessionCookie(email, sid, expires) {
    const payload = Buffer.from(JSON.stringify({ email, expires, sid })).toString('base64url');
    const value = `${payload}.${sign(payload)}`;
    return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${config.production ? '; Secure' : ''}`;
  }
  async function sessionFor(req) {
    const raw = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!raw) return null;
    const [payload, signature] = raw.split('.');
    if (!payload || !signature || !safeEqualText(sign(payload), signature)) return null;
    try {
      const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (value.expires <= Date.now() / 1000 || !/^[0-9a-f-]{36}$/i.test(value.sid || '') || !validEmail(value.email)) return null;
      const active = await store.getSession(value.sid);
      return active && active.email === value.email && Number(active.expires) > Date.now() / 1000 ? { ...active, sid: value.sid } : null;
    } catch { return null; }
  }
  function json(res, status, data, extra = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
    res.end(JSON.stringify(data));
  }
  function setCookie(res, cookie) { res.setHeader('Set-Cookie', cookie); }
  function originAllowed(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    const expected = config.appUrl || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
    try { return new URL(origin).origin === new URL(expected).origin; } catch { return false; }
  }
  async function body(req, limit = BODY_LIMIT) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw new PaymentError('Solicitud demasiado grande.', 413);
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
    catch { throw new PaymentError('JSON no válido.'); }
  }
  async function requireSession(req, res) {
    const session = await sessionFor(req);
    if (!session) { json(res, 401, { error: 'Inicia sesión de nuevo.' }); return null; }
    return session;
  }
  function validateState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !value.event || typeof value.event !== 'object') throw new PaymentError('Datos del evento no válidos.');
    for (const key of ['itinerary', 'gifts', 'guests', 'tables', 'songs', 'gallery']) if (!Array.isArray(value[key])) throw new PaymentError(`Lista ${key} no válida.`);
    const limits={itinerary:100,gifts:100,guests:20000,tables:500,songs:5000,gallery:200,floorObjects:500};
    for(const [key,limit] of Object.entries(limits))if(value[key]!=null&&(!Array.isArray(value[key])||value[key].length>limit))throw new PaymentError(`Lista ${key} supera el límite permitido.`,413);
    const event=value.event;
    for(const [key,max] of Object.entries({bride:100,groom:100,venue:200,address:300,phrase:1000,dressCode:160,deadline:10,theme:40,palette:40}))if(event[key]!=null&&(typeof event[key]!=='string'||event[key].length>max))throw new PaymentError(`Dato ${key} no válido.`);
    if(event.date&& !validIsoDate(event.date))throw new PaymentError('Fecha del evento no válida.');
    if(event.deadline&& !validIsoDate(event.deadline))throw new PaymentError('Fecha límite no válida.');
    if(event.sections!=null&&(!event.sections||typeof event.sections!=='object'||Array.isArray(event.sections)))throw new PaymentError('Secciones no válidas.');
    if (JSON.stringify(value).length > BODY_LIMIT) throw new PaymentError('El evento supera el límite de almacenamiento de la demo.', 413);
  }
  async function recordLoginAttempt(req, email) {
    const fingerprint = tokenDigest(`${req.socket.remoteAddress || 'unknown'}:${email}`);
    return store.consumeRateLimit('login', fingerprint, 10, 15 * 60_000);
  }
  async function allowPublicWrite(req, slug) {
    const fingerprint = tokenDigest(`${req.socket.remoteAddress || 'unknown'}:${slug || 'legacy'}`);
    return store.consumeRateLimit('public-write', fingerprint, 30, 60_000);
  }
  async function authToken(account, kind, lifetimeMs, req) {
    const token = randomBytes(32).toString('base64url');
    await store.putAuthToken({ accountId: account.id, kind, hash: tokenDigest(token), expiresAt: Date.now() + lifetimeMs });
    const base = config.appUrl || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
    const url = `${base}/#/${kind === 'verify' ? 'verify' : 'reset-password'}?token=${encodeURIComponent(token)}`;
    if (config.production) {
      const action = kind === 'verify' ? 'Confirmar correo' : 'Restablecer contraseña';
      const response = await fetch(config.emailApiUrl, { method: 'POST', headers: { Authorization: `Bearer ${config.emailApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: config.emailFrom, to: account.email, subject: `${action} · Nupcial`, text: `${action}: ${url}`, html: `<p>${action}:</p><p><a href="${url}">${action}</a></p>` }) });
      if (!response.ok) throw new PaymentError('No se pudo enviar el correo. Intenta de nuevo más tarde.', 503);
      return null;
    }
    return url;
  }
  async function startPayment(req, session, payload) {
    if (provider.mode !== 'mock') throw new PaymentError('Cobros deshabilitados aquí. Integra el servicio externo de billing.', 503);
    if (!Object.hasOwn(PAYMENT_PLANS, payload.planId)) throw new PaymentError('Selecciona un plan válido.');
    const record = await store.getStateForSession(session), state = record.state;
    if (!state) throw new PaymentError('No hay un evento activo. Guarda primero el evento desde tu panel.', 409);
    const plan = PAYMENT_PLANS[payload.planId];
    const payment = {
      id: randomUUID(), planId: payload.planId, planName: plan.name, amount: plan.amount, currency: 'PEN',
      status: 'pending', provider: provider.mode, previousPlan: state.event.plan || 'essential',
      previousPlanStatus: state.event.planStatus || 'demo',
      ownerEmail: session.email, accountId: session.accountId || null, eventId: record.eventId || null, createdAt: new Date().toISOString(),
    };
    await store.createPayment(payment);
    try {
      const result = await provider.createCheckout({ payment, email: session.email });
      payment.providerReference = result.providerReference;
      // Provider preference metadata is separate from the immutable product/money the server priced.
      const saved = await store.settlePayment(payment.id, { providerReference: result.providerReference, status: 'pending' });
      return { payment: publicPayment(saved || payment), checkoutUrl: result.checkoutUrl, mode: provider.mode };
    } catch (error) {
      await store.settlePayment(payment.id, { status: 'failed', failureReason: error.message });
      throw error;
    }
  }
  function publicPayment(payment) {
    if (!payment) return null;
    const { ownerEmail, accountId, eventId, ...safe } = payment;
    return safe;
  }
  function publicState(state, code) {
    if (!state) return null;
    const publicEventFields = [
      'bride', 'groom', 'date', 'ceremonyTime', 'receptionTime', 'venue', 'address', 'phrase', 'dressCode', 'deadline',
      'giftMethod', 'primary', 'format24h', 'adultsOnly', 'avoidColors', 'thanksTitle', 'thanksMessage', 'backgroundMusic',
      'parentsBride', 'parentsGroom', 'godparents', 'theme', 'palette', 'sections', 'coverPhoto', 'musicData',
    ];
    const event = Object.fromEntries(publicEventFields.filter(key => Object.hasOwn(state.event || {}, key)).map(key => [key, state.event[key]]));
    const guest = code ? (state.guests || []).find(item => item.code === code) : null;
    const safeGuest = guest ? {
      id: guest.id, code: guest.code, name: guest.name, passes: guest.passes, status: guest.status,
      confirmedCount: guest.confirmedCount, members: guest.members, message: guest.message,
      attendanceType: guest.attendanceType, responseAt: guest.responseAt, table: null,
    } : null;
    return {
      event,
      itinerary: (state.itinerary || []).map(item => ({ id: item.id, time: item.time, icon: item.icon, title: item.title, description: item.description })),
      gifts: (state.gifts || []).map(item => ({ id: item.id, type: item.type, title: item.title, detail: item.detail })),
      guests: safeGuest ? [safeGuest] : [],
      songs: (state.songs || []).filter(song => song.status === 'approved').map(song => ({ id: song.id, title: song.title, artist: song.artist })),
      tables: [], floorObjects: [], gallery: state.galleryEnabled ? (state.gallery || []).map(photo => ({ id: photo.id, src: photo.src, by: photo.by })) : [],
      galleryEnabled: Boolean(state.galleryEnabled),
    };
  }
  function safePublicGuest(guest) {
    if (!guest) return null;
    return {
      id: guest.id, code: guest.code, name: guest.name, passes: guest.passes, status: guest.status,
      confirmedCount: guest.confirmedCount, members: guest.members, message: guest.message,
      attendanceType: guest.attendanceType, responseAt: guest.responseAt, table: null,
    };
  }
  async function updatePublicState(mutator, slug = '') {
    if (slug) return store.updatePublicEvent(slug, mutator);
    if (config.production) throw new PaymentError('Indica el evento de esta invitación.', 404);
    const record = await store.getStateRecord();
    const state = record.state;
    if (!state) throw new PaymentError('La invitación todavía no está configurada.', 404);
    const result = await mutator(state);
    await store.setState(state, record.version);
    return result;
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/') && !originAllowed(req)) {
        json(res, 403, { error: 'Origen no autorizado.' }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/health') { json(res, 200, { status: 'ok' }); return; }
      if (req.method === 'GET' && url.pathname === '/api/ready') {
        await store.ping();
        json(res, 200, { status: 'ready', storage: store instanceof PostgresStore ? 'postgres' : 'local-file', payments: provider.mode }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/config') { json(res, 200, { paymentMode: provider.mode, demo: !config.production, registrationEnabled: true }); return; }

      if (req.method === 'GET' && url.pathname === '/api/auth/session') {
        const session = await sessionFor(req);
        json(res, 200, { authenticated: Boolean(session), email: session?.email || null, accountId: session?.accountId || null, activeEventId: session?.activeEventId || null, legacy: Boolean(session?.legacy) }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        const input = await body(req, 32 * 1024), email = String(input.email || '').trim().toLowerCase(), password = input.password;
        const fingerprint = tokenDigest(req.socket.remoteAddress || 'unknown');
        if (!await store.consumeRateLimit('register', fingerprint, 5, 60 * 60_000)) { json(res, 429, { error: 'Demasiados intentos. Espera antes de volver a probar.' }); return; }
        if (!validEmail(email) || !validPassword(password)) throw new PaymentError('Ingresa un correo válido y contraseña de 12 a 128 caracteres.');
        let account = await store.getAccountByEmail(email), verificationUrl = null;
        if (!account) {
          account = { id: randomUUID(), email, passwordHash: hashPassword(password), status: 'pending_verification', createdAt: Date.now() };
          await store.createAccount(account);
          verificationUrl = await authToken(account, 'verify', 24 * 60 * 60_000, req);
        } else if (account.status === 'pending_verification') {
          verificationUrl = await authToken(account, 'verify', 24 * 60 * 60_000, req);
        }
        json(res, 202, { accepted: true, message: 'Si el correo puede registrarse, recibirás instrucciones para confirmarlo.', ...(verificationUrl ? { verificationUrl } : {}) }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/verify') {
        const input = await body(req, 32 * 1024), token = String(input.token || '');
        if (token.length < 32 || token.length > 128) throw new PaymentError('Enlace de verificación inválido o vencido.', 400);
        const account = await store.consumeAuthToken(tokenDigest(token), 'verify');
        if (!account || account.status !== 'active') throw new PaymentError('Enlace de verificación inválido o vencido.', 400);
        json(res, 200, { verified: true, email: account.email }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/password-reset/request') {
        const input = await body(req, 32 * 1024), email = String(input.email || '').trim().toLowerCase();
        const fingerprint = tokenDigest(req.socket.remoteAddress || 'unknown');
        if (!await store.consumeRateLimit('password-reset', fingerprint, 5, 60 * 60_000)) { json(res, 429, { error: 'Demasiados intentos. Espera antes de volver a probar.' }); return; }
        let resetUrl = null;
        if (validEmail(email)) {
          const account = await store.getAccountByEmail(email);
          if (account?.status === 'active') resetUrl = await authToken(account, 'reset', 30 * 60_000, req);
        }
        json(res, 202, { accepted: true, message: 'Si existe una cuenta activa con ese correo, recibirás instrucciones para restablecer la contraseña.', ...(resetUrl ? { resetUrl } : {}) }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/password-reset/confirm') {
        const input = await body(req, 32 * 1024), token = String(input.token || ''), password = input.password;
        if (token.length < 32 || token.length > 128 || !validPassword(password)) throw new PaymentError('Enlace inválido o contraseña no válida. Usa al menos 12 caracteres.');
        if (!await store.resetAccountPassword(tokenDigest(token), hashPassword(password))) throw new PaymentError('Enlace de restablecimiento inválido o vencido.', 400);
        json(res, 200, { reset: true }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        const input = await body(req, 32 * 1024);
        const email = String(input.email || '').trim().toLowerCase();
        const password = String(input.password || '');
        if (!await recordLoginAttempt(req, email)) { json(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' }); return; }
        let account = null, legacy = false;
        if (config.legacyAuthEnabled && email === config.appEmail) {
          const candidate = scryptSync(password, passwordSalt, 32);
          if (timingSafeEqual(candidate, passwordHash)) legacy = true;
        }
        if (!legacy) {
          account = await store.getAccountByEmail(email);
          if (!account || !verifyPassword(password, account.passwordHash)) throw new PaymentError('Correo o contraseña incorrectos.', 401);
          if (account.status !== 'active') throw new PaymentError('Confirma tu correo antes de iniciar sesión.', 403);
        }
        await store.clearRateLimit('login', tokenDigest(`${req.socket.remoteAddress || 'unknown'}:${email}`));
        const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
        const sid = randomUUID();
        await store.createSession({ id: sid, email, expires, ...(legacy ? { legacy: true } : { accountId: account.id, tokenHash: tokenDigest(sid), activeEventId: null }) });
        setCookie(res, sessionCookie(email, sid, expires));
        json(res, 200, { authenticated: true, email, accountId: account?.id || null, legacy }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
        const session = await sessionFor(req);
        if (session) await store.deleteSession(session.sid);
        setCookie(res, `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.production ? '; Secure' : ''}`);
        json(res, 200, { authenticated: false }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const session = await requireSession(req, res); if (!session) return;
        json(res, 200, await store.getStateForSession(session)); return;
      }
      if (req.method === 'PUT' && url.pathname === '/api/state') {
        const session = await requireSession(req, res); if (!session) return;
        const input = await body(req);
        validateState(input.state);
        if (!Number.isSafeInteger(input.version) || input.version < 0) throw new PaymentError('Versión de datos no válida.');
        const version = await store.setStateForSession(session, input.state, input.version);
        json(res, 200, { saved: true, version, updatedAt: new Date().toISOString() }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/events') {
        const session = await requireSession(req, res); if (!session) return;
        if (session.legacy) { json(res, 200, { events: [], activeEventId: null, legacy: true }); return; }
        json(res, 200, { events: await store.listEvents(session.accountId), activeEventId: session.activeEventId || null }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/events') {
        const session = await requireSession(req, res); if (!session) return;
        if (session.legacy) throw new PaymentError('Crea cuenta para administrar celebraciones separadas.', 403);
        const input = await body(req); validateState(input.state);
        const id = randomUUID(), slug = `boda-${randomBytes(12).toString('hex')}`;
        input.state.event.slug = slug;
        const event = await store.createEvent(session.accountId, { id, slug, state: input.state });
        if (!await store.setSessionEvent(session.sid, session.accountId, id)) throw new PaymentError('No se pudo activar la celebración.', 500);
        json(res, 201, { event: { id, slug, title: [input.state.event.bride, input.state.event.groom].filter(Boolean).join(' & ') || 'Nueva celebración', status: 'draft', role: 'owner', revision: event.revision } }); return;
      }
      const selectEvent = /^\/api\/events\/([0-9a-f-]{36})\/select$/i.exec(url.pathname);
      if (req.method === 'POST' && selectEvent) {
        const session = await requireSession(req, res); if (!session) return;
        if (session.legacy || !await store.setSessionEvent(session.sid, session.accountId, selectEvent[1])) throw new PaymentError('Celebración no encontrada o acceso no autorizado.', 404);
        json(res, 200, await store.getStateForSession({ ...session, activeEventId: selectEvent[1] })); return;
      }
      const publishEvent = /^\/api\/events\/([0-9a-f-]{36})\/publish$/i.exec(url.pathname);
      if (req.method === 'POST' && publishEvent) {
        const session = await requireSession(req, res); if (!session) return;
        if (session.legacy) throw new PaymentError('Publicación por evento requiere cuenta.', 403);
        const input = await body(req, 32 * 1024), record = await store.getStateForSession({ ...session, activeEventId: publishEvent[1] });
        if (!record.state) throw new PaymentError('Celebración no encontrada o acceso no autorizado.', 404);
        if (input.published && (!record.state.event.bride?.trim() || !record.state.event.groom?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(record.state.event.date || ''))) throw new PaymentError('Completa nombres y fecha antes de publicar.');
        const result = await store.publishEvent(session, publishEvent[1], Boolean(input.published));
        if (!result) throw new PaymentError('Celebración no encontrada o acceso no autorizado.', 404);
        json(res, 200, { event: result, url: `${config.appUrl || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`}/?event=${encodeURIComponent(result.slug)}#/public` }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/public/state') {
        const slug = url.searchParams.get('event') || '';
        const record = slug ? await store.getPublicEvent(slug) : config.production ? null : { state: await store.getState() };
        const state = record?.state;
        if (!state) { json(res, 404, { error: 'Invitación no publicada.' }); return; }
        const code = url.searchParams.get('guest') || '';
        if (code && !(state.guests || []).some(guest => guest.code === code)) { json(res, 404, { error: 'Invitación no encontrada.' }); return; }
        json(res, 200, { state: { ...publicState(state, code), event: { ...publicState(state, code).event, slug: record.slug || '' } } }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/public/rsvp') {
        const input = await body(req, 128 * 1024);
        const slug = typeof input.event === 'string' ? input.event : '';
        if (!await allowPublicWrite(req, slug)) { json(res, 429, { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }); return; }
        const code = typeof input.code === 'string' ? input.code.trim() : '';
        const name = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
        const message = typeof input.message === 'string' ? input.message.trim().slice(0, 500) : '';
        const status = input.status;
        if (!name || !['confirmed', 'declined'].includes(status)) throw new PaymentError('Nombre o respuesta no válidos.');
        if (input.website) throw new PaymentError('No se pudo recibir la respuesta.');
        if (input.members != null && typeof input.members !== 'string') throw new PaymentError('Acompañantes no válidos.');
        const outcome = await updatePublicState(state => {
          if (state.event?.sections?.rsvp === false) throw new PaymentError('Las confirmaciones están deshabilitadas.', 403);
          if (state.event?.deadline && /^\d{4}-\d{2}-\d{2}$/.test(state.event.deadline)) {
            const now = new Date();
            const deadline = new Date(`${state.event.deadline}T23:59:59-05:00`);
            if (now > deadline) throw new PaymentError('El plazo para confirmar ha terminado.', 409);
          }
          let guest = code ? (state.guests || []).find(item => item.code === code) : null;
          if (code && !guest) throw new PaymentError('Invitación no encontrada.', 404);
          const max = guest?.passes || 10;
          const passes = status === 'confirmed' ? Number(input.passes) : 0;
          if (status === 'confirmed' && (!Number.isSafeInteger(passes) || passes < 1 || passes > max)) throw new PaymentError(`Asistentes debe ser un entero entre 1 y ${max}.`);
          const members = status === 'confirmed' ? String(input.members || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, passes) : [];
          const currentTime = new Date().toISOString();
          if (!guest) {
            const id = Math.max(Date.now(), ...(state.guests || []).map(item => Number(item.id) + 1 || 0));
            guest = { id, createdAt: Date.now(), code: `INV-${randomBytes(12).toString('hex').toUpperCase()}`, name, phone: '', passes: Math.max(passes, 1), status: 'pending', side: 'Invitación web', category: 'Web', type: 'individual', table: null, notes: '', sentCount: 0 };
            state.guests.unshift(guest);
          }
          Object.assign(guest, {
            name, status, confirmedCount: passes, members, message,
            attendanceType: input.attendanceType === 'ceremony' ? 'ceremony' : 'full', responseAt: currentTime, table: null,
          });
          return safePublicGuest(guest);
        }, slug);
        json(res, 200, { received: true, guest: outcome }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/public/songs') {
        const input = await body(req, 32 * 1024);
        const slug = typeof input.event === 'string' ? input.event : '';
        if (!await allowPublicWrite(req, slug)) { json(res, 429, { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }); return; }
        const title = typeof input.title === 'string' ? input.title.trim().slice(0, 160) : '';
        const artist = typeof input.artist === 'string' ? input.artist.trim().slice(0, 160) : '';
        const requester = typeof input.requester === 'string' ? input.requester.trim().slice(0, 120) : '';
        if (!title || !artist || !requester) throw new PaymentError('Completa canción, artista y nombre.');
        await updatePublicState(state => {
          if (state.event?.sections?.songs === false) throw new PaymentError('Las sugerencias musicales están deshabilitadas.', 403);
          state.songs ||= [];
          const key = value => value.trim().toLocaleLowerCase('es');
          if (state.songs.some(song => key(song.title) === key(title) && key(song.artist) === key(artist) && key(song.requester) === key(requester))) throw new PaymentError('Esta sugerencia ya está registrada.', 409);
          if (state.songs.length >= 5000) throw new PaymentError('Se alcanzó el límite de canciones.', 413);
          state.songs.unshift({ id: Date.now(), createdAt: Date.now(), title, artist, requester, status: 'pending' });
        }, slug);
        json(res, 201, { received: true }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/public/gallery') {
        const input = await body(req, 3 * 1024 * 1024);
        const slug = typeof input.event === 'string' ? input.event : '';
        if (!await allowPublicWrite(req, slug)) { json(res, 429, { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }); return; }
        const src = typeof input.src === 'string' ? input.src : '';
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-z\d+/]+=*)$/i.exec(src);
        if (!match || Math.ceil(match[2].length * 3 / 4) > 2 * 1024 * 1024) throw new PaymentError('Usa JPG, PNG o WebP de hasta 2 MB.');
        const bytes = Buffer.from(match[2], 'base64');
        if (bytes.toString('base64') !== match[2]) throw new PaymentError('La imagen no tiene una codificación válida.');
        const mime = match[1].toLowerCase();
        const validSignature = mime === 'image/png'
          ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : mime === 'image/jpeg'
            ? bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
        if (!validSignature) throw new PaymentError('El contenido del archivo no coincide con una imagen permitida.');
        await updatePublicState(state => {
          if (!state.galleryEnabled) throw new PaymentError('La galería está deshabilitada.', 403);
          state.gallery ||= [];
          if (state.gallery.length >= 200) throw new PaymentError('La galería de demostración alcanzó su límite.', 413);
          state.gallery.unshift({ id: Date.now(), src, by: 'Invitado' });
        }, slug);
        json(res, 201, { received: true }); return;
      }
      if (req.method === 'POST' && url.pathname === '/api/payments/checkout') {
        const session = await requireSession(req, res);
        if (!session) return;
        const input = await body(req, 32 * 1024);
        json(res, 201, await startPayment(req, session, input)); return;
      }
      if (req.method === 'GET' && /^\/api\/payments\/[0-9a-f-]{36}$/i.test(url.pathname)) {
        const session = await requireSession(req, res); if (!session) return;
        const id = url.pathname.split('/').at(-1);
        json(res, 200, { payment: publicPayment(await store.getPaymentForSession(id, session)) }); return;
      }
      if (req.method === 'POST' && /^\/api\/payments\/[0-9a-f-]{36}\/demo-result$/i.test(url.pathname)) {
        if (config.production || provider.mode !== 'mock') { json(res, 404, { error: 'No encontrado.' }); return; }
        const session = await requireSession(req, res); if (!session) return;
        const id = url.pathname.split('/').at(-2);
        if (!await store.getPaymentForSession(id, session)) throw new PaymentError('Pago no encontrado.', 404);
        const input = await body(req, 32 * 1024);
        if (!['pending', 'approved', 'rejected', 'cancelled'].includes(input.status)) throw new PaymentError('Estado de prueba no válido.');
        const payment = await store.settlePayment(id, { status: input.status, providerStatus: input.status, approvedAt: input.status === 'approved' ? new Date().toISOString() : null });
        if (!payment) throw new PaymentError('Pago no encontrado.', 404);
        json(res, 200, { payment: publicPayment(payment) }); return;
      }
      if (url.pathname.startsWith('/api/')) { json(res, 404, { error: 'Endpoint no encontrado.' }); return; }
      if (req.method !== 'GET' && req.method !== 'HEAD') { json(res, 405, { error: 'Método no permitido.' }); return; }

      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { json(res, 400, { error: 'Ruta no válida.' }); return; }
      const candidate = path.resolve(ROOT, `.${pathname}`);
      if (candidate !== ROOT && !candidate.startsWith(`${ROOT}${path.sep}`)) { json(res, 400, { error: 'Ruta no válida.' }); return; }
      let target = candidate;
      if (!path.extname(pathname) || pathname.endsWith('/')) target = path.join(ROOT, 'index.html');
      let content;
      try { content = await readFile(target); }
      catch (error) { if (error.code === 'ENOENT') { json(res, 404, { error: 'Archivo no encontrado.' }); return; } throw error; }
      const extension = path.extname(target).toLowerCase();
      const mutableAsset = ['.html', '.js', '.css'].includes(extension);
      res.writeHead(200, { 'Content-Type': MIME[extension] || 'application/octet-stream', 'Cache-Control': mutableAsset ? 'no-store, no-cache, must-revalidate' : 'public, max-age=3600', ...(mutableAsset ? { Pragma: 'no-cache', Expires: '0' } : {}) });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      const status = error instanceof PaymentError ? error.status : 500;
      if (status === 500) console.error(error);
      if (!res.headersSent) {
        let current = {};
        if (status === 409 && url.pathname === '/api/state') {
          try { const record = await store.getStateRecord(); current = { version: record.version }; } catch { /* Keep the original conflict response. */ }
        }
        json(res, status, { error: status === 500 ? 'Error interno. Revisa el registro del servidor.' : error.message, ...current });
      }
      else res.destroy();
    }
  });
  return { server, store, config, close: async () => {
    if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await store.close?.();
  } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const app = await createApp();
    app.server.listen(app.config.port, app.config.host, () => console.log(`Nupcial disponible en http://localhost:${app.config.port} (${app.config.provider}, ${app.store instanceof PostgresStore ? 'PostgreSQL' : 'archivo local'})`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
