import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildCaptureUnavailablePayload,
    buildRuntimeCapabilities,
    buildRuntimeConfig,
    resolveDeploymentMode,
    resolveLocalCaptureEnabled,
} from '../src/runtime.js';

test('resolves Railway mode from Railway environment name and disables local capture by default', () => {
    const env = { RAILWAY_ENVIRONMENT_NAME: 'production', DASHBOARD_TOKEN: 'configured' };
    const config = buildRuntimeConfig(env);
    const capabilities = buildRuntimeCapabilities(config);

    assert.equal(resolveDeploymentMode(env), 'railway-dashboard');
    assert.equal(resolveLocalCaptureEnabled(env), false);
    assert.deepEqual(capabilities, {
        mode: 'railway-dashboard',
        localCapture: false,
        whatsappTracker: true,
        reports: true,
        networkMonitor: false,
        callTrafficAnalysis: false,
        authRequired: true,
    });
});

test('resolves local-full mode and enables capture by default', () => {
    const env = { DEPLOYMENT_MODE: 'local-full' };
    const config = buildRuntimeConfig(env);
    const capabilities = buildRuntimeCapabilities(config);

    assert.equal(capabilities.mode, 'local-full');
    assert.equal(capabilities.localCapture, true);
    assert.equal(capabilities.networkMonitor, true);
    assert.equal(capabilities.callTrafficAnalysis, true);
    assert.equal(capabilities.authRequired, false);
});

test('explicit LOCAL_CAPTURE_ENABLED overrides deployment default', () => {
    assert.equal(resolveLocalCaptureEnabled({ DEPLOYMENT_MODE: 'local-full', LOCAL_CAPTURE_ENABLED: 'false' }), false);
    assert.equal(resolveLocalCaptureEnabled({ DEPLOYMENT_MODE: 'railway-dashboard', LOCAL_CAPTURE_ENABLED: 'true' }), true);
});

test('builds capture unavailable payload with operational hint', () => {
    assert.deepEqual(buildCaptureUnavailablePayload('railway-dashboard'), {
        error: 'Local packet capture is disabled in this deployment',
        mode: 'railway-dashboard',
        hint: 'Run with DEPLOYMENT_MODE=local-full and LOCAL_CAPTURE_ENABLED=true on an authorized local machine or VM.',
    });
});
