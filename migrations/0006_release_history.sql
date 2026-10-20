-- Keep closed weeks in the books. Locked means closed after release, or not yet released;
-- first_released_at distinguishes those cases without exposing unreleased answers.
ALTER TABLE assignments ADD COLUMN first_released_at TEXT;
UPDATE assignments SET first_released_at=CASE WHEN release_mode='open' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE opens_at END
 WHERE published=1 AND (release_mode='open' OR (release_mode='scheduled' AND julianday(opens_at)<=julianday('now')));
-- Preserve evidence of weeks already closed before this migration.
UPDATE assignments SET first_released_at=COALESCE(
 (SELECT MIN(created_at) FROM audit WHERE action='assignment.release' AND target=assignments.id AND json_extract(details,'$.mode')='open'),
 (SELECT MIN(created_at) FROM attempts WHERE assignment_id=assignments.id)
) WHERE first_released_at IS NULL;
