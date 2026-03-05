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
import { connectDB, saveMeasurement, saveContact, removeContact, reactivateContact, getRecentMeasurements, getSavedContacts, getActiveContacts, getActivityHistory, getStateDistribution, updateContactProfile, updateCustomName, getContactProfile, getOnlinePatterns, generateReport, disconnectDB } from './db.js';
import { listInterfaces, startCapture, stopCapture, getCaptureStatus, getRecentPackets, updateFilter, exportJSON, exportCSV, CaptureFilter, PacketMeta } from './packet-capture.js';
import { initAnalytics, getFullIntelligence, getDailyRoutine, getAvailabilityProfile, getSessionStats, getWeeklyHeatmap, getHabitProfile, getCorrelation } from './analytics.js';

// Configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

let sock: any;
let isWhatsAppConnected = false;
let globalProbeMethod: ProbeMethod = 'delete'; // Default to delete method
let currentWhatsAppQr: string | null = null; // Store current QR code for new clients

interface TrackerEntry {
    tracker: WhatsAppTracker;
}

const trackers: Map<string, TrackerEntry> = new Map(); // JID -> Tracker entry

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
}

// Initialize DB, Analytics, and WhatsApp
(async () => {
    await connectDB();
    await initAnalytics();
    connectToWhatsApp();
})();

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

                tracker.onUpdate = (updateData) => {
                    io.emit('tracker-update', { jid: contact.jid, ...updateData });

                    if (updateData.median !== undefined && updateData.devices) {
                        saveMeasurement({
                            jid: contact.jid,
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
    const limit = parseInt(req.query.limit as string) || 200;
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
    const limit = parseInt(req.query.limit as string) || 50;
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
        const days = parseInt(req.query.days as string) || 14;
        const intel = await getFullIntelligence(req.params.jid, days);
        res.json(intel);
    } catch (err) {
        console.error('[API] Intel error:', err);
        res.status(500).json({ error: 'Failed to generate intelligence report' });
    }
});

app.get('/api/intel/:jid/routine', async (req, res) => {
    const days = parseInt(req.query.days as string) || 14;
    res.json(await getDailyRoutine(req.params.jid, days));
});

app.get('/api/intel/:jid/availability', async (req, res) => {
    const days = parseInt(req.query.days as string) || 14;
    res.json(await getAvailabilityProfile(req.params.jid, days));
});

app.get('/api/intel/:jid/sessions', async (req, res) => {
    const days = parseInt(req.query.days as string) || 14;
    res.json(await getSessionStats(req.params.jid, days));
});

app.get('/api/intel/:jid/heatmap', async (req, res) => {
    const weeks = parseInt(req.query.weeks as string) || 4;
    res.json(await getWeeklyHeatmap(req.params.jid, weeks));
});

app.get('/api/intel/:jid/habits', async (req, res) => {
    const days = parseInt(req.query.days as string) || 14;
    res.json(await getHabitProfile(req.params.jid, days));
});

app.get('/api/intel/correlation', async (req, res) => {
    const { jid1, jid2, days } = req.query;
    if (!jid1 || !jid2) return res.status(400).json({ error: 'jid1 and jid2 required' });
    const d = parseInt(days as string) || 7;
    res.json(await getCorrelation(jid1 as string, jid2 as string, d));
});

// ── Network Monitor REST endpoints ────────────────────────────

app.put('/api/contact/:jid/custom-name', async (req, res) => {
    try {
        const jid = req.params.jid;
        const { customName } = req.body || {};
        const trimmed = typeof customName === 'string' ? customName.trim() || null : null;
        console.log(`[CUSTOM NAME REST] ${jid} → "${trimmed}"`);
        await updateCustomName(jid, trimmed);
        io.emit('custom-name-updated', { jid, customName: trimmed });
        res.json({ ok: true, jid, customName: trimmed });
    } catch (err) {
        console.error('[API] Error setting custom name:', err);
        res.status(500).json({ error: 'Failed to set custom name' });
    }
});

app.get('/api/network/interfaces', (_req, res) => {
    res.json(listInterfaces());
});

app.get('/api/network/status', (_req, res) => {
    res.json(getCaptureStatus());
});

app.get('/api/network/packets', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(getRecentPackets(limit));
});

app.get('/api/network/export/json', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=packets-${Date.now()}.json`);
    res.send(exportJSON(limit));
});

app.get('/api/network/export/csv', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=packets-${Date.now()}.csv`);
    res.send(exportCSV(limit));
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

    // Send tracked contacts
    const trackedContacts = Array.from(trackers.keys());

    // Handle request to get tracked contacts (for page refresh)
    socket.on('get-tracked-contacts', () => {
        const trackedContacts = Array.from(trackers.keys());
        socket.emit('tracked-contacts', trackedContacts);
    });

    // Add contact - WhatsApp only
    socket.on('add-contact', async (data: string | { number: string; customName?: string }) => {
        const number = typeof data === 'string' ? data : data.number;
        const customName = (typeof data === 'object' && data.customName?.trim()) ? data.customName.trim() : null;

        console.log(`Request to track: ${number}${customName ? ` (alias: ${customName})` : ''}`);
        const cleanNumber = number.replace(/\D/g, '');

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

                tracker.onUpdate = (updateData) => {
                    io.emit('tracker-update', {
                        jid: result.jid,
                        ...updateData
                    });

                    // Persist measurement to MongoDB
                    if (updateData.median !== undefined && updateData.devices) {
                        saveMeasurement({
                            jid: result.jid,
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
                });

                io.emit('profile-pic', { jid: result.jid, url: ppUrl });
                io.emit('contact-name', { jid: result.jid, name: displayName });

                // Persist contact to MongoDB (with custom name)
                saveContact(result.jid, cleanNumber, contactName, ppUrl, customName);

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
        const trimmed = customName?.trim() || null;
        console.log(`[CUSTOM NAME] ${jid} → "${trimmed}"`);
        await updateCustomName(jid, trimmed);
        // Broadcast to all clients so the name updates everywhere
        io.emit('custom-name-updated', { jid, customName: trimmed });
    });

    // Re-activate a previously tracked contact from history
    socket.on('reactivate-contact', async (jid: string) => {
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

    socket.on('network-start', (data: { interfaceAddr: string; filter?: CaptureFilter }) => {
        console.log(`[NETWORK] Start capture on ${data.interfaceAddr}`);
        const ok = startCapture(data.interfaceAddr, data.filter || {}, (packet: PacketMeta) => {
            io.emit('network-packet', packet);
        });
        socket.emit('network-status', getCaptureStatus());
        if (!ok) {
            socket.emit('error', { message: 'Failed to start capture. Run as administrator.' });
        }
    });

    socket.on('network-stop', () => {
        stopCapture();
        socket.emit('network-status', getCaptureStatus());
        console.log('[NETWORK] Capture stopped by client');
    });

    socket.on('network-filter', (filter: CaptureFilter) => {
        updateFilter(filter);
    });

    socket.on('network-get-status', () => {
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
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
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
