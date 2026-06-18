import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { NetworkMonitor } from './components/NetworkMonitor';
import { AuditTrail } from './components/AuditTrail';
import { Cases } from './components/Cases';
import { Smartphone, Globe, Activity, ClipboardList, Briefcase } from 'lucide-react';
import { API_URL, clearDashboardToken, getDashboardToken, setDashboardToken } from './auth';

// Create socket with autoConnect disabled so we can add listeners before connecting
export const socket: Socket = io(API_URL, { autoConnect: false });

export interface ConnectionState {
    whatsapp: boolean;
    whatsappQr: string | null;
}

interface RuntimeCapabilities {
    mode: string;
    localCapture: boolean;
    networkMonitor: boolean;
    callTrafficAnalysis: boolean;
    authRequired?: boolean;
}

type AppTab = 'cases' | 'tracker' | 'network' | 'audit';

function App() {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [activeTab, setActiveTab] = useState<AppTab>('cases');
    const [capabilities, setCapabilities] = useState<RuntimeCapabilities | null>(null);
    const [authToken, setAuthToken] = useState(getDashboardToken());
    const [authInput, setAuthInput] = useState(getDashboardToken());
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        whatsapp: false,
        whatsappQr: null
    });

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
            setConnectionState({
                whatsapp: false,
                whatsappQr: null
            });
        }

        function onWhatsAppConnectionOpen() {
            setConnectionState(prev => ({ ...prev, whatsapp: true, whatsappQr: null }));
        }

        function onWhatsAppQr(qr: string) {
            console.log('[WHATSAPP] Received QR code');
            setConnectionState(prev => ({ ...prev, whatsappQr: qr }));
        }

        socket.auth = authToken ? { token: authToken } : {};

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('qr', onWhatsAppQr);
        socket.on('connection-open', onWhatsAppConnectionOpen);

        const requiresAuth = capabilities?.authRequired;
        const canConnect = !requiresAuth || !!authToken;
        if (canConnect && !socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('qr', onWhatsAppQr);
            socket.off('connection-open', onWhatsAppConnectionOpen);
        };
    }, [authToken, capabilities?.authRequired]);

    useEffect(() => {
        fetch(`${API_URL}/api/runtime-capabilities`)
            .then(r => r.json())
            .then(setCapabilities)
            .catch(() => setCapabilities({
                mode: 'local-full',
                localCapture: true,
                networkMonitor: true,
                callTrafficAnalysis: true,
            }));
    }, []);

    useEffect(() => {
        if (capabilities?.authRequired && !authToken && socket.connected) {
            socket.disconnect();
        }
    }, [authToken, capabilities?.authRequired]);

    useEffect(() => {
        if (activeTab === 'network' && capabilities && !capabilities.networkMonitor) {
            setActiveTab('tracker');
        }
    }, [activeTab, capabilities]);

    const tabs = [
        { id: 'cases' as AppTab, label: 'Cases', icon: Briefcase },
        { id: 'tracker' as AppTab, label: 'WhatsApp Tracker', icon: Smartphone },
        ...(capabilities?.networkMonitor ? [{ id: 'network' as AppTab, label: 'Network Monitor', icon: Globe }] : []),
        { id: 'audit' as AppTab, label: 'Audit Trail', icon: ClipboardList },
    ];

    const pageTitle = {
        cases: 'Cases',
        tracker: 'WhatsApp Tracker',
        network: 'Network Monitor',
        audit: 'Audit Trail',
    }[activeTab];

    const handleAuthSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setDashboardToken(authInput);
        setAuthToken(authInput.trim());
        if (socket.connected) socket.disconnect();
    };

    const handleLogout = () => {
        clearDashboardToken();
        setAuthToken('');
        setAuthInput('');
        socket.disconnect();
    };

    if (capabilities?.authRequired && !authToken) {
        return (
            <div className="min-h-screen bg-surface bg-grid flex items-center justify-center p-6">
                <form onSubmit={handleAuthSubmit} className="card max-w-md w-full p-6 space-y-4">
                    <div>
                        <h1 className="text-xl font-bold text-txt-primary">Dashboard Access</h1>
                        <p className="text-sm text-txt-muted mt-1">Ingresa el token configurado en `DASHBOARD_TOKEN`.</p>
                    </div>
                    <input
                        value={authInput}
                        onChange={event => setAuthInput(event.target.value)}
                        type="password"
                        placeholder="Dashboard token"
                        className="input-field"
                        autoFocus
                    />
                    <button disabled={!authInput.trim()} className="btn-primary w-full" type="submit">
                        Entrar
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface bg-grid">
            {/* ── Sidebar ───────────────────────────── */}
            <aside className="fixed left-0 top-0 bottom-0 w-56 bg-surface-raised border-r border-surface-border flex flex-col z-20">
                {/* Brand */}
                <div className="px-5 py-5 border-b border-surface-border">
                    <h1 className="text-xl font-extrabold tracking-tight">
                        <span className="text-txt-primary">DECO31416</span>
                        <span className="text-accent">.</span>
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    isActive
                                        ? 'bg-accent text-white shadow-glow-sm'
                                        : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                                }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Status footer */}
                <div className="px-4 py-4 border-t border-surface-border space-y-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse-slow' : 'bg-danger'}`} />
                        <span className="text-xs text-txt-muted">{isConnected ? 'Server Connected' : 'Disconnected'}</span>
                    </div>
                    {isConnected && connectionState.whatsapp && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
                            <span className="text-xs text-txt-muted">WhatsApp Active</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Main Content ──────────────────────── */}
            <main className="ml-56 min-h-screen">
                {/* Top bar */}
                <header className="sticky top-0 z-10 glass px-6 py-3 flex items-center justify-between border-b border-surface-border">
                    <div className="flex items-center gap-3">
                        <Activity size={18} className="text-accent" />
                        <h2 className="text-lg font-semibold text-txt-primary">
                            {pageTitle}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'tracker' && connectionState.whatsapp && (
                            <span className="badge-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                Connected
                            </span>
                        )}
                        {capabilities && !capabilities.localCapture && (
                            <span className="badge">
                                Dashboard Mode
                            </span>
                        )}
                        {capabilities?.authRequired && (
                            <button onClick={handleLogout} className="btn-ghost !py-1 !px-3 !text-xs">
                                Logout
                            </button>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <div className="p-6">
                    {activeTab === 'cases' && (
                        <Cases />
                    )}
                    {activeTab === 'tracker' && (
                        <>
                            {!connectionState.whatsapp ? (
                                <Login connectionState={connectionState} />
                            ) : (
                                <Dashboard connectionState={connectionState} />
                            )}
                        </>
                    )}
                    {activeTab === 'network' && (
                        <NetworkMonitor />
                    )}
                    {activeTab === 'audit' && (
                        <AuditTrail />
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
