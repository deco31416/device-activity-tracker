/**
 * MongoDB Persistence Service
 *
 * Stores RTT measurements, contact info, and activity history
 * so data is not lost when the server restarts.
 */

import { MongoClient, Db, Collection } from 'mongodb';
import 'dotenv/config';

// Types
export interface MeasurementDoc {
    jid: string;
    rtt: number;
    avg: number;
    median: number;
    threshold: number;
    state: string;
    devices: Array<{
        jid: string;
        state: string;
        rtt: number;
        avg: number;
    }>;
    deviceCount: number;
    timestamp: Date;
}

export interface ContactDoc {
    jid: string;
    number: string;
    contactName: string;
    customName: string | null;
    profilePic: string | null;
    about: string | null;
    aboutSetAt: Date | null;
    isBusinessAccount: boolean;
    businessProfile: {
        description?: string;
        category?: string;
        website?: string;
        email?: string;
        address?: string;
    } | null;
    verifiedOnWhatsApp: boolean;
    pushName: string | null;
    addedAt: Date;
    lastSeen: Date;
    lastProfileUpdate: Date | null;
    isActive: boolean;
}

export interface SessionDoc {
    startedAt: Date;
    endedAt: Date | null;
    contactsTracked: string[];
}

// Singleton
let client: MongoClient | null = null;
let db: Db | null = null;

let measurements: Collection<MeasurementDoc>;
let contacts: Collection<ContactDoc>;
let sessions: Collection<SessionDoc>;

const MONGO_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'activity-tracker';

/**
 * Connect to MongoDB. Returns true if connected, false otherwise.
 * Silently fails if no URI is configured (runs without persistence).
 */
export async function connectDB(): Promise<boolean> {
    if (!MONGO_URI) {
        console.log('[DB] No MONGODB_URI configured — running without persistence');
        return false;
    }

    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);

        measurements = db.collection<MeasurementDoc>('measurements');
        contacts = db.collection<ContactDoc>('contacts');
        sessions = db.collection<SessionDoc>('sessions');

        // Create indexes for efficient queries
        await measurements.createIndex({ jid: 1, timestamp: -1 });
        await measurements.createIndex({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }); // TTL: 30 days
        await contacts.createIndex({ jid: 1 }, { unique: true });

        console.log('[DB] Connected to MongoDB');
        return true;
    } catch (err) {
        console.error('[DB] Failed to connect to MongoDB:', err);
        client = null;
        db = null;
        return false;
    }
}

/**
 * Check if DB is connected
 */
export function isDBConnected(): boolean {
    return db !== null;
}

/**
 * Save a single RTT measurement
 */
