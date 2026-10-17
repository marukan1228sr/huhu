CREATE TABLE users (
 id TEXT PRIMARY KEY NOT NULL,
 slot INTEGER NOT NULL UNIQUE CHECK (slot IN (1,2)),
 email TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 salt TEXT NOT NULL,
 password_hash TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id),
 expires INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE login_limits (
 key TEXT PRIMARY KEY NOT NULL,
 window INTEGER NOT NULL,
 attempts INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE settings (
 key TEXT PRIMARY KEY NOT NULL,
 value TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE photos (
 id TEXT PRIMARY KEY NOT NULL,
 room TEXT NOT NULL,
 content_type TEXT NOT NULL,
 body TEXT NOT NULL
);
