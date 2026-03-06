# Changelog

All notable changes to this project will be documented in this file.

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
