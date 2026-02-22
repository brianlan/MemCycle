CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY NOT NULL,
    deck_id TEXT NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    source TEXT DEFAULT 'default',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_scheduling (
    id TEXT PRIMARY KEY NOT NULL,
    card_id TEXT NOT NULL UNIQUE,
    algorithm TEXT DEFAULT 'sm2',
    repetitions INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 0,
    ease_factor DOUBLE PRECISION DEFAULT 2.5,
    box_index INTEGER DEFAULT 0,
    due_at TEXT NOT NULL,
    last_reviewed_at TEXT,
    lapse_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY NOT NULL,
    card_id TEXT NOT NULL,
    reviewed_at TEXT NOT NULL,
    rating INTEGER NOT NULL,
    response_type TEXT NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_card_scheduling_card_id ON card_scheduling(card_id);
CREATE INDEX IF NOT EXISTS idx_card_scheduling_due_at ON card_scheduling(due_at);
CREATE INDEX IF NOT EXISTS idx_review_logs_card_id ON review_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs(reviewed_at);
