const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const schema = fs.readFileSync(path.join(root, 'db/migrations/001_core_schema.sql'), 'utf8');
const erd = fs.readFileSync(path.join(root, 'docs/diagrams/database-erd.mmd'), 'utf8');

test('initial schema covers isolated accounts, event modules, history and external entitlements', () => {
  for (const table of [
    'accounts', 'account_sessions', 'email_verification_tokens', 'password_reset_tokens',
    'events', 'event_memberships', 'event_itinerary_items', 'event_gift_options',
    'guest_groups', 'guest_rsvp_responses', 'guest_rsvp_attendees', 'event_tables',
    'guest_table_assignments', 'event_floor_objects', 'event_song_suggestions',
    'event_media', 'event_entitlements', 'billing_event_receipts', 'event_activity_log',
  ]) assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`), table);

  assert.match(schema, /owner_account_id uuid NOT NULL REFERENCES accounts\(id\)/);
  assert.match(schema, /FOREIGN KEY \(event_id, guest_group_id\) REFERENCES guest_groups\(event_id, id\)/);
  assert.match(schema, /FOREIGN KEY \(event_id, table_id\) REFERENCES event_tables\(event_id, id\)/);
  assert.match(schema, /CREATE OR REPLACE VIEW current_guest_rsvps/);
  assert.match(schema, /length\(link_code\) BETWEEN 32 AND 128/);
  assert.match(schema, /external_event_id text PRIMARY KEY/);
  assert.doesNotMatch(schema, /DROP\s+TABLE/i, 'migration must not drop user data');
  assert.doesNotMatch(schema, /card_number|cvv|cardholder/i, 'billing/card data remains external');
});

test('ERD states 1:N tenant and event relationships', () => {
  assert.match(erd, /ACCOUNTS \|\|--o\{ EVENTS/);
  assert.match(erd, /EVENTS \|\|--o\{ GUEST_GROUPS/);
  assert.match(erd, /GUEST_GROUPS \|\|--o\{ GUEST_RSVP_RESPONSES/);
  assert.match(erd, /EVENT_TABLES \|\|--o\{ GUEST_TABLE_ASSIGNMENTS/);
});
