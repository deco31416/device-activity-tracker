import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEnrichmentClassification, normalizeDbIpResponse, normalizeIpApiResponse } from '../src/ip-enrichment.js';
import type { CandidateIP } from '../src/call-analyzer.js';

test('normalizes ip-api geolocation and ASN data', () => {
    const enrichment = normalizeIpApiResponse({
        status: 'success',
        query: '200.24.51.144',
        continent: 'Sudamerica',
        country: 'Colombia',
        countryCode: 'CO',
        region: 'ANT',
        regionName: 'Antioquia',
        city: 'Medellin',
        zip: '050036',
        lat: 6.2529,
        lon: -75.5646,
        timezone: 'America/Bogota',
        isp: 'Tigo Colombia',
        org: 'Tigo Colombia',
        as: 'AS13489 UNE EPM Telecomunicaciones S.A.',
        asname: 'UNE-EPM',
        mobile: false,
        proxy: false,
        hosting: false,
    }, 'http://ip-api.com/json/200.24.51.144');

    assert.equal(enrichment.status, 'success');
    assert.equal(enrichment.ip, '200.24.51.144');
    assert.equal(enrichment.city, 'Medellin');
    assert.equal(enrichment.regionName, 'Antioquia');
    assert.equal(enrichment.postalCode, '050036');
    assert.equal(enrichment.asn, 13489);
    assert.equal(enrichment.isp, 'Tigo Colombia');
    assert.equal(enrichment.mapsUrl, 'https://www.google.com/maps?q=6.2529,-75.5646');
    assert.match(enrichment.accuracyNote, /estimada de red/);
});

test('normalizes DB-IP free geolocation data as primary city source', () => {
    const enrichment = normalizeDbIpResponse({
        ipAddress: '200.24.51.144',
        continentCode: 'SA',
        continentName: 'South America',
        countryCode: 'CO',
        countryName: 'Colombia',
        stateProv: 'Antioquia',
        city: 'Medellin (El Poblado)',
    }, 'https://api.db-ip.com/v2/free/200.24.51.144');

    assert.equal(enrichment.provider, 'db-ip');
    assert.equal(enrichment.status, 'success');
    assert.equal(enrichment.ip, '200.24.51.144');
    assert.equal(enrichment.country, 'Colombia');
    assert.equal(enrichment.regionName, 'Antioquia');
    assert.equal(enrichment.city, 'Medellin (El Poblado)');
    assert.equal(enrichment.mapsUrl, undefined);
    assert.match(enrichment.accuracyNote, /DB-IP/);
});

test('demotes enriched CDN/cloud IPs even when initial traffic score is high', () => {
    const candidate = buildCandidate({
        ip: '143.204.23.46',
        confidenceScore: 87,
        confidence: 'high',
        packets: 227,
    });
    const enrichment = normalizeIpApiResponse({
        status: 'success',
        query: '143.204.23.46',
        country: 'Brasil',
        countryCode: 'BR',
        regionName: 'Sao Paulo',
        city: 'Sao Paulo',
        lat: -23.5558,
        lon: -46.6396,
        timezone: 'America/Sao_Paulo',
        isp: 'Amazon.com',
        org: 'AWS CloudFront (GLOBAL)',
        as: 'AS16509 Amazon.com, Inc.',
        asname: 'AMAZON-02',
        hosting: false,
        proxy: false,
    }, 'http://ip-api.com/json/143.204.23.46');

    const adjusted = applyEnrichmentClassification({ ...candidate, ipEnrichment: enrichment }, enrichment);

    assert.equal(adjusted.isP2P, false);
    assert.equal(adjusted.networkCategory, 'cdn');
    assert.equal(adjusted.networkIntelligence.isDatacenterLikely, true);
    assert.equal(adjusted.confidence, 'low');
    assert.ok(adjusted.confidenceScore <= 30);
    assert.ok(adjusted.reasonCodes.some(reason => reason.code === 'ENRICHED_CDN_PROVIDER'));
});

test('keeps enriched consumer ISP candidates eligible for corroboration', () => {
    const candidate = buildCandidate({
        ip: '190.240.115.151',
        confidenceScore: 87,
        confidence: 'high',
        packets: 92,
    });
    const enrichment = normalizeIpApiResponse({
        status: 'success',
        query: '190.240.115.151',
        country: 'Colombia',
        countryCode: 'CO',
        regionName: 'Tolima',
        city: 'Ibague',
        lat: 4.4337,
        lon: -75.2374,
        timezone: 'America/Bogota',
        isp: 'EPM Telecomunicaciones S.A. E.S.P.',
        org: 'EPM Telecomunicaciones S.A. E.S.P',
        as: 'AS13489 UNE EPM Telecomunicaciones S.A.',
        asname: 'UNE-EPM',
        hosting: false,
        proxy: false,
    }, 'http://ip-api.com/json/190.240.115.151');

    const adjusted = applyEnrichmentClassification({ ...candidate, ipEnrichment: enrichment }, enrichment);

    assert.equal(adjusted.isP2P, true);
    assert.equal(adjusted.networkCategory, 'consumer_isp_or_unknown');
    assert.equal(adjusted.confidenceScore, 87);
    assert.equal(adjusted.networkIntelligence.asn, 13489);
    assert.match(adjusted.networkIntelligence.org, /EPM/);
});

function buildCandidate(overrides: Partial<CandidateIP>): CandidateIP {
    return {
        ip: '8.8.8.8',
        packets: 100,
        bytesTotal: 12000,
        firstSeen: new Date('2026-06-23T00:00:00.000Z'),
        lastSeen: new Date('2026-06-23T00:01:00.000Z'),
        avgSize: 120,
        ports: [443],
        direction: 'bidirectional',
        provider: 'unknown',
        networkCategory: 'consumer_isp_or_unknown',
        networkIntelligence: {
            asn: null,
            org: 'Unknown public network',
            category: 'consumer_isp_or_unknown',
            source: 'local_rules',
            isDatacenterLikely: false,
            caution: 'unit test',
        },
        geo: null,
        confidence: 'high',
        confidenceScore: 87,
        reasonCodes: [{ code: 'UNIT_INITIAL', label: 'Initial score from traffic', delta: 87 }],
        technicalNote: 'unit test',
        isP2P: true,
        ...overrides,
    };
}
