# Initial implementation validation

Date: October 19, 2026. Environment: local Cloudflare Wrangler / workerd and persistent D1 emulation. No remote infrastructure was modified.

## Passed

- 5 accounting engine tests: correct and reordered/split compound lines, rejection of balanced but conceptually wrong entries and reversed debit/credit directions, invalid amounts/accounts, normal and abnormal account balances, and exact money parsing.
- 2 DOM interaction tests: source documents do not auto-fill date/accounts, manually entered decimal amounts are sent as exact integer cents, checking does not post, mobile document/entry switching preserves work, compound lines and draft requests work.
- TypeScript checking and Vite production build.
- Both D1 SQL migrations applied locally (13 application tables, indexes and immutability triggers; 18 accounts; 3 locked sample assignments).
- 35 HTTP integration checks: unauthenticated access, instructor-only routes, invalid section access, release permissions, locked/scheduled access, persisted drafts, hidden server answer keys, balanced wrong entries, wrong date, fractional cents, correct checks without posting, concurrent duplicate posting (one success and one HTTP 409), equivalent compound entries, trial balance integrity, second-student isolation, provisioned passphrase login, instructor feedback history, origin rejection, logout revocation, and re-login persistence.
- Fresh Worker process restart preserved 3 posted entries and 7 lines, with Cash $20,450.00 in the controlled test dataset.

## Not verified / remaining

- Desktop/mobile browser rendering and real browser keyboard/accessibility testing. Chromium was unavailable, and its download failed in this environment. DOM tests are not a substitute for visual review.
- GitHub CI execution must be checked after the staging source upload. The included workflow validates without deploying.
- Cloudflare staging or production: no authenticated Cloudflare account is available; no remote resources, migration, or deployment were created.
- Real roster, institutional data/privacy/security review, assistive technology testing, production account recovery, load testing, and the features listed as remaining in README.

The local agent environment required a temporary network-interface shim to start Wrangler, and the server and HTTP client had to run in the same network namespace. Neither workaround is part of the app or required by the normal documented development workflow.

Sample posted test data is excluded from the deliverable. A new checkout starts with no user accounts, zero balances, and locked assignments after migration. The remote configuration explicitly disables development login.

## Student account creation update

- 8 unit/DOM tests passed, including creating a student from the owner dashboard, displaying the generated login details and dismissing them.
- 50 HTTP integration checks passed on a fresh local D1 database. New coverage includes generated passphrase login, automatic enrollment, forced student role despite submitted role fields, unauthorized student and cross-section requests, invalid input, duplicate normalized email, concurrent duplicate creation, owner access across sections and absence of credentials in roster/audit records.
- TypeScript and production build passed. No new migration is needed; account creation uses the existing users, enrollments and audit tables.
- Initial passphrases are displayed after creation and can be copied; no automatic email delivery or password reset UI is included.

## Phase 2 classroom update

- 13 unit/DOM tests pass, including yellow review feedback, exact required references, course-unit preservation in the builder, exact money amounts, retained earnings/equity/cash-flow relationships and Eastern daylight-saving conversions.
- 50 existing HTTP regression checks and 64 additional Phase 2 checks pass on a fresh local D1/R2 environment. Coverage includes draft/published visibility, private answer keys, alternative answer configurations, preview without student writes, reference rejection during posting, frozen source content, private R2 uploads/reads/removal, document type and count restrictions, release/schedule/section gates, extensions, report unlocking, cross-student privacy, financial totals, progress and filtered CSV exports.
- Migration 0003 is additive. It retains all posted entries, backfills source-document references and adds zero-balance course accounts, publishing/report controls, extensions and private R2 document metadata. Existing-ledger preservation is checked during local upgrade.
- Full desktop/mobile visual QA remains unverified because the available browser binary download failed earlier. DOM workflow and API checks do not replace assistive technology or institution review.
- Full-course exercises and controlled semester baselines remain Phase 3 work; the Course Plan and COURSE_ALIGNMENT.md specify the source outline's progression and scope limits.

## Phase 3 — prepared course and interface

