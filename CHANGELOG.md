# Changelog

All notable changes to this project will be documented in this file.

---

## [2.9.4] — 2026-06-28 · Current

### 🔧 Changes
- WhatsApp/Baileys auth recovery now rotates stale `auth_info_baileys` data when the connection closes with `401/loggedOut`, allowing the backend to generate a fresh QR automatically.
- Local startup script now sets UTF-8 console output and suppresses frontend Node deprecation warnings that appeared as red PowerShell error records even though the React server compiled successfully.
- Runtime logging now suppresses Baileys/libsignal session internals such as ratchet keys, prekeys, identity keys, and buffer dumps during session close events.
- Live presence now expires ephemeral `composing`/`recording` states and clears stale frontend typing indicators when WhatsApp stops sending realtime presence.
- Baileys call events now resolve `@lid` identities through the local reverse LID map before updating live contact state, so `offer`/`ringing`/`accept`/`terminate` events appear on the tracked phone-number contact.
- Added a minimal raw `CB:call` monitor to detect explicit `busy` call nodes/reasons when WhatsApp emits them but the installed Baileys version would otherwise coerce unknown call nodes to `ringing`.
- Added `activity_events` persistence for high-value WhatsApp activity signals (`presence`, `call`, `message`) without duplicating RTT probe volume.
- Stats now include a separate "Senales observadas" section for WhatsApp/presence/call/message activity while keeping RTT distribution unchanged.
- OPSEC/privacy score now deducts presence, call, and message exposure only when those signal types were actually observed.

### 📚 Documentation
- README documents the `401/loggedOut` auth recovery behavior and cleaner local terminal output.

### ✅ QA
- Backend TypeScript build passing.
- Frontend production build passing.
- PowerShell startup script syntax validated.
- Security QA verified runtime logs no longer emit `privKey`, `rootKey`, `remoteIdentityKey`, `pendingPreKey`, `Closing session`, or raw `<Buffer>` session dumps.
- Runtime QA verified stale `Escribiendo` no remains selected after the backend live-state falls back to fresh presence/RTT signals.
- Runtime QA confirmed Baileys exposes call events through `sock.ev.on('call')` with statuses `offer`, `ringing`, `accept`, `reject`, `timeout`, and `terminate`; local logs showed `offer`, `ringing`, and `terminate` from an `@lid` identity resolved to the tracked number.
- Runtime QA documents `busy` as a best-effort raw-node signal, not an official typed Baileys call status in this dependency version.
- Backend, frontend, and unit tests pass after adding combined observed-activity stats.

---

## [2.9.3] — 2026-06-28

### ✨ New Features
- **One-command local startup**: added `pnpm run dev:local` to launch backend and frontend on ports `4000/4001` with visible titled PowerShell terminals.
- **VS Code task launcher**: added `.vscode/tasks.json` with `WP MONITOR: Start Local Full Stack`, creating dedicated integrated terminals for backend and frontend.

### 🔧 Changes
- Local startup logs are written to `.runtime-logs/backend-local.log` and `.runtime-logs/frontend-local.log`.
- Startup script sets backend/frontend ports and frontend API URL explicitly to avoid collisions with other local projects on port `3000`.

### 📚 Documentation
- README and local operation guide now document the one-command startup, VS Code task flow, visible terminal names, URLs, logs, and stop procedure.

### ✅ QA
- `pnpm run build`: backend TypeScript build passing.
- `pnpm --dir client run build`: frontend production build passing.

---

## [2.9.2] — 2026-06-28

### ✨ New Features
- **Backend Network IP Intelligence**: Network Monitor now receives backend-generated `ipInsights` with role, verdict, direction, packet counts, provider, network category, ASN/ORG, GeoIP hints, and investigation reason.
- **Expanded infrastructure classification**: shared local network intelligence now includes GitHub and Akamai/CDN ranges in addition to Meta/WhatsApp, Google, Cloudflare, AWS/Azure/DigitalOcean-style cloud/hosting, private, CGNAT, and reserved ranges.
- **Professional IP Tracker view**: Network Monitor now separates public IPs to review from infrastructure/local traffic and includes DB-IP, DNSChecker, and Maps links when useful.

