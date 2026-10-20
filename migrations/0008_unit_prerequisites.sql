ALTER TABLE sections ADD COLUMN require_unit_completion INTEGER NOT NULL DEFAULT 1 CHECK(require_unit_completion IN (0,1));
CREATE TABLE unit_prerequisite_waivers(
 section_id TEXT NOT NULL REFERENCES sections(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 course_key TEXT NOT NULL,
 unit INTEGER NOT NULL CHECK(unit BETWEEN 1 AND 13),
 reason TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(section_id,user_id,course_key,unit)
);
