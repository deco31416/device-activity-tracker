export type CandidateProvider = 'meta' | 'google' | 'cloudflare' | 'unknown';
export type CandidateDirection = 'incoming' | 'outgoing' | 'bidirectional';
export type NetworkCategory = 'meta' | 'stun_turn' | 'cdn' | 'cloud_hosting' | 'consumer_isp_or_unknown' | 'unknown_public';
export type NetworkIntelligenceCategory = 'meta' | 'stun_turn' | 'cdn' | 'cloud_hosting' | 'consumer_isp_or_unknown' | 'unknown';
export type CandidateConfidence = 'high' | 'medium' | 'low';

export interface NetworkIntelligence {
    asn: number | null;
    org: string;
    category: NetworkIntelligenceCategory;
    source: 'local_rules';
    isDatacenterLikely: boolean;
    caution: string;
}

export interface CandidateReasonCode {
    code: string;
    label: string;
    delta: number;
}

export interface CandidateScoreInput {
    provider: CandidateProvider;
    networkIntelligence: NetworkIntelligence;
    packets: number;
    bytesTotal: number;
    direction: CandidateDirection;
    ports: number[];
    durationSec: number;
}

export interface CandidateScoreResult {
    confidence: CandidateConfidence;
    confidenceScore: number;
    reasonCodes: CandidateReasonCode[];
    technicalNote: string;
    networkCategory: NetworkCategory;
    isP2P: boolean;
}

interface LocalNetworkRule {
    cidrs: string[];
    asn: number | null;
    org: string;
    category: NetworkIntelligenceCategory;
    isDatacenterLikely: boolean;
}

const LOCAL_NETWORK_RULES: LocalNetworkRule[] = [
    {
        cidrs: ['31.13.24.0/21', '31.13.64.0/18', '45.64.40.0/22', '57.141.0.0/16', '57.142.0.0/15', '57.144.0.0/14', '57.148.0.0/15', '66.220.144.0/20', '69.63.176.0/20', '69.171.224.0/19', '74.119.76.0/22', '102.132.96.0/20', '129.134.0.0/17', '147.75.208.0/20', '157.240.0.0/17', '163.70.128.0/17', '173.252.64.0/18', '179.60.192.0/22', '185.60.216.0/22', '204.15.20.0/22'],
        asn: 32934,
        org: 'Meta Platforms / Facebook',
        category: 'meta',
        isDatacenterLikely: true,
    },
    {
        cidrs: ['142.250.0.0/15', '172.217.0.0/16', '216.58.192.0/19', '216.239.32.0/19', '74.125.0.0/16', '64.233.160.0/19', '108.177.0.0/17', '34.0.0.0/8', '35.0.0.0/8'],
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
    {
        cidrs: ['200.24.48.0/20', '200.114.32.0/19'],
        asn: 13489,
        org: 'UNE EPM Telecomunicaciones / Tigo Colombia',
        category: 'consumer_isp_or_unknown',
        isDatacenterLikely: false,
    },
];

export function classifyNetworkCategory(provider: CandidateProvider): NetworkCategory {
    if (provider === 'meta') return 'meta';
    if (provider === 'google') return 'stun_turn';
    if (provider === 'cloudflare') return 'cdn';
    return 'unknown_public';
}

export function lookupNetworkIntelligence(ip: string, provider: CandidateProvider): NetworkIntelligence {
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
        const category = classifyNetworkCategory(provider);
        return {
            asn: null,
            org: provider,
            category: category === 'unknown_public' ? 'unknown' : category,
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

export function scoreCandidate(input: CandidateScoreInput): CandidateScoreResult {
    const networkCategory = input.networkIntelligence.category === 'cloud_hosting'
        ? 'cloud_hosting'
        : input.networkIntelligence.category === 'consumer_isp_or_unknown'
            ? 'consumer_isp_or_unknown'
            : classifyNetworkCategory(input.provider);
    const reasonCodes: CandidateReasonCode[] = [];
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

function clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
}

function confidenceFromScore(score: number): CandidateConfidence {
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';
    return 'low';
}