### 🔧 Changes
- Network Monitor filtering now hides broader known infrastructure/local traffic consistently instead of only Meta/Google/Cloudflare/private ranges.
- Backend packet capture now rebuilds top IP stats and `ipInsights` every 25 packets, on status reads, and when capture stops, reducing stale UI results.
- Private/local IP detection in packet capture now uses the shared `isPrivateIP` logic, including CGNAT, benchmark, documentation, multicast, reserved, loopback, link-local, and RFC1918 ranges.
- Network Monitor no longer scrolls the whole page to the packet table during active capture; auto-scroll now avoids trapping the operator at the bottom of the view.
- IP Tracker empty states are scoped to the active tab so Statistics/IP Tracker no longer display packet-table empty messages incorrectly.

### 📚 Documentation
- Documented Network Monitor IP Intelligence in README and local operation guide.
- Documented the difference between Network Monitor baseline/raw capture and call-specific analysis in the `Llamada` tab.
- Updated IP candidate methodology to clarify backend `ipInsights`, infrastructure filtering, and conservative interpretation limits.
- Updated planner with completed Network Monitor intelligence and scroll/UX fixes.

### ✅ QA
- `pnpm run test:unit`: 40 tests passing.
- `pnpm run build`: backend TypeScript build passing.
- `pnpm --dir client run build`: frontend production build passing.
- Local runtime verified on backend `http://127.0.0.1:4000` and frontend `http://127.0.0.1:4001`; `/api/network/status` returns the new `ipInsights` contract.

---

## [2.9.1] — 2026-06-23

### ✨ New Features
- **Call-analysis correlation model**: added phone-country/GeoIP context, hard caps for tiny samples, and non-conclusive observation handling.
- **OPSEC explanation panel**: privacy score now shows formula, deductions, and a plain-language reason for the assigned score.

### 🔧 Changes
- Call-analysis scoring now applies hard caps for tiny samples, one-way flows, and phone-country/GeoIP context mismatch so 1-9 packet observations cannot appear as medium candidates.
- Call-analysis UI now separates true candidate IPs from non-conclusive observations and shows the correlation reason, country context, and applied score caps.
- IP enrichment now re-scores call candidates after DB-IP/ip-api lookup so enriched country/provider context can demote weak observations before verdict calculation.
- Privacy OPSEC score now explains the formula and why each deduction affected the final score.
- README and local operation guide now document that WhatsApp calls should be started from WhatsApp Web/Desktop outside WP MONITOR, while the app observes the local traffic window.
- Production startup now fails closed when `NODE_ENV=production` is missing a strong `DASHBOARD_TOKEN`.
- API and Socket.IO authentication no longer accept dashboard tokens through URL query strings.
- `TRUST_PROXY` now controls forwarded IP trust; Railway defaults to one trusted proxy hop and local mode defaults to no proxy trust.
- Swagger/OpenAPI version now follows the package version instead of a hardcoded release number.
- Public Authorized Check-In submissions now have configurable in-memory rate limits by IP and token/IP pair.
- Check-In consistency now treats browser GPS as client-declared corroborative evidence, not as independently verified location proof.
- Final reports now preserve non-conclusive call IP observations in JSON, HTML, PDF, and CSV annexes instead of silently hiding them.
- Dependency hardening added Yarn/pnpm/npm overrides for patched transitive packages such as `ws`, `qs`, `path-to-regexp`, `postcss`, `brace-expansion`, `socket.io-parser`, and related frontend build-chain packages.
- Frontend runtime dependencies were reduced by moving test/build tooling out of production dependencies.
- Authorized Check-In evidence now stores the exact custom consent text plus mandatory disclosure that the user accepted, so the receipt hash matches the public landing content.
- Authorized Check-In custom consent can no longer override or weaken the mandatory minimum technical disclosure.
- Startup/env parsing now trims `DASHBOARD_TOKEN`, ignores empty CORS origins, and falls back safely if numeric port/rate-limit variables are invalid.
- Backend default port now falls back to `4000` when no `PORT` or `BACKEND_PORT` is provided, matching the frontend local API fallback.
- Evidence Package manifests now use the current package version instead of a stale hardcoded release.

