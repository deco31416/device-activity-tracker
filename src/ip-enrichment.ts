import { isPrivateIP } from './meta-ip-ranges.js';
import type { CallAnalysisResult, CandidateIP } from './call-analyzer.js';

export interface IpEnrichment {
    ip: string;
    provider: 'ip-api';
    sourceUrl: string;
    status: 'success' | 'fail' | 'skipped';
    message?: string;
    continent?: string;
    country?: string;
    countryCode?: string;
    region?: string;
    regionName?: string;
    city?: string;
    postalCode?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
    isp?: string;
    org?: string;
    asn?: number | null;
    asName?: string;
    mobile?: boolean;
    proxy?: boolean;
    hosting?: boolean;
    mapsUrl?: string;
    fetchedAt: string;
    cacheTtlSec: number;
    accuracyNote: string;
}

interface IpApiResponse {
    status?: string;
    message?: string;
    query?: string;
    continent?: string;
    country?: string;
    countryCode?: string;
    region?: string;
    regionName?: string;
    city?: string;
    zip?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
    isp?: string;
    org?: string;
    as?: string;
    asname?: string;
    mobile?: boolean;
    proxy?: boolean;
    hosting?: boolean;
}

const IP_API_FIELDS = [
    'status',
    'message',
    'query',
    'continent',
    'country',
    'countryCode',
    'region',
    'regionName',
    'city',
    'zip',
    'lat',
    'lon',
    'timezone',
    'isp',
    'org',
    'as',
    'asname',
    'mobile',
    'proxy',
    'hosting',
].join(',');

const CACHE_TTL_SEC = parsePositiveInt(process.env.IP_ENRICHMENT_CACHE_TTL_SEC, 7 * 24 * 3600);
const TIMEOUT_MS = parsePositiveInt(process.env.IP_ENRICHMENT_TIMEOUT_MS, 3500);
const ENABLED = process.env.ENABLE_IP_ENRICHMENT !== 'false';
const cache = new Map<string, { value: IpEnrichment; expiresAt: number }>();

export async function enrichCallAnalysis(result: CallAnalysisResult): Promise<CallAnalysisResult> {
    if (!ENABLED || !Array.isArray(result.candidateIps) || result.candidateIps.length === 0) {
        return result;
    }

    const enrichedCandidates: CandidateIP[] = [];
    for (const candidate of result.candidateIps) {
        enrichedCandidates.push(await enrichCandidate(candidate));
    }

    return {
        ...result,
        candidateIps: enrichedCandidates,
    };
}

async function enrichCandidate(candidate: CandidateIP): Promise<CandidateIP> {
    const enrichment = await lookupIpEnrichment(candidate.ip);
    if (!enrichment || enrichment.status !== 'success') {
        return enrichment ? { ...candidate, ipEnrichment: enrichment } : candidate;
    }

    const geo = typeof enrichment.lat === 'number' && typeof enrichment.lon === 'number'
        ? {
            country: enrichment.countryCode || enrichment.country || candidate.geo?.country || '',
            region: enrichment.regionName || enrichment.region || candidate.geo?.region || '',
            city: enrichment.city || candidate.geo?.city || '',
            lat: enrichment.lat,
            lon: enrichment.lon,
            timezone: enrichment.timezone || candidate.geo?.timezone || '',
        }
        : candidate.geo;

    return {
        ...candidate,
        geo,
        ipEnrichment: enrichment,
    };
}

export async function lookupIpEnrichment(ip: string): Promise<IpEnrichment | null> {
    if (!ip || isPrivateIP(ip)) {
        return buildSkippedEnrichment(ip, 'private_or_reserved_ip');
    }

    const now = Date.now();
    const cached = cache.get(ip);
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }

    const url = buildIpApiUrl(ip);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'MONITORIZACION-DECO/2.8.0 ip-enrichment',
            },
        });
        clearTimeout(timeout);

        if (!response.ok) {
            const failed = buildFailedEnrichment(ip, url, `http_${response.status}`);
            cacheResult(ip, failed, Math.min(CACHE_TTL_SEC, 3600));
            return failed;
        }

        const payload = await response.json() as IpApiResponse;
        const normalized = normalizeIpApiResponse(payload, url);
        cacheResult(ip, normalized, CACHE_TTL_SEC);
        return normalized;
    } catch (error) {
        const failed = buildFailedEnrichment(ip, url, error instanceof Error ? error.message : 'request_failed');
        cacheResult(ip, failed, Math.min(CACHE_TTL_SEC, 1800));
        return failed;
    }
}

export function normalizeIpApiResponse(payload: IpApiResponse, sourceUrl: string): IpEnrichment {
    const ip = payload.query || '';
    const asn = parseAsn(payload.as);
    const lat = toFiniteNumber(payload.lat);
    const lon = toFiniteNumber(payload.lon);

    return {
        ip,
        provider: 'ip-api',
        sourceUrl,
        status: payload.status === 'success' ? 'success' : 'fail',
        message: payload.message,
        continent: payload.continent,
        country: payload.country,
        countryCode: payload.countryCode,
        region: payload.region,
        regionName: payload.regionName,
        city: payload.city,
        postalCode: payload.zip,
        lat,
        lon,
        timezone: payload.timezone,
        isp: payload.isp,
        org: payload.org,
        asn,
        asName: payload.asname || parseAsName(payload.as),
        mobile: payload.mobile,
        proxy: payload.proxy,
        hosting: payload.hosting,
        mapsUrl: typeof lat === 'number' && typeof lon === 'number'
            ? `https://www.google.com/maps?q=${lat},${lon}`
            : undefined,
        fetchedAt: new Date().toISOString(),
        cacheTtlSec: CACHE_TTL_SEC,
        accuracyNote: 'Ubicacion estimada de red/ISP. No confirma ubicacion fisica exacta, identidad ni titularidad del usuario.',
    };
}

function buildIpApiUrl(ip: string): string {
    return `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${encodeURIComponent(IP_API_FIELDS)}&lang=es`;
}

function buildSkippedEnrichment(ip: string, message: string): IpEnrichment {
    return {
        ip,
        provider: 'ip-api',
        sourceUrl: '',
        status: 'skipped',
        message,
        fetchedAt: new Date().toISOString(),
        cacheTtlSec: CACHE_TTL_SEC,
        accuracyNote: 'IP privada, local o reservada; no aplica geolocalizacion publica.',
    };
}

function buildFailedEnrichment(ip: string, sourceUrl: string, message: string): IpEnrichment {
    return {
        ip,
        provider: 'ip-api',
        sourceUrl,
        status: 'fail',
        message,
        fetchedAt: new Date().toISOString(),
        cacheTtlSec: CACHE_TTL_SEC,
        accuracyNote: 'No se pudo consultar el proveedor externo. Se conserva la clasificacion local disponible.',
    };
}

function cacheResult(ip: string, value: IpEnrichment, ttlSec: number): void {
    cache.set(ip, {
        value,
        expiresAt: Date.now() + ttlSec * 1000,
    });
}

function parseAsn(value?: string): number | null {
    const match = value?.match(/\bAS(\d+)\b/i);
    return match ? Number(match[1]) : null;
}

function parseAsName(value?: string): string | undefined {
    return value?.replace(/\bAS\d+\b\s*/i, '').trim() || undefined;
}

function toFiniteNumber(value?: number): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
