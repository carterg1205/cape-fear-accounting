ALTER TABLE assignments ADD COLUMN expected_reference TEXT NOT NULL DEFAULT '';
UPDATE assignments SET expected_reference=COALESCE(json_extract(document,'$.reference'),'');
ALTER TABLE assignments ADD COLUMN published INTEGER NOT NULL DEFAULT 1 CHECK(published IN (0,1));
ALTER TABLE assignments ADD COLUMN cash_flow TEXT NOT NULL DEFAULT 'none' CHECK(cash_flow IN ('none','operating','investing','financing'));
UPDATE assignments SET cash_flow='financing' WHERE id='capital';
UPDATE assignments SET cash_flow='operating' WHERE id='rental';
ALTER TABLE assignments ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sections ADD COLUMN reports_unlocked INTEGER NOT NULL DEFAULT 0 CHECK(reports_unlocked IN (0,1));
CREATE TABLE documents(id TEXT PRIMARY KEY,assignment_id TEXT NOT NULL REFERENCES assignments(id),object_key TEXT NOT NULL,filename TEXT NOT NULL,content_type TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX documents_assignment ON documents(assignment_id);
CREATE TABLE extensions(user_id TEXT NOT NULL REFERENCES users(id),assignment_id TEXT NOT NULL REFERENCES assignments(id),due_at TEXT NOT NULL,PRIMARY KEY(user_id,assignment_id));
CREATE TRIGGER assignment_content_frozen BEFORE UPDATE OF title,instructions,document,transaction_date,period_start,period_end,expected_reference,cash_flow,points,unit,sort_order ON assignments WHEN EXISTS(SELECT 1 FROM attempts WHERE assignment_id=OLD.id) BEGIN SELECT RAISE(ABORT,'Assignment content is frozen after student work starts'); END;
CREATE TRIGGER answer_key_frozen BEFORE UPDATE ON answer_keys WHEN EXISTS(SELECT 1 FROM attempts WHERE assignment_id=OLD.assignment_id) BEGIN SELECT RAISE(ABORT,'Answer key is frozen after student work starts'); END;
CREATE TRIGGER documents_frozen BEFORE INSERT ON documents WHEN EXISTS(SELECT 1 FROM attempts WHERE assignment_id=NEW.assignment_id) BEGIN SELECT RAISE(ABORT,'Source documents are frozen after student work starts'); END;

CREATE TRIGGER documents_limit BEFORE INSERT ON documents WHEN (SELECT COUNT(*) FROM documents WHERE assignment_id=NEW.assignment_id)>=2 BEGIN SELECT RAISE(ABORT,'Document limit reached'); END;
CREATE TRIGGER documents_delete_frozen BEFORE DELETE ON documents WHEN EXISTS(SELECT 1 FROM attempts WHERE assignment_id=OLD.assignment_id) BEGIN SELECT RAISE(ABORT,'Source documents are frozen after student work starts'); END;
-- Accounts needed for course-aligned instructor-authored exercises; no balances are seeded.
INSERT OR IGNORE INTO accounts VALUES
('1110','Allowance for uncollectible accounts','asset','credit'),('1120','Notes receivable','asset','debit'),('1130','Interest receivable','asset','debit'),('1400','Supplies','asset','debit'),('1600','Land','asset','debit'),('1700','Buildings','asset','debit'),('1710','Accumulated depreciation - buildings','asset','credit'),('1800','Patents','asset','debit'),('1810','Accumulated amortization','asset','credit'),
('2020','Sales tax payable','liability','credit'),('2030','Salaries payable','liability','credit'),('2040','Interest payable','liability','credit'),('2050','Income tax payable','liability','credit'),('2060','Dividends payable','liability','credit'),('2300','Bonds payable','liability','credit'),('3020','Additional paid-in capital','equity','credit'),
('4200','Interest revenue','revenue','credit'),('4300','Gain on sale of assets','revenue','credit'),('5400','Bad debt expense','expense','debit'),('5500','Salaries expense','expense','debit'),('5600','Interest expense','expense','debit'),('5700','Income tax expense','expense','debit'),('5800','Amortization expense','expense','debit'),('5900','Utilities expense','expense','debit'),('5910','Bank service charge expense','expense','debit'),('5920','Supplies expense','expense','debit'),('5930','Repairs expense','expense','debit'),('5940','Loss on sale of assets','expense','debit');