### 📚 Documentation
- Documented the IP candidate scoring methodology for E.164 phone-country context, tiny packet samples, country mismatch, one-way traffic caps, and interpretation limits.
- Updated the planner with completed scoring-correlation and non-conclusive observation tasks.
- Documented Railway security variables for strong dashboard token enforcement and proxy trust.
- Documented dependency-audit residual risks: CRA `webpack-dev-server` advisories remain dev-only until Vite migration, and Baileys/libsignal/protobuf/music-metadata transitive advisories require a separate compatibility upgrade plan.
- Documented the operational difference between Activity Bitácora exports, Full Contact Report, Call Analysis, Final Case Report, and Evidence Package.

### ✅ QA
- `pnpm run test:unit`: 40 tests passing.
- `pnpm run build`: backend TypeScript build passing.
- `pnpm --dir client run build`: frontend production build passing.
- `pnpm --dir client audit --prod`: no known vulnerabilities found.
- `pnpm --dir client audit --dev`: 4 moderate `react-scripts`/`webpack-dev-server` findings remain for migration planning.
- `yarn npm audit --recursive --severity high`: still reports upstream/transitive findings through Baileys/libsignal/protobufjs and Baileys/music-metadata; tracked as residual upgrade work, not force-overridden.

---

## [2.9.0] — 2026-06-23

### ✨ New Features
- **Audit Trail investigative console**: added active case selector, operational summary, scope/action/search filters, paginated custody timeline, readable event cards, technical table, and grouped evidence exports.
- **Responsive navigation**: added collapsible desktop sidebar, mobile drawer menu, persistent sidebar state, and cleaner WP MONITOR branding with drone icon.

### 🔧 Changes
- Audit timeline/table now render only the current page with selectable page sizes, preventing long cases from expanding infinitely.
- Call capture audit stop handling snapshots and clears the active audit context before async enrichment, reducing risk of mismatched `callId` chain-of-custody entries during rapid capture transitions.
- Frontend API fallback now points to `http://localhost:4000`, and local docs recommend backend `4000` plus frontend `4001` to avoid collisions with other projects.
- Public Check-In page scrollbar and responsive layout were polished for a more restrained commercial look.

### ✅ QA
- `pnpm run test:unit`: 35 tests passing.
- `pnpm run build`: backend TypeScript build passing.
- `pnpm --dir client run build`: frontend production build passing.

---

## [2.8.0] — 2026-06-23

### ✨ New Features
- **Check-In Open Graph preview**: added editable public page title/description and optional uploaded preview image for authorized shared links.
- **Authorized landing builder**: added per-link brand name, layout, color theme, preview image reuse, and GPS request toggle for the public consent page.
- **Client policy customization**: added editable public field labels, policy/consent text, submit button text, success message, and optional post-check-in redirect URL with minimum technical disclosure preserved.
- **Realtime Check-In dashboard**: added Socket.IO `checkins-changed` events plus polling fallback so completed check-ins appear without pressing Refresh.
- **Preview asset upload**: added `/api/checkins/assets`, static `/uploads/checkins/*` serving, 3 MB JSON body support, and `.gitignore` protection for generated uploads.
- **Case-bound Check-In UX**: dashboard now selects from active cases, supports new Case ID mode, and keeps operator/authorization context attached to the link.
- **Extended device/browser evidence**: check-in submissions now capture device type, OS/browser, CPU/RAM hints, screen/viewport, touch capability, language/timezone, browser network hints, optional GPS, and SHA-256 evidence hash.
- **Check-In consistency analysis**: added explainable score/signals using IP reputation flags, timezone/language alignment, GPS-vs-IP distance, referer, mobile/hosting/proxy flags, and browser metadata.
- **Check-In administration**: added edit, revoke, and administrative delete flows; delete removes MongoDB check-in records and related case evidence links.
- **Dashboard state persistence**: active frontend tab survives page refresh so operators return to the same module.