- 19 unit/DOM tests pass, including course completeness, balanced generated records, cross-unit regeneration, immutable starting checkpoints and invalid parameter dependencies.
- 50 original API checks, 64 classroom checks and 33 prepared-course HTTP checks pass against a fresh disposable D1 database.
- Prepared-course checks cover install/edit/revision conflicts, hidden locked lessons, student/instructor authorization, nonjournal grading, exact references, preview without freezing, frozen editions, protected editing routes, journal revisions, starting records without duplicate posting, statement reconciliation and preserved archived work.
- `npm run check` runs tests, TypeScript and the production build. CI also runs all three HTTP suites and migration 0004.
- Browser verification passed with Chromium headless shell: instructor sign-in, course installation, assignment preview, desktop and 390-pixel mobile layouts. No browser runtime errors or page-level horizontal overflow were observed.

## Teaching model

The 13 units contain 26 prepared activities. Each unit supplies a story introduction, concepts, scope notes and a worked example with different numbers. Analysis, periodic inventory, reconciliation, cash-flow classification and statement analysis use manually entered worksheet answers; journal activities require manually entered accounts, dates and amounts. Wrong responses use yellow **Needs review** text. Reference matching applies to both activity types.

A single server-side compiler generates source documents, answer keys and the next unit's approved records from restricted parameters. Names, whole-cent amounts, bounded quantities, rates, starting month and activity points are editable; accounts, formulas and grading logic are fixed. Dependency checks prevent overselling inventory, excessive write-offs, negative cash, below-par stock issues and invalid depreciation assumptions.

The original Phase 3 implementation used approved prior-unit checkpoints. The deadline-correction update below supersedes that model; earlier entries now remain in the cumulative books and missing entries are repaired only at the configured time. These are selected simulation transactions, not a complete recurring monthly accounting cycle. Worksheet completions earn points without creating fictitious student journal entries. The period advances one simulated month per unit; release dates remain independent.

Before student attempts, saves regenerate the complete edition atomically with a revision check. After any attempt, scenario edits require a new edition. Earlier editions remain read-only for student submissions, with original keys, grades and entries preserved. Scheduling and deadline extensions remain editable.


## Deadline corrections and accounting workspace — October 19 update

- 25 unit/DOM tests cover accounting behavior, course generation, Eastern correction times, consistent narrative money formatting, no login flash, recoverable load failures, route/form restoration, hidden student edition controls and manual account/debit/credit entry.
- The original 50 API checks, 64 classroom checks, 35 prepared-course checks and the new correction suite run against disposable D1 databases. Correction tests verify delays, disabled mode, extensions, repeat/concurrent reads, preserved grades, cumulative balances, correct manual postings without duplication, later extensions/submissions, unreleased/no-deadline activities, immutable corrected keys and independent scheduled execution.
- Migration 0005 adds instructor correction settings and separate immutable correction records. Deployment config registers a 15-minute cron. No scheduled action sends messages or changes grades.
- Corrections use the latest release/deadline/extension/settings/revision/source-key values checked again atomically at insertion. Once applied, corrections remain in history. Pending corrections follow new settings; changes do not undo already applied records.
- Only labeled supplied business records (the advance deposit, patent purchase and dividend payment) are provided when their own units open. Missing student exercise transactions are no longer silently included as starting balances when a later unit opens.
- Journal entries and corrections accumulate through the selected unit, rather than adding a full prior-week answer-key snapshot. A later correct student post replaces a correction's financial effect, preserving both original records without duplicate balances.
- Student journal pages have no course-edition banner, motivational sidebar/banner or worked-example disclosure. Documents are optional; all journal activities retain manual blank account dropdowns, debit/credit fields, dates, memos and exact reference validation.

- Final verification: all 25 unit/DOM tests and all 196 HTTP checks passed. Chromium verified journal and general-ledger page restoration, preservation of unsaved manual journal fields, no login-form flash, hidden student edition/teaching controls, left/right desktop columns, optional supporting documents and a 390-pixel mobile layout without page overflow. No browser runtime errors were observed.
- Background correction work is bounded to 25 records per run to leave room within the D1 free-tier per-invocation query budget. A student's own state/report read catches up their prepared course (fewer than 25 journal/analysis posting records). Larger background queues continue on subsequent runs.

- Migration 0006 preserves release history so closing a previously released week does not remove supplied records, roll back the ledger period, cancel eligible corrections or exclude missed work from the dashboard grade. Previously unreleased locks and future schedules remain protected. Four additional HTTP checks cover closed-week correction eligibility and retained supplied transactions.

- Responsive follow-up verified 390, 768, 1024, 1100 and 1440-pixel widths. Smaller laptop windows stack the panels before their minimum column widths would overflow.
