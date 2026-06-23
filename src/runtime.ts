export interface RuntimeConfig {
    deploymentMode: string;
    localCaptureEnabled: boolean;
    dashboardTokenConfigured: boolean;
}

export interface RuntimeCapabilities {
    mode: string;
    localCapture: boolean;
    whatsappTracker: boolean;
    reports: boolean;
    networkMonitor: boolean;
    callTrafficAnalysis: boolean;
    authRequired: boolean;
}

export function resolveDeploymentMode(env: NodeJS.ProcessEnv): string {
    return env.DEPLOYMENT_MODE || (env.RAILWAY_ENVIRONMENT_NAME ? 'railway-dashboard' : 'local-full');
}

export function resolveLocalCaptureEnabled(env: NodeJS.ProcessEnv, deploymentMode = resolveDeploymentMode(env)): boolean {
    return env.LOCAL_CAPTURE_ENABLED
        ? env.LOCAL_CAPTURE_ENABLED === 'true'
        : deploymentMode === 'local-full';
}

export function buildRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
    const deploymentMode = resolveDeploymentMode(env);
    return {
        deploymentMode,
        localCaptureEnabled: resolveLocalCaptureEnabled(env, deploymentMode),
        dashboardTokenConfigured: Boolean(env.DASHBOARD_TOKEN),
    };
}

export function buildRuntimeCapabilities(config: RuntimeConfig): RuntimeCapabilities {
    return {
        mode: config.deploymentMode,
        localCapture: config.localCaptureEnabled,
        whatsappTracker: true,
        reports: true,
        networkMonitor: config.localCaptureEnabled,
        callTrafficAnalysis: config.localCaptureEnabled,
        authRequired: config.dashboardTokenConfigured,
    };
}

export function buildCaptureUnavailablePayload(deploymentMode: string) {
    return {
        error: 'Local packet capture is disabled in this deployment',
        mode: deploymentMode,
        hint: 'Run with DEPLOYMENT_MODE=local-full and LOCAL_CAPTURE_ENABLED=true on an authorized local machine or VM.',
    };
}
