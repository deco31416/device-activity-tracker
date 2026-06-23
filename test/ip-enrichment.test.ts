import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIpApiResponse } from '../src/ip-enrichment.js';

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
