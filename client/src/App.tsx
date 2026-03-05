import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { NetworkMonitor } from './components/NetworkMonitor';
import { Smartphone, Globe, Activity } from 'lucide-react';

// Create socket with autoConnect disabled so we can add listeners before connecting
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
export const socket: Socket = io(API_URL, { autoConnect: false });

export interface ConnectionState {
    whatsapp: boolean;
    whatsappQr: string | null;
}

type AppTab = 'tracker' | 'network';

function App() {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [activeTab, setActiveTab] = useState<AppTab>('tracker');
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

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('qr', onWhatsAppQr);
        socket.on('connection-open', onWhatsAppConnectionOpen);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('qr', onWhatsAppQr);
            socket.off('connection-open', onWhatsAppConnectionOpen);
        };
    }, []);

    const tabs = [
        { id: 'tracker' as AppTab, label: 'WhatsApp Tracker', icon: Smartphone },
        { id: 'network' as AppTab, label: 'Network Monitor', icon: Globe },
    ];

    return (
        <div className="min-h-screen bg-surface bg-grid">
            {/* ── Sidebar ───────────────────────────── */}
            <aside className="fixed left-0 top-0 bottom-0 w-56 bg-surface-raised border-r border-surface-border flex flex-col z-20">
                {/* Brand */}
                <div className="px-5 py-5 border-b border-surface-border">
                    <h1 className="text-xl font-extrabold tracking-tight">
                        <span className="text-txt-primary">DAT</span>
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
                            {activeTab === 'tracker' ? 'WhatsApp Tracker' : 'Network Monitor'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'tracker' && connectionState.whatsapp && (
                            <span className="badge-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                Connected
                            </span>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <div className="p-6">
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
                </div>
            </main>
        </div>
    );
}

export default App;
