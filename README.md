# Cape Fear Outfitters Accounting

A React + TypeScript accounting classroom application with a Cloudflare Worker API, D1 persistence, and Tailwind CSS. Source is maintained on the `staging` branch of [carterg1205/cape-fear-accounting](https://github.com/carterg1205/cape-fear-accounting/tree/staging). No ChatGPT Sites dependency. **Staging is connected to Cloudflare Workers Builds. Production deployment requires explicit approval.**

## Working application

- Responsive student and instructor workspaces, separate role navigation.
- Three realistic source documents: stock issuance, inventory bought on account, and earned service revenue. Students manually select accounts and enter dates and amounts; no document-to-entry automation.
- Compound journal lines, persistent drafts, unlimited checks, server-only answer keys, feedback, and revalidation at posting. Equivalent split lines and reordered lines are accepted. A check never posts.
- Atomic D1 posting, unique student/assignment constraint against concurrent duplicates, immutable posted entries and lines, attempt history.
- Actual posted-data company snapshot, journal-derived ledger, course account chart, unadjusted trial balance, and completion grades. Zero opening baseline represents a new corporation; no fabricated balances.
- Instructor section roster, student account creation with automatic enrollment and one-time display of generated login credentials, release/re-lock controls, scheduled openings enforced on the server, submission history, beta gradebook, CSV export. These are early Phase 2 foundations.
- Provisioned passphrase authentication with PBKDF2 hashes, HttpOnly/SameSite sessions, HTTPS Secure cookies, backend roles and section scoping, login throttling, origin checks, and release audit records.

## Phase 2 classroom features

- **Assignments / Assignment Builder:** create and edit journal-entry exercises; specify unit, order, instructions, points, dates, required reference, source document details, cash-flow category, accepted alternatives and the explanation after posting. Save hidden drafts or publish locked activities to the current section. Copy to another authorized section when needed. Once students start checking work, source content and answer keys are protected; copy the activity to create a new version.
- **Documents:** upload up to two PDF, PNG, JPEG or WebP source files per assignment, up to 10 MB each. Files remain private in R2 and are served through authenticated section/release checks. View documents beside the manual journal workspace or open the original. Unstarted exercises support removing/replacing files.
- **Preview as student:** preview a saved assignment and check a manually prepared entry without writing student attempts, grades or ledger entries. Posting and draft-saving are disabled in instructor preview.
- **Scheduling:** manual release, scheduled opening, re-locking, editable deadlines and individual extensions. Times entered in the UI use America/New_York, including daylight saving. Extensions do not override locks.
- **Settings:** configure simulation course weight and unlock financial statements (locked by default).
- **Progress and Gradebook:** completion tracking, common feedback, student/assignment filters, submission history and authenticated CSV grade exports.
- **Company Financials / Financial Statements:** cumulative income statement, retained earnings, balance sheet and cash-flow views from each student's posted entries. Instructor views require selection of an enrolled student. Students cannot access anyone else's records.
- Incorrect entries now display a **yellow Needs review** message. Both checking and posting require a case-sensitive match to the document reference, ignoring outside whitespace. A balanced entry with a wrong reference cannot post.
- **Course Plan:** a 13-unit progression based on the uploaded ACG 201 outline. The builder shows prerequisites and scope limits for the chosen unit. See COURSE_ALIGNMENT.md for implementation boundaries and the remaining full-course work.

## Expanded course and weekly assignments

- Course Builder is a three-step setup: course details, approved unit settings, review and save. The new model has 43 prepared assignments, including 13 line-by-line statement tasks. Editing approved names and figures regenerates questions, documents and every dependent key. Existing 26-activity courses retain model 1 and their submissions; use **Create updated course** to adopt the expanded course separately.
- Assignments uses a unit-grouped schedule table. Red lock, yellow clock and green check buttons show locked, scheduled and open states. Schedule/deadline opens a visible dialog; schedule a whole unit or one activity in Eastern time. Student extensions remain separate.
- Classes lets professors create independent classes and enroll students from classes they manage. Create new accounts under Students. The top-right class selector changes the roster, course and schedule together.
- Students see weekly units, a current-week completion ring, upcoming units and a progress navigator across all steps. Progress counts correct submitted work, not checks or automatic book corrections. Refresh preserves the page and unsaved work.
- Statement working papers require manual headings, classifications, amounts and subtotals. Incorrect fields receive yellow feedback with specific row details. Financial Analysis stays locked until Unit 13 is released and the instructor enables reports for expanded courses.

## Local development

Node 22+ and npm required. From this directory:

```bash
npm ci
npm run build
npm run db:local
npm run worker
```

Open http://localhost:8787. Development login buttons only work on localhost/127.0.0.1 when `ENVIRONMENT=local` and `DEV_AUTH=true`. Sign in as instructor, release assignments, sign out, then sign in as student. All three sample assignments start locked. Local data persists under `.wrangler/state` across restarts. Never commit that directory.

For frontend hot reload, run `npm run dev` in a second terminal and use http://localhost:5173. Vite proxies `/api` to the local Worker. The Worker also serves the built frontend at port 8787.

## Tests

```bash
npm run check
npm run test:integration
npm run test:classroom
```

`check` runs accounting unit tests, TypeScript checking, and a production frontend build. Integration requires the local Worker and a **fresh, disposable** D1 database; it creates local demo users, releases exercises, posts entries, and tests login/roles, schedule gates, drafts, feedback, duplicate-post races, ledger totals, session revocation, and re-login persistence. Run it against a new checkout. Do not run it against a populated classroom database. No destructive reset script is supplied.

## GitHub workflow

Repository: https://github.com/carterg1205/cape-fear-accounting

Application source lives on `staging`. The `main` branch begins with a repository overview only; production releases require explicit approval. The included GitHub workflow checks accounting and UI tests, TypeScript, the production build, local migrations and API integration. It never deploys.

```bash
git clone --branch staging https://github.com/carterg1205/cape-fear-accounting.git
cd cape-fear-accounting
npm ci
```

Keep changes on staging or feature branches and review before a production release. A successful Cloudflare staging deployment still needs verification.

## Cloudflare staging setup

The dedicated staging D1 database and R2 bucket have been created through the Cloudflare dashboard. Their bindings are in `wrangler.staging.jsonc`. Do not overwrite that file with the example or recreate these resources.

For Cloudflare Workers Builds, use:

- Worker name: `cape-fear-accounting-staging`
- Git / production branch: `staging` (the app files are not on `main`)
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npx wrangler d1 migrations apply DB --remote --config wrangler.staging.jsonc && npx wrangler deploy --config wrangler.staging.jsonc`
- Preview builds: off during initial staging setup.

After changing the build branch, start a build from the latest staging commit. Retrying an old failed main-branch build can still use the old commit and report that package.json is missing. The build token must allow deployment and D1 migration operations.

The R2 binding is reserved for Phase 2 document uploads; Phase 1 sample documents are structured records in D1. For a manual CLI deployment, sign in with `npx wrangler login` and apply migrations:

```bash
npx wrangler d1 migrations apply DB --remote --config wrangler.staging.jsonc
```

Provision accounts with unique passphrases (16+ characters). Set `CFO_PASSPHRASE` securely in your shell without entering it in source code. The generated SQL contains a salt and hash, not the password:

```bash
node scripts/provision-user.mjs carter@example.com 'Carter Godwin' instructor > /tmp/cfo-user.sql
npx wrangler d1 execute DB --remote --config wrangler.staging.jsonc --file /tmp/cfo-user.sql
```

Provision each test student with role `student` the same way. Deliver initial passphrases through your chosen secure channel. Instructors need to be assigned to the section; the provisioning script does this for the initial ACG201 section. Owner accounts can access all sections. No public self-registration or email delivery is included.

After reviewing configuration and using fictional test accounts:

```bash
npm run build
npx wrangler deploy --config wrangler.staging.jsonc
```

Record the returned staging URL and verify the deployment. **Production requires Carter's explicit approval**, a separate D1 database and R2 bucket, `DEV_AUTH=false`, and reviewed deployment settings. Never deploy `wrangler.jsonc` as a remote environment: it is a local configuration.

## Create students from the dashboard

Sign in as an owner or assigned instructor, open **Students**, and enter the student's name and email. **Create student account** creates a student-only account, enrolls it in the current section and records an audit event in one D1 transaction. Duplicate email addresses are rejected without changing the existing account. Owners can create accounts for any section; instructors can only use sections assigned to them.

The generated initial passphrase is returned once and is not stored in plaintext or included in roster or audit responses. Save or copy the displayed login details and share them directly; the app does not send email. To test the student workspace while keeping your owner session, use a private browser window and log in with the new credentials. Refreshing the page or dismissing the credential card removes those displayed details.

## Database and security boundaries

Three SQL migrations create and extend users, sessions, login counters, sections, enrollments, accounts, assignments, answer keys, drafts, entries, lines, attempts and audit records, then seed 3 fictional exercises and additional zero-balance course accounts. The third migration adds private-document metadata, extensions, publishing/report controls, required references and source-content protections. They seed no remote users. Release defaults to locked. Passwords are PBKDF2-SHA256 (100,000 iterations, chosen to fit the Workers Web Crypto iteration limit); sessions last 8 hours. Rate limiting is 20 login requests per client IP per 15-minute window. School networks share IPs, so production needs a reviewed throttling policy. Student account creation is available in the instructor dashboard; initial owner/instructor provisioning remains an administrative CLI task. Password reset, session revocation UI, passphrase rotation, and roster management UI remain to be built.

Only the authenticated student's posted lines feed their reports. Instructor queries require ownership of the section (or owner role). Students never receive answer keys. Submitted entry content and check feedback are visible to the assigned instructor. Posted records cannot be overwritten or deleted; an auditable reversal workflow is still needed before corrections can be offered.

## Deliberate remaining work

- Continue staging review and classroom usability testing; production remains pending explicit approval.
- Additional exercise types, configurable attempts/accuracy grading and late policies, account recovery and remaining lifecycle controls.
- Institutional privacy, security and accessibility review before real student use; broader cross-section and assistive technology testing.
- Semester-approved opening records and versioned weekly baselines to support missed work without duplication. Phase 1 uses a zero baseline and independent sample assignments only.
- T-accounts, period-filtered/classified/adjusting/closing and post-closing reports, accounting-period administration, auditable reversals. Current financial report views are cumulative from incorporation.
- All 13 editable course units, inventory calculations, reconciliation, ratios, cash flows and other reusable exercise types.
- Beta grading remains unlimited checks and full points for a correct posted entry before the applicable deadline. Instructors can now edit due dates and grant extensions; configurable late policies remain future work.

This application is a tested local beta, not university-approved or certified FERPA compliant. No real student data was imported.

### Prepared course (Phase 3)

Open **Course Builder → Review & save → Use prepared course** to install all 13 units and 43 activities for a section. Installation selects the new edition and leaves every activity locked. Preview the stories and examples, customize the listed names/numbers, then release activities from **Assignments**. Saving regenerates the complete course's documents, keys and starting checkpoints. After student work begins, use **Create updated course**; old work is preserved in course history.

Course history is managed inside Course Builder; global course-edition boxes are removed from both dashboards. Instructor financial reports offer a unit selector. Financial statements combine actual student entries, supplied business transactions and deadline-triggered book corrections. Worksheet activities earn completion credit without adding journal entries. See `VALIDATION.md` for the simulation and versioning model.

Run `node scripts/course-integration.mjs` after the original integration and classroom suites against the same disposable local worker/database.


### Deadline corrections and workspace updates

**Settings → Automatic book corrections** controls whether missing transactions are filled automatically and how long to wait after each effective due date (0–168 whole hours; default 24). Individual extensions delay pending corrections. Assignments without deadlines, hidden drafts and locked assignments are not corrected. A Cloudflare scheduled handler runs every 15 minutes; state and financial report reads also catch up due corrections. The scheduled handler is covered by the local API suite using `--test-scheduled`.

Correction records are immutable and separate from student submissions: they do not earn points or alter grades/attempts. Previously posted correct entries remain unchanged. If a later extension permits a student to post an already corrected transaction, the original correction remains in history while its financial effect is replaced by the student's matching entry, preventing duplication. Applied corrections also freeze the related answer keys/course configuration.

The app checks the session behind a loading screen and preserves the selected page, section and journal on refresh through the URL. Unsaved manual journal fields are restored from tab-local, user-scoped session storage. Debit/credit transactions remain manual, with blank account selectors and amount fields; working papers support analysis/calculation topics and manual statement preparation. The desktop workspace places supporting documents or transaction details on the left and entry fields on the right.

Closing a previously released assignment keeps its accounting history and does not cancel an eligible deadline correction. Unreleased locks still hide future transactions. Released/closed assignments remain part of the student's grade denominator.

### Transaction questions, supporting records and account search

Every released journal transaction now supplies a complete question with the business facts, accounting assumptions, explicit recording task, date and reference. Supporting documents are supplementary. Prepared transactions use appropriate invoices, paid receipts, policy schedules, bank advice, payroll registers and financing records with counterparties, terms, line items and totals. The presentation is generated read-only from the edition's existing parameters; it does not change frozen answer keys or student submissions.

Journal accounts use a searchable combobox with name/code search, keyboard navigation and pointer selection. The per-transaction list generally contains 8–12 accounts, including plausible alternatives; every accepted account is retained for custom instructor-authored keys. The chart of accounts remains available separately. No account is selected automatically by a search.

Checks identify incorrect line/account selections, wrong debit/credit direction, amount errors and missing accounts. Imbalances show the actual debit/credit totals and difference. Date, reference and memo problems are reported alongside accounting errors, using the existing yellow review feedback. Exact cents, split/compound-line equivalence and multiple accepted configurations remain supported.

CI also runs `node scripts/transaction-integration.mjs` after the preceding local API suites.
