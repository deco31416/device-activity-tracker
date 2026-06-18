/**
 * Device Activity Tracker - Web Server
 *
 * HTTP server with Socket.IO for real-time tracking visualization.
 * Provides REST API and WebSocket interface for the React frontend.
 *
 * For educational and research purposes only.
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { pino } from 'pino';
import { Boom } from '@hapi/boom';
import { WhatsAppTracker, ProbeMethod } from './tracker.js';
import { connectDB, saveMeasurement, saveContact, removeContact, reactivateContact, getRecentMeasurements, getSavedContacts, getActiveContacts, getActivityHistory, getStateDistribution, updateContactProfile, updateCustomName, getContactProfile, getOnlinePatterns, generateReport, disconnectDB, saveCallAnalysis, getCallAnalyses, saveAuditEvent, getAuditEvents, createCase, getCase, updateCase, saveCaseEvidenceLink, getCaseEvidenceLinks } from './db.js';
import { listInterfaces, startCapture, stopCapture, getCaptureStatus, getRecentPackets, updateFilter, exportJSON, exportCSV, CaptureFilter, PacketMeta } from './packet-capture.js';
import { initAnalytics, getFullIntelligence, getDailyRoutine, getAvailabilityProfile, getSessionStats, getWeeklyHeatmap, getHabitProfile, getCorrelation } from './analytics.js';
import { startCallCapture, stopCallCapture, getCallCaptureStatus, getCallAnalysisHistory, getLatestCallAnalysis, autoDetectInterface } from './call-analyzer.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerCaseRoutes } from './routes/cases.js';
import { registerReportRoutes } from './routes/reports.js';
import { CASE_STATUSES, cleanText, normalizeOptionalJid, parseLimit, socketValidationError, validateCaseId, validateJid, validateRequiredText, validationError } from './validation.js';

// Configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '3001', 10);
const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || (process.env.RAILWAY_ENVIRONMENT_NAME ? 'railway-dashboard' : 'local-full');
const LOCAL_CAPTURE_ENABLED = process.env.LOCAL_CAPTURE_ENABLED
    ? process.env.LOCAL_CAPTURE_ENABLED === 'true'
    : DEPLOYMENT_MODE === 'local-full';
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || '';
const ENABLE_SWAGGER = process.env.ENABLE_SWAGGER === 'true' && NODE_ENV !== 'production';

const SERVICE_TAG = '[MONITORIZACION-DECO]';
let dbAvailableForStartupAudit = false;
let serverListeningForStartupAudit = false;
let startupAuditRecorded = false;

function bootLog(level: 'ok' | 'warn' | 'error' | 'info', message: string) {
    const icon = {
        ok: '🟢',
        warn: '🟠',
        error: '🔴',
        info: '🔵',
    }[level];
    console.log(`${icon} ${SERVICE_TAG} ${message}`);
}

function isConfigured(value: string | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

function logStartupBanner() {
    bootLog('ok', 'Backend starting...');
    bootLog('ok', 'Developed by Deco31416');
}

function logStartupConfiguration() {
    bootLog('ok', `Environment: ${NODE_ENV}`);
    bootLog('ok', `Port: ${PORT}`);
    bootLog(isConfigured(process.env.MONGODB_URI) ? 'ok' : NODE_ENV === 'production' ? 'error' : 'warn',
        isConfigured(process.env.MONGODB_URI)
            ? 'MongoDB: configured'
            : 'MONGODB_URI missing - persistence disabled');
    bootLog(isConfigured(process.env.REDIS_URL) ? 'ok' : 'warn',
        isConfigured(process.env.REDIS_URL)
            ? 'Redis: configured'
            : 'REDIS_URL missing - optional cache/rate-limit backend unavailable');
    bootLog(isConfigured(process.env.GROQ_API_KEY) ? 'ok' : 'warn',
        isConfigured(process.env.GROQ_API_KEY)
            ? 'Groq: configured'
            : 'GROQ_API_KEY missing - AI analysis integrations unavailable');
    bootLog(isConfigured(process.env.RESEND_API_KEY) ? 'ok' : 'warn',
        isConfigured(process.env.RESEND_API_KEY)
            ? 'Resend: configured'
            : 'RESEND_API_KEY missing - email notifications unavailable');
    bootLog(ENABLE_SWAGGER ? 'warn' : 'ok',
        ENABLE_SWAGGER ? 'Swagger: enabled at /docs' : 'Swagger: disabled');
    bootLog('ok', `CORS origins loaded: ${ALLOWED_ORIGINS.length}`);
    bootLog(DASHBOARD_TOKEN ? 'ok' : NODE_ENV === 'production' ? 'error' : 'warn',
        DASHBOARD_TOKEN
            ? 'Internal API guard: enabled'
            : 'DASHBOARD_TOKEN missing - dashboard/API guard disabled');
    bootLog('info', `Deployment mode: ${DEPLOYMENT_MODE}`);
    bootLog(LOCAL_CAPTURE_ENABLED ? 'warn' : 'ok',
        LOCAL_CAPTURE_ENABLED ? 'Local capture: enabled' : 'Local capture: disabled');
}

async function tryRecordStartupAudit() {
    if (startupAuditRecorded || !serverListeningForStartupAudit) return;
    startupAuditRecorded = true;

    if (!dbAvailableForStartupAudit) {
        bootLog('warn', 'Startup audit event skipped: MongoDB persistence unavailable');
        return;
    }

    try {
        await saveAuditEvent({
            caseId: 'SYSTEM-STARTUP',
            operatorName: 'system',
            authorizationNote: 'Backend startup operational audit event',
            action: 'backend_operational',
            scope: 'system',
            targetJid: null,
            details: {
                environment: NODE_ENV,
                port: PORT,
                deploymentMode: DEPLOYMENT_MODE,
                localCapture: LOCAL_CAPTURE_ENABLED,
                swaggerEnabled: ENABLE_SWAGGER,
                corsOriginsLoaded: ALLOWED_ORIGINS.length,
                dashboardGuardEnabled: !!DASHBOARD_TOKEN,
                developedBy: 'Deco31416',
            },
        });
        bootLog('ok', 'Startup audit event recorded: backend_operational');
    } catch (err) {
        bootLog('error', 'Startup audit event failed to record');
    }
}

logStartupBanner();

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

function extractAuthToken(req: express.Request): string {
    const auth = req.headers.authorization || '';
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    return typeof req.query.auth === 'string' ? req.query.auth.trim() : '';
}

function isAuthorizedToken(token: string): boolean {
    return !DASHBOARD_TOKEN || token === DASHBOARD_TOKEN;
}

function buildOpenApiDocument() {
    return {
        openapi: '3.0.3',
        info: {
            title: 'Device Activity Tracker API',
            version: '2.5.0',
            description: 'Authorized activity monitoring, case management, audit trail, reports, and local capture API. Developed by Deco31416.',
        },
        servers: [{ url: `http://localhost:${PORT}` }],
        tags: [
            { name: 'Runtime' },
            { name: 'Cases' },
            { name: 'Audit' },
            { name: 'Contacts' },
            { name: 'Network' },
            { name: 'Call Capture' },
            { name: 'Reports' },
            { name: 'Evidence' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                },
            },
        },
        security: DASHBOARD_TOKEN ? [{ bearerAuth: [] }] : [],
        paths: {
            '/api/runtime-capabilities': {
                get: {
                    tags: ['Runtime'],
                    summary: 'Get runtime capabilities',
                    security: [],
                    responses: { '200': { description: 'Runtime capability document' } },
                },
            },
            '/api/cases': {
                get: {
                    tags: ['Cases'],
                    summary: 'List cases',
                    parameters: [
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                        { name: 'status', in: 'query', schema: { type: 'string', enum: CASE_STATUSES } },
                    ],
                    responses: { '200': { description: 'Case list' } },
                },
                post: {
                    tags: ['Cases'],
                    summary: 'Create or update a case',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['caseId', 'primaryOperator', 'authorizationNote'],
                                    properties: {
                                        caseId: { type: 'string' },
                                        title: { type: 'string' },
                                        description: { type: 'string', nullable: true },
                                        status: { type: 'string', enum: CASE_STATUSES },
                                        primaryOperator: { type: 'string' },
                                        authorizationNote: { type: 'string' },
                                        tags: { type: 'array', items: { type: 'string' } },
                                    },
                                },
                            },
                        },
                    },
                    responses: { '201': { description: 'Case created or updated' }, '400': { description: 'Missing required fields' } },
                },
            },
            '/api/cases/{caseId}': {
                get: {
                    tags: ['Cases'],
                    summary: 'Get a case',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Case document' }, '404': { description: 'Case not found' } },
                },
                patch: {
                    tags: ['Cases'],
                    summary: 'Update a case',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Updated case' }, '404': { description: 'Case not found' } },
                },
            },
            '/api/cases/{caseId}/close': {
                post: {
                    tags: ['Cases'],
                    summary: 'Close a case',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Closed case' }, '404': { description: 'Case not found' } },
                },
            },
            '/api/cases/{caseId}/evidence': {
                get: {
                    tags: ['Cases'],
                    summary: 'List direct evidence links for a case',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Case evidence links' } },
                },
            },
            '/api/audit/{caseId}': {
                get: {
                    tags: ['Audit'],
                    summary: 'List audit events for a case',
                    parameters: [
                        { name: 'caseId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
                    ],
                    responses: { '200': { description: 'Audit events' } },
                },
            },
            '/api/audit/{caseId}/export': {
                get: {
                    tags: ['Audit'],
                    summary: 'Export audit events with SHA-256 integrity hash',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Audit JSON export' } },
                },
            },
            '/api/contacts': {
                get: {
                    tags: ['Contacts'],
                    summary: 'List active contacts',
                    responses: { '200': { description: 'Contact list' } },
                },
            },
            '/api/network/interfaces': {
                get: {
                    tags: ['Network'],
                    summary: 'List local capture interfaces',
                    responses: { '200': { description: 'Interfaces' }, '403': { description: 'Local capture disabled' } },
                },
            },
            '/api/network/export/json': {
                get: {
                    tags: ['Network'],
                    summary: 'Export captured packets as JSON',
                    responses: { '200': { description: 'Packet JSON export' }, '403': { description: 'Local capture disabled' } },
                },
            },
            '/api/network/export/csv': {
                get: {
                    tags: ['Network'],
                    summary: 'Export captured packets as CSV',
                    responses: { '200': { description: 'Packet CSV export' }, '403': { description: 'Local capture disabled' } },
                },
            },
            '/api/call-capture/status': {
                get: {
                    tags: ['Call Capture'],
                    summary: 'Get current call-capture status',
                    responses: { '200': { description: 'Capture status' }, '403': { description: 'Local capture disabled' } },
                },
            },
            '/api/call-capture/start': {
                post: {
                    tags: ['Call Capture'],
                    summary: 'Start manual authorized call capture',
                    responses: { '200': { description: 'Capture started' }, '409': { description: 'Case closed or archived' } },
                },
            },
            '/api/call-capture/stop': {
                post: {
                    tags: ['Call Capture'],
                    summary: 'Stop manual call capture',
                    responses: { '200': { description: 'Call analysis result' } },
                },
            },
            '/api/report/{jid}/download': {
                get: {
                    tags: ['Reports'],
                    summary: 'Download full contact report',
                    parameters: [{ name: 'jid', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Report file' } },
                },
            },
            '/api/evidence/{caseId}/package': {
                get: {
                    tags: ['Evidence'],
                    summary: 'Download JSON evidence package with manifest and SHA-256 hashes',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Evidence package JSON' }, '404': { description: 'Case/evidence not found' } },
                },
            },
            '/api/evidence/{caseId}/package.zip': {
                get: {
                    tags: ['Evidence'],
                    summary: 'Download ZIP evidence package with separated JSON artifacts',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Evidence package ZIP' }, '404': { description: 'Case/evidence not found' } },
                },
            },
            '/api/reports/{caseId}/final': {
                get: {
                    tags: ['Reports'],
                    summary: 'Download final case report as JSON',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Final case report JSON' }, '404': { description: 'Case/evidence not found' } },
                },
            },
            '/api/reports/{caseId}/final.html': {
                get: {
                    tags: ['Reports'],
                    summary: 'Download final printable case report as HTML',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Final case report HTML' }, '404': { description: 'Case/evidence not found' } },
                },
            },
            '/api/reports/{caseId}/final.pdf': {
                get: {
                    tags: ['Reports'],
                    summary: 'Download final case report as PDF',
                    parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Final case report PDF' }, '404': { description: 'Case/evidence not found' } },
                },
            },
        },
    };
}

if (ENABLE_SWAGGER) {
    app.get('/docs/openapi.json', (_req, res) => {
        res.json(buildOpenApiDocument());
    });

    app.get('/docs', (_req, res) => {
        res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Device Activity Tracker API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: false
    });
  </script>
</body>
</html>`);
    });
}

app.use('/api', (req, res, next) => {
    if (req.path === '/runtime-capabilities') {
        next();
        return;
    }
    if (!isAuthorizedToken(extractAuthToken(req))) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

io.use((socket, next) => {
    const token = typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : typeof socket.handshake.query?.auth === 'string'
            ? socket.handshake.query.auth
            : '';

    if (!isAuthorizedToken(token)) {
        next(new Error('Unauthorized'));
        return;
    }

    next();
});

let sock: any;
let isWhatsAppConnected = false;
let globalProbeMethod: ProbeMethod = 'delete'; // Default to delete method
let currentWhatsAppQr: string | null = null; // Store current QR code for new clients

interface TrackerEntry {
    tracker: WhatsAppTracker;
}

const trackers: Map<string, TrackerEntry> = new Map(); // JID -> Tracker entry

interface CaptureAuditContext {
    caseId: string;
    operatorName: string;
    authorizationNote: string;
}

let activeNetworkAuditContext: (CaptureAuditContext & { captureSessionId: string }) | null = null;
let activeCallAuditContext: (CaptureAuditContext & { targetJid: string; callId: string }) | null = null;

function rejectCaptureUnavailable(res: express.Response): boolean {
    if (LOCAL_CAPTURE_ENABLED) return false;
    res.status(403).json({
        error: 'Local packet capture is disabled in this deployment',
        mode: DEPLOYMENT_MODE,
    });
    return true;
}

function parseCaptureAuditContext(data: any): CaptureAuditContext | null {
    const caseId = validateCaseId(data?.caseId);
    const operatorName = validateRequiredText(data?.operatorName, 'operatorName', 120);
    const authorizationNote = validateRequiredText(data?.authorizationNote, 'authorizationNote', 1000);

    if (!caseId.ok || !operatorName.ok || !authorizationNote.ok) return null;

    return {
        caseId: caseId.value!,
        operatorName: operatorName.value!,
        authorizationNote: authorizationNote.value!,
    };
}

function getDefaultCaptureAuditContext(): CaptureAuditContext | null {
    return parseCaptureAuditContext({
        caseId: process.env.DEFAULT_CASE_ID,
        operatorName: process.env.DEFAULT_OPERATOR_NAME,
        authorizationNote: process.env.DEFAULT_AUTHORIZATION_NOTE,
    });
}

async function checkCaseCanCapture(context: CaptureAuditContext): Promise<{ ok: true } | { ok: false; status: number; payload: Record<string, unknown> }> {
    const existing = await getCase(context.caseId);
    if (existing?.status === 'closed' || existing?.status === 'archived') {
        return {
            ok: false,
            status: 409,
            payload: {
                error: `Case ${context.caseId} is ${existing.status}; capture is not allowed`,
                caseId: context.caseId,
                status: existing.status,
            },
        };
    }

    if (!existing) {
        await createCase({
            caseId: context.caseId,
            title: context.caseId,
            status: 'active',
            primaryOperator: context.operatorName,
            authorizationNote: context.authorizationNote,
        });
    } else if (existing.status === 'draft' || existing.status === 'authorized') {
        await updateCase(context.caseId, { status: 'active' });
    }

    return { ok: true };
}

async function ensureCaseCanCapture(context: CaptureAuditContext, res: express.Response): Promise<boolean> {
    const result = await checkCaseCanCapture(context);
    if (result.ok) return true;
    res.status(result.status).json(result.payload);
    return false;
}

async function auditEvent(
    context: CaptureAuditContext,
    action: string,
    scope: 'network' | 'call' | 'contact' | 'report' | 'system',
    details: Record<string, unknown> = {},
    targetJid?: string | null
) {
    await saveAuditEvent({
        ...context,
        action,
        scope,
        targetJid: targetJid || null,
        details,
    });
}

async function getCaseExportContext(caseId: string, authorizationNote: string): Promise<CaptureAuditContext | null> {
    const [caseRecord, auditEvents, evidenceLinks] = await Promise.all([
        getCase(caseId),
        getAuditEvents(caseId, 1),
        getCaseEvidenceLinks(caseId),
    ]);

    if (!caseRecord && auditEvents.length === 0 && evidenceLinks.length === 0) return null;

    return {
        caseId,
        operatorName: caseRecord?.primaryOperator || auditEvents[0]?.operatorName || 'system',
        authorizationNote: caseRecord?.authorizationNote || auditEvents[0]?.authorizationNote || authorizationNote,
    };
}

async function linkEvidenceToCase(
    context: CaptureAuditContext,
    type: 'contact' | 'network_capture' | 'call_analysis' | 'report' | 'evidence_package',
    refId: string,
    label: string,
    metadata: Record<string, unknown> = {},
    targetJid?: string | null
) {
    await saveCaseEvidenceLink({
        caseId: context.caseId,
        type,
        refId,
        label,
        targetJid: targetJid || null,
        metadata: {
            operatorName: context.operatorName,
            ...metadata,
        },
    });
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'warn' }),
        markOnlineOnConnect: true,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('QR Code generated');
            currentWhatsAppQr = qr; // Store the QR code
            io.emit('qr', qr);
        }

        if (connection === 'close') {
            isWhatsAppConnected = false;
            currentWhatsAppQr = null; // Clear QR on close
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`connection closed (status: ${statusCode}), reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) {
                // Delay before reconnecting to avoid rapid loop
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        } else if (connection === 'open') {
            isWhatsAppConnected = true;
            currentWhatsAppQr = null; // Clear QR on successful connection
            console.log('opened connection');
            io.emit('connection-open');

            // Auto-restore saved contacts from MongoDB
            autoRestoreContacts();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }: any) => {
        console.log(`[SESSION] History sync - Chats: ${chats.length}, Contacts: ${contacts.length}, Messages: ${messages.length}, Latest: ${isLatest}`);
    });

    // ── Listen to contacts.update for real push names and status changes ──
    sock.ev.on('contacts.update', async (updates: any[]) => {
        for (const update of updates) {
            const jid = update.id;
            if (!jid) continue;

            // Only process contacts we are tracking
            if (!trackers.has(jid)) continue;

            const changes: any = {};

            // Push name (the name the contact set in their WhatsApp profile)
            if (update.notify) {
                changes.pushName = update.notify;
                console.log(`[CONTACTS] Push name for ${jid}: "${update.notify}"`);
            }

            // Status/about text
            if (update.status !== undefined) {
                changes.about = update.status || null;
                console.log(`[CONTACTS] About for ${jid}: "${update.status}"`);
            }

            // Profile picture update
            if (update.imgUrl !== undefined) {
                // imgUrl can be 'changed' or 'removed' - fetch fresh pic
                try {
                    const freshPic = await sock.profilePictureUrl(jid, 'image');
                    changes.profilePic = freshPic || null;
                    io.emit('profile-pic', { jid, url: freshPic || null });
                } catch (_e) {
                    changes.profilePic = null;
                }
            }

            if (Object.keys(changes).length > 0) {
                await updateContactProfile(jid, changes);
                // Emit the updated fields to all clients
                io.emit('contact-profile-update', { jid, ...changes });
            }
        }
    });

    // ── Listen to contacts.upsert for initial contact data ──
    sock.ev.on('contacts.upsert', async (newContacts: any[]) => {
        for (const contact of newContacts) {
            const jid = contact.id;
            if (!jid || !trackers.has(jid)) continue;

            const changes: any = {};
            if (contact.notify) changes.pushName = contact.notify;
            if (contact.status) changes.about = contact.status;

            if (Object.keys(changes).length > 0) {
                await updateContactProfile(jid, changes);
                io.emit('contact-profile-update', { jid, ...changes });
                console.log(`[CONTACTS UPSERT] Updated ${jid}:`, changes);
            }
        }
    });

    sock.ev.on('messages.update', (updates: any) => {
        for (const update of updates) {
            console.log(`[MSG UPDATE] JID: ${update.key.remoteJid}, ID: ${update.key.id}, Status: ${update.update.status}, FromMe: ${update.key.fromMe}`);
        }
    });

    // ── Listen to call events for Call IP Analyzer ──
    sock.ev.on('call', async (calls: any[]) => {
        for (const call of calls) {
            console.log(`[CALL] Event: ${call.status} | From: ${call.from} | ID: ${call.id} | Video: ${call.isVideo || false}`);

            // Emit call event to all connected clients
            io.emit('call-event', {
                callId: call.id,
                from: call.from,
                status: call.status,
                isVideo: call.isVideo || false,
                date: call.date,
                offline: call.offline,
                latencyMs: call.latencyMs,
            });

            // Auto-start only when a default case context is configured.
            if (LOCAL_CAPTURE_ENABLED && (call.status === 'offer' || call.status === 'accept')) {
                const defaultContext = getDefaultCaptureAuditContext();
                if (!defaultContext) {
                    console.log('[CALL] Auto-capture skipped: DEFAULT_CASE_ID, DEFAULT_OPERATOR_NAME, and DEFAULT_AUTHORIZATION_NOTE are required');
                    continue;
                }
                const iface = autoDetectInterface();
                if (iface) {
                    const started = startCallCapture(
                        iface,
                        call.from,
                        call.id,
                        call.isVideo || false,
                        (packet) => {
                            io.emit('call-packet', packet);
                        }
                    );
                    if (started) {
                        activeCallAuditContext = { ...defaultContext, targetJid: call.from, callId: call.id };
                        await auditEvent(defaultContext, 'call_capture_start', 'call', {
                            callId: call.id,
                            interfaceAddr: iface,
                            isVideo: call.isVideo || false,
                            trigger: 'auto',
                        }, call.from);
                        console.log(`[CALL] Auto-capture started for call ${call.id}`);
                        io.emit('call-capture-started', { callId: call.id, targetJid: call.from });
                    }
                } else {
                    console.warn('[CALL] No network interface found for auto-capture');
                }
            }

            // Auto-stop capture when call terminates
            if (LOCAL_CAPTURE_ENABLED && (call.status === 'terminate' || call.status === 'reject' || call.status === 'timeout')) {
                if (!activeCallAuditContext || activeCallAuditContext.callId !== call.id) {
                    continue;
                }
                const result = stopCallCapture();
                if (result) {
                    console.log(`[CALL] Analysis complete: ${result.verdict} | ${result.candidateIps.filter(c => c.isP2P).length} direct-path candidates`);
                    io.emit('call-analysis', result);
                    // Persist to MongoDB
                    await saveCallAnalysis(result);
                    if (activeCallAuditContext) {
                        await auditEvent(activeCallAuditContext, 'call_capture_stop', 'call', {
                            callId: result.callId,
                            verdict: result.verdict,
                            totalPackets: result.totalPackets,
                            durationSec: result.durationSec,
                            candidateCount: result.candidateIps.filter(c => c.isP2P).length,
                            metaIpCount: result.metaIps.length,
                            trigger: 'auto',
                        }, result.targetJid);
                        activeCallAuditContext = null;
                    }
                }
            }
        }
    });
}

// Initialize DB, Analytics, and WhatsApp
(async () => {
    dbAvailableForStartupAudit = await connectDB();
    await initAnalytics();
    connectToWhatsApp();
    await tryRecordStartupAudit();
})();

/**
 * Wire up standard callbacks for a tracker instance.
 * Centralizes onUpdate, onPresenceChange, onNewDevice logic.
 */
