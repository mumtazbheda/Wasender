# WASENDER MASTER MEMORY & CHANGELOG

**LAST UPDATED:** 15 Mar 2026, 20:56 GMT+4
**PROJECT STATUS:** Background campaign job deployed — awaiting GitHub PAT with `workflow` scope
**LATEST LIVE COMMIT:** `040ce77` — Campaign background job via GitHub Actions + rerun dialog
**LIVE URL:** https://wasender-pi.vercel.app
**REPOSITORY:** https://github.com/mumtazbheda/Wasender

---

## ⚡ QUICK STATUS (As of 15 Mar 2026)

| Feature | Status |
|---|---|
| Campaign rerun dialog (Fresh start / Resume) | ✅ Live |
| "Keep tab open" banner | ✅ Removed |
| Background campaign via GitHub Actions | ⏳ Needs new PAT (see below) |
| Contract A showing correct value | ✅ Fixed (commit 7acbc5f) |
| WhatsApp 3-step modal (Owner → Account → Template) | ✅ Fixed (PR #2) |
| Send Message phone validation | ✅ Fixed (commit 7acbc5f) |

### 🔴 ONE PENDING ACTION
To enable fully background campaigns (no tab required), the user must create a **GitHub Personal Access Token** with `repo` + `workflow` scopes and share it. This allows the agent to write `.github/workflows/process-campaign.yml` to the repo.

**Steps:**
1. github.com → Settings → Developer Settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic), check: `repo` (all) + `workflow`
3. Share with agent — agent will add workflow file + update Vercel env var

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
- **Endpoint:** `https://wasender.websmartmedia.tech/send-text`
- **Zoha's API Key:** `ZOHA_API_KEY_REDACTED_see_Tasklet_agent`
- **Zoha's Phone (sender):** `971501234567`
- **Format:** POST with JSON `{ phone, message, apiKey }`

### Google Sheets
- **Sheet ID:** `1q_OYmnZsW_wMEqlGh3dYJFb0OFzKdB_XUJwfexvhGiY`
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
Flow when GitHub PAT with workflow scope is available:
1. User clicks "Send Campaign" → /api/send-campaign queues all messages in DB
2. API calls GitHub Actions via REST API: POST /repos/.../actions/workflows/process-campaign.yml/dispatches
3. GitHub Actions workflow polls /api/process-campaign every N seconds
4. Each poll: sends one message, updates DB status
5. Loop continues until all messages sent or workflow timeout (6h)
6. User can CLOSE BROWSER — campaign runs completely server-side

Fallback (current state without workflow PAT):
- Messages are queued in DB
- User sees "use Resume button" message
- (Improvement needed once PAT provided)
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
- **Step 3:** Delay config (initial delay, between delay, unit selector, randomize ±20%, schedule option)
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
| `GOOGLE_SHEET_ID` | `1q_OYmnZsW_wMEqlGh3dYJFb0OFzKdB_XUJwfexvhGiY` |
| `GITHUB_PAT` | GitHub token (added 15 Mar) — currently missing `workflow` scope |

---

## 🔐 CREDENTIALS

| Item | Value |
|---|---|
| GitHub PAT (current, missing workflow scope) | `github_pat_REDACTED_see_Tasklet_agent` |
| Vercel Token | `vcp_REDACTED_see_Tasklet_agent` |
| Zoha WhatsApp API Key | `ZOHA_API_KEY_REDACTED_see_Tasklet_agent` |
| Zoha Phone | `971501234567` |
| WhatsApp API Endpoint | `https://wasender.websmartmedia.tech/send-text` |
| Google Sheet ID | `1q_OYmnZsW_wMEqlGh3dYJFb0OFzKdB_XUJwfexvhGiY` |

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

## ⏭️ FUTURE WORK (Not yet implemented)

1. **GitHub Actions workflow file** — Pending new PAT with `workflow` scope. File ready at `/agent/home/process-campaign-workflow.yml`
2. **UAE Number Auto-Normalization to Google Sheet** — `isUAEPhone()` detects UAE numbers but doesn't yet write normalized numbers back to Sheet
3. **Edit modal section reorganization** — View modal has 9 sections; edit modal (`EDIT_FIELD_GROUPS`) still has original grouping. Should be aligned
4. **Campaign scheduling (cron)** — Date/time picker exists in Step 3 but actual scheduled execution not implemented server-side
5. **Multi-user data isolation** — Multiple users can currently see each other's data. Needs `user_id` on all DB tables + per-user filtering
6. **Full 162+ column edit support** — Edit modal may not show all 162 Google Sheet columns

---

*File maintained by Tasklet AI agent. Push to GitHub root as `MEMORY_AND_CHANGELOG.md`.*
