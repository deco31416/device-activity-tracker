<h1 align="center">Device Activity Tracker v2.5.0</h1>
<p align="center">WhatsApp Activity Tracker — RTT Analysis · Real-Time Bitácora · Behavior Intelligence · Audit Trail · Railway Dashboard · Local Network Monitor</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.5.0-blue?style=flat" alt="Version 2.5.0"/>
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/MongoDB-7.1-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License MIT"/>
</p>

> ⚠️ **DISCLAIMER**: Proof-of-concept for authorized security research, defensive analysis, training, and lab use only. Do not monitor people, accounts, devices, or traffic without explicit authorization. Network results are treated as observed infrastructure, relays, and IP candidates; they do not prove identity, exact location, or ownership by a person.

---

## Overview

Originally forked from [gommzystudio/device-activity-tracker](https://github.com/gommzystudio/device-activity-tracker). Extensively redesigned, improved, and scaled by **[deco31416](https://www.deco31416.com)** — adding MongoDB persistence, contact history with auto-restore, human-readable activity bitácora, comprehensive report generation (JSON/HTML/PDF), profile enrichment, behavior intelligence analytics, custom contact aliases, a local Network Monitor module, local call traffic analysis, audit trail, and Railway/local deployment split.

Based on the paper **"Careless Whisper: Exploiting Silent Delivery Receipts to Monitor Users on Mobile Instant Messengers"** by Gabriel K. Gegenhuber et al. (University of Vienna & SBA Research).

### What it does

| Module | Description |
|--------|-------------|
| **📱 WhatsApp Tracker** | Measures RTT of delivery receipts to detect device activity (online/standby/offline) |
| **🧠 Behavior Intelligence** | OSINT analytics: routine detection, availability model, session stats, heatmap, habit profiling |
| **🔍 SIGINT Detection** | Real-time typing/recording detection, device change alerts, WiFi vs Cellular inference |
| **🛡️ Privacy Score** | OPSEC assessment: evaluates target's exposure level (profile pic, about, business data) |
| **⚡ Anomaly Detection** | Flags unusual activity patterns: off-schedule hours, erratic behavior, session length outliers |
| **📋 Activity Bitácora** | Human-readable timeline with military time (local + UTC), designed for non-technical stakeholders |
| **📊 Reports & Stats** | Comprehensive report generation with profile, stats, patterns, and export to JSON/HTML/PDF |
| **💾 Contact History** | Persistent contacts across restarts with auto-restore and one-click re-tracking |
| **🌐 Network Monitor** | Real-time packet capture with protocol analysis, IP geolocation, and data export |
| **📞 Call Traffic Analysis** | Local authorized packet capture during WhatsApp Web calls with route visualization and candidate IP classification |
| **🗂️ Case Management** | Formal case records with status, operator, authorization note, audit linkage, and closure controls |
| **🧾 Audit Trail** | Case-based capture metadata, event log, SHA-256 hashed audit export, and evidence package export |
| **📑 Final Case Report** | Case-level JSON/HTML report with executive summary, candidate IP scoring, timeline, hashes, and limitations |
| **🚆 Railway Dashboard Mode** | Remote dashboard/statistics mode with local capture disabled for safe cloud deployment |

---

## Features

### WhatsApp Activity Tracker
- 🔍 Real-time RTT measurement via delivery receipts
- 📊 Dynamic threshold-based device state detection (Online / Standby / Offline)
- 📈 Historical RTT chart with persistent data from MongoDB (loads last 200 measurements on page load)
- 🔄 Multiple probe methods (Delete / Reaction)
- 📱 QR code authentication via Baileys
- 👤 Contact profile enrichment (about, business profile, push name)

### Activity Bitácora (NEW in v2.1)
- 📋 Human-readable activity log below the RTT chart
- 🕐 Military time format (24h) with dual display: local + UTC
- 📝 Plain-language descriptions: "📱 El contacto se CONECTÓ", "💤 Pasó a ESPERA", "🔴 Se DESCONECTÓ"
- 📄 Paginated table (15 events/page) with numbered navigation
- 💀 Skeleton loading while data loads
- 🎨 Color-coded rows by state (green/yellow/red)

### Report Generation & Export (NEW in v2.1)
- 📤 Export bitácora to **JSON**, **HTML** (dark-themed), or **PDF** (print dialog)
- 📊 Full report download (profile + stats + patterns + history + measurements + executive summary)
- 📋 Executive summary: tracking duration, data points, avg RTT, online %, peak hour, daily usage estimate

### Contact History & Auto-Restore (NEW in v2.1)
- 💾 Contacts persist across server restarts (soft-delete)
- 📜 History panel shows all previously tracked contacts
- 🔄 One-click re-activation from history
- ⚡ Auto-restore: active contacts resume tracking automatically on reconnection

### Behavior Intelligence (NEW in v2.2)
- 🧠 OSINT analytics engine based on Schnitzler et al. (NDSS 2023)
- 📅 **Daily Routine Detection** — wake/sleep estimation, session count, peak hours
- 🎯 **Availability Probability** — 24-hour online probability curve per contact
- ⏱️ **Session Statistics** — total/avg/median/max sessions, intensity score (0-100)
- 📊 **Weekly Heatmap** — 7×24 day×hour activity matrix with color intensity
- 🦉 **Habit Profiling** — Night Owl/Early Bird/Regular/Irregular classification, timezone inference
- 🔗 **Multi-Contact Correlation** — Pearson correlation, simultaneous online detection, follow-delay
- 📈 All analytics accessible via Intel tab and REST API (`/api/intel/*`)

### SIGINT Detection (NEW in v2.4)
- ✍️ **Typing Detection** — Real-time `composing` state via Baileys presence events, animated ✍️ indicator on card
- 🎙️ **Recording Detection** — Detects `recording` (audio) state, animated 🎙️ indicator on card
- 📱 **Device Change Alerts** — Tracks known device JIDs; alerts when a new device connects (new phone, WhatsApp Web/Desktop)
- 📶 **WiFi vs Cellular Inference** — Analyzes RTT variance (coefficient of variation) to classify connection type:
  - Low RTT + low CV → WiFi 📶
  - High RTT + high CV → Celular 📱
- 🏷️ Real-time connection type badge on each contact card

### Privacy / OPSEC Score (NEW in v2.4)
- 🛡️ Calculates a **privacy exposure score (0–100)** for each contact
- Evaluates: profile picture visibility, about/status text, business account data, push name, RTT trackability, typing/recording detectability, multi-device fingerprint
- Visual score card with color-coded level (Alto ≥70 / Medio 40–69 / Bajo <40)
- Detailed deduction breakdown showing exactly what data is exposed
- Available in the **Profile tab** and via REST API (`GET /api/privacy-score/:jid`)

### Anomaly Detection (NEW in v2.4)
- ⚡ Detects **unusual behavior patterns** compared to historical baselines:
  - 🕐 **Unusual Hours** — Online during normally inactive hours (with probability %)
  - ⏱️ **Long Sessions** — Session max 3× above average duration
  - 🦉 **Night Owl Pattern** — Elevated nocturnal activity score
  - 🔀 **Erratic Behavior** — Low consistency score (<30%)
  - 📅 **Schedule Shifts** — Large weekday vs weekend usage difference (>2h)
- Severity levels: info (ℹ️), warning (🟡), critical (🔴)
- Visual anomaly alerts in the **Intel tab**
- Available via REST API (`GET /api/anomalies/:jid`)

### Custom Name / Alias (NEW in v2.2)
- ✏️ Per-contact custom alias with inline editing (pencil icon)
- 🏷️ Alias input when adding new contacts
- 💾 Persisted in MongoDB with REST API (`PUT /api/contact/:jid/custom-name`)
- 📡 Real-time sync across all connected clients
- 🔤 Display priority: customName > pushName (WhatsApp) > number

### Stats & Profile Panels
- 📊 State distribution bar (% online/standby/offline)
- 📈 Activity timeline with state transitions
- 👤 Full profile: about, business info, push name, custom alias, account type
- 🕐 Activity patterns: hourly bar chart, peak hour, avg session length, total online minutes

### Network Monitor
- 🔬 Smart Packet Capture via Npcap (metadata only — no payload)
- 🌍 IP Geolocation with country, region, city, coordinates (GeoIP-Lite)
- 📡 Live monitoring with real-time packet table and auto-scroll
- 🎯 BPF Filters by protocol (TCP/UDP/ICMP), port, IP
- ⚠️ Severity classification: info, warning, danger
- 📊 Statistics: protocol distribution pie chart, top IPs bar chart
- 📤 Export to CSV and JSON
- 🧾 Requires `caseId`, operator, and authorization note before starting manual capture

### Call Traffic Analysis (Local Full Mode)
- 📞 Manual authorized capture window during WhatsApp Web calls or interactions
- 🗺️ Visual route map: local host → local network/ISP → WhatsApp/Meta infrastructure → relays/cloud → candidate IPs
- 🧭 Provider classification for Meta/WhatsApp, Google, Cloudflare, private ranges, and unknown public IPs
- 🧮 Candidate IP scoring 0-100 with explainable reason codes and technical limitations
- 📊 Packet counters, ports, directions, geolocation hints, and historical call analysis
- ⚠️ Candidate IP language by design: observed IPs are not treated as verified person identity

### Audit Trail & Evidence Metadata
- 🧾 Required capture metadata: `caseId`, `operatorName`, `authorizationNote`
- 🕐 UTC timestamps for local capture and call-capture events
- 🔎 Audit Trail tab to search events by Case ID
- 📤 JSON audit export via `/api/audit/:caseId/export`
- 🔐 SHA-256 hash included with audit export payload
- 📑 Final case report export via `/api/reports/:caseId/final` and `/api/reports/:caseId/final.html`
- 🖨️ Native PDF export via `/api/reports/:caseId/final.pdf`

### Runtime Modes
- 🚆 `railway-dashboard`: dashboard, contacts, reports, activity, audit lookup, and WhatsApp session persistence without local packet capture
- 💻 `local-full`: complete local/VM/VPS mode with packet capture, Network Monitor, and call traffic analysis
- 🧠 `/api/runtime-capabilities` lets the frontend show or hide capture features automatically
- 🔐 Optional `DASHBOARD_TOKEN` protects REST API, Socket.IO, dashboard access, and download links

### MongoDB Persistence
- 💾 Measurements stored with 30-day TTL auto-cleanup
- 📇 Contacts with full profile data (soft-delete enabled)
- 📊 Aggregation queries for stats, patterns, and reports
- 🔄 Graceful shutdown with connection cleanup
- 📞 Call analyses persisted by `callId`
- 🧾 Audit events persisted by `caseId`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 22 + TypeScript 5.7 |
| **Backend** | Express 5 + Socket.IO 4.8 |
| **Frontend** | React 19 + TailwindCSS 3.4 + Recharts 3.5 + Lucide React |
| **Database** | MongoDB 7.1 (Atlas or local) |
| **WhatsApp** | @whiskeysockets/baileys (latest from GitHub) |
| **Packet Capture** | cap 0.2.1 (libpcap binding) + Npcap (Windows) |
| **Geolocation** | geoip-lite 2.0 (offline MaxMind DB) |
| **Package Managers** | Yarn 4 (backend) / pnpm (frontend) |

---

## Installation

### Prerequisites

- **Node.js** 22+
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- **Npcap** (Windows only — required for Network Monitor)
  - Download from [npcap.com](https://npcap.com/)
  - Install with **"Install Npcap in WinPcap API-compatible Mode"** checked
- **WhatsApp account** for tracker authentication

### Setup

```bash
# Clone repository
git clone https://github.com/deco31416/device-activity-tracker.git
cd device-activity-tracker

# Install backend dependencies
yarn install

# Install frontend dependencies
cd client && pnpm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and settings
```

### Environment Variables

```env
# Server / frontend defaults
BACKEND_PORT=3001
CLIENT_PORT=3000
BACKEND_URL=http://localhost:3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017       # or mongodb+srv://... for Atlas
MONGODB_DB=device-tracker

# Runtime
NODE_ENV=production
DEPLOYMENT_MODE=local-full                  # local-full | railway-dashboard
LOCAL_CAPTURE_ENABLED=true                  # false in Railway dashboard mode

# Optional auth for public dashboards
DASHBOARD_TOKEN=change-this-long-random-token

# API docs. Served only when true and NODE_ENV is not production.
ENABLE_SWAGGER=false

# Optional automatic call-capture defaults
DEFAULT_CASE_ID=CASO-2026-001
DEFAULT_OPERATOR_NAME=Operator name
DEFAULT_AUTHORIZATION_NOTE=Authorization reference
```

For Railway, use `DEPLOYMENT_MODE=railway-dashboard` and `LOCAL_CAPTURE_ENABLED=false`.

### Swagger / OpenAPI

Swagger UI is available only when:

```env
ENABLE_SWAGGER=true
NODE_ENV!=production
```

Local route:

```txt
http://localhost:3001/docs
```

In production, `/docs` is not registered.

Startup logs validate operational configuration without printing secrets:

- `🟢` OK / operational
- `🟠` warning / degraded
- `🔴` critical
- `🔵` info / process

---

## Usage

### Web Interface (Recommended)

```bash
# Terminal 1: Start backend (requires admin for packet capture)
yarn start:server

# Terminal 2: Start frontend
cd client && pnpm start
```

Open [http://localhost:3000](http://localhost:3000):

1. **📱 WhatsApp Tracker tab** — Scan QR, add contacts, monitor RTT + bitácora
2. **🌐 Network Monitor tab** — Select interface, add audit metadata, apply filters, capture packets
3. **🧾 Audit Trail tab** — Search events by Case ID and export hashed audit JSON
4. **📞 Call panel** — In a contact card, use local call traffic analysis when Local full mode is enabled

> **Note:** Packet capture requires **administrator/root privileges** and only works on the local machine, VM, or authorized host where the traffic is visible.

### Contact Tracking Workflow

1. Scan the WhatsApp QR code
2. Enter a phone number and click **Add**
3. The RTT chart shows real-time activity detection
4. Below the chart, the **Bitácora** shows state changes in plain language
5. Export the bitácora via JSON / HTML / PDF buttons
6. Download a full report with the **Report** button
7. Stop tracking — the contact is saved to history
8. Click **History** to see all saved contacts and re-track with one click

### CLI Interface (WhatsApp only)

```bash
yarn start
```

### Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)
- WhatsApp auth is persisted at `/app/auth_info_baileys`

### Railway Dashboard Deployment

Railway should be used for the dashboard/API/statistics side, not for local packet capture.

Required production shape:

```env
DEPLOYMENT_MODE=railway-dashboard
LOCAL_CAPTURE_ENABLED=false
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://...
MONGODB_DB=activity-tracker
ALLOWED_ORIGINS=https://your-frontend.up.railway.app
DASHBOARD_TOKEN=change-this-long-random-token
```

Attach a Railway volume to:

```txt
/app/auth_info_baileys
```

See [docs/railway-checklist.md](docs/railway-checklist.md) for the full deployment checklist.

---

## API Endpoints

### Runtime & Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/runtime-capabilities` | Public runtime capability check for dashboard/local mode |
| `GET` | `/api/audit/:caseId` | Audit events for a Case ID |
| `GET` | `/api/audit/:caseId/export` | Export audit JSON with SHA-256 hash |
| `GET` | `/api/evidence/:caseId/package` | Export JSON evidence package with manifest and SHA-256 hashes |
| `GET` | `/api/evidence/:caseId/package.zip` | Export ZIP evidence package with separated JSON artifacts |
| `GET` | `/api/reports/:caseId/final` | Export final case report JSON |
| `GET` | `/api/reports/:caseId/final.html` | Export final case report HTML |
| `GET` | `/api/reports/:caseId/final.pdf` | Export final case report PDF |

### Case Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cases` | List cases, optionally filtered by status |
| `POST` | `/api/cases` | Create or update a formal case record |
| `GET` | `/api/cases/:caseId` | Get one case |
| `PATCH` | `/api/cases/:caseId` | Update case metadata/status |
| `POST` | `/api/cases/:caseId/close` | Close a case and register audit event |
| `GET` | `/api/cases/:caseId/evidence` | List direct evidence links for a case |

### WhatsApp Tracker

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/contacts` | List all tracked contacts |
| `GET` | `/api/contacts/history` | All saved contacts (active + inactive) |
| `GET` | `/api/history/:jid` | RTT measurement history for a contact |
| `GET` | `/api/activity/:jid` | State transition history |
| `GET` | `/api/stats/:jid` | State distribution (% online/standby/offline) |
| `GET` | `/api/profile/:jid` | Full contact profile (stored + live WhatsApp data) |
| `GET` | `/api/patterns/:jid` | Hourly activity patterns |
| `GET` | `/api/report/:jid` | Comprehensive report (JSON) |
| `GET` | `/api/report/:jid/download` | Download report as file |
| `GET` | `/api/privacy-score/:jid` | Privacy/OPSEC exposure score (0–100) with deductions |
| `GET` | `/api/anomalies/:jid` | Anomaly detection (unusual hours, erratic behavior, etc.) |

### Network Monitor

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/network/interfaces` | List available network interfaces |
| `GET` | `/api/network/status` | Capture status and statistics |
| `GET` | `/api/network/packets` | Recent captured packets (up to 2000) |
| `GET` | `/api/network/export/json` | Export packets as JSON file |
| `GET` | `/api/network/export/csv` | Export packets as CSV file |

### Call Traffic Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/call-analysis/:jid` | Latest call traffic analysis for a contact |
| `GET` | `/api/call-history/:jid` | Call traffic analysis history for a contact |
| `GET` | `/api/call-capture/status` | Current call-capture status |
| `POST` | `/api/call-capture/start` | Start manual call capture with audit metadata |
| `POST` | `/api/call-capture/stop` | Stop manual call capture |

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `add-contact` | Client → Server | Start tracking a phone number |
| `remove-contact` | Client → Server | Stop tracking (soft-delete) |
| `reactivate-contact` | Client → Server | Re-activate a saved contact |
| `get-tracked-contacts` | Client → Server | Request active trackers |
| `set-probe-method` | Client → Server | Change probe method (delete/reaction) |
| `tracker-update` | Server → Client | Real-time RTT + state data |
| `contact-added` | Server → Client | Contact successfully added |
| `contact-profile` | Server → Client | Enriched profile data |
| `network-start` | Client → Server | Start packet capture |
| `network-stop` | Client → Server | Stop packet capture |
| `network-packet` | Server → Client | New packet captured |
| `start-call-capture` | Client → Server | Start call traffic capture with audit metadata |
| `stop-call-capture` | Client → Server | Stop call traffic capture |
| `call-capture-started` | Server → Client | Call capture started confirmation |
| `call-capture-stopped` | Server → Client | Call capture stopped with analysis result |
| `call-packet` | Server → Client | New packet observed during call capture |
| `presence-change` | Server → Client | Typing/recording/available state change |
| `device-alert` | Server → Client | New device detected for a contact |

When `DASHBOARD_TOKEN` is set, REST requests require `Authorization: Bearer <token>` and Socket.IO connects with the same token in auth payload.

---

## Project Structure

```
device-activity-tracker/
├── src/
│   ├── server.ts              # Express + Socket.IO backend (APIs + auto-restore + privacy/anomaly)
│   ├── tracker.ts             # WhatsApp RTT analysis engine + SIGINT detection
│   ├── packet-capture.ts      # Network packet capture service (Npcap/cap)
│   ├── call-analyzer.ts       # Local call traffic analysis and route/candidate classification
│   ├── meta-ip-ranges.ts      # Meta/WhatsApp infrastructure CIDR helpers
│   ├── db.ts                  # MongoDB persistence + report generation
│   ├── index.ts               # CLI interface
│   └── types/
│       └── cap.d.ts           # TypeScript declarations for cap module
├── client/
│   ├── src/
│   │   ├── App.tsx            # Root component with tab navigation
│   │   ├── auth.ts            # Dashboard token helpers and authenticated fetch/download URLs
│   │   ├── types.ts           # Shared frontend models for call/audit views
│   │   └── components/
│   │       ├── Dashboard.tsx      # Tracker dashboard + contact history panel
│   │       ├── Login.tsx          # WhatsApp QR authentication
│   │       ├── ContactCard.tsx    # Contact card: chart, bitácora, stats, profile, intel, SIGINT
│   │       ├── NetworkMonitor.tsx # Network monitor UI
│   │       └── AuditTrail.tsx     # Case-based audit lookup and export
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── deployment-split.md
│   ├── local-operation-guide.md
│   └── railway-checklist.md
├── plan.md
├── CHANGELOG.md
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## How It Works

### WhatsApp RTT Analysis

The tracker sends probe messages and measures the Round-Trip Time (RTT) to detect device activity:

| Probe Method | Description |
|-------------|-------------|
| **Delete** (Default) | Sends a "delete" request for a non-existent message ID |
| **Reaction** | Sends a reaction emoji to a non-existent message ID |

The time between sending the probe and receiving the CLIENT ACK (Status 3) is measured as RTT. Device state uses a dynamic threshold at 90% of median RTT — values below = active, values above = standby.

### Bitácora Translation

The bitácora translates technical RTT data into plain language for stakeholders:

| Technical State | Bitácora Output |
|----------------|----------------|
| `Online (1 device)` | 📱 El contacto se CONECTÓ — Dispositivo activo (respuesta: 1124ms) |
| `Standby` | 💤 El contacto pasó a ESPERA — App abierta en segundo plano (respuesta: 1350ms) |
| `OFFLINE` | 🔴 El contacto se DESCONECTÓ — No hay actividad detectada |

### Report Generation

The `/api/report/:jid` endpoint generates a comprehensive report:

```json
{
  "summary": {
    "trackingDuration": "2h 19m",
    "totalDataPoints": 3053,
    "avgResponseTime": 1350,
    "onlinePercentage": 24,
    "peakActivityHour": "1:00 - 2:00",
    "estimatedDailyUsage": "28m"
  },
  "contact": { "..." },
  "stats": { "..." },
  "patterns": { "..." },
  "activityHistory": [ "..." ],
  "recentMeasurements": [ "..." ]
}
```

### Network Packet Capture

Captures packet **metadata only** (no payload/content inspection):

1. **Capture** → Npcap captures raw Ethernet frames via BPF filters
2. **Decode** → IPv4 headers → TCP/UDP ports → protocol classification
3. **Geolocate** → Public IPs via offline MaxMind database
4. **Classify** → Severity based on port (danger: 22, 3389; warning: 80, 53)
5. **Stream** → Socket.IO real-time to UI
6. **Store** → Buffer of 2000 packets with export

### Call Traffic Analysis

In Local full mode, the call analyzer opens a bounded capture window while an authorized WhatsApp Web call or interaction is performed on the same machine.

The UI presents a route map and packet summary using cautious language:

1. **Local host** → machine running WhatsApp Web and the capture service
2. **Local network / ISP** → observed outbound path
3. **WhatsApp / Meta infrastructure** → known provider ranges when matched
4. **Relays / cloud providers** → infrastructure that may proxy traffic
5. **Candidate IPs** → non-verified observed IPs for further authorized analysis

The result is an investigative aid, not proof that an IP belongs to a person.

### Audit Flow

Manual capture flows require:

- `caseId`
- `operatorName`
- `authorizationNote`

Audit events are saved in MongoDB and can be reviewed from the `Audit Trail` tab. Audit export returns a JSON payload plus SHA-256 hash so the exported package can be referenced later.

### Evidence Package

The first evidence package format is JSON and includes:

- manifest with software version, generated timestamp, case ID, and limitations
- case record
- direct evidence links
- audit events
- call analyses linked by audited `callId`
- network summary from capture audit events
- SHA-256 hash per section
- SHA-256 package hash

Endpoint:

```txt
GET /api/evidence/:caseId/package
```

ZIP export is also available with separated JSON artifacts: `manifest.json`, `case.json`, `audit.json`, `evidence-links.json`, `call-analysis.json`, `network-summary.json`, `integrity.json`, and `full-package.json`. Contacts, network captures, call analyses, and generated evidence packages are linked directly to the case through `case_evidence_links`.

### Deployment Split

The project intentionally separates cloud dashboard features from local packet capture:

- **Railway dashboard mode**: API, dashboard, WhatsApp session, contacts, reports, audit lookup, and statistics.
- **Local full mode**: full capture stack, Network Monitor, call traffic analysis, and route visualization.

Railway containers cannot see your local network adapter, so packet capture belongs on the local machine, VM, or authorized lab host where the traffic is generated.

### Case Management

Cases are formal records used to group capture metadata, audit events, contact observations, and future evidence packages.

Supported states:

- `draft`
- `authorized`
- `active`
- `closed`
- `archived`

Manual capture flows can automatically create or activate a case from `caseId`, `operatorName`, and `authorizationNote`. Captures are rejected when the case is `closed` or `archived`.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [plan.md](plan.md) | Planner/audit board for current work and next steps |
| [docs/README.md](docs/README.md) | Documentation index and operating principles |
| [docs/deployment-split.md](docs/deployment-split.md) | Architecture split between Railway dashboard and Local full mode |
| [docs/local-operation-guide.md](docs/local-operation-guide.md) | Local operating procedure, prerequisites, audit metadata, and troubleshooting |
| [docs/railway-checklist.md](docs/railway-checklist.md) | Railway deployment checklist with env vars, volume, CORS, and smoke tests |

---

## How to Protect Yourself

For **WhatsApp tracking**: Enable "Block unknown account messages" in WhatsApp under Settings → Privacy → Advanced. Disabling read receipts helps with regular messages but does not protect against this specific RTT attack.

For **network monitoring**: Use a VPN to encrypt and tunnel all traffic.

> As of March 2026, the WhatsApp RTT vulnerability remains exploitable.

---

## Common Issues

| Problem | Solution |
|---------|----------|
| **Not connecting to WhatsApp** | Delete `auth_info_baileys/` folder and re-scan QR |
| **Baileys 405 error** | Install from GitHub, not npm |
| **Packet capture not working** | Run as Administrator; verify Npcap with WinPcap mode |
| **Network Monitor hidden** | Backend is likely in `railway-dashboard` mode or `LOCAL_CAPTURE_ENABLED=false` |
| **401 Unauthorized** | `DASHBOARD_TOKEN` is set; enter the correct token in the dashboard |
| **No useful call packets** | Confirm WhatsApp Web/call is running on the same machine/interface being captured |
| **Railway does not capture traffic** | Expected behavior; Railway mode is for dashboard/statistics, not local adapter capture |
| **Yarn PnP errors** | `.yarnrc.yml` must have `nodeLinker: node-modules` |
| **MongoDB connection failed** | Check `MONGODB_URI` in `.env`; verify Atlas IP whitelist |
| **Contact not auto-restoring** | Ensure contact was active (not stopped) before restart |

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

### Unreleased (June 2026)
- 🚆 **Railway/local split** — `railway-dashboard` mode disables local capture; `local-full` keeps the complete capture stack
- 🔐 **Dashboard token auth** — optional `DASHBOARD_TOKEN` for REST, Socket.IO, dashboard, and downloads
- 📞 **Call Traffic Analysis** — local authorized capture window, observed route map, relays/providers, and candidate IP classification
- 🧾 **Audit Trail** — required capture metadata, Case ID event lookup, and SHA-256 hashed audit export
- 📚 **Operational docs** — Railway checklist, local operation guide, deployment split, and planner/audit board

### v2.5.0 (March 2026) — Current
- 🐛 **Network Monitor fixes** — `cap.open()` buffer arg order, `geoip-lite` CJS interop, `linkType: undefined` en Wi-Fi (Windows)
- 📄 **Network Monitor pagination** — 8 paquetes/página con controles «‹ N/Total ›» y auto-scroll a última página
- 🐛 **Recharts height fix** — `ResponsiveContainer` en `ContactCard` usa píxeles fijos en vez de % para evitar warnings

### v2.4.0 (March 2026)
- ✍️ **SIGINT Detection** — Real-time typing/recording detection via presence events with animated indicators
- 📱 **Device Change Alerts** — Detects when a new device connects; visual warning badge with device count
- 📶 **WiFi vs Cellular Inference** — Classifies connection type from RTT variance; dynamic badge on contact card
- 🛡️ **Privacy Score (OPSEC)** — Calculates 0–100 exposure score; evaluates pic, about, business, push name, trackability
- ⚡ **Anomaly Detection** — Flags unusual hours, long sessions, night owl patterns, erratic behavior, schedule shifts
- 🔧 Refactored `wireTrackerCallbacks()` — centralized callback wiring eliminates 3 duplicate code blocks
- 🆕 New API endpoints: `/api/privacy-score/:jid`, `/api/anomalies/:jid`
- 🆕 New Socket.IO events: `presence-change`, `device-alert`

### v2.3.0 (March 2026)
- 📈 Historical RTT chart — loads last 200 measurements from MongoDB on page load (charts no longer start empty)
- 🐛 Fix: `saveContact` conflict with duplicate `customName` in `$set` and `$setOnInsert` — new contacts now persist correctly
- 🐛 Fix: `deviceCount` incorrectly counted LID JIDs — now uses actual `devices.length`

### v2.2.0 (March 2026)
- ✨ Activity Bitácora with military time (local + UTC)
- 📤 Export to JSON / HTML / PDF
- 📊 Comprehensive report generation
- 💾 Contact history with auto-restore
- 👤 Profile enrichment + stats panels
- 📄 Pagination + skeleton loading

### v2.0.0 (March 2026)
- 🌐 Network Monitor with packet capture
- 💾 MongoDB persistence
- 🎨 Dark theme UI
- 🔒 Security hardening
- ❌ Signal support removed

---

## Ethical & Legal Considerations

⚠️ **For authorized research, defensive analysis, training, and lab use only.** Never track people, accounts, devices, or traffic without explicit authorization; doing so may violate privacy, computer misuse, wiretap, or data protection laws in your jurisdiction.

Authentication data (`auth_info_baileys/`), packet captures, audit exports, evidence packages, and generated reports must not be committed to version control.

---

## Citation

Based on research by Gegenhuber et al., University of Vienna & SBA Research:

```bibtex
@inproceedings{gegenhuber2024careless,
  title={Careless Whisper: Exploiting Silent Delivery Receipts to Monitor Users on Mobile Instant Messengers},
  author={Gegenhuber, Gabriel K. and G{\"u}nther, Maximilian and Maier, Markus and Judmayer, Aljosha and Holzbauer, Florian and Frenzel, Philipp {\'E}. and Ullrich, Johanna},
  year={2024},
  organization={University of Vienna, SBA Research}
}
```

---

## Author

**deco31416** — [deco31416@gmail.com](mailto:deco31416@gmail.com) · [www.deco31416.com](https://www.deco31416.com)

All v2.x improvements, architecture redesign, MongoDB integration, Network Monitor, report system, and UI overhaul by **deco31416**.

---

## Acknowledgments

- Original concept by [gommzystudio](https://github.com/gommzystudio/device-activity-tracker)
- Research by Gegenhuber et al. (University of Vienna & SBA Research)
- Built with [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)

---

## License

MIT License — See [LICENSE](LICENSE) file.

---

**Use responsibly. This tool demonstrates real security vulnerabilities that affect millions of users.**
