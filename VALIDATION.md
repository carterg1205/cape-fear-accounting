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