### 🔧 Changes
- Frontend check-in fetches now validate JSON responses before parsing so HTML/backend errors surface as clear UI messages instead of `Unexpected token '<'`.
- Check-In summary now separates public template, brand, and GPS request state instead of a compact ambiguous landing label.
- Network Monitor now has an active case selector, investigative metrics, known-infrastructure filtering, UDP-only view, and clearer case-evidence guidance.
- Call Traffic Analysis now reapplies scoring after IP enrichment, demoting CDN/cloud/hosting/proxy networks such as CloudFront, Akamai, Fastly, Google Cloud, and Cloudflare from user-candidate lists.
- IP enrichment now uses DB-IP as the primary GeoIP source by default, with ip-api as a technical complement/fallback for ASN, ISP, coordinates, and proxy/hosting flags.
- Authorized Check-In public pages now use a more commercial landing layout with stronger typography, cleaner consent card, separated technical disclosure, and polished CTA states.
- Public Check-In now removes internal case/operator/detail cards from the public landing, keeping only the compact reference and expiration summary visible.
- Authorized Check-In builder now groups preview, visual identity, public labels, and consent settings into clearer sections instead of compressed control rows.
- Public check-in consent copy now states the exact categories of technical data collected.
- Open Graph image URLs are generated from `PUBLIC_BASE_URL` so public HTTPS deployments can render link previews outside the local machine.

### 🛡️ Safety & Compliance
- Check-In remains explicit-consent only; preview content is for authorized verification pages, not deceptive capture.
- Consistency analysis is presented as corroborative technical context, not exact physical location or identity proof.
- Documentation clarifies that `localhost`/`127.0.0.1` links and preview images only work on the local machine.
- Completed check-ins can be deleted administratively, with audit logging and evidence-link cleanup.

### ✅ QA
- `pnpm run test:unit`: 35 tests passing.
- `yarn build`: backend TypeScript build passing.
- `pnpm --dir client run build`: frontend production build passing.

---

## [2.7.0] — 2026-06-23

### ✨ New Features
- **Authorized Check-In**: added protected dashboard tab to create consent-based public check-in links per case.
- **Public consent page**: added `/checkin/:token` with explicit user acceptance before submission and optional browser GPS permission.
- **Check-In evidence**: stores server-observed IP, user agent, language, timezone/platform/screen metadata, optional GPS coordinates, optional IP enrichment, and SHA-256 evidence hash.
- **Check-In audit trail**: records `checkin_link_created` and `checkin_completed` audit events and links check-ins into case evidence.
- **Maps links**: dashboard shows GPS Maps and IP Maps links when coordinates are available.

### 🛡️ Safety & Compliance
- Check-In location collection requires visible user action and browser/user permission.
- GeoIP remains documented as estimated network/ISP location, not verified person identity or exact physical location.

### ✅ QA
- `yarn test:unit`: 30 tests passing.
- `yarn build`: backend TypeScript build passing.
- `pnpm --dir client run build`: frontend production build passing.

---

## [2.6.0] — 2026-06-23

### ✨ New Features
- **Runtime split**: added `DEPLOYMENT_MODE` and `LOCAL_CAPTURE_ENABLED` to separate Railway dashboard mode from Local full mode.
- **Runtime capabilities API**: added `/api/runtime-capabilities` so the frontend can enable or hide capture features based on backend mode.
- **Operational health API**: added `/api/health` with operational/degraded status for MongoDB, WhatsApp, local capture, runtime mode, and dependency reasons without leaking secrets.
- **Swagger/OpenAPI**: added `/docs` for development/staging only when `ENABLE_SWAGGER=true` and `NODE_ENV !== "production"`.
- **Call Traffic Analysis**: added local authorized call-capture flow, observed route map, relay/provider classification, candidate IP scoring, packet counters, and call history.
- **Audit Trail**: added case-based audit events, required capture metadata (`caseId`, `operatorName`, `authorizationNote`), and frontend lookup by Case ID.
- **Audit export**: added `/api/audit/:caseId/export` with SHA-256 hash for the exported JSON evidence payload.
- **Dashboard token**: added optional `DASHBOARD_TOKEN` protection for REST API, Socket.IO, dashboard access, and authenticated download links.
- **Case Management & Evidence Package**: added formal cases, evidence links, JSON/ZIP evidence package exports, CSV annexes, integrity hashes, and final case report exports in JSON/HTML/PDF.
- **Activity insights**: added 24h/7d/30d trends, daily coverage, sample reliability, and report/evidence integration for observed activity statistics.
- **QA fixture**: added `yarn qa:report-fixture` to generate stable report/evidence fixtures and verify required HTML/PDF/ZIP content.
- **IP enrichment**: added optional `ip-api.com` enrichment for call-analysis IPs with estimated network city/region/postal/coordinates, ISP, organization, ASN, mobile/proxy/hosting flags, cached results, and Google Maps links.

