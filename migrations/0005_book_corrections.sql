ALTER TABLE sections ADD COLUMN book_correction_enabled INTEGER NOT NULL DEFAULT 1 CHECK(book_correction_enabled IN (0,1));
ALTER TABLE sections ADD COLUMN book_correction_delay_hours INTEGER NOT NULL DEFAULT 24 CHECK(book_correction_delay_hours BETWEEN 0 AND 168);
CREATE TABLE book_corrections(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),course_revision INTEGER,
 records TEXT NOT NULL,effective_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),UNIQUE(user_id,assignment_id)
);
CREATE INDEX book_corrections_student ON book_corrections(user_id,assignment_id);
CREATE TRIGGER corrections_no_update BEFORE UPDATE ON book_corrections BEGIN SELECT RAISE(ABORT,'Book correction history is immutable'); END;
CREATE TRIGGER corrections_no_delete BEFORE DELETE ON book_corrections BEGIN SELECT RAISE(ABORT,'Book correction history is immutable'); END;
CREATE TRIGGER corrected_course_frozen BEFORE UPDATE OF params ON course_versions WHEN EXISTS(SELECT 1 FROM book_corrections b JOIN assignments a ON a.id=b.assignment_id WHERE a.course_version=OLD.id) BEGIN SELECT RAISE(ABORT,'Course content is frozen after book correction'); END;
CREATE TRIGGER corrected_assignment_frozen BEFORE UPDATE OF title,instructions,document,transaction_date,period_start,period_end,expected_reference,cash_flow,points,unit,sort_order,activity_data ON assignments WHEN EXISTS(SELECT 1 FROM book_corrections WHERE assignment_id=OLD.id) BEGIN SELECT RAISE(ABORT,'Assignment content is frozen after book correction'); END;
CREATE TRIGGER corrected_key_frozen BEFORE UPDATE ON answer_keys WHEN EXISTS(SELECT 1 FROM book_corrections WHERE assignment_id=OLD.assignment_id) BEGIN SELECT RAISE(ABORT,'Answer key is frozen after book correction'); END;
