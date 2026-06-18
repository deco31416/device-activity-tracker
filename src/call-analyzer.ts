/**
 * Call IP Analyzer
 *
 * Captures local network traffic during WhatsApp calls to classify
 * observed infrastructure and direct-path candidate IPs.
 *
 * Flow:
 * 1. Baileys detects a call event (offer/accept/terminate)
 * 2. This module starts a focused UDP packet capture
 * 3. When the call ends, captured packets are analyzed:
 *    - Meta/Facebook IPs are classified as relay/infrastructure
 *    - Remaining IPs are classified as observed direct-path candidates
 *    - Candidates receive geoip-lite hints when available
 * 4. Results are returned with confidence scores
 *
 * For educational and security research purposes only.
 */

// @ts-ignore - cap is a CJS module
import capModule from 'cap';
// @ts-ignore - geoip-lite is CJS
import geoipModule from 'geoip-lite';
import os from 'os';
import { isMetaIP, isKnownRelayIP, isPrivateIP, classifyIP } from './meta-ip-ranges.js';

const geoip = (geoipModule as any)?.default ?? geoipModule as any;
const { Cap, decoders, findDevice } = capModule as any;

// ── Types ──────────────────────────────────────────────────────

export interface CallGeoInfo {
    country: string;
    region: string;
    city: string;
    lat: number;
    lon: number;
    timezone: string;
}

export interface CandidateIP {
    ip: string;
    packets: number;
    bytesTotal: number;
    firstSeen: Date;
    lastSeen: Date;
    avgSize: number;
    ports: number[];
    direction: 'incoming' | 'outgoing' | 'bidirectional';
    provider: 'meta' | 'google' | 'cloudflare' | 'unknown';
    networkCategory: 'meta' | 'stun_turn' | 'cdn' | 'cloud_hosting' | 'consumer_isp_or_unknown' | 'unknown_public';
    networkIntelligence: {
        asn: number | null;
        org: string;
        category: 'meta' | 'stun_turn' | 'cdn' | 'cloud_hosting' | 'consumer_isp_or_unknown' | 'unknown';
        source: 'local_rules';
        isDatacenterLikely: boolean;
        caution: string;
    };
    geo: CallGeoInfo | null;
    confidence: 'high' | 'medium' | 'low';
    confidenceScore: number;
    reasonCodes: Array<{
        code: string;
        label: string;
        delta: number;
    }>;
    technicalNote: string;
    isP2P: boolean;
}

export interface CallAnalysisResult {
    callId: string;
    targetJid: string;
    startTime: Date;
    endTime: Date | null;
    durationSec: number;
    isVideo: boolean;
    totalPackets: number;
    candidateIps: CandidateIP[];
    metaIps: string[];
    verdict: 'p2p' | 'relay' | 'mixed' | 'insufficient_data';
    captureInterface: string;
}

export interface CallCaptureStatus {
    isCapturing: boolean;
    targetJid: string | null;
    callId: string | null;
    startTime: Date | null;
    packetsCollected: number;
    elapsed: number;
}

// ── Internal packet structure for call capture ─────────────────

interface RawCallPacket {
    timestamp: Date;
    srcIp: string;
    dstIp: string;
    srcPort: number | null;
    dstPort: number | null;
    protocol: number;   // 6=TCP, 17=UDP
    length: number;
}

// ── State ──────────────────────────────────────────────────────

let capSession: any = null;
let isCapturing = false;
let currentCallId: string | null = null;
let currentTargetJid: string | null = null;
let currentIsVideo: boolean = false;
let captureStartTime: Date | null = null;
let capturedPackets: RawCallPacket[] = [];
let captureInterfaceAddr: string = '';
let localIPs: Set<string> = new Set();

// Callback for real-time packet streaming
let onCallPacket: ((packet: RawCallPacket & { isMetaIP: boolean }) => void) | null = null;

// Store completed analyses
const analysisHistory: Map<string, CallAnalysisResult[]> = new Map(); // jid -> results

function resetCaptureState() {
    capSession = null;
    isCapturing = false;
    currentCallId = null;
    currentTargetJid = null;
    currentIsVideo = false;
    captureStartTime = null;
    capturedPackets = [];
    captureInterfaceAddr = '';
    localIPs = new Set();
    onCallPacket = null;
}

// ── Helpers ────────────────────────────────────────────────────

