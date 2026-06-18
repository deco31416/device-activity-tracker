# Railway Deployment Checklist

Goal: deploy the dashboard/statistics side to Railway while keeping packet capture local.

## Target Architecture

- `backend` Railway service: Express, Socket.IO, WhatsApp tracker, MongoDB persistence, reports, audit trail.
- `client` Railway service: React dashboard served by nginx.
- Local machine/VM: full packet capture and call traffic analysis.

Railway must run with packet capture disabled.

## Preflight

- [ ] Repo pushed to GitHub.
- [ ] MongoDB URI ready.
- [ ] Long random `DASHBOARD_TOKEN` generated.
- [ ] Backend public Railway domain chosen.
- [ ] Frontend public Railway domain chosen.
- [ ] Decision made for WhatsApp auth persistence volume.

## Backend Service

Create a Railway service from the repo root using `Dockerfile`.

Required variables:

```env
NODE_ENV=production
PORT=3001
DEPLOYMENT_MODE=railway-dashboard
LOCAL_CAPTURE_ENABLED=false
ENABLE_SWAGGER=false
MONGODB_URI=mongodb+srv://...
MONGODB_DB=activity-tracker
DASHBOARD_TOKEN=change-this-long-random-token
ALLOWED_ORIGINS=https://your-client.up.railway.app
```

Volume:

- [ ] Add Railway volume mounted at:

```txt
/app/auth_info_baileys
```

Networking:

- [ ] Generate public domain for backend.
- [ ] Confirm `/api/runtime-capabilities` returns JSON.
- [ ] Confirm `authRequired: true`.
- [ ] Confirm `networkMonitor: false`.
- [ ] Confirm `callTrafficAnalysis: false`.

Expected capabilities response:

```json
{
  "mode": "railway-dashboard",
  "localCapture": false,
  "whatsappTracker": true,
  "reports": true,
  "networkMonitor": false,
  "callTrafficAnalysis": false,
  "authRequired": true
}
```

## Frontend Service

Create a Railway service from `/client` using `client/Dockerfile`.

Build argument or environment for build:

```env
REACT_APP_API_URL=https://your-backend.up.railway.app
```

Runtime variable:

```env
PORT=3000
```

Important: `REACT_APP_API_URL` is baked into the React build. If the backend domain changes, rebuild/redeploy the frontend.

Networking:

- [ ] Generate public domain for frontend.
- [ ] Update backend `ALLOWED_ORIGINS` to exactly match frontend domain.
- [ ] Redeploy backend after changing `ALLOWED_ORIGINS`.

## Security Smoke Check

- [ ] Open frontend domain.
- [ ] Confirm dashboard token screen appears.
- [ ] Enter `DASHBOARD_TOKEN`.
- [ ] Confirm app connects.
- [ ] Confirm direct request to protected endpoint without token returns `401`.
- [ ] Confirm direct request to `/api/runtime-capabilities` works without token.
- [ ] Confirm `Audit Trail` cannot load data without token.
- [ ] Confirm `/docs` is not available in production.

Protected endpoint example:

```txt
GET https://your-backend.up.railway.app/api/contacts/history
```

Expected without token:

```json
{ "error": "Unauthorized" }
```

## WhatsApp Session Check

- [ ] Open frontend.
- [ ] Enter dashboard token.
- [ ] Scan WhatsApp QR.
- [ ] Confirm `WhatsApp Active`.
- [ ] Redeploy backend.
- [ ] Confirm session persists without scanning QR again.

If QR is required after redeploy, verify the volume path is `/app/auth_info_baileys`.

## Dashboard Mode Check

- [ ] Sidebar does not show `Network Monitor`.
- [ ] Header shows `Dashboard Mode`.
- [ ] Contact statistics load.
- [ ] Reports download with token.
- [ ] Audit Trail search works.
- [ ] Audit export downloads JSON with SHA-256 integrity block.

## Rollback

- [ ] Keep previous successful Railway deploy available.
- [ ] If frontend cannot connect, check `REACT_APP_API_URL` and redeploy frontend.
- [ ] If backend rejects frontend, check `ALLOWED_ORIGINS` and redeploy backend.
- [ ] If WhatsApp session resets, check volume mount path.
- [ ] If protected endpoints return `401`, confirm the exact `DASHBOARD_TOKEN` in frontend login.

## Do Not Expect On Railway

- Packet capture from local network.
- Npcap/libpcap access to your PC/VM interfaces.
- Call traffic analysis from WhatsApp Web running on another machine.

Those remain local/VM-only features.
