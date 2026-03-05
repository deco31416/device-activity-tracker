<h1 align="center">Device Activity Tracker v2.2.0</h1>
<p align="center">WhatsApp Activity Tracker — RTT Analysis · Real-Time Bitácora · Behavior Intelligence · Report Generation · Network Monitor</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.2.0-blue?style=flat" alt="Version 2.2.0"/>
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/MongoDB-7.1-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License MIT"/>
</p>

> ⚠️ **DISCLAIMER**: Proof-of-concept for educational and security research purposes only. Demonstrates privacy vulnerabilities in WhatsApp messaging and network metadata analysis.

---

## Overview

Originally forked from [gommzystudio/device-activity-tracker](https://github.com/gommzystudio/device-activity-tracker). Extensively redesigned, improved, and scaled by **[deco31416](https://www.deco31416.com)** — adding MongoDB persistence, contact history with auto-restore, human-readable activity bitácora, comprehensive report generation (JSON/HTML/PDF), profile enrichment, behavior intelligence analytics (OSINT), custom contact aliases, and a full Network Monitor module.

Based on the paper **"Careless Whisper: Exploiting Silent Delivery Receipts to Monitor Users on Mobile Instant Messengers"** by Gabriel K. Gegenhuber et al. (University of Vienna & SBA Research).

### What it does

| Module | Description |
|--------|-------------|
| **📱 WhatsApp Tracker** | Measures RTT of delivery receipts to detect device activity (online/standby/offline) |
| **🧠 Behavior Intelligence** | OSINT analytics: routine detection, availability model, session stats, heatmap, habit profiling |
| **📋 Activity Bitácora** | Human-readable timeline with military time (local + UTC), designed for non-technical stakeholders |
| **📊 Reports & Stats** | Comprehensive report generation with profile, stats, patterns, and export to JSON/HTML/PDF |
| **💾 Contact History** | Persistent contacts across restarts with auto-restore and one-click re-tracking |
| **🌐 Network Monitor** | Real-time packet capture with protocol analysis, IP geolocation, and data export |

---

## Features

### WhatsApp Activity Tracker
- 🔍 Real-time RTT measurement via delivery receipts
- 📊 Dynamic threshold-based device state detection (Online / Standby / Offline)
- 📈 Historical RTT chart with Recharts visualization
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

### MongoDB Persistence
- 💾 Measurements stored with 30-day TTL auto-cleanup
- 📇 Contacts with full profile data (soft-delete enabled)
- 📊 Aggregation queries for stats, patterns, and reports
- 🔄 Graceful shutdown with connection cleanup

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
# Server
BACKEND_PORT=3001
CLIENT_PORT=3000
BACKEND_URL=http://localhost:3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017       # or mongodb+srv://... for Atlas
MONGODB_DB=device-tracker

# Environment
NODE_ENV=production
```

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
2. **🌐 Network Monitor tab** — Select interface, apply filters, capture packets

> **Note:** Packet capture requires **administrator privileges**.

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

---

## API Endpoints

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

### Network Monitor

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/network/interfaces` | List available network interfaces |
| `GET` | `/api/network/status` | Capture status and statistics |
| `GET` | `/api/network/packets` | Recent captured packets (up to 2000) |
| `GET` | `/api/network/export/json` | Export packets as JSON file |
| `GET` | `/api/network/export/csv` | Export packets as CSV file |

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

---

## Project Structure

```
device-activity-tracker/
├── src/
│   ├── server.ts              # Express + Socket.IO backend (all APIs + auto-restore)
│   ├── tracker.ts             # WhatsApp RTT analysis engine
│   ├── packet-capture.ts      # Network packet capture service (Npcap/cap)
│   ├── db.ts                  # MongoDB persistence + report generation
│   ├── index.ts               # CLI interface
│   └── types/
│       └── cap.d.ts           # TypeScript declarations for cap module
├── client/
│   ├── src/
│   │   ├── App.tsx            # Root component with tab navigation
│   │   └── components/
│   │       ├── Dashboard.tsx      # Tracker dashboard + contact history panel
│   │       ├── Login.tsx          # WhatsApp QR authentication
│   │       ├── ContactCard.tsx    # Contact card: chart, bitácora, stats, profile, export
│   │       └── NetworkMonitor.tsx # Network monitor UI
│   ├── tailwind.config.js
│   └── package.json
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
| **Yarn PnP errors** | `.yarnrc.yml` must have `nodeLinker: node-modules` |
| **MongoDB connection failed** | Check `MONGODB_URI` in `.env`; verify Atlas IP whitelist |
| **Contact not auto-restoring** | Ensure contact was active (not stopped) before restart |

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

### v2.1.0 (March 2026) — Current
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

⚠️ **For research and educational purposes only.** Never track people without explicit consent — this may violate privacy laws in your jurisdiction. Authentication data (`auth_info_baileys/`) must never be committed to version control.

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
