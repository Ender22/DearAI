-- Letters to AI. Every letter, including Devin's core letter, lives in this one table.
CREATE TABLE letters (
  id           TEXT PRIMARY KEY,                 -- short random id, used in /letters/<id>
  body         TEXT NOT NULL,
  format       TEXT NOT NULL DEFAULT 'text'      -- 'markdown' only for admin-seeded letters
               CHECK (format IN ('text', 'markdown')),
  name         TEXT,                             -- optional signature
  country      TEXT,                             -- optional, free text
  status       TEXT NOT NULL DEFAULT 'published'
               CHECK (status IN ('published', 'held', 'hidden')),
  pin_order    INTEGER,                          -- NULL = not pinned; lower shows first
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  body_hash    TEXT NOT NULL,                    -- sha256 of normalised body, for duplicate detection
  ip_hash      TEXT,                             -- salted sha256 of submitter IP, for rate limiting; never the raw IP
  flag_reason  TEXT                              -- why a letter was held, if it was
);

CREATE INDEX idx_letters_feed   ON letters (status, created_at DESC);
CREATE INDEX idx_letters_pinned ON letters (pin_order) WHERE pin_order IS NOT NULL;
CREATE INDEX idx_letters_ip     ON letters (ip_hash, created_at);
CREATE INDEX idx_letters_hash   ON letters (body_hash);