### 🔧 Changes
- Railway mode now blocks local packet-capture endpoints and socket events instead of attempting capture inside the container.
- Frontend hides `Network Monitor` and local call-capture panels when capture is unavailable.
- Docker and Compose now persist WhatsApp auth data at `/app/auth_info_baileys`.
- Call analysis persistence now upserts by `callId` to prevent duplicate records for the same call.
- Packet-capture cleanup is safer when capture start/stop fails.
- Private IP detection for `172.16.0.0/12` was corrected.
- Documentation added for Railway deployment, local operation, and the project planner/audit workflow.
- Startup logs now use `MONITORIZACION-DECO` status lines, severity emojis, dependency configuration checks, and final operational audit logging.
- Default local CORS origins now include `localhost` and `127.0.0.1` for ports `3000`, `3001`, `4000`, and `4001`.
- Frontend `ContactCard` was reduced by extracting call analysis, profile, intelligence, activity log, stats, and activity journal panels.
- Runtime and call-scoring logic were extracted into focused modules with unit tests.
- Frontend now falls back to `/api/health` to detect an already-connected WhatsApp session after refresh or missed Socket.IO events.
- Dashboard now hydrates active contacts from `/api/contacts` on load so saved profile photos, aliases, and names appear even if Socket.IO profile events were missed.
- Added backend profile-picture proxy at `/api/contact/:jid/profile-picture` so the frontend does not depend on direct `pps.whatsapp.net` image loading.
- Internal WhatsApp `@lid` identifiers are no longer counted as visible physical device alerts; the UI now labels observable device counts more carefully.
- Call-analysis candidate cards now show enriched ISP/ORG/ASN details and clickable estimated network coordinates when enrichment is available.

### 🛡️ Safety & Compliance
- Updated user-facing terminology to describe traffic as observed infrastructure, relays, and IP candidates.
- Documented that candidate IPs do not prove identity, exact location, or ownership by a person.
- Documented that enriched coordinates are estimated network/ISP location, not GPS or verified physical location.
- Added ignore rules for packet captures and evidence/report exports.
- Swagger is never exposed in production by default.
- Authenticated downloads avoid token-in-query exposure.
- Report/evidence QA checks reject visible placeholders such as `undefined`, `null`, `NaN`, and `[object Object]`.

### ✅ QA
- `yarn test:unit`: 26 tests passing.
- `yarn build`: backend TypeScript build passing.
- `npm run build` in `client/`: frontend production build passing.
- `yarn qa:report-fixture`: stable HTML/PDF/ZIP report fixture generated and validated.
- Local runtime validated at `http://127.0.0.1:4000` with `/api/health` returning `operational`.

---

## [2.5.0] — 2026-03-14

### 🐛 Bug Fixes
- **Network Monitor**: Fixed `TypeError: buffer must be a Buffer` — `cap.open()` recibía los argumentos en orden incorrecto; el buffer debe crearse antes de `open()` y pasarse como 4.º argumento
- **Network Monitor**: Fixed `geoip.lookup is not a function` — corregido interop ESM/CJS para `geoip-lite` usando default import con patrón de unwrap
- **Network Monitor**: Fixed `linkType: undefined` en adaptadores Wi-Fi (Windows) — ahora trata `undefined/null` igual que `ETHERNET` con try/catch interno para frames no-ethernet
- **Charts**: Fixed advertencias `width(-1) height(-1)` de Recharts en `ContactCard` — reemplazados heights porcentuales ("85%", "100%") por valores fijos en píxeles (220, 130) en `ResponsiveContainer`