export async function saveMeasurement(data: Omit<MeasurementDoc, 'timestamp'>): Promise<void> {
    if (!db) return;
    try {
        await measurements.insertOne({
            ...data,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('[DB] Error saving measurement:', err);
    }
}

/**
 * Save/update contact info
 */
export async function saveContact(jid: string, number: string, contactName?: string, profilePic?: string | null, customName?: string | null): Promise<void> {
    if (!db) return;
    try {
        const setFields: any = {
            jid,
            number,
            ...(contactName && { contactName }),
            ...(profilePic !== undefined && { profilePic }),
            lastSeen: new Date()
        };
        // Only set customName if explicitly provided (not undefined)
        if (customName !== undefined) setFields.customName = customName;

        await contacts.updateOne(
            { jid },
            {
                $set: setFields,
                $setOnInsert: {
                    addedAt: new Date(),
                    about: null,
                    aboutSetAt: null,
                    isBusinessAccount: false,
                    businessProfile: null,
                    verifiedOnWhatsApp: true,
                    pushName: null,
                    customName: customName || null,
                    lastProfileUpdate: null,
                    isActive: true,
                }
            },
            { upsert: true }
        );
    } catch (err) {
        console.error('[DB] Error saving contact:', err);
    }
}

/**
 * Update custom name (alias) for a contact
 */
export async function updateCustomName(jid: string, customName: string | null): Promise<void> {
    if (!db) return;
    try {
        await contacts.updateOne(
            { jid },
            { $set: { customName, lastSeen: new Date() } }
        );
    } catch (err) {
        console.error('[DB] Error updating custom name:', err);
    }
}

/**
 * Update contact profile (about, business info, etc.)
 */
export async function updateContactProfile(jid: string, profile: {
    about?: string | null;
    aboutSetAt?: Date | null;
    isBusinessAccount?: boolean;
    businessProfile?: ContactDoc['businessProfile'];
    pushName?: string | null;
    profilePic?: string | null;
}): Promise<void> {
    if (!db) return;
    try {
        const updateFields: any = { lastProfileUpdate: new Date() };
        if (profile.about !== undefined) updateFields.about = profile.about;
        if (profile.aboutSetAt !== undefined) updateFields.aboutSetAt = profile.aboutSetAt;
        if (profile.isBusinessAccount !== undefined) updateFields.isBusinessAccount = profile.isBusinessAccount;
        if (profile.businessProfile !== undefined) updateFields.businessProfile = profile.businessProfile;
        if (profile.pushName !== undefined) updateFields.pushName = profile.pushName;
        if (profile.profilePic !== undefined) updateFields.profilePic = profile.profilePic;

        await contacts.updateOne({ jid }, { $set: updateFields });
    } catch (err) {
        console.error('[DB] Error updating contact profile:', err);
    }
}

/**
 * Get a single contact's full profile from the database
 */
export async function getContactProfile(jid: string): Promise<ContactDoc | null> {
    if (!db) return null;
    try {
        return await contacts.findOne({ jid });
    } catch (err) {
        console.error('[DB] Error fetching contact profile:', err);
        return null;
    }
}

/**
 * Get online activity patterns (hourly distribution)
 * Shows what hours of the day the contact is most active
 */
export async function getOnlinePatterns(jid: string): Promise<{
    hourly: Array<{ hour: number; total: number; online: number; pct: number }>;
    peakHour: number;
    avgSessionLength: number;
    totalOnlineMinutes: number;
}> {
    const empty = { hourly: [], peakHour: -1, avgSessionLength: 0, totalOnlineMinutes: 0 };
    if (!db) return empty;
    try {
        // Aggregate measurements by hour of day
        const pipeline = [
            { $match: { jid } },
            {
                $group: {
                    _id: { $hour: '$timestamp' },
                    total: { $sum: 1 },
                    online: {
                        $sum: {
                            $cond: [{ $regexMatch: { input: '$state', regex: /online/i } }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ];

        const results = await measurements.aggregate(pipeline).toArray();

        // Build full 24h array
        const hourly = Array.from({ length: 24 }, (_, h) => {
            const found = results.find((r: any) => r._id === h);
            const total = found ? found.total : 0;
            const online = found ? found.online : 0;
            return { hour: h, total, online, pct: total > 0 ? Math.round((online / total) * 100) : 0 };
        });

        // Find peak hour
        let peakHour = 0;
        let maxOnline = 0;
        for (const h of hourly) {
            if (h.online > maxOnline) {
                maxOnline = h.online;
                peakHour = h.hour;
            }
        }

        // Estimate online sessions = consecutive online measurements
        // Each measurement cycle is ~2-3 seconds (probe interval)
        const onlineDocs = await measurements
            .find({ jid, state: { $regex: /online/i } })
            .sort({ timestamp: 1 })
            .toArray();

        let sessions = 0;
        let totalOnlineSec = 0;
        let sessionStart: Date | null = null;
        let prevTimestamp: Date | null = null;

        for (const doc of onlineDocs) {
            if (!prevTimestamp || (doc.timestamp.getTime() - prevTimestamp.getTime()) > 30000) {
                // New session (gap > 30s)
                if (sessionStart && prevTimestamp) {
                    totalOnlineSec += (prevTimestamp.getTime() - sessionStart.getTime()) / 1000;
                }
                sessions++;
                sessionStart = doc.timestamp;
            }
            prevTimestamp = doc.timestamp;
        }
        // Close last session
        if (sessionStart && prevTimestamp) {
            totalOnlineSec += (prevTimestamp.getTime() - sessionStart.getTime()) / 1000;
        }

        const avgSessionLength = sessions > 0 ? Math.round(totalOnlineSec / sessions) : 0;
        const totalOnlineMinutes = Math.round(totalOnlineSec / 60);

        return { hourly, peakHour, avgSessionLength, totalOnlineMinutes };
    } catch (err) {
        console.error('[DB] Error fetching online patterns:', err);
        return empty;
    }
}

/**
 * Soft-delete a contact (mark as inactive but keep history)
 */
export async function removeContact(jid: string): Promise<void> {
    if (!db) return;
    try {
        await contacts.updateOne({ jid }, { $set: { isActive: false } });
    } catch (err) {
        console.error('[DB] Error removing contact:', err);
    }
}

/**
 * Re-activate a previously tracked contact
 */
export async function reactivateContact(jid: string): Promise<void> {
    if (!db) return;
    try {
        await contacts.updateOne({ jid }, { $set: { isActive: true, lastSeen: new Date() } });
    } catch (err) {
        console.error('[DB] Error reactivating contact:', err);
    }
}

/**
 * Get active contacts (for auto-restore on reconnection)
 * Contacts without isActive field are treated as active (backwards compat)
 */
export async function getActiveContacts(): Promise<ContactDoc[]> {
    if (!db) return [];
    try {
        return await contacts.find({ isActive: { $ne: false } }).toArray();
    } catch (err) {
        console.error('[DB] Error fetching active contacts:', err);
        return [];
    }
}

/**
 * Get recent measurements for a contact (last N entries)
 */
export async function getRecentMeasurements(jid: string, limit: number = 200): Promise<MeasurementDoc[]> {
    if (!db) return [];
    try {
        return await measurements
            .find({ jid })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray()
            .then(docs => docs.reverse()); // Return in chronological order
    } catch (err) {
        console.error('[DB] Error fetching measurements:', err);
        return [];
    }
}

/**
 * Get all saved contacts
 */
export async function getSavedContacts(): Promise<ContactDoc[]> {
    if (!db) return [];
    try {
        return await contacts.find().toArray();
    } catch (err) {
        console.error('[DB] Error fetching contacts:', err);
        return [];
    }
}

/**
 * Get measurement stats for a contact (summary)
 */
export async function getContactStats(jid: string): Promise<{
    totalMeasurements: number;
    firstSeen: Date | null;
    lastSeen: Date | null;
} | null> {
    if (!db) return null;
    try {
        const stats = await measurements.aggregate([
            { $match: { jid } },
            {
                $group: {
                    _id: '$jid',
                    totalMeasurements: { $sum: 1 },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' }
                }
            }
        ]).toArray();

        if (stats.length === 0) return null;
        return {
            totalMeasurements: stats[0].totalMeasurements,
            firstSeen: stats[0].firstSeen,
            lastSeen: stats[0].lastSeen
        };
    } catch (err) {
        console.error('[DB] Error fetching stats:', err);
        return null;
    }
}

/**
 * Log a session start
 */
export async function logSessionStart(): Promise<string | null> {
    if (!db) return null;
    try {
        const result = await sessions.insertOne({
            startedAt: new Date(),
            endedAt: null,
            contactsTracked: []
        });
        return result.insertedId.toString();
    } catch (err) {
        console.error('[DB] Error logging session:', err);
        return null;
    }
}

/**
 * Get activity state changes (transitions) for a contact
 */
export async function getActivityHistory(jid: string, limit: number = 50): Promise<Array<{
    state: string;
    timestamp: Date;
    rtt: number;
}>> {
    if (!db) return [];
    try {
        // Get measurements and detect state transitions
        const docs = await measurements
            .find({ jid })
            .sort({ timestamp: -1 })
            .limit(500)
            .toArray();

        if (docs.length === 0) return [];

        // Detect state transitions
        const transitions: Array<{ state: string; timestamp: Date; rtt: number }> = [];
        let prevState = '';

        // Process in chronological order
        for (const doc of docs.reverse()) {
            if (doc.state !== prevState) {
                transitions.push({
                    state: doc.state,
                    timestamp: doc.timestamp,
                    rtt: doc.rtt
                });
                prevState = doc.state;
            }
        }

        return transitions.slice(-limit);
    } catch (err) {
        console.error('[DB] Error fetching activity history:', err);
        return [];
    }
}

/**
 * Get state distribution (% time in each state)
 */
export async function getStateDistribution(jid: string): Promise<{
    online: number;
    standby: number;
    offline: number;
    totalMeasurements: number;
    firstSeen: Date | null;
    lastSeen: Date | null;
    lastOnline: Date | null;
    avgRtt: number;
}> {
    if (!db) return { online: 0, standby: 0, offline: 0, totalMeasurements: 0, firstSeen: null, lastSeen: null, lastOnline: null, avgRtt: 0 };
    try {
        const pipeline = [
            { $match: { jid } },
            {
                $group: {
                    _id: '$jid',
                    totalMeasurements: { $sum: 1 },
                    firstSeen: { $min: '$timestamp' },
                    lastSeen: { $max: '$timestamp' },
                    avgRtt: { $avg: '$rtt' },
                    states: { $push: '$state' }
                }
            }
        ];

        const result = await measurements.aggregate(pipeline).toArray();
        if (result.length === 0) return { online: 0, standby: 0, offline: 0, totalMeasurements: 0, firstSeen: null, lastSeen: null, lastOnline: null, avgRtt: 0 };

        const r = result[0];
        const states = r.states as string[];
        const total = states.length;

        const onlineCount = states.filter((s: string) => s.includes('Online')).length;
        const offlineCount = states.filter((s: string) => s === 'OFFLINE').length;
        const standbyCount = total - onlineCount - offlineCount;

        // Find last online timestamp
        const lastOnlineDoc = await measurements
            .find({ jid, state: { $regex: /online/i } })
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();

        return {
            online: total > 0 ? Math.round((onlineCount / total) * 100) : 0,
            standby: total > 0 ? Math.round((standbyCount / total) * 100) : 0,
            offline: total > 0 ? Math.round((offlineCount / total) * 100) : 0,
            totalMeasurements: total,
            firstSeen: r.firstSeen,
            lastSeen: r.lastSeen,
            lastOnline: lastOnlineDoc.length > 0 ? lastOnlineDoc[0].timestamp : null,
            avgRtt: Math.round(r.avgRtt || 0)
        };
    } catch (err) {
        console.error('[DB] Error fetching state distribution:', err);
        return { online: 0, standby: 0, offline: 0, totalMeasurements: 0, firstSeen: null, lastSeen: null, lastOnline: null, avgRtt: 0 };
    }
}

/**
 * Generate a comprehensive report for a contact
 * Includes profile, stats, activity patterns, and recent measurements
 */
export async function generateReport(jid: string): Promise<{
    generatedAt: Date;
    contact: ContactDoc | null;
    stats: Awaited<ReturnType<typeof getStateDistribution>>;
    patterns: Awaited<ReturnType<typeof getOnlinePatterns>>;
    activityHistory: Awaited<ReturnType<typeof getActivityHistory>>;
    recentMeasurements: MeasurementDoc[];
    summary: {
        trackingDuration: string;
        totalDataPoints: number;
        avgResponseTime: number;
        onlinePercentage: number;
        peakActivityHour: string;
        estimatedDailyUsage: string;
    };
}> {
    const [contact, stats, patterns, activity, recent] = await Promise.all([
        getContactProfile(jid),
        getStateDistribution(jid),
        getOnlinePatterns(jid),
        getActivityHistory(jid, 200),
        getRecentMeasurements(jid, 500),
    ]);

    // Calculate tracking duration
    const firstSeen = stats.firstSeen ? new Date(stats.firstSeen) : new Date();
    const lastSeen = stats.lastSeen ? new Date(stats.lastSeen) : new Date();
    const durationMs = lastSeen.getTime() - firstSeen.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationDays = durationHours / 24;

    let trackingDuration = '';
    if (durationDays >= 1) {
        trackingDuration = `${Math.floor(durationDays)}d ${Math.floor(durationHours % 24)}h`;
    } else {
        trackingDuration = `${Math.floor(durationHours)}h ${Math.floor((durationMs / 60000) % 60)}m`;
    }

    // Peak activity hour formatted
    const peakHour = patterns.peakHour >= 0 ? `${patterns.peakHour}:00 - ${patterns.peakHour + 1}:00` : 'N/A';

    // Estimated daily usage
    const totalMinutes = patterns.totalOnlineMinutes;
    const monitoredDays = Math.max(1, durationDays);
    const dailyMinutes = Math.round(totalMinutes / monitoredDays);
    const estimatedDailyUsage = dailyMinutes > 60
        ? `${Math.floor(dailyMinutes / 60)}h ${dailyMinutes % 60}m`
        : `${dailyMinutes}m`;

    return {
        generatedAt: new Date(),
        contact,
        stats,
        patterns,
        activityHistory: activity,
        recentMeasurements: recent,
        summary: {
            trackingDuration,
            totalDataPoints: stats.totalMeasurements,
            avgResponseTime: stats.avgRtt,
            onlinePercentage: stats.online,
            peakActivityHour: peakHour,
            estimatedDailyUsage,
        },
    };
}

/**
 * Graceful disconnect
 */
export async function disconnectDB(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('[DB] Disconnected from MongoDB');
    }
}