function getLocalIPs(): Set<string> {
    const ips = new Set<string>();
    const interfaces = os.networkInterfaces();
    for (const addrs of Object.values(interfaces)) {
        if (!addrs) continue;
        for (const addr of addrs) {
            if (addr.family === 'IPv4') {
                ips.add(addr.address);
            }
        }
    }
    return ips;
}

function lookupGeo(ip: string): CallGeoInfo | null {
    if (isPrivateIP(ip)) return null;
    const geo = geoip.lookup(ip);
    if (!geo) return null;
    return {
        country: geo.country || '',
        region: geo.region || '',
        city: geo.city || '',
        lat: geo.ll?.[0] ?? 0,
        lon: geo.ll?.[1] ?? 0,
        timezone: geo.timezone || '',
    };
}

function classifyNetworkCategory(provider: CandidateIP['provider']): CandidateIP['networkCategory'] {
    if (provider === 'meta') return 'meta';
    if (provider === 'google') return 'stun_turn';
    if (provider === 'cloudflare') return 'cdn';
    return 'unknown_public';
}

interface LocalNetworkRule {
    cidrs: string[];
    asn: number | null;
    org: string;
    category: CandidateIP['networkIntelligence']['category'];
    isDatacenterLikely: boolean;
}

function ipToInt(ip: string): number {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) return 0;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function matchesCidr(ip: string, cidr: string): boolean {
    const [base, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) return false;
    const mask = prefix === 0 ? 0 : ((0xFFFFFFFF << (32 - prefix)) >>> 0);
    return ((ipToInt(ip) & mask) >>> 0) === ((ipToInt(base) & mask) >>> 0);
}

const LOCAL_NETWORK_RULES: LocalNetworkRule[] = [
    {
        cidrs: ['31.13.24.0/21', '31.13.64.0/18', '66.220.144.0/20', '69.63.176.0/20', '69.171.224.0/19', '74.119.76.0/22', '102.132.96.0/20', '129.134.0.0/17', '157.240.0.0/17', '163.70.128.0/17', '173.252.64.0/18', '179.60.192.0/22', '185.60.216.0/22'],
        asn: 32934,
        org: 'Meta Platforms / Facebook',
        category: 'meta',
        isDatacenterLikely: true,
    },
    {
        cidrs: ['142.250.0.0/15', '172.217.0.0/16', '216.58.192.0/19', '74.125.0.0/16', '64.233.160.0/19', '108.177.0.0/17', '34.0.0.0/8', '35.0.0.0/8'],
        asn: 15169,
        org: 'Google / Google Cloud',
        category: 'stun_turn',
        isDatacenterLikely: true,
    },
    {
        cidrs: ['104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22', '141.101.64.0/18', '162.158.0.0/15', '188.114.96.0/20', '190.93.240.0/20', '197.234.240.0/22', '198.41.128.0/17'],
        asn: 13335,
        org: 'Cloudflare',
        category: 'cdn',
        isDatacenterLikely: true,
    },
    {
        cidrs: ['3.0.0.0/8', '13.32.0.0/15', '18.0.0.0/8', '52.0.0.0/8', '54.0.0.0/8'],
        asn: null,
        org: 'Amazon/AWS range heuristic',
        category: 'cloud_hosting',
        isDatacenterLikely: true,
    },
    {
        cidrs: ['20.0.0.0/8', '40.0.0.0/8', '51.104.0.0/15'],
        asn: null,
        org: 'Microsoft/Azure range heuristic',
        category: 'cloud_hosting',
        isDatacenterLikely: true,
    },
    {
        cidrs: ['104.131.0.0/16', '138.68.0.0/16', '143.198.0.0/16', '159.65.0.0/16', '167.71.0.0/16'],
        asn: 14061,
        org: 'DigitalOcean',
        category: 'cloud_hosting',
        isDatacenterLikely: true,
    },
];