### ✨ Improvements
- **Network Monitor**: Añadida paginación (8 paquetes/página) con controles «‹ N/Total ›» — evita que la UI se congele con capturas de alto volumen (10 000+ paquetes)
- **Network Monitor**: El modo auto-scroll avanza automáticamente a la última página cuando llegan nuevos paquetes

---

## [2.4.0] — 2026-03-06

### ✨ New Features

#### SIGINT Detection — Typing & Recording
- Real-time detection of `composing` (typing) and `recording` (audio) states via Baileys presence events
- Animated indicator on contact card: ✍️ Escribiendo... / 🎙️ Grabando audio...
- New `onPresenceChange` callback on `WhatsAppTracker` class — fires immediately on state change

#### Device Change Alerts
- Tracks known device JIDs (multi-device) and alerts when a new device connects
- New `onNewDevice` callback on `WhatsAppTracker` — emits `device-alert` socket event
- Visual warning badge on contact card showing total device count

#### WiFi vs Cellular Inference
- Analyzes RTT variance (coefficient of variation) to classify connection type
- Low RTT + low variance = WiFi 📶, High RTT + high variance = Celular 📱
- Real-time badge displayed on contact card in the Status section

#### Privacy / OPSEC Score
- New `/api/privacy-score/:jid` endpoint calculates privacy exposure (0–100)
- Evaluates: profile pic visibility, about/status, business account data, push name, trackability
- Visual score card with deduction breakdown in Profile tab
- Levels: Alto (≥70), Medio (40–69), Bajo (<40)

#### Anomaly Detection
- New `/api/anomalies/:jid` endpoint detects unusual behavior patterns
- Detects: unusual active hours, long sessions, night owl patterns, erratic behavior, schedule shifts
- Severity levels: info, warning, critical
- Visual anomaly alerts in Intel tab with color-coded badges

### 🔧 Changes
- Refactored tracker callback wiring into centralized `wireTrackerCallbacks()` helper in server.ts
- Removed 3 duplicate `onUpdate` implementations (autoRestore, addContact, reactivateContact) — now use shared helper
- `sendUpdate()` now includes `connectionType` field in tracker data
- Frontend `ContactInfo` interface extended with `connectionType`, `typingState`, `deviceAlerts`
- Dashboard listens for `presence-change` and `device-alert` socket events

---

## [2.3.0] — 2026-03-06

### ✨ New Features

#### Historical RTT Charts
- RTT History chart now loads the **last 200 measurements from MongoDB** on page load
- Charts no longer start empty — historical data is fetched via `/api/history/:jid` and prepended to real-time data
- New data points continue appending seamlessly after historical data

### 🐛 Bug Fixes

#### `saveContact` Duplicate Field Conflict
- Fixed MongoDB upsert failure caused by `customName` appearing in both `$set` and `$setOnInsert` operators
- MongoDB silently rejected the upsert when both operators contained the same field
- New contacts now persist correctly on first add

#### `deviceCount` Incorrect Count
- `deviceCount` previously used `trackedJids.size` which included LID JIDs (internal WhatsApp identifiers)
- Now correctly uses `devices.length` to count only actual devices

### 🔧 Changes
- Dashboard `onTrackedContacts` handler now fetches historical measurements for each contact on load
- `saveContact()` refactored: `$setOnInsert` no longer includes `customName` (handled exclusively by `$set`)

---

## [2.2.0] — 2026-03-05

### ✨ New Features

