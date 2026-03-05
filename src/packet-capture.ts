/**
 * Packet Capture Service
 *
 * Uses Npcap (via `cap`) to capture network packets in real-time.
 * Extracts metadata only: IPs, ports, protocols, sizes, timestamps.
 * NO payload/content inspection — metadata capture only.
 *
 * For educational and research purposes only.
 */

// @ts-ignore - cap is a CJS module
import capModule from 'cap';
import * as geoip from 'geoip-lite';
import os from 'os';

const { Cap, decoders, findDevice } = capModule as any;

// ── Types ──────────────────────────────────────────────────────

export interface PacketMeta {
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

export interface GeoInfo {
    country: string;
    region: string;
    city: string;
    ll: [number, number]; // [lat, lon]
}

export interface CaptureFilter {
    protocol?: string;       // tcp, udp, icmp, all
    port?: number;
    ip?: string;
    minSize?: number;
    maxSize?: number;
}

export interface CaptureStats {
    totalPackets: number;
    totalBytes: number;
    startTime: string | null;
    protocols: Record<string, number>;
    topSrcIps: Array<{ ip: string; count: number; geo: GeoInfo | null }>;
    topDstIps: Array<{ ip: string; count: number; geo: GeoInfo | null }>;
}

export interface NetworkInterface {
    name: string;
    address: string;
    description: string;
}

// ── Private state ──────────────────────────────────────────────

let capSession: any = null;
let isCapturing = false;
let packetCounter = 0;
let captureFilter: CaptureFilter = {};
let captureStats: CaptureStats = {
    totalPackets: 0,
    totalBytes: 0,
    startTime: null,
    protocols: {},
    topSrcIps: [],
    topDstIps: [],
};

const recentPackets: PacketMeta[] = [];
const MAX_RECENT = 2000;

// Counters for stats
const srcIpCounts = new Map<string, number>();
const dstIpCounts = new Map<string, number>();

// Callback for emitting packets
let onPacket: ((packet: PacketMeta) => void) | null = null;

// ── Helpers ────────────────────────────────────────────────────

function lookupGeo(ip: string): GeoInfo | null {
    // Skip private/local IPs
    if (isPrivateIp(ip)) return null;
    const geo = geoip.lookup(ip);
    if (!geo) return null;
    return {
        country: geo.country || '',
        region: geo.region || '',
        city: geo.city || '',
        ll: geo.ll as [number, number],
    };
}

function isPrivateIp(ip: string): boolean {
    return (
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.3') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('127.') ||
        ip === '0.0.0.0' ||
        ip === '255.255.255.255' ||
        ip.startsWith('224.') || // multicast
        ip.startsWith('169.254.') // link-local
    );
}

function getProtocolName(proto: number): string {
    switch (proto) {
        case 1: return 'ICMP';
        case 6: return 'TCP';
        case 17: return 'UDP';
        case 41: return 'IPv6';
        case 47: return 'GRE';
        case 50: return 'ESP';
        case 58: return 'ICMPv6';
        default: return `OTHER(${proto})`;
    }
}

function classifySeverity(packet: { protocol: string; dstPort: number | null; srcPort: number | null }): 'info' | 'warning' | 'danger' {
    const dangerPorts = [22, 23, 3389, 445, 135, 139, 4444, 5555, 1433, 3306, 5432];
    const warningPorts = [80, 8080, 8443, 53, 25, 587, 993, 995, 110, 143];

    const port = packet.dstPort || packet.srcPort || 0;
    if (dangerPorts.includes(port)) return 'danger';
    if (warningPorts.includes(port) || packet.protocol === 'ICMP') return 'warning';
    return 'info';
}

function matchesFilter(packet: PacketMeta, filter: CaptureFilter): boolean {
    if (filter.protocol && filter.protocol !== 'all') {
        if (packet.protocol.toLowerCase() !== filter.protocol.toLowerCase()) return false;
    }
    if (filter.port) {
        if (packet.srcPort !== filter.port && packet.dstPort !== filter.port) return false;
    }
    if (filter.ip) {
        if (!packet.srcIp.includes(filter.ip) && !packet.dstIp.includes(filter.ip)) return false;
    }
    if (filter.minSize && packet.length < filter.minSize) return false;
    if (filter.maxSize && packet.length > filter.maxSize) return false;
    return true;
}

function updateStats(packet: PacketMeta) {
    captureStats.totalPackets++;
    captureStats.totalBytes += packet.length;
    captureStats.protocols[packet.protocol] = (captureStats.protocols[packet.protocol] || 0) + 1;

    // Track IP counts
    srcIpCounts.set(packet.srcIp, (srcIpCounts.get(packet.srcIp) || 0) + 1);
    dstIpCounts.set(packet.dstIp, (dstIpCounts.get(packet.dstIp) || 0) + 1);

    // Rebuild top IPs every 100 packets
    if (captureStats.totalPackets % 100 === 0) {
        captureStats.topSrcIps = [...srcIpCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count, geo: lookupGeo(ip) }));

        captureStats.topDstIps = [...dstIpCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count, geo: lookupGeo(ip) }));
    }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * List available network interfaces
 */
export function listInterfaces(): NetworkInterface[] {
    const interfaces = os.networkInterfaces();
    const result: NetworkInterface[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
        if (!addrs) continue;
        for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
                result.push({
                    name,
                    address: addr.address,
                    description: `${name} (${addr.address})`,
                });
            }
        }
    }
    return result;
}

/**
 * Start packet capture on a given interface
 */