function lookupNetworkIntelligence(ip: string, provider: CandidateIP['provider']): CandidateIP['networkIntelligence'] {
    const matched = LOCAL_NETWORK_RULES.find(rule => rule.cidrs.some(cidr => matchesCidr(ip, cidr)));
    if (matched) {
        return {
            asn: matched.asn,
            org: matched.org,
            category: matched.category,
            source: 'local_rules',
            isDatacenterLikely: matched.isDatacenterLikely,
            caution: 'Clasificacion local heuristica. Requiere corroboracion con fuente ASN/WHOIS actualizada si se usa en informe formal.',
        };
    }

    if (provider !== 'unknown') {
        return {
            asn: null,
            org: provider,
            category: classifyNetworkCategory(provider) === 'unknown_public' ? 'unknown' : classifyNetworkCategory(provider) as CandidateIP['networkIntelligence']['category'],
            source: 'local_rules',
            isDatacenterLikely: true,
            caution: 'Proveedor clasificado por reglas locales. No identifica usuario final.',
        };
    }

    return {
        asn: null,
        org: 'Unknown public network',
        category: 'consumer_isp_or_unknown',
        source: 'local_rules',
        isDatacenterLikely: false,
        caution: 'Sin ASN/ORG verificado localmente. Puede ser ISP, CGNAT, VPN, proxy, relay o infraestructura no catalogada.',
    };
}

function clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
}

function confidenceFromScore(score: number): 'high' | 'medium' | 'low' {
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';
    return 'low';
}

function scoreCandidate(input: {
    provider: CandidateIP['provider'];
    networkIntelligence: CandidateIP['networkIntelligence'];
    packets: number;
    bytesTotal: number;
    direction: CandidateIP['direction'];
    ports: number[];
    durationSec: number;
}): Pick<CandidateIP, 'confidence' | 'confidenceScore' | 'reasonCodes' | 'technicalNote' | 'networkCategory' | 'isP2P'> {
    const networkCategory = input.networkIntelligence.category === 'cloud_hosting'
        ? 'cloud_hosting'
        : input.networkIntelligence.category === 'consumer_isp_or_unknown'
            ? 'consumer_isp_or_unknown'
            : classifyNetworkCategory(input.provider);
    const reasonCodes: CandidateIP['reasonCodes'] = [];
    let score = input.provider === 'unknown' ? 35 : 5;

    if (input.provider === 'unknown' && !input.networkIntelligence.isDatacenterLikely) {
        reasonCodes.push({ code: 'UNKNOWN_PUBLIC_PROVIDER', label: 'IP publica fuera de proveedores relay conocidos', delta: 35 });
    } else {
        reasonCodes.push({ code: 'KNOWN_INFRASTRUCTURE', label: `Infraestructura probable: ${input.networkIntelligence.org}`, delta: -30 });
    }

    if (input.networkIntelligence.category === 'consumer_isp_or_unknown') {
        score += 10;
        reasonCodes.push({ code: 'NO_LOCAL_ASN_MATCH', label: 'Sin coincidencia local de ASN/ORG cloud o relay', delta: 10 });
    }

    if (input.networkIntelligence.isDatacenterLikely) {
        score -= 25;
        reasonCodes.push({ code: 'DATACENTER_OR_RELAY_LIKELY', label: 'ASN/ORG o rango sugiere datacenter, CDN o relay', delta: -25 });
    }

    if (input.direction === 'bidirectional') {
        score += 25;
        reasonCodes.push({ code: 'BIDIRECTIONAL_TRAFFIC', label: 'Flujo bidireccional observado', delta: 25 });
    } else {
        score -= 10;
        reasonCodes.push({ code: 'ONE_WAY_TRAFFIC', label: 'Solo se observo trafico en una direccion', delta: -10 });
    }

    if (input.packets >= 250) {
        score += 20;
        reasonCodes.push({ code: 'HIGH_PACKET_VOLUME', label: 'Volumen alto de paquetes durante la ventana', delta: 20 });
    } else if (input.packets >= 75) {
        score += 12;
        reasonCodes.push({ code: 'MEDIUM_PACKET_VOLUME', label: 'Volumen medio de paquetes durante la ventana', delta: 12 });
    } else if (input.packets >= 20) {
        score += 6;
        reasonCodes.push({ code: 'LOW_PACKET_VOLUME', label: 'Volumen bajo pero util de paquetes', delta: 6 });
    } else {
        score -= 15;
        reasonCodes.push({ code: 'INSUFFICIENT_PACKET_VOLUME', label: 'Muy pocos paquetes para confianza fuerte', delta: -15 });
    }

    const avgBytes = input.packets > 0 ? input.bytesTotal / input.packets : 0;
    if (avgBytes >= 80 && avgBytes <= 1400) {
        score += 5;
        reasonCodes.push({ code: 'REALISTIC_PACKET_SIZE', label: 'Tamano promedio compatible con trafico multimedia/UDP', delta: 5 });
    }

    const hasStunTurnPort = input.ports.some(port => [3478, 3479, 5349, 19302].includes(port));
    if (hasStunTurnPort) {
        score -= 20;
        reasonCodes.push({ code: 'STUN_TURN_PORT', label: 'Puerto asociado a STUN/TURN/relay observado', delta: -20 });
    }

    if (input.durationSec > 0 && input.packets / input.durationSec >= 2) {
        score += 8;
        reasonCodes.push({ code: 'TEMPORAL_DENSITY', label: 'Densidad temporal consistente durante la captura', delta: 8 });
    }

    if (networkCategory !== 'unknown_public' && networkCategory !== 'consumer_isp_or_unknown') {
        score = Math.min(score, 30);
    }

    const confidenceScore = clampScore(score);
    const confidence = confidenceFromScore(confidenceScore);
    const isP2P = input.provider === 'unknown' && !input.networkIntelligence.isDatacenterLikely;
    const technicalNote = isP2P
        ? 'IP publica observada como candidata tecnica. No confirma identidad, ubicacion exacta ni titularidad; requiere corroboracion externa.'
        : 'Infraestructura o relay conocido/probable. No debe tratarse como IP candidata de usuario.';

    return { confidence, confidenceScore, reasonCodes, technicalNote, networkCategory, isP2P };
}

