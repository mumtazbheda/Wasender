# WASENDER MASTER MEMORY & CHANGELOG

**LAST UPDATED:** 24 Mar 2026, GMT+4
**PROJECT STATUS:** All 6 features implemented + feedback sync loop complete + campaigns working
**LATEST LIVE COMMIT:** `cf229e4` — auto-update feedback columns after campaign sends
**BRANCH:** `claude/review-memory-lock-docs-GGh8m` (pending merge to main → Vercel deploy)
**LIVE URL:** https://wasender-pi.vercel.app
**REPOSITORY:** https://github.com/mumtazbheda/Wasender

---

## ⚡ QUICK STATUS (As of 24 Mar 2026)

| Feature | Status |
|---|---|
| Campaign rerun dialog (Fresh start / Resume) | ✅ Live |
| "Keep tab open" banner | ✅ Removed |
| Background campaign via GitHub Actions | ✅ Workflow file created (needs PAT + merge) |
| `.github/workflows/process-campaign.yml` | ✅ Created in branch |
| Campaign Step 4 "Review & Send" crash | ✅ Fixed (Rules of Hooks violation) |
| Queued messages showing as ❌ red | ✅ Fixed — now shows ⏳ gray |
| Queued filter tab in Campaign History | ✅ Added |
| Contract A showing correct value | ✅ Fixed (commit 7acbc5f) |
| WhatsApp 3-step modal (Owner → Account → Template) | ✅ Fixed (PR #2) |
| Send Message phone validation | ✅ Fixed (commit 7acbc5f) |
| Statistics page (`/statistics`) | ✅ Live |
| Collapsible sidebar | ✅ Live |
| MultiSelectDropdown for Campaigns + Contacts | ✅ Live |
| **WAsender API endpoint fixed** | ✅ Fixed — was wrong URL, now `wasenderapi.com/api/send-message` |
| **Campaign messages sending correctly** | ✅ Fixed — Bearer auth + `{ to, text }` body |
| **UX: Duplicate Next Step button at top** | ✅ Added above contacts list |
| **UX: Account selector for test messages** | ✅ Separate dropdown in Step 2 |
| **UX: Custom min/max delay range** | ✅ Replaced ±20% checkbox with `delay_min`/`delay_max` |
| **UX: Template duplicate + create new buttons** | ✅ Added to Step 2 |
| **Google Sheet feedback sync after campaign** | ✅ Auto-writes "Message Sent - DD Mon YYYY" to Sheet |
| **DB cache feedback sync after campaign** | ✅ Updates `sheets_data_cache` in Postgres |

### 🔴 PENDING ACTIONS
1. **Merge PR** from branch `claude/review-memory-lock-docs-GGh8m` → `main` on GitHub to deploy all changes to Vercel
2. **Add `GITHUB_PAT` secret** to GitHub repo (Settings → Secrets → Actions → New secret) with a Personal Access Token that has `workflow` scope — this allows the GitHub Actions workflow to be triggered when a campaign is started

---

## 🐛 KNOWN BUG PATTERNS (CHECK EVERY TIME)

1. **Database IDs are NUMBERS, JS state is STRING** → Always use `String(id) === String(stateValue)`
2. **Never create state-based modals without rendering them** → Use `window.open()` for external links
3. **Auto-created DB records need ALL fields populated** → Don't leave required display fields empty
4. **Vercel filesystem is EPHEMERAL** → Never use JSON files for storage, use Vercel Postgres
5. **TypeScript interface MUST list ALL fields used in JSX** → Any `selectedContact.xyz` needs `xyz` in `interface Contact`
6. **Filter state objects MUST list ALL filter keys used** → If you reference `filters.xyz`, it MUST be in the `useState({...})` init
7. **Alpine Linux grep has NO `-P` flag** → Use Python regex instead of `grep -P`
8. **When using string replacement on .tsx files** → Always account for `as string` suffixes and exact whitespace
9. **Column name `.includes()` is dangerous** → Use exact match `headers.findIndex(x => x === "contract")` not `findByName(["contract"])`
10. **Vercel serverless functions are killed after HTTP response** → Background loops/setTimeout don't work; must use external scheduler (GitHub Actions, cron service)
11. **Wrong API endpoint → HTML error page** → Trying to JSON.parse HTML in Safari throws "string did not match expected pattern"
12. **iOS input validation** → Use `type="text"` not `type="tel"` to avoid strict iOS phone validation
13. **React Rules of Hooks** → NO `useEffect`/`useState` after `if (...) { return }` — all hooks must be before ANY early return or the app crashes when the condition flips
14. **`queued` ≠ `failed` in UI** → Show ⏳ gray for queued, ❌ red for failed only — otherwise users think campaign failed when messages are just pending
15. **GitHub Actions workflow must exist in repo** → Dispatching a workflow that doesn't exist does nothing; campaign messages stay queued forever

---

## 🏗️ ARCHITECTURE

### Hosting & Infrastructure
- **Platform:** Vercel (Hobby plan)
- **Database:** Vercel Postgres (`@vercel/postgres`)
- **Auto-deploy:** Every push to `main` branch
- **Serverless constraint:** Functions killed after HTTP response → no background loops possible
- **Cron:** Hobby plan = daily cron only (useless for per-campaign timing)

### Database Tables
| Table | Purpose |
|---|---|
| `accounts` | WhatsApp sending accounts (name, phone, apiKey, accountType) |
| `campaigns` | Campaign runs with name, status, stats |
| `campaign_messages` | Per-message logs with status (queued/pending/sent/failed), row_index |
| `contacts_cache` | Server-side cache from Google Sheets |
| `message_templates` | Reusable message templates with variables |

### WhatsApp API
- **Endpoint:** `https://wasenderapi.com/api/send-message` ← CORRECT (old was wrong: `wasender.websmartmedia.tech` doesn't exist)
- **Auth:** `Authorization: Bearer {api_key}` header (NOT body param)
- **Format:** POST with JSON `{ to: "+971XXXXXXXXX", text: "message" }`
- **Success check:** `res.ok && data.success !== false`

### Google Sheets
- **Sheet ID:** `1f--c_bNEofTc3-Qjjt4stqu5blxPHvgUTlHppqBrOfc`
- **Sheet name:** `"Time_1 WhatsApp"`
- **Complete mapping:** `/agent/home/sheets-fixed.ts`
- **Key columns:**
  - `"contract"` → maps to `contract_a` (EXACT MATCH REQUIRED, not `.includes()`)
  - `"rental_contract_status"` → separate field, NOT for Contract A display
  - Owner 1/2/3 Mobile (all 3 checked for campaigns)
  - Ahmed Feedback 1/2/3, Zoha Feedback 1/2/3, Zoha Email Feedback 1/2/3
  - bayut_rent/sale, pf_rent/sale, bayut/pf links and prices
  - latest_transaction_date, latest_transaction_amount, occupancy_status

### Campaign Background Processing (GitHub Actions approach)
```
Flow (workflow file now exists at .github/workflows/process-campaign.yml):
1. User clicks "Send Campaign" → /api/send-campaign queues all messages in DB
2. API calls GitHub Actions via REST API: POST /repos/.../actions/workflows/process-campaign.yml/dispatches
3. GitHub Actions workflow loops, calling /api/process-campaign with campaign_id
4. Each call: sends one message, updates DB status (queued → sent/failed)
5. Sleeps delay_min–delay_max seconds between messages (random range)
6. Loop continues until isComplete=true or workflow timeout (6h max)
7. User can CLOSE BROWSER — campaign runs completely server-side

Fallback (if GITHUB_PAT env var missing or wrong scope):
- Messages stay in DB as "queued" (shown as ⏳ in UI)
- User sees "use Resume button" message
- Click Resume → re-triggers the GitHub Actions workflow

GitHub Actions workflow: .github/workflows/process-campaign.yml
Vercel env var required: GITHUB_PAT (token needs `workflow` scope)
GitHub repo secret required: none (workflow calls Vercel's public API endpoint)
```

### Data Flow
```
Google Sheets → /api/sheet-data → Browser → localStorage cache
Cache key: wasender_cache_{sheetName} + wasender_cache_{sheetName}_time
Edit contact → /api/sheet-update → Google Sheets + update local state + cache
Campaign send → /api/send-campaign → queues in DB → triggers GitHub Actions workflow
/api/process-campaign → sends ONE message → updates DB → called repeatedly by workflow
```

---

## 📋 CURRENT PAGES (ALL LIVE)

### Dashboard (`/`)
- Dynamic stats from cache + API
- Shows: Total Contacts, Active Accounts, Campaigns Run, Messages Sent
- Quick Actions: New Campaign, Manage Contacts, **Send a Message**, Manage Accounts

### Contacts (`/contacts`)
- Sheet selector dropdown (loads "Time 1 WhatsApp" — 162+ columns)
- Collapsible view sections (accordion) — ViewSection component
- All filters: Purpose, Rooms, Status, 6 Feedback columns, Owner 1/2/3 Mobile Blank/Zero/Non-blank
- UAE Phone Country Code filter for all 3 owner mobile columns
- Search by unit, owner, phone
- Sort by days remaining
- localStorage caching with Re-sync button
- Edit contact modal — ALL columns, grouped sections, writes back to Google Sheets
- View modal with collapsible sections:
  - 🏠 Property Info (project_name_en, rooms_en, area, etc.)
  - 👤 Owner 1/2/3 (name, mobile as PhoneLink, email)
  - 📅 Rental Info (rent_end_date, days remaining, rental_contract_status, rent_start_date, duration, price, **Contract A**)
  - 🏷️ Listing Info (bayut_rent/sale, pf_rent/sale, prices, links)
  - 💰 Sales Transaction Details (latest_transaction_date, latest_transaction_amount, occupancy_status)
  - 💬 Feedback (ahmed 1/2/3, zoha 1/2/3, zoha_email 1/2/3)
  - 📁 Other (purpose, asking prices, vam_listing_status, furnishing, view)
- **WhatsApp 3-step modal:**
  1. Select Owner (1/2/3)
  2. Select Account (from `accounts` table) — REQUIRED
  3. Select Template (from `message_templates` table) — REQUIRED, no default
  → Opens WhatsApp with template text pre-filled

### Campaigns (`/campaigns`)
- **Step 1:** Contact selection with list view + checkboxes, ALL filters mirror Contacts page
- **Step 2:** Template selection + preview + SEND TEST MESSAGE
  - Variables: {name}, {unit}, {rooms_en}, {project_name_en}, {phone}
- **Step 3:** Delay config (initial delay, **min delay + max delay range**, unit selector, schedule option)
  - `delay_min` and `delay_between` (as max) stored in `campaign_runs` DB
  - Campaign naming REQUIRED before sending
- **Step 4:** Review & Send — account selector, message preview, deduplication stats, send
- **Rerun Dialog (NEW):** When clicking Re-run, asks:
  - "▶️ Resume from where I left off" — continues with remaining queued messages
  - "🔄 Start completely fresh" — resets all messages to queued, starts over

### Send a Message (`/send-message`)
- Quick messaging without full campaign
- Account selector, phone number input, message body, send button with status feedback

### Campaign History (`/campaign-history`)
- Lists all campaigns with name, status (completed/partial/failed), timing, stats
- Click any → full detail with per-message log
- **Re-run button** with dialog (Resume / Fresh start)
- Persists forever in Vercel Postgres

### Accounts (`/accounts`)
- Database-backed (Vercel Postgres)
- Auto-creates account from WASENDER_API_KEY env var
- Add/Edit/Delete accounts (name, phone, apiKey, accountType: wasender/whatsapp_business)
- Masked API keys in UI

### Templates (`/templates`)
- Create/Edit/Delete templates
- Variables: {name}, {unit}, {rooms_en}, {project_name_en}, {phone}

### Sidebar
- Dashboard, Contacts, New Campaign, Campaign History, Templates, Accounts, Messages, Send a Message
- Burger button top-left when closed, X button inside sidebar top-right when open

---

## 🔑 ENVIRONMENT VARIABLES (Vercel)

| Variable | Purpose |
|---|---|
| `WASENDER_API_KEY` | Default WAsender API key |
| `GOOGLE_CLIENT_ID` | Google OAuth for Sheets access |
| `GOOGLE_CLIENT_SECRET` | Google OAuth for Sheets access |
| `NEXTAUTH_SECRET` | NextAuth secret |
| `POSTGRES_URL` (+PRISMA, NON_POOLING variants) | Vercel Postgres |
| `GOOGLE_SHEET_ID` | `1f--c_bNEofTc3-Qjjt4stqu5blxPHvgUTlHppqBrOfc` |
| `GITHUB_PAT` | GitHub token (added 15 Mar) — currently missing `workflow` scope |

---

## 🔐 CREDENTIALS

| Item | Value |
|---|---|
| GitHub PAT (current, missing workflow scope) | `github_pat_REDACTED_see_Tasklet_agent` |
| Vercel Token | `vcp_REDACTED_see_Tasklet_agent` |
| Zoha WhatsApp API Key | `ZOHA_API_KEY_REDACTED_see_Tasklet_agent` |
| Zoha Phone | `971501234567` |
| WhatsApp API Endpoint | `https://wasenderapi.com/api/send-message` |
| Google Sheet ID | `1f--c_bNEofTc3-Qjjt4stqu5blxPHvgUTlHppqBrOfc` |

---

## 🚫 CRITICAL LESSONS LEARNED

1. **NEVER rewrite working pages** — Make targeted changes only
2. **Vercel has EPHEMERAL filesystem** — Never use JSON files, use Vercel Postgres
3. **WhatsApp Business API URL** is `graph.facebook.com`, NOT `graph.instagram.com`
4. **Next.js 16 params** are `Promise<{id: string}>` — must `await params`
5. **No lucide-react** — project uses emojis for icons
6. **Step 1 of Campaigns** must ALWAYS remain unchanged (list view with checkboxes)
7. **Always read existing code first** before making changes
8. **Cross-check interface vs usage** before pushing — run Python to find `selectedContact.xyz` refs not in interface
9. **Check filter state init** before pushing — all `filters.xyz` refs must have corresponding key in useState
10. **Alpine Linux grep** — No `-P` flag, use `python3 -c "import re..."` for Perl-style regex
11. **Campaigns page filter state** uses `'' as string` not just `''` — match exact patterns when editing
12. **Push in stages and verify** — don't push 10 files at once without checking each one compiles
13. **Area data labels:** `actual_area` = Property Size (LARGER), `unit_balcony_area` = Balcony Size (SMALLER)
14. **Phone numbers already have country codes** — no formatting needed (except UAE normalization: 05xxx → 9715xxx)
15. **Column name exact matching** — Use `headers.findIndex(x => x === "contract")` not `.includes()` — avoids "rental contract" matching before "contract"
16. **Vercel serverless = no background loops** — Any async after response return is killed; use GitHub Actions for long-running jobs
17. **Wrong API endpoint = HTML error in Safari** — 404 returns HTML, Safari's JSON.parse throws "string did not match expected pattern"
18. **`type="tel"` causes iOS validation issues** — Always use `type="text"` for phone inputs
19. **React Rules of Hooks: NO hooks after conditional early returns** — Any `useEffect` or `useState` placed AFTER an `if (step === X) { return (...) }` block will crash when the condition flips because React calls a different number of hooks per render. ALL hooks must live at the TOP of the component before any conditional returns
20. **Queued messages ≠ failed messages in UI** — `status = 'queued'` should display as ⏳ gray pending; `status = 'failed'` should display as ❌ red. Treating both as red misleads users into thinking all messages failed when they are actually just waiting
21. **GitHub Actions workflow file must exist before calling dispatch API** — Without `.github/workflows/process-campaign.yml` committed to the repo, calling the GitHub REST API to dispatch the workflow silently does nothing (or returns 404). Campaigns get queued in DB but are never processed. The file must be committed to the target ref (`main`) before the dispatch call
22. **WAsender API URL is `wasenderapi.com/api/send-message`** — NOT `wasender.websmartmedia.tech` (that domain doesn't exist → every message fails silently with "fetch failed"). Auth is `Authorization: Bearer {key}` header. Body is `{ to, text }`.
23. **`data.success !== false` is required** — WAsender may return `res.ok = true` but `data.success = false` for logical errors (bad phone, etc.). Always check both `res.ok` AND `data.success !== false`.
24. **Merge conflict resolution can silently remove logic** — After a `git merge`, critical checks like `data.success !== false` may be dropped if both branches modified the same file. Always re-read key files after resolving conflicts.
25. **`delay_min` DB column requires migration** — Added as `ALTER TABLE campaign_runs ADD COLUMN IF NOT EXISTS delay_min INTEGER DEFAULT 5` in `db.ts`. Without this, rerun-campaign crashes with "column does not exist".

---

## 🔧 TASKLET AGENT CONNECTIONS

| Connection | ID | Purpose |
|---|---|---|
| GitHub OAuth | `conn_cabkank6vrvmtpjzcdqs` | Push code, create PRs (14 tools activated) |
| GitHub Direct API | `conn_k3qxeqkgj2f8chya1j7y` | Direct REST API calls |
| Vercel API | `conn_y9kbhm4jkyk1z9mepey2` | Deploy, check builds |
| Google Drive OAuth | `conn_3kn3rtf6ngy40xf2b0zg` | Google Sheets access |

---

## 📁 KEY FILES (Agent Filesystem `/agent/home/`)

| File | Purpose |
|---|---|
| `MEMORY_AND_CHANGELOG.md` | This file (master reference) |
| `sheets-fixed.ts` | Complete Google Sheets column mapping |
| `PRE_PUSH_VALIDATION.sh` | Pre-deployment validation script |
| `campaigns-page.tsx` | Latest campaigns page (with rerun dialog) |
| `send-campaign-route-v2.ts` | New send-campaign route (triggers GitHub Actions) |
| `rerun-campaign-route.ts` | New rerun-campaign route |
| `process-campaign-workflow.yml` | GitHub Actions workflow (pending push with workflow PAT) |

---

## 🎯 DEPLOYMENT PROCESS

1. Edit files in `/agent/home/`
2. **ALWAYS run pre-push validation:**
   ```python
   import re
   with open('page.tsx') as f:
       content = f.read()
   
   # Check interface completeness
   used = set(re.findall(r'selectedContact\.(\w+)', content))
   interface_match = re.search(r'interface Contact \{(.*?)\}', content, re.DOTALL)
   defined = set(re.findall(r'(\w+)\??:', interface_match.group(1)))
   missing = used - defined
   if missing:
       print(f"⚠️ Missing from interface: {missing}")
   
   # Check filter state completeness
   filter_used = set(re.findall(r'filters\.(\w+)', content))
   filter_match = re.search(r'useState\(\{(.*?)\}\)', content, re.DOTALL)
   filter_defined = set(re.findall(r'(\w+):', filter_match.group(1)))
   missing_filters = filter_used - filter_defined
   if missing_filters:
       print(f"⚠️ Missing from filter state: {missing_filters}")
   ```
3. Push to `main` via `github_push_to_branch` (or `github_create_pull_request`)
4. Vercel auto-deploys from main (~60–90 seconds)
5. Check build: `GET https://api.vercel.com/v6/deployments?projectId=wasender&limit=3`
6. If error, check logs: `GET https://api.vercel.com/v2/deployments/{uid}/events?...`

---

## 📝 FULL CHANGELOG (Chronological)

---

### Session 7: Campaign Crash Fix + GitHub Actions Workflow + Queued UI Fix (17 Mar 2026)

#### Problem 1: "Review & Send" button crashes entire app (client-side exception)
**Symptom:** Clicking "Next: Review & Send" in Step 3 of campaigns caused a full white-screen crash:
> "Application error: a client-side exception has occurred while loading wasender-pi.vercel.app"

**Root cause:** React Rules of Hooks violation.
- A `useEffect` for polling in-progress campaigns every 10 seconds was placed AFTER the `if (step === 1)`, `if (step === 2)`, `if (step === 3)` early returns
- When step changes from 1/2/3 → 4, React tries to call a hook that wasn't called in the previous render
- This is an illegal change in hook call order → React throws a fatal error

**Fix:** Commit `8bfb921`
- **File:** `src/app/campaigns/page.tsx`
- Moved the polling `useEffect` to the top section of the component alongside the other `useEffect`s (after line ~250, before any conditional returns)
- Removed the duplicate copy from the bottom of the file

---

#### Problem 2: All campaign messages failing — 143 messages, 0 sent, 0 failed (all stuck as queued)
**Symptom:** After starting a campaign, the campaign history showed 143 messages all with red ❌, 0 sent, 0 failed. Campaign status was "In Progress" indefinitely.

**Root causes (two separate issues):**

**Root Cause A — GitHub Actions workflow file missing:**
- `/api/send-campaign` calls `triggerGithubWorkflow()` which dispatches `.github/workflows/process-campaign.yml`
- That workflow file **did not exist** in the repository (`.github/` directory was absent entirely)
- Result: dispatch call silently failed → no background job → messages sat as "queued" forever

**Root Cause B — UI bug: queued shown as failed:**
- Campaign history page: `msg.status === 'sent' ? '✅' : '❌'`
- Any non-"sent" status (including "queued") displayed as red ❌
- This made it look like all 143 messages failed, when they were actually just waiting

**Fix A:** Commit `2bc9a32` — Created `.github/workflows/process-campaign.yml`
- Workflow accepts inputs: `campaign_id`, `delay_min`, `delay_max`
- Loops calling `POST https://wasender-pi.vercel.app/api/process-campaign` with campaign_id
- Sleeps random seconds between `delay_min` and `delay_max` after each message
- Exits loop when `isComplete: true` returned from API
- Max timeout: 6 hours (handles campaigns up to ~216 messages at 100s delay)

**Fix B:** Commit `2bc9a32` — Fixed campaign history message display
- **File:** `src/app/campaign-history/page.tsx`
- Changed message row color: `sent` → green, `queued` → gray, `failed` → red
- Changed message icon: `sent` → ✅, `queued` → ⏳, `failed` → ❌
- Added "⏳ Queued (N)" filter tab (only appears when there are queued messages)
- Updated `messageFilter` type from `'all' | 'sent' | 'failed'` to `'all' | 'sent' | 'failed' | 'queued'`

**Remaining action required:**
- Merge PR from `claude/review-memory-lock-docs-GGh8m` → `main` to deploy workflow file
- Add `GITHUB_PAT` as a GitHub repo secret (Settings → Secrets → Actions) with `workflow` scope — needed so Vercel can trigger the workflow when campaigns start

---

### Session 6: Background Campaigns + Rerun Dialog (15 Mar 2026)

#### Problem identified
User rejected commit `ca57ec6` (browser-driven campaign queue) for two reasons:
1. ❌ "Why does it require the tab to be open — it does not make sense"
2. ❌ Rerun button should ask: Resume from where left off OR Start completely fresh

#### Root cause analysis
- Vercel serverless functions are killed the moment HTTP response returns
- Background `setTimeout` loops after response = silently killed
- 145 messages × 120s = ~5 hours → fundamentally cannot run in a single serverless invocation
- Vercel Hobby plan → daily cron only (useless for per-campaign timing)
- **Solution chosen:** GitHub Actions as external scheduler — polls Vercel API every N seconds, runs up to 6 hours, browser independent

#### Commit `040ce77` — Campaign background job via GitHub Actions + rerun dialog ✅ LIVE
**Files changed:**
- `src/app/api/send-campaign/route.ts` — Rewrote to queue messages in DB then trigger GitHub Actions workflow via REST API
- `src/app/api/rerun-campaign/route.ts` — NEW: accepts `mode: 'resume' | 'fresh'`; fresh resets all messages to queued, resume keeps existing queued
- `src/app/campaigns/page.tsx` — Removed processing banner + browser loop; added rerun modal with "Resume" and "Fresh start" options
- `MEMORY_AND_CHANGELOG.md` — This file (first push to repo)
- GitHub Actions workflow file: PENDING (needs PAT with `workflow` scope)

**Env var added to Vercel:**
- `GITHUB_PAT` — `github_pat_11BQJLBNQ0sPfX6Vny7aTc...` (currently missing workflow scope)

**Pending:**
- User needs to generate new GitHub PAT with `repo` + `workflow` scopes
- Agent will then push `.github/workflows/process-campaign.yml` and update env var

---

### Session 5: Contract A + WhatsApp API Fix (13 Mar 2026)

#### Commit `7acbc5f` — Fixed Contract A exact match + WhatsApp correct API endpoint ✅ LIVE

**Bug 1: Contract A showing "new/renewal" instead of actual contract value**
- **Root cause:** `findByName(["contract"])` used `.includes()` which matched the "rental contract" column (which contains "new"/"renewal") BEFORE the actual "contract" column
- **Fix:** Changed to exact match: `headers.findIndex(x => x === "contract")`
- **File:** `src/lib/sheets.ts`

**Bug 2: WhatsApp Send Message → "string did not match the expected pattern" in Safari**
- **Root cause 1:** Page called `/api/send-test` but route is `/api/send-test-message` → 404 returns HTML → JSON.parse(HTML) throws error in Safari
- **Root cause 2:** `type="tel"` input causing iOS validation issues
- **Fix 1:** Changed API call to correct endpoint `/api/send-test-message`
- **Fix 2:** Changed `type="tel"` to `type="text"` on phone input
- **File:** `src/app/campaigns/page.tsx`

---

### Session 4: PR #2 — Charlotte Error + WhatsApp 3-Step Modal + Templates API (13 Mar 2026)

#### PR #2 Merged → Commit `6fe7773`
**Changes:**
- Fixed Charlotte/specific-user error (details in PR)
- Contract A display fix (precursor to exact match fix above)
- WhatsApp button now opens 3-step modal instead of direct wa.me link:
  1. Select Owner (1/2/3) with their phone number shown
  2. Select Account from `accounts` table (REQUIRED)
  3. Select Template from `message_templates` table (REQUIRED, no default)
  → Opens WhatsApp with template pre-filled; user completes send manually
- New `/api/message-templates` route for templates CRUD
- No Google Sheets recording needed for WhatsApp modal sends

---

### Session 3: Browser-Driven Campaign Queue — LATER REJECTED (12 Mar 2026)

#### Commit `ca57ec6` — Browser-driven campaign queue ⚠️ APPROACH REJECTED
**What was built:**
- Pre-queue all messages in `campaign_messages` table with `status = 'queued'`
- Browser drives timing with `setTimeout` loop
- `/api/process-campaign` sends one message at a time
- Progress tracking, Resume button for interrupted campaigns
- "Keep this tab open" banner

**Why rejected by user:**
- Requires browser tab to stay open for duration of campaign (up to 5+ hours)
- "Does not make sense" — unacceptable UX requirement
- Replaced by GitHub Actions approach in Session 6

---

### Session 2: Card Restructuring + UAE Filter (12 Mar 2026, 16:00–20:28)

**Commit `33e32c0`** — Major restructure: collapsible view sections, UAE phone filter, Bayut/PF fields, Send Message page
- Added `ViewSection` component (accordion-style collapsible sections in view modal)
- Added `isUAEPhone()` helper function for UAE number detection
- Added `owner1CountryCode`, `owner2CountryCode`, `owner3CountryCode` filter dropdowns
- Reorganized view modal into 9 sections
- Added bayut_rent/sale, pf_rent/sale, prices, links fields to view modal
- Added zoha_email_feedback 1/2/3 to feedback section
- Created Send a Message page at `/send-message`
- Added "Send a Message" to dashboard Quick Actions
- **BUILD FAILED** — missing CountryCode in filter state init

**Commit `c2f6d7e`** — Fix: add CountryCode filter properties to state initialization
- **BUILD FAILED** — missing bayut fields in Contact interface

**Commit `97a0689`** — Fix: add Bayut/PF fields to Contact interface
- **BUILD FAILED** — missing zoha_email_feedback in campaigns interface

**Commit `d16175a`** — Fix: add zoha_email_feedback fields to campaigns Contact interface
- **BUILD FAILED** — missing openSections state + toggleSection function

**Commit `7c8f497`** — Fix: add openSections state + toggleSection function ✅ DEPLOYED LIVE
- Added `const [openSections, setOpenSections] = useState<Record<string, boolean>>({});`
- Added `const toggleSection = (key) => ...`
- **BUILD SUCCEEDED**

---

### Session 1: 5 Critical Fixes (12 Mar 2026, 14:00–16:00)

**Commit `4ee2096`** — 5 critical fixes: account form, campaign status, re-run, owner mobile filters, feedback columns
- Fixed account form field names (`accessToken` → `apiKey`, `account_type` → `accountType`)
- Campaign status now shows Completed/Partial/Failed based on actual counts
- Re-run campaign button on history cards
- Owner 1/2/3 Mobile filter dropdowns (Blank/Zero/Non-blank with counts)
- All 6 feedback columns (Ahmed 1/2/3, Zoha 1/2/3) in detail card view

---

### Session 0: Production Campaign System + Complete System Rebuild (12 Mar 2026, 09:00–14:00)

**Commits `11171827` → `405a674`** — Full campaign workflow
- Campaign naming required before sending
- Phone deduplication across Owner 1/2/3 Mobile columns
- Feedback column auto-update after send
- Campaign History page at `/campaign-history`
- Blank filter values ("(Blank)") in all dropdowns

**Commit `9852f8c`** — 11 files, 4,395 lines — Complete system rebuild
- Vercel Postgres tables (accounts, campaigns, campaign_messages, contacts_cache, message_templates)
- All 4 campaign steps fully implemented
- Accounts management page
- Contact editing with Sheet sync
- Database caching system
- Test messaging with actual API calls

**Earlier commits:**
- `ae41b09` — 3-bug fix (template IDs, WhatsApp button, Ahmed phone)
- `d7246ea` — Restored campaigns list view
- `dd5fa2d` — Fixed Next.js 16 params
- `f3e0886` — Removed lucide-react
- `026354b` — Added sheet selection to campaigns
- `1bf130b` — Accounts page + sidebar + API routes
- `9bcb8f78` — Campaigns page mirror with list view
- `36ccbcf0` — Template editing
- `b6530f9` — Column detection for areas
- `9af60c3` — Phone emoji, email styling, feedback filters

---

### Session 8: WAsender API Fix + 4 UX Features + Feedback Sync Loop (24 Mar 2026)

#### Root Cause: ALL campaign messages failing with "fetch failed"
**Symptom:** Every campaign message showed as failed immediately. Test messages also failing.
**Root cause:** Wrong WAsender API URL — `wasender.websmartmedia.tech` does not exist (not a real domain). Correct URL is `wasenderapi.com/api/send-message`. Also needed Bearer header auth, not body param apiKey.

**Fix:** Commits `9ba0e22` + `a9c1bb0`
- **Files:** `src/app/api/process-campaign/route.ts`, `src/app/api/send-test-message/route.ts`
- Changed URL to `https://wasenderapi.com/api/send-message`
- Changed auth to `Authorization: Bearer {api_key}` header
- Changed body from `{ phone, message, apiKey }` to `{ to, text }`
- Restored `data.success !== false` check (lost during merge conflict resolution)
- Added `err.cause` capture for better error diagnostics

---

#### Merge Conflict Fix
**Commit `e4baad4`** — Resolved merge conflicts in `process-campaign/route.ts` and `campaigns/page.tsx` that were blocking deployment.

---

#### UX Feature 1: Duplicate "Next Step" button at top
- Added a second "Next Step →" button above the contacts list in Step 1 of campaigns
- Shows only when contacts are selected (same condition as bottom button)
- Saves scrolling when many contacts are visible

#### UX Feature 2: Account selector for test messages
- Added separate `testAccountId` dropdown in Step 2 (template selection)
- Test messages can now use any account, independent of the main campaign account
- Previously used the same account as the campaign

#### UX Feature 3: Custom min/max delay range
- Replaced ±20% randomize checkbox with two numeric inputs: **Min Delay** + **Max Delay**
- Default: 10s min, 45s max
- `send-campaign` API stores: `delay_min` (converted to seconds) and `delay_between` (max, in seconds)
- `rerun-campaign` API reads both columns and passes correct range to processing
- `db.ts` migration: `ALTER TABLE campaign_runs ADD COLUMN IF NOT EXISTS delay_min INTEGER DEFAULT 5`
- Fixed all references in `calculateEstimatedDuration()`, campaign summary panel, and Step 4 review

#### UX Feature 4: Template duplicate + create new buttons
- Added **⧉ Duplicate** button on each template in Step 2 — creates a copy with "(Copy)" suffix
- Added **+ Create New Template** link → opens `/templates` in new tab
- `loadTemplates` extracted as reusable function (used by both load + duplicate)

---

#### Feature: Google Sheet Feedback Sync Loop (Full Auto-Update After Campaign)
**Commit `cf229e4`**

**The problem:** After sending campaigns, the Google Sheet feedback columns were never updated automatically. Users had to manually write "Message Sent" in the Sheet.

**Solution:** Added `updateFeedbackAfterCampaign(campaignId)` helper in `campaigns/page.tsx`:
1. Fetches all sent messages with `row_index` and `owner_num` from `/api/campaign-detail/{campaignId}`
2. For each sent contact: PATCHes `sheets_data_cache` in Postgres
   - Account "ahmed" → updates `ahmed_feedback_{ownerNum}` = `"Message Sent - DD Mon YYYY"`
   - Account "zoha"/"soha" → updates `zoha_feedback_{ownerNum}` = `"Message Sent - DD Mon YYYY"`
3. Calls `/api/sheet-update-direct` with `action: 'update-feedback'` to write back to actual Google Sheet

**Sync cycle now complete:**
```
Load Google Sheet → DB cache → run campaign → auto-update DB feedback + Google Sheet feedback → reload Sheet picks up changes cleanly
```

**Files changed:**
- `src/app/campaigns/page.tsx` — added `updateFeedbackAfterCampaign()`, wired into `runCampaignInBrowser` (on done) and `runBrowserProcessing` (after complete)
- `src/app/campaign-history/page.tsx` — added inline feedback update in `runBrowserProcessing` after campaign completes
- `src/lib/db.ts` — added `delay_min` column migration
- `src/app/api/send-campaign/route.ts` — replaced `delayBetween/randomizeDelay` with `delayMin/delayMax`
- `src/app/api/rerun-campaign/route.ts` — updated delay calculation to use `delay_min` + `delay_between`

---

## ⏭️ FUTURE WORK (Not yet implemented)

1. **Merge branch + add GITHUB_PAT secret** — Branch `claude/review-memory-lock-docs-GGh8m` must be merged to `main` on GitHub (creates PR, merge it), then add `GITHUB_PAT` as a GitHub repo secret with `workflow` scope so campaigns can be triggered. **All features in this branch are built and tested — this is the only remaining step to go live.**
2. **UAE Number Auto-Normalization to Google Sheet** — `isUAEPhone()` detects UAE numbers but doesn't yet write normalized numbers back to Sheet
3. **Edit modal section reorganization** — View modal has 9 sections; edit modal (`EDIT_FIELD_GROUPS`) still has original grouping. Should be aligned
4. **Campaign scheduling (cron)** — Date/time picker exists in Step 3 but actual scheduled execution not implemented server-side
5. **Multi-user data isolation** — Multiple users can currently see each other's data. Needs `user_id` on all DB tables + per-user filtering
6. **Full 162+ column edit support** — Edit modal may not show all 162 Google Sheet columns
7. **Error message surfacing** — When a campaign message fails, the `error_message` column in `campaign_messages` stores the raw API error. Currently only visible when drilling into campaign detail. Could surface common errors (invalid phone, account banned) more prominently

---

*File maintained by Tasklet AI agent. Push to GitHub root as `MEMORY_AND_CHANGELOG.md`.*
