import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Code, Download, FileDown, FileText, Globe } from 'lucide-react';
import clsx from 'clsx';

interface ActivityEntry {
    state: string;
    timestamp: string;
    rtt: number;
}

interface JournalEntry {
    utc: string;
    local: string;
    date: string;
    rawTimestamp: string;
    state: string;
    stateLabel: string;
    description: string;
    rtt: number;
}

interface ActivityJournalPanelProps {
    activity: ActivityEntry[];
    jid: string;
    displayNumber: string;
    privacyMode: boolean;
    onDownloadFullReport: () => void;
}

const LOG_PAGE_SIZE = 15;

export function ActivityJournalPanel({
    activity,
    jid,
    displayNumber,
    privacyMode,
    onDownloadFullReport,
}: ActivityJournalPanelProps) {
    const [logPage, setLogPage] = useState(1);
    const entries = useMemo(() => buildJournalEntries(activity), [activity]);
    const totalLogPages = Math.max(1, Math.ceil(entries.length / LOG_PAGE_SIZE));
    const pagedEntries = entries.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE);

    const exportJson = () => {
        const data = {
            contact: privacyMode ? '***' : displayNumber,
            jid: privacyMode ? '***' : jid,
            generatedAt: new Date().toISOString(),
            totalEvents: entries.length,
            events: entries.map(entry => ({
                utc: entry.utc,
                local: entry.local,
                date: entry.date,
                state: entry.stateLabel,
                description: entry.description,
                rtt_ms: entry.rtt,
            })),
        };
        downloadBlob(
            new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
            `bitacora-${displayNumber}-${new Date().toISOString().slice(0, 10)}.json`,
        );
    };

    const exportHtml = () => {
        const rows = entries.map(entry => {
            const color = stateColor(entry.state);
            return `<tr>
                <td style="padding:8px;font-family:monospace;white-space:nowrap">${entry.date}</td>
                <td style="padding:8px;font-family:monospace;white-space:nowrap">${entry.local} (${entry.utc} UTC)</td>
                <td style="padding:8px;color:${color};font-weight:600">${entry.stateLabel}</td>
                <td style="padding:8px">${entry.description}</td>
            </tr>`;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Bitacora - ${privacyMode ? '***' : displayNumber}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#070b18;color:#f1f5f9;padding:40px}
h1{font-size:20px;color:#25d366;margin-bottom:4px}
.meta{color:#64748b;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;background:#0f1629;border-radius:12px;overflow:hidden}
th{background:#1e2545;padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:1px}
td{border-bottom:1px solid #1e2545;font-size:13px}
tr:hover{background:#141b2d}
.footer{margin-top:20px;color:#475569;font-size:11px;text-align:center}
</style></head><body>
<h1>Bitacora de Actividad</h1>
<div class="meta">Contacto: ${privacyMode ? '***' : displayNumber} - Generado: ${new Date().toLocaleString('es-MX')} - Total eventos: ${entries.length}</div>
<table><thead><tr><th>Fecha</th><th>Hora (Local / UTC)</th><th>Estado</th><th>Descripcion</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">WP MONITOR - Activity Journal</div>
</body></html>`;
        downloadBlob(
            new Blob([html], { type: 'text/html' }),
            `bitacora-${displayNumber}-${new Date().toISOString().slice(0, 10)}.html`,
        );
    };

    const exportPdf = () => {
        const rows = entries.map(entry => {
            const color = stateColor(entry.state, true);
            return `<tr>
                <td style="padding:6px 8px;font-family:monospace;font-size:11px;white-space:nowrap;border-bottom:1px solid #e2e8f0">${entry.date}</td>
                <td style="padding:6px 8px;font-family:monospace;font-size:11px;white-space:nowrap;border-bottom:1px solid #e2e8f0">${entry.local}<br/><span style="color:#94a3b8;font-size:9px">${entry.utc} UTC</span></td>
                <td style="padding:6px 8px;color:${color};font-weight:700;font-size:11px;border-bottom:1px solid #e2e8f0">${entry.stateLabel}</td>
                <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #e2e8f0">${entry.description}</td>
            </tr>`;
        }).join('\n');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bitacora ${displayNumber}</title>
<style>@media print{body{margin:0}}body{font-family:system-ui,sans-serif;padding:20px;color:#1e293b}
h1{font-size:16px;margin-bottom:2px}
.meta{color:#64748b;font-size:11px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f1f5f9;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #cbd5e1}
</style></head><body>
<h1>Bitacora de Actividad</h1>
<div class="meta">Contacto: ${privacyMode ? '***' : displayNumber} - ${new Date().toLocaleString('es-MX')} - ${entries.length} eventos</div>
<table><thead><tr><th>Fecha</th><th>Hora</th><th>Estado</th><th>Descripcion</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
    };

    return (
        <div className="bg-surface-overlay rounded-xl border border-surface-border overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-accent" />
                    <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Bitacora de Actividad</h5>
                    <span className="badge-neutral !text-[9px] !py-0 !px-1.5">{entries.length} eventos</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={exportJson} className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1" title="Exportar JSON">
                        <Code size={10} /> JSON
                    </button>
                    <button onClick={exportHtml} className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1" title="Exportar HTML">
                        <Globe size={10} /> HTML
                    </button>
                    <button onClick={exportPdf} className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1" title="Imprimir / PDF">
                        <FileDown size={10} /> PDF
                    </button>
                    <button
                        type="button"
                        onClick={onDownloadFullReport}
                        className="btn-ghost !text-[10px] !py-1 !px-2 flex items-center gap-1"
                        title="Reporte completo"
                    >
                        <Download size={10} /> Full
                    </button>
                </div>
            </div>

            {entries.length === 0 ? (
                <div className="p-4 space-y-3">
                    {[...Array(5)].map((_, index) => (
                        <div key={index} className="flex items-center gap-3 animate-pulse">
                            <div className="w-16 h-4 bg-surface-hover rounded" />
                            <div className="w-16 h-4 bg-surface-hover rounded" />
                            <div className="w-20 h-4 bg-surface-hover rounded" />
                            <div className="flex-1 h-4 bg-surface-hover rounded" />
                        </div>
                    ))}
                    <p className="text-center text-[10px] text-txt-dim mt-2">Esperando cambios de estado...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-[80px_90px_100px_1fr] gap-0 px-5 py-2 bg-surface-hover text-[10px] font-semibold text-txt-dim uppercase tracking-wider">
                        <span>Fecha</span>
                        <span>Hora</span>
                        <span>Estado</span>
                        <span>Descripcion</span>
                    </div>

                    <div className="divide-y divide-surface-border">
                        {pagedEntries.map((entry, index) => (
                            <JournalRow key={`${entry.rawTimestamp}-${index}`} entry={entry} />
                        ))}
                    </div>

                    {totalLogPages > 1 && (
                        <Pagination
                            logPage={logPage}
                            totalLogPages={totalLogPages}
                            totalEntries={entries.length}
                            onPageChange={setLogPage}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function JournalRow({ entry }: { entry: JournalEntry }) {
    const rowColor = entry.state.includes('Online') ? 'text-success'
        : entry.state === 'Standby' ? 'text-warning'
        : entry.state === 'OFFLINE' ? 'text-danger' : 'text-txt-secondary';
    const bgHover = entry.state.includes('Online') ? 'hover:bg-success/5'
        : entry.state === 'OFFLINE' ? 'hover:bg-danger/5'
        : 'hover:bg-surface-hover';

    return (
        <div className={`grid grid-cols-[80px_90px_100px_1fr] gap-0 px-5 py-2.5 transition-colors ${bgHover}`}>
            <span className="text-[11px] font-mono text-txt-dim">{entry.date}</span>
            <div className="flex flex-col">
                <span className="text-[11px] font-mono text-txt-secondary font-medium">{entry.local}</span>
                <span className="text-[9px] font-mono text-txt-dim">{entry.utc} UTC</span>
            </div>
            <span className={`text-[11px] font-bold ${rowColor}`}>
                {entry.stateLabel}
            </span>
            <span className="text-[11px] text-txt-secondary leading-relaxed">
                {entry.description}
            </span>
        </div>
    );
}

function Pagination({
    logPage,
    totalLogPages,
    totalEntries,
    onPageChange,
}: {
    logPage: number;
    totalLogPages: number;
    totalEntries: number;
    onPageChange: (page: number | ((page: number) => number)) => void;
}) {
    return (
        <div className="px-5 py-2.5 border-t border-surface-border flex items-center justify-between">
            <span className="text-[10px] text-txt-dim">
                Mostrando {(logPage - 1) * LOG_PAGE_SIZE + 1}-{Math.min(logPage * LOG_PAGE_SIZE, totalEntries)} de {totalEntries}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page => Math.max(1, page - 1))}
                    disabled={logPage === 1}
                    className="btn-ghost !p-1 disabled:opacity-30"
                >
                    <ChevronLeft size={14} />
                </button>
                {[...Array(Math.min(totalLogPages, 5))].map((_, index) => {
                    const pageNum = resolveVisiblePageNumber(index, logPage, totalLogPages);
                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={clsx(
                                'w-6 h-6 rounded-md text-[10px] font-medium transition-colors',
                                logPage === pageNum
                                    ? 'bg-accent/15 text-accent border border-accent/25'
                                    : 'text-txt-muted hover:bg-surface-hover',
                            )}
                        >
                            {pageNum}
                        </button>
                    );
                })}
                <button
                    onClick={() => onPageChange(page => Math.min(totalLogPages, page + 1))}
                    disabled={logPage === totalLogPages}
                    className="btn-ghost !p-1 disabled:opacity-30"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

function buildJournalEntries(activity: ActivityEntry[]): JournalEntry[] {
    return activity.slice().reverse().map(entry => ({
        utc: toMilitary(entry.timestamp),
        local: toMilitaryLocal(entry.timestamp),
        date: toDateStr(entry.timestamp),
        rawTimestamp: entry.timestamp,
        state: entry.state,
        stateLabel: describeStateShort(entry.state),
        description: describeState(entry.state, entry.rtt),
        rtt: entry.rtt,
    }));
}

function resolveVisiblePageNumber(index: number, logPage: number, totalLogPages: number): number {
    if (totalLogPages <= 5) return index + 1;
    if (logPage <= 3) return index + 1;
    if (logPage >= totalLogPages - 2) return totalLogPages - 4 + index;
    return logPage - 2 + index;
}

function toMilitary(ts: string | number) {
    const date = new Date(ts);
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`;
}

function toMilitaryLocal(ts: string | number) {
    const date = new Date(ts);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function toDateStr(ts: string | number) {
    return new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function describeState(state: string, rtt: number): string {
    if (state.includes('Online')) return `El contacto se CONECTO - Dispositivo activo (respuesta: ${rtt}ms)`;
    if (state === 'Standby') return `El contacto paso a ESPERA - App abierta en segundo plano (respuesta: ${rtt}ms)`;
    if (state === 'OFFLINE') return 'El contacto se DESCONECTO - No hay actividad detectada';
    return `Estado cambiado a ${state} (respuesta: ${rtt}ms)`;
}

function describeStateShort(state: string): string {
    if (state.includes('Online')) return 'CONECTADO';
    if (state === 'Standby') return 'EN ESPERA';
    if (state === 'OFFLINE') return 'DESCONECTADO';
    return state;
}

function stateColor(state: string, print = false): string {
    if (state.includes('Online')) return print ? '#1faa59' : '#25d366';
    if (state === 'Standby') return print ? '#ca8a04' : '#eab308';
    if (state === 'OFFLINE') return print ? '#dc2626' : '#ef4444';
    return print ? '#64748b' : '#94a3b8';
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
