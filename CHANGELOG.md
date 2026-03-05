# Changelog

All notable changes to this project will be documented in this file.

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

Original by [gommzystudio](https://github.com/gommzystudio/device-activity-tracker):
- WhatsApp & Signal RTT-based activity tracking
- React web interface with real-time charts
- CLI interface
- Docker support
