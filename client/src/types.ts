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
    firstSeen: string;
    lastSeen: string;
    avgSize: number;
    ports: number[];
    direction: 'incoming' | 'outgoing' | 'bidirectional';
    provider: 'meta' | 'google' | 'cloudflare' | 'unknown';
    networkCategory?: 'meta' | 'stun_turn' | 'cdn' | 'cloud_hosting' | 'consumer_isp_or_unknown' | 'unknown_public';
    networkIntelligence?: {
        asn: number | null;
        org: string;
        category: 'meta' | 'stun_turn' | 'cdn' | 'cloud_hosting' | 'consumer_isp_or_unknown' | 'unknown';
        source: 'local_rules';
        isDatacenterLikely: boolean;
        caution: string;
    };
    geo: CallGeoInfo | null;
    confidence: 'high' | 'medium' | 'low';
    confidenceScore?: number;
    reasonCodes?: Array<{
        code: string;
        label: string;
        delta: number;
    }>;
    technicalNote?: string;
    isP2P: boolean;
}

export interface CallAnalysisResult {
    callId: string;
    targetJid: string;
    startTime: string;
    endTime: string | null;
    durationSec: number;
    isVideo: boolean;
    totalPackets: number;
    candidateIps: CandidateIP[];
    metaIps: string[];
    verdict: 'p2p' | 'relay' | 'mixed' | 'insufficient_data';
    captureInterface: string;
}

export interface CallEvent {
    callId: string;
    from: string;
    status: string;
    isVideo: boolean;
    date?: string | number;
    offline?: boolean;
    latencyMs?: number;
}

export interface CallCaptureStarted {
    callId: string;
    targetJid: string;
}

export interface AuditEvent {
    _id?: string;
    caseId: string;
    operatorName: string;
    authorizationNote: string;
    action: string;
    scope: 'network' | 'call' | 'contact' | 'report' | 'system';
    targetJid?: string | null;
    details?: Record<string, unknown>;
    timestamp: string;
    timestampUtc: string;
}

export type CaseStatus = 'draft' | 'authorized' | 'active' | 'closed' | 'archived';

export interface CaseRecord {
    _id?: string;
    caseId: string;
    title: string;
    description: string | null;
    status: CaseStatus;
    primaryOperator: string;
    authorizationNote: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    openedAt: string | null;
    closedAt: string | null;
    lastAuditAt: string | null;
    lastAuditAction: string | null;
}
