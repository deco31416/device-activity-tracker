import React, { useEffect, useState, useCallback } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell } from 'recharts';
import { Square, Activity, Wifi, Smartphone, Monitor, Clock, Database, BarChart3, History, TrendingUp, User, Briefcase, Globe, Mail, MapPin, Sun, Moon, Zap, FileDown, FileText, Code, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import clsx from 'clsx';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface TrackerData {
    rtt: number;
    avg: number;
    median: number;
    threshold: number;
    state: string;
    timestamp: number;
}

interface DeviceInfo {
    jid: string;
    state: string;
    rtt: number;
    avg: number;
}

interface StatsData {
    online: number;
    standby: number;
    offline: number;
    totalMeasurements: number;
    firstSeen: string | null;
    lastSeen: string | null;
    lastOnline: string | null;
    avgRtt: number;
}

interface ActivityEntry {
    state: string;
    timestamp: string;
    rtt: number;
}

interface ProfileData {
    jid: string;
    number: string;
    contactName: string | null;
    profilePic: string | null;
    about: string | null;
    aboutSetAt: string | null;
    isBusinessAccount: boolean;
    businessProfile: {
        description?: string;
        category?: string;
        website?: string;
        email?: string;
        address?: string;
    } | null;
    pushName: string | null;
    addedAt: string | null;
    lastSeen: string | null;
    lastProfileUpdate: string | null;
    verifiedOnWhatsApp: boolean;
}

interface PatternsData {
    hourly: Array<{ hour: number; total: number; online: number; pct: number }>;
    peakHour: number;
    avgSessionLength: number;
    totalOnlineMinutes: number;
}

interface ContactCardProps {
    jid: string;
    displayNumber: string;
    data: TrackerData[];
    devices: DeviceInfo[];
    deviceCount: number;
    presence: string | null;
    profilePic: string | null;
    onRemove: () => void;
    privacyMode?: boolean;
}

export function ContactCard({
    jid,
    displayNumber,
    data,
    devices,
    deviceCount,
    presence,
    profilePic,
    onRemove,
    privacyMode = false
}: ContactCardProps) {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [activity, setActivity] = useState<ActivityEntry[]>([]);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [patterns, setPatterns] = useState<PatternsData | null>(null);
    const [activePanel, setActivePanel] = useState<'chart' | 'stats' | 'activity' | 'profile'>('chart');
    const [profileLoading, setProfileLoading] = useState(false);
    const [logPage, setLogPage] = useState(1);
    const LOG_PAGE_SIZE = 15;

    const lastData = data[data.length - 1];
    const currentStatus = devices.length > 0
        ? (devices.find(d => d.state === 'OFFLINE')?.state ||
            devices.find(d => d.state.includes('Online'))?.state ||
            devices[0].state)
        : 'Unknown';

    const blurredNumber = privacyMode ? displayNumber.replace(/\d/g, '•') : displayNumber;

    const statusColor = currentStatus === 'OFFLINE' ? 'danger'
        : currentStatus.includes('Online') ? 'success'
        : currentStatus === 'Standby' ? 'warning' : 'neutral';

    const statusConfig = {
        success: { badge: 'badge-success', dot: 'bg-success', glow: 'glow-success' },
        danger: { badge: 'badge-danger', dot: 'bg-danger', glow: 'glow-danger' },
        warning: { badge: 'badge-warning', dot: 'bg-warning', glow: '' },
        neutral: { badge: 'badge-neutral', dot: 'bg-txt-dim', glow: '' },
    }[statusColor];

    // Fetch stats from MongoDB
    const fetchStats = useCallback(() => {
        fetch(`${API_URL}/api/stats/${encodeURIComponent(jid)}`)
            .then(r => r.json())
            .then(setStats)
            .catch(console.error);
    }, [jid]);

    const fetchActivity = useCallback(() => {
        fetch(`${API_URL}/api/activity/${encodeURIComponent(jid)}?limit=30`)
            .then(r => r.json())
            .then(setActivity)
            .catch(console.error);
    }, [jid]);

    const fetchProfile = useCallback(() => {
        setProfileLoading(true);
        fetch(`${API_URL}/api/profile/${encodeURIComponent(jid)}`)
            .then(r => r.json())
            .then((data) => {
                setProfile(data);
                setProfileLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setProfileLoading(false);
            });
    }, [jid]);

    const fetchPatterns = useCallback(() => {
        fetch(`${API_URL}/api/patterns/${encodeURIComponent(jid)}`)
            .then(r => r.json())
            .then(setPatterns)
            .catch(console.error);
    }, [jid]);

    // Load stats on mount and periodically
    useEffect(() => {
        fetchStats();
        fetchActivity();
        const interval = setInterval(() => {
            fetchStats();
            fetchActivity();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchStats, fetchActivity]);

    // Load profile and patterns when those tabs are activated
    useEffect(() => {
        if (activePanel === 'profile') {
            fetchProfile();
            fetchPatterns();
        }
    }, [activePanel, fetchProfile, fetchPatterns]);

    const formatTime = (ts: string | null) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDateTime = (ts: string | null) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return `${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const timeAgo = (ts: string | null) => {
        if (!ts) return '—';
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Justo ahora';
        if (mins < 60) return `hace ${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `hace ${hrs}h ${mins % 60}m`;
        const days = Math.floor(hrs / 24);
        return `hace ${days}d`;
    };

    const formatHour = (h: number) => {
        if (h === 0) return '12am';
        if (h < 12) return `${h}am`;
        if (h === 12) return '12pm';
        return `${h - 12}pm`;
    };

    const formatSeconds = (s: number) => {
        if (s < 60) return `${s}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // ── Bitácora helpers ──────────────────────────────────────
    const toMilitary = (ts: string | number) => {
        const d = new Date(typeof ts === 'number' ? ts : ts);
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        const ss = String(d.getUTCSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    };

    const toMilitaryLocal = (ts: string | number) => {
        const d = new Date(typeof ts === 'number' ? ts : ts);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    };

    const toDateStr = (ts: string | number) => {
        const d = new Date(typeof ts === 'number' ? ts : ts);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const describeState = (state: string, rtt: number): string => {
        if (state.includes('Online')) return `📱 El contacto se CONECTÓ — Dispositivo activo (respuesta: ${rtt}ms)`;
        if (state === 'Standby') return `💤 El contacto pasó a ESPERA — App abierta en segundo plano (respuesta: ${rtt}ms)`;
        if (state === 'OFFLINE') return `🔴 El contacto se DESCONECTÓ — No hay actividad detectada`;
        return `⚪ Estado cambiado a ${state} (respuesta: ${rtt}ms)`;
    };

    const describeStateShort = (state: string): string => {
        if (state.includes('Online')) return 'CONECTADO';
        if (state === 'Standby') return 'EN ESPERA';
        if (state === 'OFFLINE') return 'DESCONECTADO';
        return state;
    };

    // Build bitácora entries from activity data
    const bitacoraEntries = activity.slice().reverse().map((entry) => ({
        utc: toMilitary(entry.timestamp),
        local: toMilitaryLocal(entry.timestamp),
        date: toDateStr(entry.timestamp),
        rawTimestamp: entry.timestamp,
        state: entry.state,
        stateLabel: describeStateShort(entry.state),
        description: describeState(entry.state, entry.rtt),
        rtt: entry.rtt,
    }));

    const totalLogPages = Math.max(1, Math.ceil(bitacoraEntries.length / LOG_PAGE_SIZE));
    const pagedEntries = bitacoraEntries.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE);

    // Export functions
    const exportBitacoraJSON = () => {
        const data = {
            contact: privacyMode ? '***' : displayNumber,
            jid: privacyMode ? '***' : jid,
            generatedAt: new Date().toISOString(),
            totalEvents: bitacoraEntries.length,
            events: bitacoraEntries.map(e => ({
                utc: e.utc,
                local: e.local,
                date: e.date,
                state: e.stateLabel,
                description: e.description,
                rtt_ms: e.rtt,
            })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `bitacora-${displayNumber}-${new Date().toISOString().slice(0, 10)}.json`);
    };

    const exportBitacoraHTML = () => {
        const rows = bitacoraEntries.map(e => {
            const color = e.state.includes('Online') ? '#22c55e' : e.state === 'Standby' ? '#eab308' : e.state === 'OFFLINE' ? '#ef4444' : '#94a3b8';
            return `<tr>
                <td style="padding:8px;font-family:monospace;white-space:nowrap">${e.date}</td>
                <td style="padding:8px;font-family:monospace;white-space:nowrap">${e.local} (${e.utc} UTC)</td>
                <td style="padding:8px;color:${color};font-weight:600">${e.stateLabel}</td>
                <td style="padding:8px">${e.description}</td>
            </tr>`;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Bitácora - ${privacyMode ? '***' : displayNumber}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#070b18;color:#f1f5f9;padding:40px}
h1{font-size:20px;color:#7c3aed;margin-bottom:4px}
.meta{color:#64748b;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;background:#0f1629;border-radius:12px;overflow:hidden}
th{background:#1e2545;padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:1px}
td{border-bottom:1px solid #1e2545;font-size:13px}
tr:hover{background:#141b2d}
.footer{margin-top:20px;color:#475569;font-size:11px;text-align:center}
</style></head><body>
<h1>📋 Bitácora de Actividad</h1>
<div class="meta">Contacto: ${privacyMode ? '***' : displayNumber} · Generado: ${new Date().toLocaleString('es-MX')} · Total eventos: ${bitacoraEntries.length}</div>
<table><thead><tr><th>Fecha</th><th>Hora (Local / UTC)</th><th>Estado</th><th>Descripción</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Device Activity Tracker v2.0.0 · @deco31416</div>
</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        downloadBlob(blob, `bitacora-${displayNumber}-${new Date().toISOString().slice(0, 10)}.html`);
    };

    const exportBitacoraPDF = () => {
        // Generate a print-friendly HTML and open print dialog
        const rows = bitacoraEntries.map(e => {
            const color = e.state.includes('Online') ? '#16a34a' : e.state === 'Standby' ? '#ca8a04' : e.state === 'OFFLINE' ? '#dc2626' : '#64748b';
            return `<tr>
                <td style="padding:6px 8px;font-family:monospace;font-size:11px;white-space:nowrap;border-bottom:1px solid #e2e8f0">${e.date}</td>
                <td style="padding:6px 8px;font-family:monospace;font-size:11px;white-space:nowrap;border-bottom:1px solid #e2e8f0">${e.local}<br/><span style="color:#94a3b8;font-size:9px">${e.utc} UTC</span></td>
                <td style="padding:6px 8px;color:${color};font-weight:700;font-size:11px;border-bottom:1px solid #e2e8f0">${e.stateLabel}</td>
                <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e2e8f0">${e.description}</td>
            </tr>`;
        }).join('\n');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bitácora ${displayNumber}</title>
<style>@media print{body{margin:0}}body{font-family:system-ui,sans-serif;padding:20px;color:#1e293b}
h1{font-size:16px;margin-bottom:2px}
.meta{color:#64748b;font-size:11px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f1f5f9;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #cbd5e1}
</style></head><body>
<h1>📋 Bitácora de Actividad</h1>
<div class="meta">Contacto: ${privacyMode ? '***' : displayNumber} · ${new Date().toLocaleString('es-MX')} · ${bitacoraEntries.length} eventos</div>
<table><thead><tr><th>Fecha</th><th>Hora</th><th>Estado</th><th>Descripción</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            setTimeout(() => w.print(), 500);
        }
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Profile pic */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-overlay border border-surface-border">
                            {profilePic ? (
                                <img
                                    src={profilePic}
                                    alt="Profile"
                                    className={clsx(
                                        "w-full h-full object-cover",
                                        privacyMode && "blur-xl scale-110"
                                    )}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-txt-dim">
                                    <Smartphone size={18} />
                                </div>
                            )}
                        </div>
                        <div className={clsx(
                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-raised",
                            statusConfig.dot
                        )} />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-txt-primary">{blurredNumber}</h3>
                            {profile?.pushName && !privacyMode && (
                                <span className="text-[11px] text-txt-muted">({profile.pushName})</span>
                            )}
                            {profile?.isBusinessAccount && (
                                <span className="badge-neutral !text-[9px] !py-0 !px-1.5 flex items-center gap-0.5">
                                    <Briefcase size={9} /> Business
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={statusConfig.badge}>
                                {currentStatus}
                            </span>
                            {profile?.about && !privacyMode && (
                                <span className="text-[10px] text-txt-dim italic truncate max-w-[200px]">
                                    "{profile.about}"
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Last online indicator */}
                    {stats?.lastOnline && (
                        <div className="hidden sm:flex items-center gap-1.5 ml-4 px-3 py-1 rounded-lg bg-surface-overlay border border-surface-border">
                            <Clock size={12} className="text-success" />
                            <span className="text-[11px] text-txt-muted">
                                Último Online: <span className="text-txt-secondary font-medium">{timeAgo(stats.lastOnline)}</span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href={`${API_URL}/api/report/${encodeURIComponent(jid)}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost flex items-center gap-1.5 !text-xs !py-1.5 !px-3"
                        title="Download full report"
                    >
                        <FileDown size={12} /> Report
                    </a>
                    <button onClick={onRemove} className="btn-danger flex items-center gap-1.5 !text-xs !py-1.5 !px-3">
                        <Square size={12} /> Stop
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* ── Left: Status Panel ── */}
                    <div className="space-y-4">
                        {/* Status card */}
                        <div className="bg-surface-overlay rounded-xl border border-surface-border p-5 text-center">
                            <div className="relative mx-auto mb-4 w-24 h-24">
                                <div className={clsx(
                                    "w-24 h-24 rounded-2xl overflow-hidden bg-surface-hover border-2",
                                    statusColor === 'success' ? 'border-success/30' :
                                    statusColor === 'danger' ? 'border-danger/30' :
                                    statusColor === 'warning' ? 'border-warning/30' : 'border-surface-border'
                                )}>
                                    {profilePic ? (
                                        <img
                                            src={profilePic}
                                            alt="Profile"
                                            className={clsx(
                                                "w-full h-full object-cover",
                                                privacyMode && "blur-xl scale-110 contrast-75"
                                            )}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-txt-dim">
                                            <Smartphone size={32} />
                                        </div>
                                    )}
                                </div>
                                <div className={clsx(
                                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-surface-overlay",
                                    statusConfig.dot
                                )} />
                            </div>

                            <h4 className="text-base font-bold text-txt-primary mb-1">{blurredNumber}</h4>
                            {profile?.pushName && !privacyMode && (
                                <p className="text-xs text-txt-muted mb-1">{profile.pushName}</p>
                            )}
                            {profile?.about && !privacyMode && (
                                <p className="text-[11px] text-txt-dim italic mb-3 px-2 truncate">"{profile.about}"</p>
                            )}

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center text-txt-secondary">
                                    <span className="flex items-center gap-1.5"><Wifi size={14} className="text-txt-dim" /> Status</span>
                                    <span className="font-medium text-txt-primary">{presence || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between items-center text-txt-secondary">
                                    <span className="flex items-center gap-1.5"><Smartphone size={14} className="text-txt-dim" /> Devices</span>
                                    <span className="font-medium text-txt-primary">{deviceCount || 0}</span>
                                </div>
                                {stats?.lastOnline && (
                                    <div className="flex justify-between items-center text-txt-secondary">
                                        <span className="flex items-center gap-1.5"><Clock size={14} className="text-success" /> Last Online</span>
                                        <span className="font-medium text-success">{formatTime(stats.lastOnline)}</span>
                                    </div>
                                )}
                                {stats && stats.totalMeasurements > 0 && (
                                    <div className="flex justify-between items-center text-txt-secondary">
                                        <span className="flex items-center gap-1.5"><Database size={14} className="text-txt-dim" /> Registros</span>
                                        <span className="font-medium text-txt-primary">{stats.totalMeasurements.toLocaleString()}</span>
                                    </div>
                                )}
                                {stats?.firstSeen && (
                                    <div className="flex justify-between items-center text-txt-secondary">
                                        <span className="flex items-center gap-1.5"><History size={14} className="text-txt-dim" /> Tracking</span>
                                        <span className="font-medium text-txt-primary text-[11px]">{formatDateTime(stats.firstSeen)}</span>
                                    </div>
                                )}
                                {profile?.isBusinessAccount && (
                                    <div className="flex justify-between items-center text-txt-secondary">
                                        <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-accent" /> Tipo</span>
                                        <span className="font-medium text-accent text-[11px]">Business</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* State Distribution Bar */}
                        {stats && stats.totalMeasurements > 0 && (
                            <div className="bg-surface-overlay rounded-xl border border-surface-border p-4">
                                <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-3">Distribución de Estado</h5>

                                <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-hover mb-3">
                                    {stats.online > 0 && (
                                        <div className="bg-success h-full transition-all" style={{ width: `${stats.online}%` }} />
                                    )}
                                    {stats.standby > 0 && (
                                        <div className="bg-warning h-full transition-all" style={{ width: `${stats.standby}%` }} />
                                    )}
                                    {stats.offline > 0 && (
                                        <div className="bg-danger h-full transition-all" style={{ width: `${stats.offline}%` }} />
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                                    <div>
                                        <div className="w-2 h-2 rounded-full bg-success mx-auto mb-1" />
                                        <span className="text-success font-bold">{stats.online}%</span>
                                        <p className="text-txt-dim">Online</p>
                                    </div>
                                    <div>
                                        <div className="w-2 h-2 rounded-full bg-warning mx-auto mb-1" />
                                        <span className="text-warning font-bold">{stats.standby}%</span>
                                        <p className="text-txt-dim">Standby</p>
                                    </div>
                                    <div>
                                        <div className="w-2 h-2 rounded-full bg-danger mx-auto mb-1" />
                                        <span className="text-danger font-bold">{stats.offline}%</span>
                                        <p className="text-txt-dim">Offline</p>
                                    </div>
                                </div>

                                {stats.avgRtt > 0 && (
                                    <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                                        <span className="text-txt-muted flex items-center gap-1"><TrendingUp size={12} /> RTT Promedio</span>
                                        <span className="font-bold text-accent">{stats.avgRtt} ms</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Device list */}
                        {devices.length > 0 && (
                            <div className="bg-surface-overlay rounded-xl border border-surface-border p-4">
                                <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-3">Devices</h5>
                                <div className="space-y-1.5">
                                    {devices.map((device, idx) => {
                                        const dColor = device.state === 'OFFLINE' ? 'danger'
                                            : device.state.includes('Online') ? 'success'
                                            : device.state === 'Standby' ? 'warning' : 'neutral';
                                        return (
                                            <div key={device.jid} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-hover transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <Monitor size={13} className="text-txt-dim" />
                                                    <span className="text-xs text-txt-secondary">Device {idx + 1}</span>
                                                </div>
                                                <span className={`badge-${dColor} !text-[10px] !py-0.5 !px-2`}>
                                                    {device.state}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right: Metrics + Panels ── */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Metric cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <MetricCard
                                label="Current Avg RTT"
                                value={lastData?.avg.toFixed(0) || '—'}
                                unit="ms"
                                icon={<Activity size={16} />}
                                color="accent"
                            />
                            <MetricCard
                                label="Median (50)"
                                value={lastData?.median.toFixed(0) || '—'}
                                unit="ms"
                                icon={<Activity size={16} />}
                                color="success"
                            />
                            <MetricCard
                                label="Threshold"
                                value={lastData?.threshold.toFixed(0) || '—'}
                                unit="ms"
                                icon={<Activity size={16} />}
                                color="warning"
                            />
                        </div>

                        {/* Panel tabs */}
                        <div className="flex gap-1 bg-surface-overlay rounded-lg p-1 border border-surface-border">
                            {([
                                { key: 'chart', label: 'RTT Chart', icon: <BarChart3 size={13} /> },
                                { key: 'activity', label: 'Activity', icon: <History size={13} /> },
                                { key: 'stats', label: 'Stats', icon: <Database size={13} /> },
                                { key: 'profile', label: 'Profile', icon: <User size={13} /> },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActivePanel(tab.key)}
                                    className={clsx(
                                        "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                                        activePanel === tab.key
                                            ? 'bg-accent/20 text-accent'
                                            : 'text-txt-muted hover:text-txt-secondary'
                                    )}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* RTT Chart Panel */}
                        {activePanel === 'chart' && (
                            <>
                            <div className="bg-surface-overlay rounded-xl border border-surface-border p-5 h-[300px]">
                                <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4">RTT History & Threshold</h5>
                                <ResponsiveContainer width="100%" height="85%">
                                    <AreaChart data={data}>
                                        <defs>
                                            <linearGradient id={`grad-${jid}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(30,37,69,0.8)" />
                                        <XAxis dataKey="timestamp" hide />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            labelFormatter={(label) => new Date(Number(label)).toLocaleTimeString()}
                                            contentStyle={{
                                                backgroundColor: '#0f1629',
                                                border: '1px solid #1e2545',
                                                borderRadius: '12px',
                                                color: '#f1f5f9',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                            }}
                                            itemStyle={{ color: '#94a3b8' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="avg"
                                            stroke="#7c3aed"
                                            strokeWidth={2}
                                            fill={`url(#grad-${jid})`}
                                            dot={false}
                                            name="Avg RTT"
                                            isAnimationActive={false}
                                        />
                                        <Line
                                            type="step"
                                            dataKey="threshold"
                                            stroke="#ef4444"
                                            strokeDasharray="6 4"
                                            strokeWidth={1.5}
                                            dot={false}
                                            name="Threshold"
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* ═══ BITÁCORA EN TIEMPO REAL ═══ */}
                            <div className="bg-surface-overlay rounded-xl border border-surface-border overflow-hidden">
                                {/* Header */}
                                <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-accent" />
                                        <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Bitácora de Actividad</h5>
                                        <span className="badge-neutral !text-[9px] !py-0 !px-1.5">{bitacoraEntries.length} eventos</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={exportBitacoraJSON} className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1" title="Exportar JSON">
                                            <Code size={10} /> JSON
                                        </button>
                                        <button onClick={exportBitacoraHTML} className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1" title="Exportar HTML">
                                            <Globe size={10} /> HTML
                                        </button>
                                        <button onClick={exportBitacoraPDF} className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1" title="Imprimir / PDF">
                                            <FileDown size={10} /> PDF
                                        </button>
                                        <a
                                            href={`${API_URL}/api/report/${encodeURIComponent(jid)}/download`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1"
                                            title="Reporte completo"
                                        >
                                            <Download size={10} /> Full
                                        </a>
                                    </div>
                                </div>

                                {/* Table */}
                                {bitacoraEntries.length === 0 ? (
                                    /* Skeleton loading */
                                    <div className="p-4 space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                                <div className="w-16 h-4 bg-surface-hover rounded" />
                                                <div className="w-16 h-4 bg-surface-hover rounded" />
                                                <div className="w-20 h-4 bg-surface-hover rounded" />
                                                <div className="flex-1 h-4 bg-surface-hover rounded" />
                                            </div>
                                        ))}
                                        <p className="text-center text-[10px] text-txt-dim mt-2">Esperando cambios de estado...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Table header */}
                                        <div className="grid grid-cols-[80px_90px_100px_1fr] gap-0 px-5 py-2 bg-surface-hover text-[10px] font-semibold text-txt-dim uppercase tracking-wider">
                                            <span>Fecha</span>
                                            <span>Hora</span>
                                            <span>Estado</span>
                                            <span>Descripción</span>
                                        </div>

                                        {/* Rows */}
                                        <div className="divide-y divide-surface-border">
                                            {pagedEntries.map((entry, idx) => {
                                                const rowColor = entry.state.includes('Online') ? 'text-success'
                                                    : entry.state === 'Standby' ? 'text-warning'
                                                    : entry.state === 'OFFLINE' ? 'text-danger' : 'text-txt-secondary';
                                                const bgHover = entry.state.includes('Online') ? 'hover:bg-success/5'
                                                    : entry.state === 'OFFLINE' ? 'hover:bg-danger/5'
                                                    : 'hover:bg-surface-hover';

                                                return (
                                                    <div
                                                        key={`${entry.rawTimestamp}-${idx}`}
                                                        className={`grid grid-cols-[80px_90px_100px_1fr] gap-0 px-5 py-2.5 transition-colors ${bgHover}`}
                                                    >
                                                        <span className="text-[11px] font-mono text-txt-dim">{entry.date}</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-mono text-txt-secondary font-medium">{entry.local}</span>
                                                            <span className="text-[9px] font-mono text-txt-dim">{entry.utc} UTC</span>
                                                        </div>
                                                        <span className={`text-[11px] font-bold ${rowColor}`}>
                                                            {entry.stateLabel}
                                                        </span>
                                                        <span className="text-[11px] text-txt-secondary leading-relaxed">
                                                            {entry.description}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Pagination */}
                                        {totalLogPages > 1 && (
                                            <div className="px-5 py-2.5 border-t border-surface-border flex items-center justify-between">
                                                <span className="text-[10px] text-txt-dim">
                                                    Mostrando {(logPage - 1) * LOG_PAGE_SIZE + 1}-{Math.min(logPage * LOG_PAGE_SIZE, bitacoraEntries.length)} de {bitacoraEntries.length}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setLogPage(p => Math.max(1, p - 1))}
                                                        disabled={logPage === 1}
                                                        className="btn-ghost !p-1 disabled:opacity-30"
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    {[...Array(Math.min(totalLogPages, 5))].map((_, i) => {
                                                        let pageNum: number;
                                                        if (totalLogPages <= 5) {
                                                            pageNum = i + 1;
                                                        } else if (logPage <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (logPage >= totalLogPages - 2) {
                                                            pageNum = totalLogPages - 4 + i;
                                                        } else {
                                                            pageNum = logPage - 2 + i;
                                                        }
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setLogPage(pageNum)}
                                                                className={clsx(
                                                                    "w-6 h-6 rounded-md text-[10px] font-medium transition-colors",
                                                                    logPage === pageNum
                                                                        ? 'bg-accent text-white'
                                                                        : 'text-txt-muted hover:bg-surface-hover'
                                                                )}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        );
                                                    })}
                                                    <button
                                                        onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                                                        disabled={logPage === totalLogPages}
                                                        className="btn-ghost !p-1 disabled:opacity-30"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            </>
                        )}

                        {/* Activity Log Panel */}
                        {activePanel === 'activity' && (
                            <div className="bg-surface-overlay rounded-xl border border-surface-border p-5">
                                <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4">Activity Timeline</h5>
                                {activity.length > 0 ? (
                                    <div className="max-h-[260px] overflow-y-auto pr-2 space-y-0">
                                        {activity.slice().reverse().map((entry, idx) => {
                                            const eColor = entry.state.includes('Online') ? 'success'
                                                : entry.state === 'OFFLINE' ? 'danger'
                                                : entry.state === 'Standby' ? 'warning' : 'neutral';
                                            const dotColor = {
                                                success: 'bg-success',
                                                danger: 'bg-danger',
                                                warning: 'bg-warning',
                                                neutral: 'bg-txt-dim',
                                            }[eColor];
                                            return (
                                                <div key={idx} className="flex items-start gap-3 py-2 group">
                                                    <div className="flex flex-col items-center pt-1">
                                                        <div className={clsx("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />
                                                        {idx < activity.length - 1 && (
                                                            <div className="w-px h-full min-h-[20px] bg-surface-border" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                                        <div>
                                                            <span className={clsx(
                                                                "text-xs font-semibold",
                                                                eColor === 'success' ? 'text-success' :
                                                                eColor === 'danger' ? 'text-danger' :
                                                                eColor === 'warning' ? 'text-warning' : 'text-txt-secondary'
                                                            )}>
                                                                {entry.state}
                                                            </span>
                                                            <span className="text-[10px] text-txt-dim ml-2">RTT: {entry.rtt}ms</span>
                                                        </div>
                                                        <span className="text-[10px] text-txt-muted font-mono">
                                                            {formatDateTime(entry.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <History size={32} className="mx-auto text-txt-dim mb-2" />
                                        <p className="text-txt-muted text-sm">Sin cambios de estado registrados</p>
                                        <p className="text-txt-dim text-xs mt-1">Los cambios aparecerán cuando el dispositivo cambie entre Online/Standby/Offline</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Statistics Panel */}
                        {activePanel === 'stats' && (
                            <div className="bg-surface-overlay rounded-xl border border-surface-border p-5">
                                <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4">Stored Statistics (MongoDB)</h5>
                                {stats && stats.totalMeasurements > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <StatItem label="Total Mediciones" value={stats.totalMeasurements.toLocaleString()} icon={<Database size={14} />} />
                                        <StatItem label="RTT Promedio" value={`${stats.avgRtt} ms`} icon={<TrendingUp size={14} />} />
                                        <StatItem label="Primer Registro" value={formatDateTime(stats.firstSeen)} icon={<Clock size={14} />} />
                                        <StatItem label="Último Registro" value={formatDateTime(stats.lastSeen)} icon={<Clock size={14} />} />
                                        <StatItem label="Último Online" value={stats.lastOnline ? formatDateTime(stats.lastOnline) : 'Nunca'} icon={<Activity size={14} />} accent />
                                        <StatItem label="Tiempo Tracking" value={stats.firstSeen ? timeAgo(stats.firstSeen).replace('hace ', '') : '—'} icon={<History size={14} />} />

                                        <div className="col-span-2 pt-3 border-t border-surface-border">
                                            <h6 className="text-[10px] text-txt-dim uppercase tracking-wider mb-2">Distribución Total</h6>
                                            <div className="flex items-center gap-4 text-xs">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-success" />
                                                    <span className="text-txt-muted">Online</span>
                                                    <span className="font-bold text-success">{stats.online}%</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-warning" />
                                                    <span className="text-txt-muted">Standby</span>
                                                    <span className="font-bold text-warning">{stats.standby}%</span>
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-danger" />
                                                    <span className="text-txt-muted">Offline</span>
                                                    <span className="font-bold text-danger">{stats.offline}%</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Database size={32} className="mx-auto text-txt-dim mb-2" />
                                        <p className="text-txt-muted text-sm">Sin estadísticas aún</p>
                                        <p className="text-txt-dim text-xs mt-1">Los datos se acumularán mientras el tracker está activo</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══ Profile Panel ═══ */}
                        {activePanel === 'profile' && (
                            <div className="space-y-4">
                                {profileLoading && !profile ? (
                                    <div className="bg-surface-overlay rounded-xl border border-surface-border p-8 text-center">
                                        <div className="animate-pulse">
                                            <User size={32} className="mx-auto text-txt-dim mb-2" />
                                            <p className="text-txt-muted text-sm">Cargando perfil de WhatsApp...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Contact Info Card */}
                                        <div className="bg-surface-overlay rounded-xl border border-surface-border p-5">
                                            <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                                <User size={13} /> Perfil del Contacto
                                            </h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <ProfileItem label="Número" value={privacyMode ? blurredNumber : (profile?.number || displayNumber)} />
                                                <ProfileItem label="Push Name" value={privacyMode ? '••••' : (profile?.pushName || '—')} />
                                                <ProfileItem label="Nombre guardado" value={privacyMode ? '••••' : (profile?.contactName || '—')} />
                                                <ProfileItem
                                                    label="Tipo de cuenta"
                                                    value={profile?.isBusinessAccount ? 'Business' : 'Personal'}
                                                    accent={profile?.isBusinessAccount}
                                                />
                                                <div className="col-span-2">
                                                    <ProfileItem
                                                        label="About / Status"
                                                        value={privacyMode ? '••••••••' : (profile?.about || 'No disponible (privacidad)')}
                                                    />
                                                    {profile?.aboutSetAt && (
                                                        <p className="text-[9px] text-txt-dim mt-0.5 ml-0.5">
                                                            Actualizado: {formatDateTime(profile.aboutSetAt)}
                                                        </p>
                                                    )}
                                                </div>
                                                <ProfileItem label="Verificado en WA" value={profile?.verifiedOnWhatsApp ? 'Sí ✓' : 'No'} />
                                                <ProfileItem label="Tracking desde" value={profile?.addedAt ? formatDateTime(profile.addedAt) : '—'} />
                                                {profile?.lastProfileUpdate && (
                                                    <ProfileItem label="Perfil actualizado" value={formatDateTime(profile.lastProfileUpdate)} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Business Profile (if applicable) */}
                                        {profile?.isBusinessAccount && profile.businessProfile && (
                                            <div className="bg-surface-overlay rounded-xl border border-accent/20 p-5">
                                                <h5 className="text-xs font-semibold text-accent uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                                    <Briefcase size={13} /> Perfil de Negocio
                                                </h5>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {profile.businessProfile.description && (
                                                        <div>
                                                            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1">Descripción</p>
                                                            <p className="text-sm text-txt-primary leading-relaxed">{profile.businessProfile.description}</p>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {profile.businessProfile.category && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Briefcase size={12} className="text-txt-dim" />
                                                                <div>
                                                                    <p className="text-[10px] text-txt-dim">Categoría</p>
                                                                    <p className="text-txt-secondary font-medium">{profile.businessProfile.category}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {profile.businessProfile.website && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Globe size={12} className="text-txt-dim" />
                                                                <div>
                                                                    <p className="text-[10px] text-txt-dim">Website</p>
                                                                    <a href={profile.businessProfile.website} target="_blank" rel="noreferrer"
                                                                       className="text-accent hover:underline font-medium truncate block max-w-[200px]">
                                                                        {profile.businessProfile.website}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {profile.businessProfile.email && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Mail size={12} className="text-txt-dim" />
                                                                <div>
                                                                    <p className="text-[10px] text-txt-dim">Email</p>
                                                                    <p className="text-txt-secondary font-medium">{profile.businessProfile.email}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {profile.businessProfile.address && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <MapPin size={12} className="text-txt-dim" />
                                                                <div>
                                                                    <p className="text-[10px] text-txt-dim">Dirección</p>
                                                                    <p className="text-txt-secondary font-medium">{profile.businessProfile.address}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Activity Patterns (Hourly Heatmap) */}
                                        {patterns && patterns.hourly.length > 0 && (
                                            <div className="bg-surface-overlay rounded-xl border border-surface-border p-5">
                                                <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                                    <Sun size={13} /> Patrones de Actividad
                                                </h5>

                                                {/* Summary stats */}
                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                    <div className="bg-surface-hover rounded-lg p-3 text-center">
                                                        <Zap size={14} className="mx-auto text-accent mb-1" />
                                                        <p className="text-lg font-bold text-txt-primary">
                                                            {patterns.peakHour >= 0 ? formatHour(patterns.peakHour) : '—'}
                                                        </p>
                                                        <p className="text-[10px] text-txt-dim">Hora Pico</p>
                                                    </div>
                                                    <div className="bg-surface-hover rounded-lg p-3 text-center">
                                                        <Clock size={14} className="mx-auto text-success mb-1" />
                                                        <p className="text-lg font-bold text-txt-primary">
                                                            {patterns.avgSessionLength > 0 ? formatSeconds(patterns.avgSessionLength) : '—'}
                                                        </p>
                                                        <p className="text-[10px] text-txt-dim">Sesión Avg</p>
                                                    </div>
                                                    <div className="bg-surface-hover rounded-lg p-3 text-center">
                                                        <Activity size={14} className="mx-auto text-warning mb-1" />
                                                        <p className="text-lg font-bold text-txt-primary">
                                                            {patterns.totalOnlineMinutes > 0 ? `${patterns.totalOnlineMinutes}m` : '—'}
                                                        </p>
                                                        <p className="text-[10px] text-txt-dim">Total Online</p>
                                                    </div>
                                                </div>

                                                {/* Hourly bar chart */}
                                                <div className="h-[140px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={patterns.hourly} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(30,37,69,0.5)" />
                                                            <XAxis
                                                                dataKey="hour"
                                                                tickFormatter={(h: number) => h % 3 === 0 ? formatHour(h) : ''}
                                                                tick={{ fill: '#64748b', fontSize: 9 }}
                                                                axisLine={false}
                                                                tickLine={false}
                                                            />
                                                            <YAxis
                                                                tick={{ fill: '#64748b', fontSize: 9 }}
                                                                axisLine={false}
                                                                tickLine={false}
                                                            />
                                                            <Tooltip
                                                                formatter={(value: any, name: any) => [value, name === 'online' ? 'Online' : 'Total']}
                                                                labelFormatter={(label: any) => `${formatHour(Number(label))} - ${formatHour((Number(label) + 1) % 24)}`}
                                                                contentStyle={{
                                                                    backgroundColor: '#0f1629',
                                                                    border: '1px solid #1e2545',
                                                                    borderRadius: '12px',
                                                                    color: '#f1f5f9',
                                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                                                    fontSize: '11px',
                                                                }}
                                                            />
                                                            <Bar dataKey="total" fill="#1e2545" radius={[2, 2, 0, 0]} name="Total" />
                                                            <Bar dataKey="online" radius={[2, 2, 0, 0]} name="Online">
                                                                {patterns.hourly.map((entry, index) => (
                                                                    <Cell
                                                                        key={`cell-${index}`}
                                                                        fill={entry.hour >= 6 && entry.hour < 20 ? '#22c55e' : '#6366f1'}
                                                                    />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Legend */}
                                                <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-txt-dim">
                                                    <span className="flex items-center gap-1">
                                                        <Sun size={10} className="text-success" /> Día (6am-8pm)
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Moon size={10} className="text-indigo-400" /> Noche (8pm-6am)
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-sm bg-[#1e2545]" /> Total mediciones
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components ─── */

function MetricCard({ label, value, unit, icon, color }: {
    label: string;
    value: string;
    unit: string;
    icon: React.ReactNode;
    color: 'accent' | 'success' | 'warning';
}) {
    const colors = {
        accent: 'bg-accent-muted text-accent',
        success: 'bg-success-muted text-success',
        warning: 'bg-warning-muted text-warning',
    };

    return (
        <div className="bg-surface-overlay rounded-xl border border-surface-border p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</div>
                <span className="text-xs text-txt-muted">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-txt-primary">{value}</span>
                <span className="text-xs text-txt-dim">{unit}</span>
            </div>
        </div>
    );
}

function StatItem({ label, value, icon, accent = false }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    accent?: boolean;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <div className={clsx(
                "p-1.5 rounded-lg mt-0.5",
                accent ? 'bg-success-muted text-success' : 'bg-surface-hover text-txt-dim'
            )}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-txt-muted uppercase tracking-wider">{label}</p>
                <p className={clsx(
                    "text-sm font-semibold",
                    accent ? 'text-success' : 'text-txt-primary'
                )}>{value}</p>
            </div>
        </div>
    );
}

function ProfileItem({ label, value, accent = false }: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-0.5">{label}</p>
            <p className={clsx(
                "text-sm font-medium",
                accent ? 'text-accent' : 'text-txt-primary'
            )}>{value}</p>
        </div>
    );
}