/**
 * Auto-detect the best network interface for capture
 */
export function autoDetectInterface(): string | null {
    const interfaces = os.networkInterfaces();
    for (const [_name, addrs] of Object.entries(interfaces)) {
        if (!addrs) continue;
        for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
                return addr.address;
            }
        }
    }
    return null;
}

// ── Core capture functions ─────────────────────────────────────

/**
 * Start capturing packets for a WhatsApp call.
 * Focuses on UDP traffic which is used for SRTP voice/video.
 */
export function startCallCapture(
    interfaceAddr: string,
    targetJid: string,
    callId: string,
    isVideo: boolean = false,
    packetCallback?: (packet: RawCallPacket & { isMetaIP: boolean }) => void
): boolean {
    if (isCapturing) {
        console.log('[CALL-ANALYZER] Already capturing, stop first');
        return false;
    }

    try {
        capSession = new Cap();
        currentCallId = callId;
        currentTargetJid = targetJid;
        currentIsVideo = isVideo;
        captureStartTime = new Date();
        capturedPackets = [];
        captureInterfaceAddr = interfaceAddr;
        localIPs = getLocalIPs();
        onCallPacket = packetCallback || null;

        // BPF filter: capture UDP traffic (SRTP for voice/video calls)
        // Also capture STUN packets (port 3478) for NAT traversal detection
        const bpfFilter = 'udp';

        const device = findDevice(interfaceAddr);
        if (!device) {
            console.error('[CALL-ANALYZER] Could not find network device for:', interfaceAddr);
            resetCaptureState();
            return false;
        }

        const bufSize = 10 * 1024 * 1024; // 10MB buffer
        const snapLen = 65535;
        const buffer = Buffer.alloc(snapLen);

        capSession.open(device, bpfFilter, bufSize, buffer);
        capSession.setMinBytes && capSession.setMinBytes(0);

        const linkType = capSession.linkType;

        capSession.on('packet', (nbytes: number) => {
            const raw = buffer.slice(0, nbytes);

            try {
                let ethSize = 0;
                if (linkType === 'ETHERNET' || linkType === undefined || linkType === null) {
                    try {
                        const ethInfo = decoders.Ethernet(raw);
                        if (ethInfo.info.type !== 0x0800) return; // Only IPv4
                        ethSize = ethInfo.offset;
                    } catch {
                        ethSize = 0;
                    }
                }

                const ipInfo = decoders.IPV4(raw, ethSize);
                const ip = ipInfo.info;

                let srcPort: number | null = null;
                let dstPort: number | null = null;

                if (ip.protocol === 17) { // UDP
                    const udpInfo = decoders.UDP(raw, ipInfo.offset);
                    srcPort = udpInfo.info.srcport;
                    dstPort = udpInfo.info.dstport;
                } else if (ip.protocol === 6) { // TCP (less common for calls, but capture anyway)
                    const tcpInfo = decoders.TCP(raw, ipInfo.offset);
                    srcPort = tcpInfo.info.srcport;
                    dstPort = tcpInfo.info.dstport;
                }

                // Skip local-only traffic
                if (isPrivateIP(ip.srcaddr) && isPrivateIP(ip.dstaddr)) return;

                const packet: RawCallPacket = {
                    timestamp: new Date(),
                    srcIp: ip.srcaddr,
                    dstIp: ip.dstaddr,
                    srcPort,
                    dstPort,
                    protocol: ip.protocol,
                    length: ip.totallen,
                };

                capturedPackets.push(packet);

                // Emit real-time packet
                if (onCallPacket) {
                    const remoteIp = localIPs.has(ip.srcaddr) ? ip.dstaddr : ip.srcaddr;
                    onCallPacket({
                        ...packet,
                        isMetaIP: isKnownRelayIP(remoteIp),
                    });
                }
            } catch {
                // Malformed packet, skip
            }
        });

        isCapturing = true;
        console.log(`[CALL-ANALYZER] ✅ Capture started on ${device} for call ${callId} (${isVideo ? 'video' : 'voice'})`);
        return true;
    } catch (err) {
        console.error('[CALL-ANALYZER] Failed to start capture:', err);
        try {
            capSession?.close();
        } catch {}
        resetCaptureState();
        return false;
    }
}

