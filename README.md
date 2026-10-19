# Cape Fear Outfitters Accounting

A React + TypeScript accounting classroom application with a Cloudflare Worker API, D1 persistence, and Tailwind CSS. Source is maintained on the `staging` branch of [carterg1205/cape-fear-accounting](https://github.com/carterg1205/cape-fear-accounting/tree/staging). No ChatGPT Sites dependency. **Not yet deployed to Cloudflare.**

## Phase 1 implemented

- Responsive student and instructor workspaces, separate role navigation.
- Three realistic source documents: stock issuance, inventory bought on account, and earned service revenue. Students manually select accounts and enter dates and amounts; no document-to-entry automation.
- Compound journal lines, persistent drafts, unlimited checks, server-only answer keys, feedback, and revalidation at posting. Equivalent split lines and reordered lines are accepted. A check never posts.
- Atomic D1 posting, unique student/assignment constraint against concurrent duplicates, immutable posted entries and lines, attempt history.
- Actual posted-data company snapshot, journal-derived ledger, chart of 18 accounts, unadjusted trial balance, and completion grades. Zero opening baseline represents a new corporation; no fabricated balances.
- Instructor section roster, release/re-lock controls, scheduled openings enforced on the server, submission history, beta gradebook, CSV export. These are early Phase 2 foundations.
- Provisioned passphrase authentication with PBKDF2 hashes, HttpOnly/SameSite sessions, HTTPS Secure cookies, backend roles and section scoping, login throttling, origin checks, and release audit records.

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

## Database and security boundaries

Two SQL migrations create users, sessions, login counters, sections, enrollments, accounts, assignments, answer keys, drafts, entries, lines, attempts and audit records, then seed 3 fictional exercises. They seed no remote users. Release defaults to locked. Passwords are PBKDF2-SHA256 (100,000 iterations, chosen to fit the Workers Web Crypto iteration limit); sessions last 8 hours. Rate limiting is 20 login requests per client IP per 15-minute window. School networks share IPs, so production needs a reviewed throttling policy. Account creation is an administrative CLI task for this beta. Password reset, session revocation UI, passphrase rotation, and roster management UI remain to be built.

Only the authenticated student's posted lines feed their reports. Instructor queries require ownership of the section (or owner role). Students never receive answer keys. Submitted entry content and check feedback are visible to the assigned instructor. Posted records cannot be overwritten or deleted; an auditable reversal workflow is still needed before corrections can be offered.

## Deliberate remaining work

- Verify Cloudflare staging build, migrations and deployment; provision instructor access.
- Phase 2 assignment builder, accepted-answer editor, authenticated PDF/image uploads and R2 viewer, configurable points/attempts/grading/late rules, extensions and due-date editor, editable simulation weight, account lifecycle UI.
- Institutional privacy, security and accessibility review before real student use; broader cross-section and assistive technology testing.
- Semester-approved opening records and versioned weekly baselines to support missed work without duplication. Phase 1 uses a zero baseline and independent sample assignments only.
- Financial statements, T-accounts, adjusting/closing and post-closing reports, accounting-period administration, auditable reversals.
- All 13 editable course units, inventory calculations, reconciliation, ratios, cash flows and other reusable exercise types.
- Due-date scoring and extensions: current sample assignments have no deadline, unlimited checks and full credit for correct posting. The API rejects overdue work when a due date is configured in D1, but has no late-policy configuration yet.

This application is a tested local beta, not university-approved or certified FERPA compliant. No real student data was imported.