function wireTrackerCallbacks(tracker: WhatsAppTracker, jid: string) {
    tracker.onUpdate = (updateData) => {
        io.emit('tracker-update', { jid, ...updateData });

        if (updateData.median !== undefined && updateData.devices) {
            saveMeasurement({
                jid,
                rtt: updateData.devices[0]?.rtt ?? 0,
                avg: updateData.devices[0]?.avg ?? 0,
                median: updateData.median,
                threshold: updateData.threshold ?? 0,
                state: updateData.devices.find((d: any) => d.state.includes('Online'))?.state || updateData.devices[0]?.state || 'Unknown',
                devices: updateData.devices,
                deviceCount: updateData.deviceCount ?? 0
            });
        }
    };

    tracker.onPresenceChange = (data) => {
        console.log(`[PRESENCE] ${jid}: ${data.presence}`);
        io.emit('presence-change', data);
    };

    tracker.onNewDevice = (data) => {
        console.log(`[NEW DEVICE] ${jid}: new device ${data.deviceJid} (total: ${data.totalDevices})`);
        io.emit('device-alert', data);
    };
}

/**
 * Auto-restore: resume tracking for all active contacts saved in MongoDB.
 * Called when WhatsApp connection is established (or re-established).
 */
async function autoRestoreContacts() {
    try {
        const saved = await getActiveContacts();
        if (saved.length === 0) {
            console.log('[AUTO-RESTORE] No saved contacts to restore');
            return;
        }

        console.log(`[AUTO-RESTORE] Restoring ${saved.length} contact(s)...`);
        let restored = 0;

        for (const contact of saved) {
            if (trackers.has(contact.jid)) {
                console.log(`[AUTO-RESTORE] ${contact.jid} already tracked, skipping`);
                continue;
            }

            try {
                const tracker = new WhatsAppTracker(sock, contact.jid);
                tracker.setProbeMethod(globalProbeMethod);
                trackers.set(contact.jid, { tracker });

                wireTrackerCallbacks(tracker, contact.jid);

                tracker.startTracking();
                restored++;

                // Emit contact info to connected clients
                const displayName = contact.customName || contact.pushName || contact.contactName || contact.number;
                io.emit('contact-added', { jid: contact.jid, number: contact.number, customName: contact.customName || null, pushName: contact.pushName || null });
                if (contact.profilePic) io.emit('profile-pic', { jid: contact.jid, url: contact.profilePic });
                io.emit('contact-name', { jid: contact.jid, name: displayName });

                console.log(`[AUTO-RESTORE] ✓ ${contact.number} (${displayName})`);
            } catch (err) {
                console.error(`[AUTO-RESTORE] ✗ Failed to restore ${contact.jid}:`, err);
            }
        }

        console.log(`[AUTO-RESTORE] Done: ${restored}/${saved.length} contacts restored`);
    } catch (err) {
        console.error('[AUTO-RESTORE] Error:', err);
    }
}

