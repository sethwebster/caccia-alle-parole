CREATE TABLE IF NOT EXISTS push_tokens (
	device_id TEXT PRIMARY KEY,
	token TEXT NOT NULL,
	platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_push_tokens_token ON push_tokens(token);
