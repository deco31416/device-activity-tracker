import React, { useCallback, useState } from 'react';
import { ClipboardList, Search, ShieldCheck, Clock, Database, Download, FileText } from 'lucide-react';
import { API_URL, authFetch, downloadAuthenticatedFile } from '../auth';
import { AuditEvent } from '../types';

const SCOPE_STYLES: Record<string, string> = {
    network: 'badge-accent',
    call: 'badge-success',
    contact: 'badge-neutral',
    report: 'badge-warning',
    system: 'badge-neutral',
};

export function AuditTrail() {
    const [caseId, setCaseId] = useState('');
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchedCase, setSearchedCase] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchAudit = useCallback(async () => {
        const trimmed = caseId.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        try {
            const res = await authFetch(`${API_URL}/api/audit/${encodeURIComponent(trimmed)}?limit=200`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setEvents(Array.isArray(data) ? data : []);
            setSearchedCase(trimmed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit events');
            setEvents([]);
            setSearchedCase(trimmed);
        } finally {
            setLoading(false);
        }
    }, [caseId]);

    const onSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        fetchAudit();
    };

    const downloadAuditExport = useCallback(async () => {
        if (!searchedCase) return;
        try {
            await downloadAuthenticatedFile(
                `${API_URL}/api/audit/${encodeURIComponent(searchedCase)}/export?limit=1000`,
                `audit-${searchedCase}.json`
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download audit export');
        }
    }, [searchedCase]);

    const downloadEvidencePackage = useCallback(async () => {
        if (!searchedCase) return;
        try {
            await downloadAuthenticatedFile(
                `${API_URL}/api/evidence/${encodeURIComponent(searchedCase)}/package`,
                `evidence-${searchedCase}.json`
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download evidence package');
        }
    }, [searchedCase]);

    const downloadEvidenceZip = useCallback(async () => {
        if (!searchedCase) return;
        try {
            await downloadAuthenticatedFile(
                `${API_URL}/api/evidence/${encodeURIComponent(searchedCase)}/package.zip`,
                `evidence-${searchedCase}.zip`
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download evidence ZIP');
        }
    }, [searchedCase]);

    const downloadFinalReportJson = useCallback(async () => {
        if (!searchedCase) return;
        try {
            await downloadAuthenticatedFile(
                `${API_URL}/api/reports/${encodeURIComponent(searchedCase)}/final`,
                `final-report-${searchedCase}.json`
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download final report JSON');
        }
    }, [searchedCase]);

    const downloadFinalReportHtml = useCallback(async () => {
        if (!searchedCase) return;
        try {
            await downloadAuthenticatedFile(
                `${API_URL}/api/reports/${encodeURIComponent(searchedCase)}/final.html`,
                `final-report-${searchedCase}.html`
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download final report HTML');
        }
    }, [searchedCase]);

    const downloadFinalReportPdf = useCallback(async () => {
        if (!searchedCase) return;
        try {
            await downloadAuthenticatedFile(
                `${API_URL}/api/reports/${encodeURIComponent(searchedCase)}/final.pdf`,
                `final-report-${searchedCase}.pdf`
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download final report PDF');
        }
    }, [searchedCase]);

    const firstEvent = events[events.length - 1];
    const lastEvent = events[0];
    const operators = Array.from(new Set(events.map(event => event.operatorName).filter(Boolean)));

    return (
        <div className="space-y-4">
            <div className="card p-5">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent-muted text-accent">
                            <ClipboardList size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-txt-primary">Audit Trail</h3>
                            <p className="text-xs text-txt-dim">Consulta eventos por Case ID para revisar trazabilidad.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                        value={caseId}
                        onChange={event => setCaseId(event.target.value)}
                        placeholder="Case ID"
                        className="input-field"
                    />
                    <button
                        type="submit"
                        disabled={!caseId.trim() || loading}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Search size={16} />
                        {loading ? 'Buscando' : 'Buscar'}
                    </button>
                </form>
            </div>

            {searchedCase && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <SummaryCard label="Case ID" value={searchedCase} icon={<ShieldCheck size={16} />} />
                    <SummaryCard label="Eventos" value={String(events.length)} icon={<Database size={16} />} />
                    <SummaryCard label="Operadores" value={operators.length ? operators.join(', ') : '-'} icon={<ClipboardList size={16} />} />
                    <SummaryCard
                        label="Rango"
                        value={firstEvent && lastEvent ? `${formatTime(firstEvent.timestampUtc)} - ${formatTime(lastEvent.timestampUtc)}` : '-'}
                        icon={<Clock size={16} />}
                    />
                </div>
            )}

            {searchedCase && events.length > 0 && (
                <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-txt-primary">Exportacion con integridad</p>
                        <p className="text-xs text-txt-dim">Descarga JSON con hash SHA-256 y registra el evento de exportacion.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            type="button"
                            onClick={downloadFinalReportPdf}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            <FileText size={16} />
                            Final PDF
                        </button>
                        <button
                            type="button"
                            onClick={downloadFinalReportHtml}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            <FileText size={16} />
                            Final HTML
                        </button>
                        <button
                            type="button"
                            onClick={downloadFinalReportJson}
                            className="btn-ghost flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Final JSON
                        </button>
                        <button
                            type="button"
                            onClick={downloadAuditExport}
                            className="btn-ghost flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Audit JSON
                        </button>
                        <button
                            type="button"
                            onClick={downloadEvidencePackage}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Evidence Package
                        </button>
                        <button
                            type="button"
                            onClick={downloadEvidenceZip}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Evidence ZIP
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="card p-5 border-danger/30 text-danger text-sm">
                    Error cargando auditoria: {error}
                </div>
            )}

            {searchedCase && !loading && !error && events.length === 0 && (
                <div className="empty-state">
                    <ClipboardList size={36} className="mx-auto text-txt-dim mb-3" />
                    <p className="text-sm text-txt-muted">No hay eventos para este Case ID.</p>
                </div>
            )}

            {events.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Eventos registrados</h4>
                        <span className="badge-neutral">{events.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-surface-border text-txt-muted uppercase tracking-wider">
                                    <th className="text-left py-3 px-4">UTC</th>
                                    <th className="text-left py-3 px-4">Scope</th>
                                    <th className="text-left py-3 px-4">Action</th>
                                    <th className="text-left py-3 px-4">Operador</th>
                                    <th className="text-left py-3 px-4">Target</th>
                                    <th className="text-left py-3 px-4">Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map(event => (
                                    <tr key={event._id || `${event.timestampUtc}-${event.action}`} className="border-b border-surface-border/60 hover:bg-surface-hover">
                                        <td className="py-3 px-4 font-mono text-txt-secondary whitespace-nowrap">{formatDateTime(event.timestampUtc)}</td>
                                        <td className="py-3 px-4">
                                            <span className={SCOPE_STYLES[event.scope] || 'badge-neutral'}>{event.scope}</span>
                                        </td>
                                        <td className="py-3 px-4 text-txt-primary font-medium whitespace-nowrap">{event.action}</td>
                                        <td className="py-3 px-4 text-txt-secondary">{event.operatorName}</td>
                                        <td className="py-3 px-4 font-mono text-txt-dim">{event.targetJid || '-'}</td>
                                        <td className="py-3 px-4">
                                            <code className="text-[10px] text-txt-dim break-all">
                                                {event.details ? JSON.stringify(event.details) : '{}'}
                                            </code>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="stat-card min-w-0">
            <div className="stat-icon bg-surface-hover text-txt-dim">{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] text-txt-muted uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-txt-primary truncate">{value}</p>
            </div>
        </div>
    );
}

function formatDateTime(value: string) {
    if (!value) return '-';
    return new Date(value).toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function formatTime(value: string) {
    if (!value) return '-';
    return new Date(value).toISOString().slice(11, 19);
}