/**
 * Stop capture and analyze collected packets.
 * Returns the analysis result with observed candidate IPs.
 */
export function stopCallCapture(): CallAnalysisResult | null {
    if (!capSession || !isCapturing) {
        console.log('[CALL-ANALYZER] No active capture to stop');
        return null;
    }

    try {
        capSession.close();
    } catch (err) {
        console.error('[CALL-ANALYZER] Error closing capture session:', err);
    }
    capSession = null;
    isCapturing = false;
    onCallPacket = null;

    const endTime = new Date();
    const durationSec = captureStartTime
        ? Math.round((endTime.getTime() - captureStartTime.getTime()) / 1000)
        : 0;

    console.log(`[CALL-ANALYZER] Capture stopped. ${capturedPackets.length} packets collected in ${durationSec}s`);

    const result = analyzePackets(
        capturedPackets,
        currentCallId || 'unknown',
        currentTargetJid || 'unknown',
        captureStartTime || new Date(),
        endTime,
        durationSec,
        currentIsVideo,
        captureInterfaceAddr
    );

    // Store in history
    const jid = currentTargetJid || 'unknown';
    if (!analysisHistory.has(jid)) {
        analysisHistory.set(jid, []);
    }
    const history = analysisHistory.get(jid)!;
    history.push(result);
    // Keep last 20 analyses per contact
    if (history.length > 20) history.shift();

    resetCaptureState();

    return result;
}

/**
 * Analyze captured packets to classify observed remote IPs
 */