#### Behavior Intelligence Module (OSINT Analytics Engine)
- New `analytics.ts` engine (~660 lines) for behavioral profiling from WhatsApp activity metadata
- **Daily Routine Detection** — wake/sleep time estimation per day, session count, peak hour
- **Availability Probability Model** — 24-hour probability curve of being online (per-hour, aggregated over days)
- **Session Statistics** — total sessions, avg/median/max duration, sessions-per-day, intensity score
- **Weekly Heatmap** — 7×24 day-of-week × hour-of-day activity matrix with peak slot detection
- **Habit Profiling** — dominant pattern classification (Night Owl 🦉 / Early Bird 🐦 / Regular 📐 / Irregular ⚡), timezone estimation, weekday vs weekend comparison, night owl score, consistency score
- **Multi-Contact Correlation** — Pearson correlation of hourly patterns, simultaneous online detection, follow-delay estimation, relationship classification (strong/moderate/weak/none)
- Based on Schnitzler et al., "Hope of Delivery: Extracting User Locations From Mobile Instant Messengers", NDSS 2023

#### Intel Tab (UI)
- New **Intel** tab in ContactCard with 5 visual sections:
  - 🧠 Behavior Profile summary (pattern badge, wake/sleep, work hours, night owl score, consistency)
  - 📅 Weekly Heatmap (7×24 interactive color grid with peak indicator)
  - ⏱️ Session Statistics (counts, durations, intensity bar)
  - 🎯 Availability Probability (hourly bar chart with color-coded thresholds)
  - 📋 Daily Routine table (last 10 days with wake/sleep/sessions/online/peak)

#### Custom Name / Alias System
- Per-contact custom alias stored in MongoDB (`customName` field)
- Inline editing via pencil icon (✏️) in contact card header
- Editable alias section in Profile tab
- Alias input field when adding new contacts
- Display priority: customName > pushName (WhatsApp) > number
- New REST endpoint: `PUT /api/contact/:jid/custom-name`
- New socket event: `set-custom-name` with broadcast to all clients
- HTTP-first persistence with socket fallback for reliability

#### WhatsApp Data Enrichment
- Real-time `contacts.update` listener for push name and status changes
- Real-time `contacts.upsert` listener for initial contact data
- Automatic profile picture refresh on change detection
- Improved push name extraction from WhatsApp store/cache
- Profile updates broadcast to all connected clients in real-time

### 🔧 Changes
- 7 new REST API endpoints for intelligence: `/api/intel/:jid`, `/routine`, `/availability`, `/sessions`, `/heatmap`, `/habits`, `/api/intel/correlation`
- Auto-restore now includes `customName` and `pushName` in restoration emission
- Display name resolution improved: customName > pushName > contactName > number
- Added `express.json()` middleware for JSON body parsing on REST endpoints
- New Lucide icons: Brain, Target, CalendarDays, Timer, Coffee, Shield, Pencil, Check, X
- ContactCard `handleSaveCustomName()` uses HTTP PUT as primary with socket emit fallback
- History panel shows resolved name (customName || pushName || contactName || number)

### 🗄️ Database Schema Changes
- `ContactDoc.customName: string | null` — user-assigned alias for each contact
- New `updateCustomName()` function in db.ts
- `saveContact()` now accepts optional `customName` parameter

---

## [2.1.0] — 2026-03-05

### ✨ New Features

#### Bitácora de Actividad (Real-Time Activity Log)
- Human-readable activity timeline below the RTT chart — designed for non-technical stakeholders
- Describes each state change in plain Spanish: "📱 El contacto se CONECTÓ", "💤 Pasó a ESPERA", "🔴 Se DESCONECTÓ"
- Military time format (24h) with dual display: local time + UTC
- Full date in each row (e.g., `04 mar 2026`)
- Skeleton loading animation while waiting for data
- Paginated table (15 events per page) with numbered page navigation
- Color-coded rows: green (connected), yellow (standby), red (disconnected)

#### Export System
- **JSON export** — Structured bitácora data with contact info, timestamps, and descriptions
- **HTML export** — Styled dark-theme report, ready to open in any browser
- **PDF export** — Opens print dialog with clean print-optimized layout
- **Full report download** — Comprehensive JSON report via `/api/report/:jid/download` with profile, stats, patterns, activity history, measurements, and executive summary

#### Contact History & Auto-Restore
- Contacts now **persist across server restarts** — soft-delete instead of hard removal
- New **"History" panel** in Dashboard shows all previously tracked contacts
- One-click **"Track" button** to re-activate any saved contact
- **Auto-restore**: when WhatsApp reconnects, all active contacts resume tracking automatically from MongoDB
- New REST endpoint: `GET /api/contacts/history` — returns all contacts (active + inactive)