// REST endpoint: get measurement history for a contact
app.get('/api/history/:jid', async (req, res) => {
    const jid = req.params.jid;
    const limit = parseLimit(req.query.limit, 200, 1000);
    const history = await getRecentMeasurements(jid, limit);
    res.json(history);
});

// REST endpoint: get all saved contacts
app.get('/api/contacts', async (_req, res) => {
    const savedContacts = await getSavedContacts();
    res.json(savedContacts);
});

// REST endpoint: get activity history (state transitions)
app.get('/api/activity/:jid', async (req, res) => {
    const jid = req.params.jid;
    const limit = parseLimit(req.query.limit, 50, 1000);
    const history = await getActivityHistory(jid, limit);
    res.json(history);
});

// REST endpoint: get state distribution stats
app.get('/api/stats/:jid', async (req, res) => {
    const jid = req.params.jid;
    const stats = await getStateDistribution(jid);
    res.json(stats);
});

// REST endpoint: get full contact profile from DB + WhatsApp
app.get('/api/profile/:jid', async (req, res) => {
    const jid = req.params.jid;
    try {
        // Get stored profile from MongoDB
        const stored = await getContactProfile(jid);

        // Try to fetch fresh data from WhatsApp if connected
        let freshAbout: string | null = null;
        let freshAboutSetAt: Date | null = null;
        let freshBusiness: any = null;
        let freshPic: string | null = null;

        if (isWhatsAppConnected && sock) {
            // Fetch "about" / status text
            try {
                const status = await sock.fetchStatus(jid);
                if (status) {
                    freshAbout = status.status || null;
                    freshAboutSetAt = status.setAt ? new Date(status.setAt * 1000) : null;
                }
            } catch (e: any) {
                console.log(`[PROFILE] Could not fetch status for ${jid}:`, e.message);
            }

            // Fetch business profile
            try {
                const bp = await sock.getBusinessProfile(jid);
                if (bp) {
                    freshBusiness = {
                        description: bp.description || undefined,
                        category: bp.category || undefined,
                        website: (bp as any).website?.[0] || undefined,
                        email: (bp as any).email || undefined,
                        address: (bp as any).address || undefined,
                    };
                }
            } catch (e: any) {
                // Not a business account — that's fine
            }

            // Fetch profile pic (retry)
            try {
                freshPic = await sock.profilePictureUrl(jid, 'image') || null;
            } catch (e: any) {
                freshPic = null;
            }

            // Update DB with fresh data
            await updateContactProfile(jid, {
                about: freshAbout,
                aboutSetAt: freshAboutSetAt,
                isBusinessAccount: !!freshBusiness,
                businessProfile: freshBusiness,
                profilePic: freshPic,
            });
        }

        // Merge stored + fresh
        const profile = {
            jid,
            number: stored?.number || jid.replace('@s.whatsapp.net', ''),
            contactName: stored?.contactName || null,
            customName: stored?.customName || null,
            profilePic: freshPic || stored?.profilePic || null,
            about: freshAbout || stored?.about || null,
            aboutSetAt: freshAboutSetAt || stored?.aboutSetAt || null,
            isBusinessAccount: freshBusiness ? true : (stored?.isBusinessAccount || false),
            businessProfile: freshBusiness || stored?.businessProfile || null,
            pushName: stored?.pushName || null,
            addedAt: stored?.addedAt || null,
            lastSeen: stored?.lastSeen || null,
            lastProfileUpdate: new Date(),
            verifiedOnWhatsApp: stored?.verifiedOnWhatsApp ?? true,
        };

        res.json(profile);
    } catch (err) {
        console.error('[PROFILE] Error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// REST endpoint: get online activity patterns
app.get('/api/patterns/:jid', async (req, res) => {
    const jid = req.params.jid;
    const patterns = await getOnlinePatterns(jid);
    res.json(patterns);
});

// REST endpoint: get all saved contacts (history — includes inactive)
app.get('/api/contacts/history', async (_req, res) => {
    const allContacts = await getSavedContacts();
    // Sort: active first, then by lastSeen descending
    allContacts.sort((a, b) => {
        const aActive = a.isActive !== false;
        const bActive = b.isActive !== false;
        if (aActive !== bActive) return aActive ? -1 : 1;
        return (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0);
    });
    res.json(allContacts);
});

// REST endpoint: generate comprehensive report for a contact
app.get('/api/report/:jid', async (req, res) => {
    const jid = req.params.jid;
    try {
        const report = await generateReport(jid);
        res.json(report);
    } catch (err) {
        console.error('[REPORT] Error generating report:', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// REST endpoint: download report as formatted JSON file
app.get('/api/report/:jid/download', async (req, res) => {
    const jid = req.params.jid;
    try {
        const report = await generateReport(jid);
        const number = jid.replace('@s.whatsapp.net', '');
        const filename = `report-${number}-${new Date().toISOString().slice(0, 10)}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(report, null, 2));
    } catch (err) {
        console.error('[REPORT] Error:', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// ── Behavior Intelligence REST endpoints ─────────────────────

app.get('/api/intel/:jid', async (req, res) => {
    try {
        const days = parseLimit(req.query.days, 14, 365);
        const intel = await getFullIntelligence(req.params.jid, days);
        res.json(intel);
    } catch (err) {
        console.error('[API] Intel error:', err);
        res.status(500).json({ error: 'Failed to generate intelligence report' });
    }
});

app.get('/api/intel/:jid/routine', async (req, res) => {
    const days = parseLimit(req.query.days, 14, 365);
    res.json(await getDailyRoutine(req.params.jid, days));
});

app.get('/api/intel/:jid/availability', async (req, res) => {
    const days = parseLimit(req.query.days, 14, 365);
    res.json(await getAvailabilityProfile(req.params.jid, days));
});

app.get('/api/intel/:jid/sessions', async (req, res) => {
    const days = parseLimit(req.query.days, 14, 365);
    res.json(await getSessionStats(req.params.jid, days));
});

app.get('/api/intel/:jid/heatmap', async (req, res) => {
    const weeks = parseLimit(req.query.weeks, 4, 52);
    res.json(await getWeeklyHeatmap(req.params.jid, weeks));
});

app.get('/api/intel/:jid/habits', async (req, res) => {
    const days = parseLimit(req.query.days, 14, 365);
    res.json(await getHabitProfile(req.params.jid, days));
});

app.get('/api/intel/correlation', async (req, res) => {
    const { jid1, jid2, days } = req.query;
    if (!jid1 || !jid2) return res.status(400).json({ error: 'jid1 and jid2 required' });
    const d = parseLimit(days, 7, 365);
    res.json(await getCorrelation(jid1 as string, jid2 as string, d));
});

// ── Privacy / OPSEC Score ─────────────────────────────────────

app.get('/api/privacy-score/:jid', async (req, res) => {
    const jid = req.params.jid;
    try {
        const profile = await getContactProfile(jid);
        let score = 100; // Perfect privacy = 100
        const deductions: { reason: string; points: number }[] = [];

        // Profile picture exposed
        let hasPic = !!profile?.profilePic;
        if (!hasPic && isWhatsAppConnected && sock) {
            try { hasPic = !!(await sock.profilePictureUrl(jid, 'image')); } catch {}
        }
        if (hasPic) { score -= 20; deductions.push({ reason: 'Foto de perfil visible', points: 20 }); }

        // About/status exposed
        let hasAbout = !!profile?.about;
        if (!hasAbout && isWhatsAppConnected && sock) {
            try {
                const st = await sock.fetchStatus(jid);
                hasAbout = !!(st?.status);
            } catch {}
        }
        if (hasAbout) { score -= 15; deductions.push({ reason: 'Estado/About visible', points: 15 }); }

        // Business account (exposes lots of data)
        if (profile?.isBusinessAccount) {
            score -= 25;
            deductions.push({ reason: 'Cuenta de negocio (datos expuestos)', points: 25 });
        }

        // Push name set (reveals real name)
        if (profile?.pushName) { score -= 10; deductions.push({ reason: 'Nombre de perfil (Push Name) visible', points: 10 }); }

        // Online activity trackable (we can always detect this — universal deduction)
        score -= 15;
        deductions.push({ reason: 'Actividad online rastreable via RTT', points: 15 });

        // Presence trackable (typing/recording)
        score -= 10;
        deductions.push({ reason: 'Indicadores escribiendo/grabando detectables', points: 10 });

        // Multiple devices detectable
        const entry = trackers.get(jid);
        if (entry) {
            const deviceMetricSize = (entry.tracker as any).knownDeviceJids?.size ?? 0;
            if (deviceMetricSize > 1) {
                score -= 5;
                deductions.push({ reason: `${deviceMetricSize} dispositivos detectados`, points: 5 });
            }
        }

        score = Math.max(0, score);
        const level = score >= 70 ? 'Alto' : score >= 40 ? 'Medio' : 'Bajo';

        res.json({ score, level, deductions });
    } catch (err) {
        console.error('[PRIVACY] Error:', err);
        res.status(500).json({ error: 'Failed to calculate privacy score' });
    }
});

// ── Anomaly Detection ─────────────────────────────────────────

app.get('/api/anomalies/:jid', async (req, res) => {
    const jid = req.params.jid;
    try {
        const days = parseLimit(req.query.days, 14, 365);
        const [habits, sessions, availability] = await Promise.all([
            getHabitProfile(jid, days),
            getSessionStats(jid, days),
            getAvailabilityProfile(jid, days),
        ]);

        const anomalies: { type: string; severity: 'info' | 'warning' | 'critical'; description: string; timestamp: number }[] = [];
        const now = new Date();
        const currentHour = now.getHours();

        // 1. Active during normally inactive hours
        if (availability.inactiveHours.includes(currentHour)) {
            const prob = availability.hourly[currentHour] ?? 0;
            // Check if the tracker shows Online right now
            const entry = trackers.get(jid);
            if (entry) {
                const lastPresence = (entry.tracker as any).lastPresence;
                if (lastPresence === 'available' || lastPresence === 'composing' || lastPresence === 'recording') {
                    anomalies.push({
                        type: 'unusual-hours',
                        severity: 'warning',
                        description: `Activo a las ${currentHour}:00 (probabilidad habitual: ${(prob * 100).toFixed(0)}%)`,
                        timestamp: Date.now()
                    });
                }
            }
        }

        // 2. Session duration anomaly — check if current session is unusually long
        if (sessions.avgDurationSec > 0 && sessions.maxDurationSec > sessions.avgDurationSec * 3) {
            anomalies.push({
                type: 'long-session',
                severity: 'info',
                description: `Sesión máxima (${Math.round(sessions.maxDurationSec / 60)}min) es 3x el promedio (${Math.round(sessions.avgDurationSec / 60)}min)`,
                timestamp: Date.now()
            });
        }

        // 3. Night owl / schedule shift
        if (habits.nightOwlScore > 70) {
            anomalies.push({
                type: 'night-owl',
                severity: 'info',
                description: `Patrón nocturno elevado (score: ${habits.nightOwlScore})`,
                timestamp: Date.now()
            });
        }

        // 4. Low consistency (erratic behavior)
        if (habits.consistencyScore < 30) {
            anomalies.push({
                type: 'erratic-behavior',
                severity: 'warning',
                description: `Comportamiento errático (consistencia: ${habits.consistencyScore}%)`,
                timestamp: Date.now()
            });
        }

        // 5. Weekend vs weekday difference
        if (habits.weekdayVsWeekend) {
            const diff = Math.abs(habits.weekdayVsWeekend.weekdayAvgMin - habits.weekdayVsWeekend.weekendAvgMin);
            if (diff > 120) { // >2h difference
                anomalies.push({
                    type: 'schedule-shift',
                    severity: 'info',
                    description: `Gran diferencia L-V vs fin de semana: ${habits.weekdayVsWeekend.difference}`,
                    timestamp: Date.now()
                });
            }
        }

        res.json({ anomalies, totalAnalyzedDays: availability.daysAnalyzed });
    } catch (err) {
        console.error('[ANOMALY] Error:', err);
        res.status(500).json({ error: 'Failed to detect anomalies' });
    }
});

// ── Network Monitor REST endpoints ────────────────────────────

app.put('/api/contact/:jid/custom-name', async (req, res) => {
    try {
        const jidResult = validateJid(req.params.jid);
        if (!jidResult.ok) {
            validationError(res, jidResult.errors || []);
            return;
        }
        const { customName } = req.body || {};
        if (customName !== null && customName !== undefined && typeof customName !== 'string') {
            validationError(res, ['customName must be a string or null']);
            return;
        }
        const trimmed = cleanText(customName, 120) || null;
        console.log(`[CUSTOM NAME REST] ${jidResult.value!} → "${trimmed}"`);
        await updateCustomName(jidResult.value!, trimmed);
        io.emit('custom-name-updated', { jid: jidResult.value!, customName: trimmed });
        res.json({ ok: true, jid: jidResult.value!, customName: trimmed });
    } catch (err) {
        console.error('[API] Error setting custom name:', err);
        res.status(500).json({ error: 'Failed to set custom name' });
    }
});

app.get('/api/runtime-capabilities', (_req, res) => {
    res.json({
        mode: DEPLOYMENT_MODE,
        localCapture: LOCAL_CAPTURE_ENABLED,
        whatsappTracker: true,
        reports: true,
        networkMonitor: LOCAL_CAPTURE_ENABLED,
        callTrafficAnalysis: LOCAL_CAPTURE_ENABLED,
        authRequired: !!DASHBOARD_TOKEN,
    });
});

registerCaseRoutes(app);

app.get('/api/network/interfaces', (_req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    res.json(listInterfaces());
});

app.get('/api/network/status', (_req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    res.json(getCaptureStatus());
});

app.get('/api/network/packets', (req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    const limit = parseLimit(req.query.limit, 100, 5000);
    res.json(getRecentPackets(limit));
});

app.get('/api/network/export/json', (req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    const limit = req.query.limit ? parseLimit(req.query.limit, 1000, 50000) : undefined;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=packets-${Date.now()}.json`);
    res.send(exportJSON(limit));
});

app.get('/api/network/export/csv', (req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    const limit = req.query.limit ? parseLimit(req.query.limit, 1000, 50000) : undefined;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=packets-${Date.now()}.csv`);
    res.send(exportCSV(limit));
});

// ── Call IP Analyzer REST endpoints ───────────────────────────

app.get('/api/call-analysis/:jid', async (req, res) => {
    const jid = req.params.jid;
    try {
        // Try in-memory first, fallback to MongoDB
        const latest = getLatestCallAnalysis(jid);
        if (latest) {
            res.json(latest);
        } else {
            const fromDB = await getCallAnalyses(jid, 1);
            res.json(fromDB[0] || null);
        }
    } catch (err) {
        console.error('[CALL-API] Error:', err);
        res.status(500).json({ error: 'Failed to get call analysis' });
    }
});

app.get('/api/call-history/:jid', async (req, res) => {
    const jid = req.params.jid;
    const limit = parseLimit(req.query.limit, 20, 100);
    try {
        // Merge in-memory and MongoDB results
        const inMemory = getCallAnalysisHistory(jid);
        const fromDB = await getCallAnalyses(jid, limit);

        // Deduplicate by callId
        const seen = new Set<string>();
        const merged = [];
        for (const r of [...inMemory, ...fromDB]) {
            if (!seen.has(r.callId)) {
                seen.add(r.callId);
                merged.push(r);
            }
        }
        // Sort by startTime descending
        merged.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        res.json(merged.slice(0, limit));
    } catch (err) {
        console.error('[CALL-API] Error:', err);
        res.status(500).json({ error: 'Failed to get call history' });
    }
});

registerAuditRoutes(app, {
    getCaseExportContext,
    auditEvent,
});

registerReportRoutes(app, {
    getCaseExportContext,
    auditEvent,
});

app.get('/api/call-capture/status', (_req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    res.json(getCallCaptureStatus());
});

app.post('/api/call-capture/start', async (req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    const auditContext = parseCaptureAuditContext(req.body);
    if (!auditContext) {
        res.status(400).json({ error: 'caseId, operatorName, and authorizationNote are required' });
        return;
    }
    if (!await ensureCaseCanCapture(auditContext, res)) return;
    const { interfaceAddr, targetJid, callId, isVideo } = req.body || {};
    const targetResult = normalizeOptionalJid(targetJid, 'manual');
    if (!targetResult.ok) {
        validationError(res, targetResult.errors || []);
        return;
    }
    const iface = cleanText(interfaceAddr, 200) || autoDetectInterface();
    if (!iface) {
        res.status(400).json({ error: 'No network interface available' });
        return;
    }
    const cid = cleanText(callId, 120) || `manual-${Date.now()}`;
    const target = targetResult.value!;
    const ok = startCallCapture(iface, target, cid, isVideo || false, (packet) => {
        io.emit('call-packet', packet);
    });
    if (ok) {
        activeCallAuditContext = { ...auditContext, targetJid: target, callId: cid };
        await linkEvidenceToCase(auditContext, 'call_analysis', cid, `Call capture ${cid}`, {
            interfaceAddr: iface,
            isVideo: isVideo || false,
            trigger: 'manual_rest',
            status: 'started',
        }, target);
        await auditEvent(auditContext, 'call_capture_start', 'call', {
            callId: cid,
            interfaceAddr: iface,
            isVideo: isVideo || false,
            trigger: 'manual_rest',
        }, target);
        io.emit('call-capture-started', { callId: cid, targetJid: target });
        res.json({ ok: true, callId: cid });
    } else {
        res.status(500).json({ error: 'Failed to start capture. Already capturing or run as administrator.' });
    }
});

app.post('/api/call-capture/stop', async (_req, res) => {
    if (rejectCaptureUnavailable(res)) return;
    const result = stopCallCapture();
    if (result) {
        io.emit('call-analysis', result);
        await saveCallAnalysis(result);
        if (activeCallAuditContext) {
            await linkEvidenceToCase(activeCallAuditContext, 'call_analysis', result.callId, `Call analysis ${result.callId}`, {
                verdict: result.verdict,
                totalPackets: result.totalPackets,
                durationSec: result.durationSec,
                candidateCount: result.candidateIps.filter(c => c.isP2P).length,
                metaIpCount: result.metaIps.length,
                status: 'completed',
            }, result.targetJid);
            await auditEvent(activeCallAuditContext, 'call_capture_stop', 'call', {
                callId: result.callId,
                verdict: result.verdict,
                totalPackets: result.totalPackets,
                durationSec: result.durationSec,
                candidateCount: result.candidateIps.filter(c => c.isP2P).length,
                metaIpCount: result.metaIps.length,
                trigger: 'manual_rest',
            }, result.targetJid);
            activeCallAuditContext = null;
        }
        res.json(result);
    } else {
        res.json({ ok: false, message: 'No active capture' });
    }
});

io.on('connection', (socket) => {
    console.log('Client connected');

    // Send current WhatsApp QR code if available
    if (currentWhatsAppQr) {
        socket.emit('qr', currentWhatsAppQr);
    }

    if (isWhatsAppConnected) {
        socket.emit('connection-open');
    }

    // Send current probe method to client
    socket.emit('probe-method', globalProbeMethod);

    // Handle request to get tracked contacts (for page refresh)
    socket.on('get-tracked-contacts', () => {
        const trackedContacts = Array.from(trackers.keys());
        socket.emit('tracked-contacts', trackedContacts);
    });

    // Add contact - WhatsApp only
    socket.on('add-contact', async (data: string | { number: string; customName?: string; caseId?: string; operatorName?: string; authorizationNote?: string }) => {
        const number = typeof data === 'string' ? data : data.number;
        const customName = typeof data === 'object' ? cleanText(data.customName, 120) || null : null;
        const auditContext = typeof data === 'object' ? parseCaptureAuditContext(data) : null;
        if (!auditContext) {
            socketValidationError(socket, ['caseId, operatorName, and authorizationNote are required before tracking a contact']);
            return;
        }
        const caseCheck = await checkCaseCanCapture(auditContext);
        if (!caseCheck.ok) {
            socket.emit('error', { status: caseCheck.status, ...caseCheck.payload });
            return;
        }

        console.log(`Request to track: ${number}${customName ? ` (alias: ${customName})` : ''}`);
        const cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length < 6 || cleanNumber.length > 20) {
            socketValidationError(socket, ['number must contain 6-20 digits']);
            return;
        }

        const targetJid = cleanNumber + '@s.whatsapp.net';

        if (trackers.has(targetJid)) {
            socket.emit('error', { jid: targetJid, message: 'Already tracking this contact' });
            return;
        }

        try {
            const results = await sock.onWhatsApp(targetJid);
            const result = results?.[0];

            if (result?.exists) {
                const tracker = new WhatsAppTracker(sock, result.jid);
                tracker.setProbeMethod(globalProbeMethod);
                trackers.set(result.jid, { tracker });

                wireTrackerCallbacks(tracker, result.jid);

                tracker.startTracking();

                const ppUrl = await tracker.getProfilePicture();

                let contactName = cleanNumber;
                let pushNameFromWA: string | null = null;
                try {
                    const contactInfo = await sock.onWhatsApp(result.jid);
                    if (contactInfo && contactInfo[0]?.notify) {
                        pushNameFromWA = contactInfo[0].notify;
                        contactName = contactInfo[0].notify;
                    }
                } catch (err) {
                    console.log('[NAME] Could not fetch contact name, using number');
                }

                // Display name priority: customName > pushName > number
                const displayName = customName || pushNameFromWA || cleanNumber;

                socket.emit('contact-added', {
                    jid: result.jid,
                    number: cleanNumber,
                    customName: customName,
                    pushName: pushNameFromWA,
                    caseId: auditContext.caseId,
                });

                io.emit('profile-pic', { jid: result.jid, url: ppUrl });
                io.emit('contact-name', { jid: result.jid, name: displayName });

                // Persist contact to MongoDB (with custom name)
                saveContact(result.jid, cleanNumber, contactName, ppUrl, customName);
                await linkEvidenceToCase(auditContext, 'contact', result.jid, `Contact ${displayName}`, {
                    number: cleanNumber,
                    displayName,
                    customName,
                    pushName: pushNameFromWA,
                    status: 'tracking_started',
                }, result.jid);
                await auditEvent(auditContext, 'contact_tracking_start', 'contact', {
                    number: cleanNumber,
                    displayName,
                    customName,
                    pushName: pushNameFromWA,
                }, result.jid);

                // Fetch and persist enriched profile (about, business, etc.)
                (async () => {
                    try {
                        let about: string | null = null;
                        let aboutSetAt: Date | null = null;
                        let businessProfile: any = null;
                        let pushName: string | null = null;

                        // Fetch about/status
                        try {
                            const status = await sock.fetchStatus(result.jid);
                            if (status) {
                                about = status.status || null;
                                aboutSetAt = status.setAt ? new Date(status.setAt * 1000) : null;
                            }
                        } catch (_e) { /* privacy settings may block */ }

                        // Fetch business profile
                        try {
                            const bp = await sock.getBusinessProfile(result.jid);
                            if (bp) {
                                businessProfile = {
                                    description: bp.description || undefined,
                                    category: bp.category || undefined,
                                    website: (bp as any).website?.[0] || undefined,
                                    email: (bp as any).email || undefined,
                                    address: (bp as any).address || undefined,
                                };
                            }
                        } catch (_e) { /* not a business account */ }

                        // Get push name from WhatsApp (use the one we already got, or try again)
                        pushName = pushNameFromWA;
                        if (!pushName) {
                            try {
                                const waInfo = await sock.onWhatsApp(result.jid);
                                pushName = waInfo?.[0]?.notify || null;
                            } catch (_e) {}
                        }

                        // Also try to get pushName from the store/cache
                        try {
                            const storeContacts = sock.store?.contacts || {};
                            if (storeContacts[result.jid]?.notify) {
                                pushName = storeContacts[result.jid].notify;
                            }
                        } catch (_e) {}

                        await updateContactProfile(result.jid, {
                            about,
                            aboutSetAt,
                            isBusinessAccount: !!businessProfile,
                            businessProfile,
                            pushName,
                            profilePic: ppUrl,
                        });

                        // Emit enriched profile to all clients
                        io.emit('contact-profile', {
                            jid: result.jid,
                            about,
                            aboutSetAt,
                            isBusinessAccount: !!businessProfile,
                            businessProfile,
                            pushName,
                            customName,
                        });

                        console.log(`[PROFILE] Enriched profile saved for ${result.jid}`);
                    } catch (err) {
                        console.log('[PROFILE] Could not enrich profile:', err);
                    }
                })();
            } else {
                socket.emit('error', { jid: targetJid, message: 'Number not on WhatsApp' });
            }
        } catch (err) {
            console.error(err);
            socket.emit('error', { jid: targetJid, message: 'Verification failed' });
        }
    });

    socket.on('remove-contact', (jid: string) => {
        const jidResult = validateJid(jid);
        if (!jidResult.ok) {
            socketValidationError(socket, jidResult.errors || []);
            return;
        }
        jid = jidResult.value!;
        console.log(`Request to stop tracking: ${jid}`);
        const entry = trackers.get(jid);
        if (entry) {
            entry.tracker.stopTracking();
            trackers.delete(jid);
            socket.emit('contact-removed', jid);
            removeContact(jid);
        }
    });

    // Set/update custom name (alias) for a contact
    socket.on('set-custom-name', async (data: { jid: string; customName: string | null }) => {
        const { jid, customName } = data;
        const jidResult = validateJid(jid);
        if (!jidResult.ok) {
            socketValidationError(socket, jidResult.errors || []);
            return;
        }
        const trimmed = cleanText(customName, 120) || null;
        console.log(`[CUSTOM NAME] ${jid} → "${trimmed}"`);
        await updateCustomName(jidResult.value!, trimmed);
        // Broadcast to all clients so the name updates everywhere
        io.emit('custom-name-updated', { jid: jidResult.value!, customName: trimmed });
    });

    // Re-activate a previously tracked contact from history
    socket.on('reactivate-contact', async (jid: string) => {
        const jidResult = validateJid(jid);
        if (!jidResult.ok) {
            socketValidationError(socket, jidResult.errors || []);
            return;
        }
        jid = jidResult.value!;
        console.log(`Request to reactivate: ${jid}`);

        if (trackers.has(jid)) {
            socket.emit('error', { jid, message: 'Already tracking this contact' });
            return;
        }

        if (!isWhatsAppConnected || !sock) {
            socket.emit('error', { jid, message: 'WhatsApp not connected' });
            return;
        }

        try {
            const tracker = new WhatsAppTracker(sock, jid);
            tracker.setProbeMethod(globalProbeMethod);
            trackers.set(jid, { tracker });

            wireTrackerCallbacks(tracker, jid);

            tracker.startTracking();

            // Mark as active again in DB
            await reactivateContact(jid);

            const number = jid.replace('@s.whatsapp.net', '');
            socket.emit('contact-added', { jid, number });

            // Fetch profile pic
            try {
                const ppUrl = await sock.profilePictureUrl(jid, 'image');
                io.emit('profile-pic', { jid, url: ppUrl || null });
            } catch (_e) {}

            console.log(`[REACTIVATE] ✓ ${jid}`);
        } catch (err) {
            console.error(`[REACTIVATE] Error:`, err);
            socket.emit('error', { jid, message: 'Failed to reactivate contact' });
        }
    });

    // ── Network Monitor Socket events ──────────────────────────

    socket.on('network-start', async (data: { interfaceAddr: string; filter?: CaptureFilter; caseId?: string; operatorName?: string; authorizationNote?: string }) => {
        if (!LOCAL_CAPTURE_ENABLED) {
            socket.emit('error', { message: 'Local packet capture is disabled in this deployment', mode: DEPLOYMENT_MODE });
            return;
        }
        const auditContext = parseCaptureAuditContext(data);
        if (!auditContext) {
            socketValidationError(socket, ['caseId, operatorName, and authorizationNote are required before capture']);
            return;
        }
        const caseCheck = await checkCaseCanCapture(auditContext);
        if (!caseCheck.ok) {
            socket.emit('error', { status: caseCheck.status, ...caseCheck.payload });
            return;
        }
        const captureSessionId = `network-${Date.now()}`;
        const interfaceAddr = cleanText(data.interfaceAddr, 200);
        if (!interfaceAddr) {
            socketValidationError(socket, ['interfaceAddr is required']);
            return;
        }
        console.log(`[NETWORK] Start capture on ${interfaceAddr}`);
        const ok = startCapture(interfaceAddr, data.filter || {}, (packet: PacketMeta) => {
            io.emit('network-packet', packet);
        });
        socket.emit('network-status', getCaptureStatus());
        if (ok) {
            activeNetworkAuditContext = { ...auditContext, captureSessionId };
            await linkEvidenceToCase(auditContext, 'network_capture', captureSessionId, `Network capture ${captureSessionId}`, {
                interfaceAddr,
                filter: data.filter || {},
                trigger: 'socket',
                status: 'started',
            });
            await auditEvent(auditContext, 'capture_start', 'network', {
                captureSessionId,
                interfaceAddr,
                filter: data.filter || {},
                trigger: 'socket',
            });
        }
        if (!ok) {
            socket.emit('error', { message: 'Failed to start capture. Run as administrator.' });
        }
    });

    socket.on('network-stop', async () => {
        if (!LOCAL_CAPTURE_ENABLED) {
            socket.emit('network-status', { isCapturing: false, stats: null });
            return;
        }
        stopCapture();
        const status = getCaptureStatus();
        socket.emit('network-status', status);
        if (activeNetworkAuditContext) {
            await linkEvidenceToCase(activeNetworkAuditContext, 'network_capture', activeNetworkAuditContext.captureSessionId, `Network capture ${activeNetworkAuditContext.captureSessionId}`, {
                stats: status.stats,
                trigger: 'socket',
                status: 'completed',
            });
            await auditEvent(activeNetworkAuditContext, 'capture_stop', 'network', {
                captureSessionId: activeNetworkAuditContext.captureSessionId,
                stats: status.stats,
                trigger: 'socket',
            });
            activeNetworkAuditContext = null;
        }
        console.log('[NETWORK] Capture stopped by client');
    });

    socket.on('network-filter', (filter: CaptureFilter) => {
        if (!LOCAL_CAPTURE_ENABLED) return;
        updateFilter(filter);
    });

    socket.on('network-get-status', () => {
        if (!LOCAL_CAPTURE_ENABLED) {
            socket.emit('network-status', { isCapturing: false, stats: null });
            return;
        }
        socket.emit('network-status', getCaptureStatus());
    });

    socket.on('set-probe-method', (method: ProbeMethod) => {
        console.log(`Request to change probe method to: ${method}`);
        if (method !== 'delete' && method !== 'reaction') {
            socket.emit('error', { message: 'Invalid probe method' });
            return;
        }

        globalProbeMethod = method;

        for (const entry of trackers.values()) {
            entry.tracker.setProbeMethod(method);
        }

        io.emit('probe-method', method);
        console.log(`Probe method changed to: ${method}`);
    });

    // ── Call IP Analyzer Socket events ──────────────────────────

    socket.on('start-call-capture', async (data: { interfaceAddr?: string; targetJid?: string; callId?: string; isVideo?: boolean; caseId?: string; operatorName?: string; authorizationNote?: string }) => {
        if (!LOCAL_CAPTURE_ENABLED) {
            socket.emit('error', { message: 'Local call traffic analysis is disabled in this deployment', mode: DEPLOYMENT_MODE });
            return;
        }
        const auditContext = parseCaptureAuditContext(data);
        if (!auditContext) {
            socketValidationError(socket, ['caseId, operatorName, and authorizationNote are required before call capture']);
            return;
        }
        const caseCheck = await checkCaseCanCapture(auditContext);
        if (!caseCheck.ok) {
            socket.emit('error', { status: caseCheck.status, ...caseCheck.payload });
            return;
        }
        const targetResult = normalizeOptionalJid(data.targetJid, 'manual');
        if (!targetResult.ok) {
            socketValidationError(socket, targetResult.errors || []);
            return;
        }
        const iface = cleanText(data.interfaceAddr, 200) || autoDetectInterface();
        if (!iface) {
            socket.emit('error', { message: 'No network interface available for capture' });
            return;
        }
        const cid = cleanText(data.callId, 120) || `manual-${Date.now()}`;
        const jid = targetResult.value!;
        const ok = startCallCapture(iface, jid, cid, data.isVideo || false, (packet) => {
            io.emit('call-packet', packet);
        });
        if (ok) {
            activeCallAuditContext = { ...auditContext, targetJid: jid, callId: cid };
            await linkEvidenceToCase(auditContext, 'call_analysis', cid, `Call capture ${cid}`, {
                interfaceAddr: iface,
                isVideo: data.isVideo || false,
                trigger: 'socket',
                status: 'started',
            }, jid);
            await auditEvent(auditContext, 'call_capture_start', 'call', {
                callId: cid,
                interfaceAddr: iface,
                isVideo: data.isVideo || false,
                trigger: 'socket',
            }, jid);
            io.emit('call-capture-started', { callId: cid, targetJid: jid });
            console.log(`[CALL] Manual capture started: ${cid} for ${jid}`);
        } else {
            socket.emit('error', { message: 'Failed to start call capture. Already capturing or run as administrator.' });
        }
    });

    socket.on('stop-call-capture', async () => {
        if (!LOCAL_CAPTURE_ENABLED) {
            socket.emit('error', { message: 'No local call capture is running in this deployment' });
            return;
        }
        const result = stopCallCapture();
        if (result) {
            io.emit('call-analysis', result);
            await saveCallAnalysis(result);
            if (activeCallAuditContext) {
                await linkEvidenceToCase(activeCallAuditContext, 'call_analysis', result.callId, `Call analysis ${result.callId}`, {
                    verdict: result.verdict,
                    totalPackets: result.totalPackets,
                    durationSec: result.durationSec,
                    candidateCount: result.candidateIps.filter(c => c.isP2P).length,
                    metaIpCount: result.metaIps.length,
                    status: 'completed',
                }, result.targetJid);
                await auditEvent(activeCallAuditContext, 'call_capture_stop', 'call', {
                    callId: result.callId,
                    verdict: result.verdict,
                    totalPackets: result.totalPackets,
                    durationSec: result.durationSec,
                    candidateCount: result.candidateIps.filter(c => c.isP2P).length,
                    metaIpCount: result.metaIps.length,
                    trigger: 'socket',
                }, result.targetJid);
                activeCallAuditContext = null;
            }
            console.log(`[CALL] Manual capture stopped. Verdict: ${result.verdict}`);
        } else {
            socket.emit('error', { message: 'No active call capture to stop' });
        }
    });

    socket.on('get-call-capture-status', () => {
        if (!LOCAL_CAPTURE_ENABLED) {
            socket.emit('call-capture-status', {
                isCapturing: false,
                targetJid: null,
                callId: null,
                startTime: null,
                packetsCollected: 0,
                elapsed: 0,
            });
            return;
        }
        socket.emit('call-capture-status', getCallCaptureStatus());
    });
});

httpServer.listen(PORT, () => {
    serverListeningForStartupAudit = true;
    logStartupConfiguration();
    bootLog('ok', 'Backend operational');
    tryRecordStartupAudit();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    for (const entry of trackers.values()) {
        entry.tracker.stopTracking();
    }
    await disconnectDB();
    process.exit(0);
});