function analyzePackets(
    packets: RawCallPacket[],
    callId: string,
    targetJid: string,
    startTime: Date,
    endTime: Date,
    durationSec: number,
    isVideo: boolean,
    captureInterface: string
): CallAnalysisResult {
    if (packets.length === 0) {
        return {
            callId,
            targetJid,
            startTime,
            endTime,
            durationSec,
            isVideo,
            totalPackets: 0,
            candidateIps: [],
            metaIps: [],
            verdict: 'insufficient_data',
            captureInterface,
        };
    }

    // Group packets by remote IP
    const ipStats = new Map<string, {
        packets: number;
        bytesTotal: number;
        firstSeen: Date;
        lastSeen: Date;
        ports: Set<number>;
        inbound: number;
        outbound: number;
    }>();

    const metaIpSet = new Set<string>();

    for (const pkt of packets) {
        // Determine which IP is "remote" (not local)
        const isLocalSrc = localIPs.has(pkt.srcIp) || isPrivateIP(pkt.srcIp);
        const isLocalDst = localIPs.has(pkt.dstIp) || isPrivateIP(pkt.dstIp);

        let remoteIp: string;
        let isInbound: boolean;

        if (isLocalSrc && !isLocalDst) {
            remoteIp = pkt.dstIp;
            isInbound = false;
        } else if (!isLocalSrc && isLocalDst) {
            remoteIp = pkt.srcIp;
            isInbound = true;
        } else if (!isLocalSrc && !isLocalDst) {
            // Both remote — take destination as the remote target
            remoteIp = pkt.dstIp;
            isInbound = false;
        } else {
            // Both local, skip
            continue;
        }

        // Skip private IPs
        if (isPrivateIP(remoteIp)) continue;

        // Track Meta IPs separately
        if (isMetaIP(remoteIp)) {
            metaIpSet.add(remoteIp);
        }

        if (!ipStats.has(remoteIp)) {
            ipStats.set(remoteIp, {
                packets: 0,
                bytesTotal: 0,
                firstSeen: pkt.timestamp,
                lastSeen: pkt.timestamp,
                ports: new Set(),
                inbound: 0,
                outbound: 0,
            });
        }

        const stats = ipStats.get(remoteIp)!;
        stats.packets++;
        stats.bytesTotal += pkt.length;
        stats.lastSeen = pkt.timestamp;
        if (pkt.srcPort) stats.ports.add(pkt.srcPort);
        if (pkt.dstPort) stats.ports.add(pkt.dstPort);
        if (isInbound) stats.inbound++;
        else stats.outbound++;
    }

    // Build candidate list
    const candidates: CandidateIP[] = [];

    for (const [ip, stats] of ipStats) {
        const provider = classifyIP(ip);
        const geo = lookupGeo(ip);
        const networkIntelligence = lookupNetworkIntelligence(ip, provider);

        // Determine direction
        let direction: 'incoming' | 'outgoing' | 'bidirectional';
        if (stats.inbound > 0 && stats.outbound > 0) {
            direction = 'bidirectional';
        } else if (stats.inbound > 0) {
            direction = 'incoming';
        } else {
            direction = 'outgoing';
        }

        const ports = Array.from(stats.ports).sort((a, b) => a - b).slice(0, 10);
        const score = scoreCandidate({
            provider,
            networkIntelligence,
            packets: stats.packets,
            bytesTotal: stats.bytesTotal,
            direction,
            ports,
            durationSec,
        });

        candidates.push({
            ip,
            packets: stats.packets,
            bytesTotal: stats.bytesTotal,
            firstSeen: stats.firstSeen,
            lastSeen: stats.lastSeen,
            avgSize: Math.round(stats.bytesTotal / stats.packets),
            ports,
            direction,
            provider,
            networkCategory: score.networkCategory,
            networkIntelligence,
            geo,
            confidence: score.confidence,
            confidenceScore: score.confidenceScore,
            reasonCodes: score.reasonCodes,
            technicalNote: score.technicalNote,
            isP2P: score.isP2P,
        });
    }

    // Sort direct-path candidates first, then by packet count descending
    candidates.sort((a, b) => {
        if (a.isP2P !== b.isP2P) return a.isP2P ? -1 : 1;
        return b.packets - a.packets;
    });

    // Determine verdict
    const p2pCandidates = candidates.filter(c => c.isP2P && c.confidence !== 'low');
    const hasRelay = metaIpSet.size > 0;

    let verdict: 'p2p' | 'relay' | 'mixed' | 'insufficient_data';
    if (packets.length < 10) {
        verdict = 'insufficient_data';
    } else if (p2pCandidates.length > 0 && hasRelay) {
        verdict = 'mixed';
    } else if (p2pCandidates.length > 0) {
        verdict = 'p2p';
    } else {
        verdict = 'relay';
    }

    const result: CallAnalysisResult = {
        callId,
        targetJid,
        startTime,
        endTime,
        durationSec,
        isVideo,
        totalPackets: packets.length,
        candidateIps: candidates,
        metaIps: Array.from(metaIpSet),
        verdict,
        captureInterface,
    };

    console.log(`[CALL-ANALYZER] Analysis complete: ${verdict} | ${p2pCandidates.length} direct-path candidates | ${metaIpSet.size} Meta IPs | ${packets.length} total packets`);

    return result;
}

// ── Public query functions ─────────────────────────────────────

/**
 * Get current capture status
 */
export function getCallCaptureStatus(): CallCaptureStatus {
    return {
        isCapturing,
        targetJid: currentTargetJid,
        callId: currentCallId,
        startTime: captureStartTime,
        packetsCollected: capturedPackets.length,
        elapsed: captureStartTime
            ? Math.round((Date.now() - captureStartTime.getTime()) / 1000)
            : 0,
    };
}

/**
 * Get analysis history for a specific contact
 */
export function getCallAnalysisHistory(jid: string): CallAnalysisResult[] {
    return analysisHistory.get(jid) || [];
}

/**
 * Get the latest analysis result for a contact
 */
export function getLatestCallAnalysis(jid: string): CallAnalysisResult | null {
    const history = analysisHistory.get(jid);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
}