#### Report Generation
- `GET /api/report/:jid` — Generates comprehensive report (JSON) with:
  - Contact profile (name, about, business info, push name)
  - State distribution (% online/standby/offline)
  - Activity patterns (hourly distribution, peak hour, avg session length)
  - Activity history (state transitions)
  - Recent measurements (last 500)
  - Executive summary (tracking duration, data points, avg RTT, daily usage estimate)
- `GET /api/report/:jid/download` — Same report as downloadable file with `Content-Disposition` header

#### Contact Profile Enrichment
- Expanded contact data: `about`, `aboutSetAt`, `isBusinessAccount`, `businessProfile`, `pushName`, `verifiedOnWhatsApp`
- Profile tab with WhatsApp status, business info (category, website, email, address)
- Activity patterns section with hourly bar chart (day=green, night=purple)
- Stats: peak hour, average session length, total online minutes
- `GET /api/profile/:jid` — Merges stored + fresh WhatsApp data
- `GET /api/patterns/:jid` — Hourly activity distribution

#### Stats & Activity Panels
- **Stats panel**: total measurements, avg RTT, first/last seen, state distribution bar
- **Activity panel**: timeline of state transitions with colored dots and timestamps
- Auto-refresh every 10 seconds

### 🔧 Changes
- `removeContact()` now performs **soft-delete** (`isActive: false`) instead of `deleteOne()`
- New DB functions: `reactivateContact()`, `getActiveContacts()`, `generateReport()`
- New socket event: `reactivate-contact` — resumes tracking for a saved contact
- ContactCard tabs: RTT Chart (with Bitácora), Activity, Stats, Profile
- "Report" button added next to "Stop" in each contact card header
- Dashboard "History" button in control bar with saved contacts panel
- Backwards-compatible: contacts without `isActive` field treated as active

### 🗄️ Database Schema Changes
- `ContactDoc` new fields: `isActive` (boolean), `about`, `aboutSetAt`, `isBusinessAccount`, `businessProfile`, `pushName`, `lastProfileUpdate`, `verifiedOnWhatsApp`

---

## [2.0.0] — 2026-03-04

### 🚀 Major Release — Network Monitor + MongoDB + Security

#### Added
- **🌐 Network Monitor module** — Real-time packet capture with Npcap/cap
  - Live packet table with protocol badges and severity color coding
  - Protocol distribution pie chart and top destination IPs bar chart
  - IP Geolocation (country, region, city, lat/lon) via geoip-lite
  - BPF filters by protocol, port, and IP address
  - Export to CSV and JSON
  - Socket.IO real-time streaming + REST API endpoints
- **💾 MongoDB persistence** — Measurements, contacts, sessions stored with TTL auto-cleanup (30 days)
- **🎨 Dark theme UI** — Navy-based color scheme (#070b18 bg, #0f1629 cards, #7c3aed accent)
- **🗂️ Tab navigation** — WhatsApp Tracker and Network Monitor tabs
- **📦 TypeScript declarations** for `cap` module

#### Changed
- Node.js 22, React 19, Express 5
- Baileys from GitHub (npm rc.9 has 405 error)
- Yarn 4 with `nodeLinker: node-modules`

#### Removed
- ❌ Signal support — completely removed
- ❌ `pdf-parse` dependency (contained suspicious `test.js`)

#### Security
- 🔒 CORS restricted to localhost
- 🔒 Pino logger set to `silent` (prevents auth token leaks)
- 🔒 Docker images pinned to SHA256 digests
- 🔒 Added lockfiles to version control

---

## [1.0.0] — Original

Original concept by [gommzystudio](https://github.com/gommzystudio/device-activity-tracker):
- WhatsApp & Signal RTT-based activity tracking
- React web interface with real-time charts
- CLI interface
- Docker support

---

> **All v2.x improvements by [deco31416](https://www.deco31416.com)** — [deco31416@gmail.com](mailto:deco31416@gmail.com)
