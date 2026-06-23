import crypto from 'crypto';
import type { CheckInDoc } from './db.js';

export const CHECK_IN_CONSENT_TEXT = 'Acepto enviar este check-in autorizado. Entiendo que se registrara mi IP publica observada por el servidor, sistema operativo, navegador, tipo de dispositivo, pantalla, idioma, zona horaria, datos basicos de red del navegador y, si doy permiso, mi ubicacion aproximada.';

export interface CheckInSubmission {
    consentAccepted: boolean;
    browser?: {
        timezone?: string;
        language?: string;
        languages?: string[];
        platform?: string;
        userAgentData?: {
            platform?: string;
            mobile?: boolean;
            brands?: Array<{ brand?: string; version?: string }>;
        };
        device?: {
            type?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
            os?: string;
            browser?: string;
            engine?: string;
            isTouch?: boolean;
            maxTouchPoints?: number;
            hardwareConcurrency?: number;
            deviceMemoryGb?: number;
        };
        viewport?: {
            width?: number;
            height?: number;
        };
        screen?: {
            width?: number;
            height?: number;
            pixelRatio?: number;
            colorDepth?: number;
            orientation?: string;
        };
        network?: {
            online?: boolean;
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
            saveData?: boolean;
        };
        privacy?: {
            cookiesEnabled?: boolean;
            doNotTrack?: string | null;
        };
    };
    location?: {
        permission?: 'granted' | 'denied' | 'unavailable' | 'unsupported';
        lat?: number;
        lon?: number;
        accuracy?: number;
        altitude?: number | null;
        altitudeAccuracy?: number | null;
        heading?: number | null;
        speed?: number | null;
        capturedAt?: string;
    };
}

export function createCheckInToken(): string {
    return crypto.randomBytes(24).toString('base64url');
}