export function startCapture(
    interfaceAddress: string,
    filter: CaptureFilter = {},
    callback: (packet: PacketMeta) => void
): boolean {
    if (isCapturing) {
        console.log('[CAPTURE] Already capturing, stop first');
        return false;
    }

    try {
        capSession = new Cap();
        captureFilter = filter;
        onPacket = callback;
        packetCounter = 0;
        recentPackets.length = 0;
        srcIpCounts.clear();
        dstIpCounts.clear();
        captureStats = {
            totalPackets: 0,
            totalBytes: 0,
            startTime: new Date().toISOString(),
            protocols: {},
            topSrcIps: [],
            topDstIps: [],
        };

        // Build BPF filter string
        let bpfFilter = 'ip';
        if (filter.protocol && filter.protocol !== 'all') {
            bpfFilter = filter.protocol.toLowerCase();
        }
        if (filter.port) {
            bpfFilter += ` port ${filter.port}`;
        }

        const device = findDevice(interfaceAddress);
        if (!device) {
            console.error('[CAPTURE] Could not find network device for:', interfaceAddress);
            return false;
        }

        const bufSize = 10 * 1024 * 1024; // 10MB buffer
        const snapLen = 65535;

        capSession.open(device, bpfFilter, snapLen, bufSize);
        capSession.setMinBytes && capSession.setMinBytes(0);

        const linkType = capSession.linkType;
        const buffer = Buffer.alloc(snapLen);

        capSession.on('packet', (nbytes: number) => {
            const raw = buffer.slice(0, nbytes);

            try {
                let ethSize = 0;
                if (linkType === 'ETHERNET') {
                    const ethInfo = decoders.Ethernet(raw);
                    // Only process IPv4 (0x0800)
                    if (ethInfo.info.type !== 0x0800) return;
                    ethSize = ethInfo.offset;
                }

                const ipInfo = decoders.IPV4(raw, ethSize);
                const ip = ipInfo.info;

                let srcPort: number | null = null;
                let dstPort: number | null = null;
                const protocolName = getProtocolName(ip.protocol);

                if (ip.protocol === 6) { // TCP
                    const tcpInfo = decoders.TCP(raw, ipInfo.offset);
                    srcPort = tcpInfo.info.srcport;
                    dstPort = tcpInfo.info.dstport;
                } else if (ip.protocol === 17) { // UDP
                    const udpInfo = decoders.UDP(raw, ipInfo.offset);
                    srcPort = udpInfo.info.srcport;
                    dstPort = udpInfo.info.dstport;
                }

                const packet: PacketMeta = {
                    id: ++packetCounter,
                    timestamp: new Date().toISOString(),
                    srcIp: ip.srcaddr,
                    dstIp: ip.dstaddr,
                    srcPort,
                    dstPort,
                    protocol: protocolName,
                    length: ip.totallen,
                    ttl: ip.ttl,
                    srcGeo: lookupGeo(ip.srcaddr),
                    dstGeo: lookupGeo(ip.dstaddr),
                    severity: classifySeverity({ protocol: protocolName, dstPort, srcPort }),
                };

                // Apply user filter (extra filtering beyond BPF)
                if (!matchesFilter(packet, captureFilter)) return;

                // Store in recent buffer
                recentPackets.push(packet);
                if (recentPackets.length > MAX_RECENT) {
                    recentPackets.shift();
                }

                // Update stats
                updateStats(packet);

                // Emit to callback
                if (onPacket) onPacket(packet);
            } catch {
                // Malformed packet, skip
            }
        });

        isCapturing = true;
        console.log(`[CAPTURE] Started on ${device} with filter: "${bpfFilter}"`);
        return true;
    } catch (err) {
        console.error('[CAPTURE] Failed to start:', err);
        return false;
    }
}

/**
 * Stop packet capture
 */
export function stopCapture(): void {
    if (capSession && isCapturing) {
        capSession.close();
        capSession = null;
        isCapturing = false;
        onPacket = null;
        console.log('[CAPTURE] Stopped');
    }
}

/**
 * Get capture status
 */
export function getCaptureStatus(): { isCapturing: boolean; stats: CaptureStats } {
    return { isCapturing, stats: captureStats };
}

/**
 * Get recent captured packets
 */
export function getRecentPackets(limit: number = 100): PacketMeta[] {
    return recentPackets.slice(-limit);
}

/**
 * Update filter without restarting capture
 */
export function updateFilter(filter: CaptureFilter): void {
    captureFilter = filter;
}

/**
 * Export packets as JSON
 */
export function exportJSON(limit?: number): string {
    const data = limit ? recentPackets.slice(-limit) : recentPackets;
    return JSON.stringify(data, null, 2);
}

/**
 * Export packets as CSV
 */
export function exportCSV(limit?: number): string {
    const data = limit ? recentPackets.slice(-limit) : recentPackets;
    const header = 'id,timestamp,srcIp,srcPort,dstIp,dstPort,protocol,length,ttl,severity,srcCountry,srcCity,dstCountry,dstCity';
    const rows = data.map(p =>
        `${p.id},${p.timestamp},${p.srcIp},${p.srcPort ?? ''},${p.dstIp},${p.dstPort ?? ''},${p.protocol},${p.length},${p.ttl},${p.severity},${p.srcGeo?.country ?? ''},${p.srcGeo?.city ?? ''},${p.dstGeo?.country ?? ''},${p.dstGeo?.city ?? ''}`
    );
    return [header, ...rows].join('\n');
}
