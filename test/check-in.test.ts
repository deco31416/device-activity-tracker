import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckInHash, createCheckInToken, normalizeCheckInSubmission, renderCheckInPage } from '../src/check-in.js';
import type { CheckInDoc } from '../src/db.js';

function fixture(): CheckInDoc {
    const now = new Date('2026-06-22T22:00:00.000Z');
    return {
        token: 'tok_123',
        caseId: 'CASE-TEST',
        operatorName: 'Deco31416',
        authorizationNote: 'Autorizado',
        label: 'Prueba autorizada',
        targetName: 'Decode1010',
        targetJid: null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date('2026-06-23T22:00:00.000Z'),
        completedAt: null,
        request: null,
        browser: null,
        consent: {
            accepted: false,
            text: 'consent',
            acceptedAt: null,
        },
        location: null,
        ipEnrichment: null,
        hash: '',
    };
}

test('creates URL-safe check-in tokens', () => {
    const token = createCheckInToken();
    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.ok(token.length >= 32);
});

test('builds stable hash while ignoring existing hash field', () => {
    const doc = fixture();
    const first = buildCheckInHash(doc);
    const second = buildCheckInHash({ ...doc, hash: 'different' });
    assert.equal(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
});

test('normalizes check-in submission safely', () => {
    const normalized = normalizeCheckInSubmission({
        consentAccepted: true,
        browser: {
            timezone: 'America/Bogota',
            screen: { width: '390', height: 844, pixelRatio: 2 },
        },
        location: {
            permission: 'granted',
            lat: '6.25',
            lon: -75.56,
            accuracy: 24,
        },
    });

    assert.equal(normalized.consentAccepted, true);
    assert.equal(normalized.browser?.timezone, 'America/Bogota');
    assert.equal(normalized.browser?.screen?.width, 390);
    assert.equal(normalized.location?.permission, 'granted');
    assert.equal(normalized.location?.lat, 6.25);
});

test('renders explicit consent page without raw script injection', () => {
    const html = renderCheckInPage({ ...fixture(), label: '<script>alert(1)</script>' });
    assert.match(html, /Check-in autorizado/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<div class="value"><script>alert/);
});
