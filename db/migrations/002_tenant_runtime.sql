-- Runtime bridge: authenticated account sessions select an owned event,
-- while the existing domain UI reads/writes one revisioned state document.
-- Child collections remain represented by the normalized tables in 001.
BEGIN;

ALTER TABLE account_sessions
  ADD COLUMN IF NOT EXISTS active_event_id uuid REFERENCES events(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS event_application_states (
  event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_rate_limit_buckets (
  scope text NOT NULL,
  fingerprint text NOT NULL,
  window_started_at timestamptz NOT NULL,
  hit_count integer NOT NULL CHECK (hit_count > 0),
  PRIMARY KEY (scope, fingerprint)
);

INSERT INTO schema_migrations(version) VALUES ('002_tenant_runtime') ON CONFLICT (version) DO NOTHING;
COMMIT;
