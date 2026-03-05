import React, { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from '../App';
import {
    Activity, Play, Square, Download, Filter, Globe, AlertTriangle,
    Shield, Info, Wifi, BarChart3, MapPin
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────

interface PacketMeta {
    id: number;
    timestamp: string;
    srcIp: string;
    dstIp: string;
    srcPort: number | null;
    dstPort: number | null;
    protocol: string;
    length: number;
    ttl: number;
    srcGeo: GeoInfo | null;
    dstGeo: GeoInfo | null;
    severity: 'info' | 'warning' | 'danger';
}

interface GeoInfo {
    country: string;
    region: string;
    city: string;
    ll: [number, number];
}

interface CaptureStats {
    totalPackets: number;
    totalBytes: number;
    startTime: string | null;
    protocols: Record<string, number>;
    topSrcIps: Array<{ ip: string; count: number; geo: GeoInfo | null }>;
    topDstIps: Array<{ ip: string; count: number; geo: GeoInfo | null }>;
}

interface NetworkInterface {
    name: string;
    address: string;
    description: string;
}

interface CaptureFilter {
    protocol?: string;
    port?: number;
    ip?: string;
}

// ── Constants ──────────────────────────────────────────────────

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const PROTOCOL_COLORS: Record<string, string> = {
    TCP: '#7c3aed',
    UDP: '#3b82f6',
    ICMP: '#f59e0b',
    OTHER: '#64748b',
};

const SEVERITY_STYLES = {
    info: { bg: 'bg-accent/5', text: 'text-accent', border: 'border-accent/20', icon: Info },
    warning: { bg: 'bg-warning/5', text: 'text-warning', border: 'border-warning/20', icon: AlertTriangle },
    danger: { bg: 'bg-danger/5', text: 'text-danger', border: 'border-danger/20', icon: Shield },
};

const MAX_DISPLAY_PACKETS = 200;

// ── Component ──────────────────────────────────────────────────

export function NetworkMonitor() {
    const [isCapturing, setIsCapturing] = useState(false);
    const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
    const [selectedInterface, setSelectedInterface] = useState('');
    const [packets, setPackets] = useState<PacketMeta[]>([]);
    const [stats, setStats] = useState<CaptureStats | null>(null);
    const [filterProtocol, setFilterProtocol] = useState('all');
    const [filterPort, setFilterPort] = useState('');
    const [filterIp, setFilterIp] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [activeTab, setActiveTab] = useState<'packets' | 'stats' | 'geo'>('packets');

    const tableEndRef = useRef<HTMLDivElement | null>(null);
    const packetsRef = useRef<PacketMeta[]>([]);

    // Load interfaces on mount
    useEffect(() => {
        fetch(`${API_URL}/api/network/interfaces`)
            .then(r => r.json())
            .then((data: NetworkInterface[]) => {
                setInterfaces(data);
                if (data.length > 0) setSelectedInterface(data[0].address);
            })
            .catch(console.error);

        // Get initial status
        socket.emit('network-get-status');
    }, []);

    // Socket listeners
    useEffect(() => {
        function onPacket(packet: PacketMeta) {
            packetsRef.current = [...packetsRef.current.slice(-MAX_DISPLAY_PACKETS + 1), packet];
            setPackets(packetsRef.current);
        }

        function onStatus(data: { isCapturing: boolean; stats: CaptureStats }) {
            setIsCapturing(data.isCapturing);
            setStats(data.stats);
        }

        socket.on('network-packet', onPacket);
        socket.on('network-status', onStatus);

        return () => {
            socket.off('network-packet', onPacket);
            socket.off('network-status', onStatus);
        };
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && tableEndRef.current) {
            tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [packets, autoScroll]);

    // Periodic stats refresh while capturing
    useEffect(() => {
        if (!isCapturing) return;
        const interval = setInterval(() => {
            socket.emit('network-get-status');
        }, 2000);
        return () => clearInterval(interval);
    }, [isCapturing]);

    const handleStart = useCallback(() => {
        if (!selectedInterface) return;
        const captureFilter: CaptureFilter = {
            protocol: filterProtocol !== 'all' ? filterProtocol : undefined,
            port: filterPort ? parseInt(filterPort) : undefined,
            ip: filterIp || undefined,
        };
        packetsRef.current = [];
        setPackets([]);
        socket.emit('network-start', { interfaceAddr: selectedInterface, filter: captureFilter });
    }, [selectedInterface, filterProtocol, filterPort, filterIp]);

    const handleStop = useCallback(() => {
        socket.emit('network-stop');
    }, []);

    const handleExport = useCallback((format: 'csv' | 'json') => {
        window.open(`${API_URL}/api/network/export/${format}`, '_blank');
    }, []);

    // ── Protocol chart data ────────────────────────────────────

    const protocolData = stats ? Object.entries(stats.protocols).map(([name, value]) => ({
        name,
        value,
        fill: PROTOCOL_COLORS[name] || PROTOCOL_COLORS.OTHER,
    })) : [];

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatTime = (ts: string) => {
        return new Date(ts).toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any);
    };

    // ── Render ─────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Control Bar */}
            <div className="card">
                <div className="p-4 flex flex-wrap items-center gap-3">
                    {/* Interface selector */}
                    <select
                        value={selectedInterface}
                        onChange={e => setSelectedInterface(e.target.value)}
                        disabled={isCapturing}
                        className="select-field max-w-[280px]"
                    >
                        {interfaces.map(iface => (
                            <option key={iface.address} value={iface.address}>
                                {iface.description}
                            </option>
                        ))}
                    </select>

                    {/* Start/Stop button */}
                    {!isCapturing ? (
                        <button
                            onClick={handleStart}
                            disabled={!selectedInterface}
                            className="px-4 py-2 bg-success hover:bg-success-hover text-white rounded-xl flex items-center gap-2 font-medium transition-colors text-sm disabled:opacity-40"
                        >
                            <Play size={16} /> Start Capture
                        </button>
                    ) : (
                        <button onClick={handleStop} className="btn-danger flex items-center gap-2">
                            <Square size={16} /> Stop
                        </button>
                    )}

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors ${
                            showFilters
                                ? 'bg-accent text-white shadow-glow-sm'
                                : 'bg-surface-overlay text-txt-secondary border border-surface-border hover:bg-surface-hover'
                        }`}
                    >
                        <Filter size={14} /> Filters
                    </button>

                    {/* Export */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={packets.length === 0}
                            className="btn-ghost flex items-center gap-1.5 !text-xs disabled:opacity-40"
                        >
                            <Download size={14} /> CSV
                        </button>
                        <button
                            onClick={() => handleExport('json')}
                            disabled={packets.length === 0}
                            className="btn-ghost flex items-center gap-1.5 !text-xs disabled:opacity-40"
                        >
                            <Download size={14} /> JSON
                        </button>
                    </div>

                    {/* Auto-scroll toggle */}
                    <label className="flex items-center gap-1.5 text-xs text-txt-muted cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={e => setAutoScroll(e.target.checked)}
                            className="rounded border-surface-border-strong bg-surface-overlay accent-accent"
                        />
                        Auto-scroll
                    </label>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="px-4 pb-4 pt-0">
                        <div className="pt-3 border-t border-surface-border flex flex-wrap items-center gap-3">
                            <select
                                value={filterProtocol}
                                onChange={e => setFilterProtocol(e.target.value)}
                                className="select-field !py-1.5"
                            >
                                <option value="all">All Protocols</option>
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="icmp">ICMP</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Port"
                                value={filterPort}
                                onChange={e => setFilterPort(e.target.value)}
                                className="input-field !py-1.5 w-24"
                            />
                            <input
                                type="text"
                                placeholder="IP address"
                                value={filterIp}
                                onChange={e => setFilterIp(e.target.value)}
                                className="input-field !py-1.5 w-40"
                            />
                            <span className="text-xs text-txt-dim">Filters apply on next capture start</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            {stats && stats.totalPackets > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={<Activity size={18} />} label="Packets" value={stats.totalPackets.toLocaleString()} color="accent" />
                    <StatCard icon={<Wifi size={18} />} label="Data" value={formatBytes(stats.totalBytes)} color="success" />
                    <StatCard icon={<BarChart3 size={18} />} label="Protocols" value={Object.keys(stats.protocols).length.toString()} color="info" />
                    <StatCard icon={<Globe size={18} />} label="Unique IPs" value={(stats.topSrcIps.length + stats.topDstIps.length).toString()} color="warning" />
                </div>
            )}

            {/* Tab navigation */}
            <div className="tab-group">
                {(['packets', 'stats', 'geo'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab-item ${activeTab === tab ? 'tab-active' : 'tab-inactive'}`}
                    >
                        {tab === 'packets' ? 'Packets' : tab === 'stats' ? 'Statistics' : 'IP Tracker'}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'packets' && (
                <PacketTable packets={packets} formatTime={formatTime} tableEndRef={tableEndRef} />
            )}

            {activeTab === 'stats' && stats && (
                <StatsPanel stats={stats} protocolData={protocolData} formatBytes={formatBytes} />
            )}

            {activeTab === 'geo' && stats && (
                <GeoPanel stats={stats} />
            )}

            {/* Empty state */}
            {packets.length === 0 && !isCapturing && (
                <div className="empty-state">
                    <Activity size={48} className="mx-auto text-txt-dim mb-4" />
                    <p className="text-txt-secondary text-lg">No packets captured yet</p>
                    <p className="text-txt-dim text-sm mt-2">Select a network interface and click Start Capture</p>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    const colors: Record<string, string> = {
        accent: 'bg-accent-muted text-accent',
        success: 'bg-success-muted text-success',
        info: 'bg-accent-muted text-accent',
        warning: 'bg-warning-muted text-warning',
    };
    return (
        <div className="stat-card">
            <div className={`stat-icon ${colors[color]}`}>{icon}</div>
            <div>
                <p className="text-xs text-txt-muted">{label}</p>
                <p className="text-lg font-bold text-txt-primary">{value}</p>
            </div>
        </div>
    );
}

function PacketTable({
    packets,
    formatTime,
    tableEndRef,
}: {
    packets: PacketMeta[];
    formatTime: (ts: string) => string;
    tableEndRef: React.RefObject<HTMLDivElement | null>;
}) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-xs">
                    <thead className="bg-surface-overlay sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">#</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Time</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Protocol</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Source</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Destination</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Size</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">TTL</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Geo</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Sev</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                        {packets.map(p => {
                            const sev = SEVERITY_STYLES[p.severity];
                            const SevIcon = sev.icon;
                            return (
                                <tr key={p.id} className={`${sev.bg} hover:bg-surface-hover transition-colors`}>
                                    <td className="px-3 py-1.5 text-txt-dim font-mono">{p.id}</td>
                                    <td className="px-3 py-1.5 text-txt-secondary font-mono">{formatTime(p.timestamp)}</td>
                                    <td className="px-3 py-1.5">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                                            style={{ backgroundColor: PROTOCOL_COLORS[p.protocol] || PROTOCOL_COLORS.OTHER }}>
                                            {p.protocol}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-txt-primary">
                                        {p.srcIp}{p.srcPort ? `:${p.srcPort}` : ''}
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-txt-primary">
                                        {p.dstIp}{p.dstPort ? `:${p.dstPort}` : ''}
                                    </td>
                                    <td className="px-3 py-1.5 text-txt-secondary">{p.length}B</td>
                                    <td className="px-3 py-1.5 text-txt-muted">{p.ttl}</td>
                                    <td className="px-3 py-1.5 text-txt-muted">
                                        {p.dstGeo ? (
                                            <span title={`${p.dstGeo.city}, ${p.dstGeo.country}`}>
                                                {p.dstGeo.country} {p.dstGeo.city ? `· ${p.dstGeo.city}` : ''}
                                            </span>
                                        ) : (
                                            <span className="text-txt-dim">local</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <SevIcon size={14} className={sev.text} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div ref={tableEndRef} />
            </div>
        </div>
    );
}

function StatsPanel({
    stats,
    protocolData,
    formatBytes,
}: {
    stats: CaptureStats;
    protocolData: Array<{ name: string; value: number; fill: string }>;
    formatBytes: (b: number) => string;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Protocol distribution */}
            <div className="card p-5">
                <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4">Protocol Distribution</h3>
                {protocolData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={protocolData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                            >
                                {protocolData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f1629',
                                    border: '1px solid #1e2545',
                                    borderRadius: '12px',
                                    color: '#f1f5f9',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                }}
                                itemStyle={{ color: '#94a3b8' }}
                            />
                            <Legend
                                wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-txt-dim text-center py-8">No data yet</p>
                )}
            </div>

            {/* Top destination IPs */}
            <div className="card p-5">
                <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4">Top Destination IPs</h3>
                {stats.topDstIps.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={stats.topDstIps.slice(0, 8)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,37,69,0.8)" />
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis
                                dataKey="ip"
                                type="category"
                                width={120}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(value) => [String(value), 'Packets']}
                                contentStyle={{
                                    backgroundColor: '#0f1629',
                                    border: '1px solid #1e2545',
                                    borderRadius: '12px',
                                    color: '#f1f5f9',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                }}
                                itemStyle={{ color: '#94a3b8' }}
                            />
                            <Bar dataKey="count" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-txt-dim text-center py-8">Collecting data...</p>
                )}
            </div>

            {/* Summary stats */}
            <div className="card p-5 md:col-span-2">
                <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4">Capture Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-txt-muted text-xs mb-1">Total Packets</p>
                        <p className="text-xl font-bold text-txt-primary">{stats.totalPackets.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-txt-muted text-xs mb-1">Total Data</p>
                        <p className="text-xl font-bold text-txt-primary">{formatBytes(stats.totalBytes)}</p>
                    </div>
                    <div>
                        <p className="text-txt-muted text-xs mb-1">Start Time</p>
                        <p className="text-xl font-bold text-txt-primary">
                            {stats.startTime ? new Date(stats.startTime).toLocaleTimeString('es-ES') : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-txt-muted text-xs mb-1">Protocols</p>
                        <p className="text-xl font-bold text-txt-primary">
                            {Object.entries(stats.protocols).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GeoPanel({ stats }: { stats: CaptureStats }) {
    const allIps = [...stats.topSrcIps, ...stats.topDstIps]
        .filter(e => e.geo)
        .reduce((acc, curr) => {
            const existing = acc.find(a => a.ip === curr.ip);
            if (existing) {
                existing.count += curr.count;
            } else {
                acc.push({ ...curr });
            }
            return acc;
        }, [] as Array<{ ip: string; count: number; geo: GeoInfo | null }>)
        .sort((a, b) => b.count - a.count);

    return (
        <div className="card p-5">
            <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-accent" /> IP Geolocation Tracker
            </h3>
            {allIps.length > 0 ? (
                <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-overlay sticky top-0">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">IP</th>
                                <th className="px-4 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Country</th>
                                <th className="px-4 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Region</th>
                                <th className="px-4 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">City</th>
                                <th className="px-4 py-2.5 text-left font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Lat/Lon</th>
                                <th className="px-4 py-2.5 text-right font-semibold text-txt-muted uppercase tracking-wider text-[10px]">Packets</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                            {allIps.map(entry => (
                                <tr key={entry.ip} className="hover:bg-surface-hover transition-colors">
                                    <td className="px-4 py-2 font-mono text-txt-primary">{entry.ip}</td>
                                    <td className="px-4 py-2 text-txt-secondary">{entry.geo?.country}</td>
                                    <td className="px-4 py-2 text-txt-secondary">{entry.geo?.region}</td>
                                    <td className="px-4 py-2 text-txt-secondary">{entry.geo?.city}</td>
                                    <td className="px-4 py-2 text-txt-muted font-mono text-xs">
                                        {entry.geo?.ll[0].toFixed(2)}, {entry.geo?.ll[1].toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-right font-bold text-txt-primary">{entry.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8">
                    <Globe size={48} className="mx-auto text-txt-dim mb-3" />
                    <p className="text-txt-secondary">No geolocated IPs yet</p>
                    <p className="text-txt-dim text-xs mt-1">Public IPs will appear here with location data</p>
                </div>
            )}
        </div>
    );
}