export function buildCheckInHash(doc: Partial<CheckInDoc>): string {
    const canonical = JSON.stringify(sortKeys(omitHash(doc)));
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function normalizeCheckInSubmission(input: unknown): CheckInSubmission {
    const data = typeof input === 'object' && input !== null ? input as Record<string, any> : {};
    const browser = typeof data.browser === 'object' && data.browser !== null ? data.browser : {};
    const screen = typeof browser.screen === 'object' && browser.screen !== null ? browser.screen : {};
    const viewport = typeof browser.viewport === 'object' && browser.viewport !== null ? browser.viewport : {};
    const device = typeof browser.device === 'object' && browser.device !== null ? browser.device : {};
    const network = typeof browser.network === 'object' && browser.network !== null ? browser.network : {};
    const privacy = typeof browser.privacy === 'object' && browser.privacy !== null ? browser.privacy : {};
    const userAgentData = typeof browser.userAgentData === 'object' && browser.userAgentData !== null ? browser.userAgentData : {};
    const location = typeof data.location === 'object' && data.location !== null ? data.location : {};
    const permission = ['granted', 'denied', 'unavailable', 'unsupported'].includes(location.permission)
        ? location.permission
        : 'unavailable';

    return {
        consentAccepted: data.consentAccepted === true,
        browser: {
            timezone: clean(browser.timezone, 120),
            language: clean(browser.language, 80),
            languages: Array.isArray(browser.languages)
                ? browser.languages.map((value: unknown) => clean(value, 40)).filter(Boolean).slice(0, 12) as string[]
                : undefined,
            platform: clean(browser.platform, 120),
            userAgentData: {
                platform: clean(userAgentData.platform, 80),
                mobile: booleanOrUndefined(userAgentData.mobile),
                brands: Array.isArray(userAgentData.brands)
                    ? userAgentData.brands.slice(0, 8).map((item: any) => ({
                        brand: clean(item?.brand, 80),
                        version: clean(item?.version, 30),
                    })).filter((item: { brand?: string; version?: string }) => item.brand || item.version)
                    : undefined,
            },
            device: {
                type: ['mobile', 'tablet', 'desktop', 'unknown'].includes(device.type) ? device.type : 'unknown',
                os: clean(device.os, 80),
                browser: clean(device.browser, 80),
                engine: clean(device.engine, 80),
                isTouch: booleanOrUndefined(device.isTouch),
                maxTouchPoints: numberOrUndefined(device.maxTouchPoints),
                hardwareConcurrency: numberOrUndefined(device.hardwareConcurrency),
                deviceMemoryGb: numberOrUndefined(device.deviceMemoryGb),
            },
            viewport: {
                width: numberOrUndefined(viewport.width),
                height: numberOrUndefined(viewport.height),
            },
            screen: {
                width: numberOrUndefined(screen.width),
                height: numberOrUndefined(screen.height),
                pixelRatio: numberOrUndefined(screen.pixelRatio),
                colorDepth: numberOrUndefined(screen.colorDepth),
                orientation: clean(screen.orientation, 80),
            },
            network: {
                online: booleanOrUndefined(network.online),
                effectiveType: clean(network.effectiveType, 40),
                downlink: numberOrUndefined(network.downlink),
                rtt: numberOrUndefined(network.rtt),
                saveData: booleanOrUndefined(network.saveData),
            },
            privacy: {
                cookiesEnabled: booleanOrUndefined(privacy.cookiesEnabled),
                doNotTrack: privacy.doNotTrack === null ? null : clean(privacy.doNotTrack, 40),
            },
        },
        location: {
            permission,
            lat: numberOrUndefined(location.lat),
            lon: numberOrUndefined(location.lon),
            accuracy: numberOrUndefined(location.accuracy),
            altitude: numberOrNull(location.altitude),
            altitudeAccuracy: numberOrNull(location.altitudeAccuracy),
            heading: numberOrNull(location.heading),
            speed: numberOrNull(location.speed),
            capturedAt: clean(location.capturedAt, 80),
        },
    };
}

export function renderCheckInPage(doc: CheckInDoc, options: { status?: 'ready' | 'completed' | 'expired' | 'revoked' } = {}): string {
    const status = options.status || 'ready';
    const isReady = status === 'ready';
    const fallbackTitle = status === 'completed'
        ? 'Check-in recibido'
        : status === 'expired'
            ? 'Check-in expirado'
            : status === 'revoked'
                ? 'Check-in revocado'
                : 'Check-in autorizado';
    const title = doc.content?.pageTitle || fallbackTitle;
    const description = doc.content?.pageDescription || 'Esta verificacion pertenece a un proceso autorizado. El envio registra IP observada por el servidor, navegador, sistema, tipo de dispositivo, pantalla, red y puede incluir ubicacion aproximada solo si aceptas el permiso del navegador.';
    const ogImageUrl = doc.content?.ogImageUrl || '';

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${ogImageUrl ? `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />` : '<meta name="twitter:card" content="summary" />'}
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <style>
    :root { color-scheme: dark; --bg:#0b1020; --panel:#151b31; --line:#27304d; --text:#eef4ff; --muted:#8ea0c4; --accent:#7c3aed; --ok:#10b981; --warn:#f59e0b; --danger:#ef4444; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top, #17203b 0, var(--bg) 48%); color:var(--text); display:flex; align-items:center; justify-content:center; padding:24px; }
    main { width:min(720px, 100%); background:rgba(21,27,49,.94); border:1px solid var(--line); border-radius:14px; padding:28px; box-shadow:0 24px 70px rgba(0,0,0,.38); }
    .brand { color:var(--muted); font-size:12px; letter-spacing:.14em; text-transform:uppercase; font-weight:800; margin-bottom:16px; }
    h1 { margin:0 0 10px; font-size:28px; line-height:1.15; letter-spacing:0; }
    p { color:var(--muted); line-height:1.6; margin:0 0 16px; }
    .meta { display:grid; gap:10px; grid-template-columns: repeat(2, minmax(0,1fr)); margin:22px 0; }
    .item { border:1px solid var(--line); border-radius:10px; padding:12px; background:#11172b; min-width:0; }
    .label { color:var(--muted); font-size:12px; margin-bottom:4px; }
    .value { font-weight:700; overflow-wrap:anywhere; }
    label { display:flex; gap:10px; align-items:flex-start; color:var(--text); line-height:1.5; margin:18px 0; }
    input[type="checkbox"] { margin-top:4px; width:18px; height:18px; accent-color:var(--accent); flex:0 0 auto; }
    button { appearance:none; border:0; border-radius:10px; padding:13px 18px; font-weight:800; color:#fff; background:var(--accent); cursor:pointer; min-height:46px; }
    button:disabled { opacity:.55; cursor:not-allowed; }
    .status { margin-top:18px; padding:14px; border-radius:10px; border:1px solid var(--line); background:#10172d; color:var(--muted); }
    .ok { border-color:rgba(16,185,129,.45); color:#b7f7df; }
    .warn { border-color:rgba(245,158,11,.45); color:#ffe2a6; }
    .danger { border-color:rgba(239,68,68,.5); color:#ffc6c6; }
    @media (max-width: 640px) { main { padding:20px; } .meta { grid-template-columns:1fr; } h1 { font-size:24px; } }
  </style>
</head>
<body>
  <main>
    <div class="brand">Developed by Deco31416</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <div class="meta">
      <div class="item"><div class="label">Caso</div><div class="value">${escapeHtml(doc.caseId)}</div></div>
      <div class="item"><div class="label">Operador</div><div class="value">${escapeHtml(doc.operatorName)}</div></div>
      <div class="item"><div class="label">Etiqueta</div><div class="value">${escapeHtml(doc.label)}</div></div>
      <div class="item"><div class="label">Vence</div><div class="value">${escapeHtml(doc.expiresAt ? doc.expiresAt.toISOString() : 'Sin vencimiento')}</div></div>
    </div>
    ${isReady ? `<label><input id="consent" type="checkbox" /><span>${escapeHtml(CHECK_IN_CONSENT_TEXT)}</span></label>
    <button id="send" disabled>Aceptar y enviar check-in</button>
    <div id="status" class="status">Esperando autorizacion del usuario.</div>` : `<div class="status ${status === 'completed' ? 'ok' : status === 'expired' ? 'warn' : 'danger'}">${escapeHtml(statusMessage(status))}</div>`}
  </main>
  ${isReady ? `<script>
    const consent = document.getElementById('consent');
    const button = document.getElementById('send');
    const statusBox = document.getElementById('status');
    consent.addEventListener('change', () => { button.disabled = !consent.checked; });
    function setStatus(text, cls) {
      statusBox.className = 'status ' + (cls || '');
      statusBox.textContent = text;
    }
    function getLocation() {
      return new Promise(resolve => {
        if (!navigator.geolocation) {
          resolve({ permission: 'unsupported' });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          pos => resolve({
            permission: 'granted',
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            capturedAt: new Date(pos.timestamp).toISOString()
          }),
          err => resolve({ permission: err.code === 1 ? 'denied' : 'unavailable' }),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });
    }
    button.addEventListener('click', async () => {
      if (!consent.checked) return;
      button.disabled = true;
      setStatus('Recolectando datos tecnicos autorizados y solicitando ubicacion...', 'warn');
      const location = await getLocation();
      const uaData = navigator.userAgentData ? {
        platform: navigator.userAgentData.platform,
        mobile: navigator.userAgentData.mobile,
        brands: navigator.userAgentData.brands
      } : null;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
      const parsed = parseUserAgent(navigator.userAgent);
      const payload = {
        consentAccepted: true,
        browser: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          languages: navigator.languages ? Array.from(navigator.languages) : [],
          platform: navigator.platform,
          userAgentData: uaData,
          device: {
            type: detectDeviceType(),
            os: parsed.os,
            browser: parsed.browser,
            engine: parsed.engine,
            isTouch: navigator.maxTouchPoints > 0,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemoryGb: navigator.deviceMemory
          },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          screen: {
            width: screen.width,
            height: screen.height,
            pixelRatio: window.devicePixelRatio || 1,
            colorDepth: screen.colorDepth,
            orientation: screen.orientation ? screen.orientation.type : undefined
          },
          network: connection ? {
            online: navigator.onLine,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          } : { online: navigator.onLine },
          privacy: {
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack || window.doNotTrack || null
          }
        },
        location
      };
      try {
        const response = await fetch('/public/checkin/${encodeURIComponent(doc.token)}/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo enviar');
        setStatus('Check-in recibido. Hash de evidencia: ' + data.receipt.hash, 'ok');
      } catch (err) {
        button.disabled = false;
        setStatus(err.message || 'Error enviando check-in', 'danger');
      }
    });
    function detectDeviceType() {
      const ua = navigator.userAgent || '';
      const touch = navigator.maxTouchPoints || 0;
      if (/ipad|tablet|playbook|silk/i.test(ua) || (touch > 1 && Math.min(screen.width, screen.height) >= 600)) return 'tablet';
      if (/mobi|android|iphone|ipod|windows phone/i.test(ua)) return 'mobile';
      return 'desktop';
    }
    function parseUserAgent(ua) {
      const os = /Windows NT/i.test(ua) ? 'Windows'
        : /Android/i.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/i.test(ua) ? 'iOS/iPadOS'
        : /Mac OS X/i.test(ua) ? 'macOS'
        : /Linux/i.test(ua) ? 'Linux'
        : 'Unknown';
      const browser = /Edg\\//i.test(ua) ? 'Microsoft Edge'
        : /OPR\\//i.test(ua) ? 'Opera'
        : /Chrome\\//i.test(ua) ? 'Chrome'
        : /Firefox\\//i.test(ua) ? 'Firefox'
        : /Safari\\//i.test(ua) ? 'Safari'
        : 'Unknown';
      const engine = /AppleWebKit/i.test(ua) ? 'WebKit/Blink'
        : /Gecko\\//i.test(ua) ? 'Gecko'
        : 'Unknown';
      return { os, browser, engine };
    }
  </script>` : ''}
</body>
</html>`;
}

function statusMessage(status: string): string {
    if (status === 'completed') return 'Este check-in ya fue recibido y registrado.';
    if (status === 'expired') return 'Este enlace expiro. Solicita un nuevo check-in al operador.';
    if (status === 'revoked') return 'Este enlace fue revocado por el operador.';
    return 'Este check-in no esta disponible.';
}

function clean(value: unknown, max: number): string | undefined {
    return typeof value === 'string' ? value.trim().slice(0, max) || undefined : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function numberOrNull(value: unknown): number | null {
    if (value === null) return null;
    const n = numberOrUndefined(value);
    return n === undefined ? null : n;
}

function booleanOrUndefined(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function omitHash(value: any): any {
    if (!value || typeof value !== 'object') return value;
    const { hash: _hash, _id: _id, ...rest } = value;
    return rest;
}

function sortKeys(value: any): any {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value instanceof Date) return value.toISOString();
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
    }, {});
}
