import { createHash } from 'crypto';
import { getAuditEvents, getCallAnalysesByCallIds, getCase, getCaseEvidenceLinks } from './db.js';
export function hashJson(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value, null, 2)).digest('hex');
}

function extractCallIdsFromAudit(events: Awaited<ReturnType<typeof getAuditEvents>>): string[] {
    const ids = new Set<string>();
    for (const event of events) {
        const callId = event.details?.callId;
        if (typeof callId === 'string' && callId.trim()) ids.add(callId.trim());
    }
    return Array.from(ids);
}

function buildNetworkSummary(events: Awaited<ReturnType<typeof getAuditEvents>>) {
    const captureStarts = events.filter(event => event.scope === 'network' && event.action === 'capture_start');
    const captureStops = events.filter(event => event.scope === 'network' && event.action === 'capture_stop');
    const stopStats = captureStops
        .map(event => event.details?.stats)
        .filter(Boolean);

    return {
        captureStartCount: captureStarts.length,
        captureStopCount: captureStops.length,
        latestStats: stopStats[0] || null,
        captures: captureStops.map(event => ({
            timestampUtc: event.timestampUtc,
            operatorName: event.operatorName,
            stats: event.details?.stats || null,
        })),
    };
}

export async function buildEvidencePackage(caseId: string) {
    const [caseRecord, auditEvents, evidenceLinks] = await Promise.all([
        getCase(caseId),
        getAuditEvents(caseId, 5000),
        getCaseEvidenceLinks(caseId),
    ]);

    if (!caseRecord && auditEvents.length === 0 && evidenceLinks.length === 0) return null;

    const directCallIds = evidenceLinks
        .filter(link => link.type === 'call_analysis')
        .map(link => link.refId);
    const callIds = Array.from(new Set([...extractCallIdsFromAudit(auditEvents), ...directCallIds]));
    const callAnalyses = await getCallAnalysesByCallIds(callIds);
    const networkSummary = buildNetworkSummary(auditEvents);
    const generatedAt = new Date().toISOString();

    const sections = {
        case: caseRecord,
        audit: auditEvents,
        evidenceLinks,
        callAnalysis: callAnalyses,
        networkSummary,
    };

    const sectionHashes = {
        case: hashJson(sections.case),
        audit: hashJson(sections.audit),
        evidenceLinks: hashJson(sections.evidenceLinks),
        callAnalysis: hashJson(sections.callAnalysis),
        networkSummary: hashJson(sections.networkSummary),
    };

    const manifest = {
        packageType: 'evidence-package',
        version: '1.0',
        software: {
            name: 'Device Activity Tracker',
            version: '2.5.0',
            developedBy: 'Deco31416',
        },
        caseId,
        generatedAt,
        contents: [
            { name: 'case', format: 'json', sha256: sectionHashes.case },
            { name: 'audit', format: 'json', sha256: sectionHashes.audit, count: auditEvents.length },
            { name: 'evidenceLinks', format: 'json', sha256: sectionHashes.evidenceLinks, count: evidenceLinks.length },
            { name: 'callAnalysis', format: 'json', sha256: sectionHashes.callAnalysis, count: callAnalyses.length },
            { name: 'networkSummary', format: 'json', sha256: sectionHashes.networkSummary },
        ],
        limitations: [
            'Traffic analysis is based on observed metadata only.',
            'Candidate IPs do not prove identity, exact location, or ownership by a person.',
            'WhatsApp/WebRTC traffic may use relays, NAT, VPNs, CGNAT, or provider infrastructure.',
        ],
    };

    const packageWithoutIntegrity = {
        manifest,
        sections,
    };

    return {
        ...packageWithoutIntegrity,
        integrity: {
            algorithm: 'SHA-256',
            sectionHashes,
            packageHash: hashJson(packageWithoutIntegrity),
            canonicalPayload: 'JSON.stringify({ manifest, sections }, null, 2)',
        },
    };
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatReportDate(value: unknown): string {
    if (!value) return '-';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '-';
    return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function getCandidateScore(candidate: any): number {
    if (typeof candidate?.confidenceScore === 'number') {
        return Math.max(0, Math.min(100, Math.round(candidate.confidenceScore)));
    }
    if (candidate?.confidence === 'high') return 80;
    if (candidate?.confidence === 'medium') return 55;
    return 25;
}

export function buildFinalCaseReport(evidencePackage: NonNullable<Awaited<ReturnType<typeof buildEvidencePackage>>>) {
    const generatedAt = new Date().toISOString();
    const caseRecord = evidencePackage.sections.case;
    const auditEvents = evidencePackage.sections.audit || [];
    const evidenceLinks = evidencePackage.sections.evidenceLinks || [];
    const callAnalysis = evidencePackage.sections.callAnalysis || [];

    const operators = Array.from(new Set(auditEvents.map(event => event.operatorName).filter(Boolean)));
    const targets = Array.from(new Set([
        ...auditEvents.map(event => event.targetJid).filter(Boolean),
        ...evidenceLinks.map(link => link.targetJid).filter(Boolean),
    ]));
    const candidateIps = callAnalysis
        .flatMap((analysis: any) => (analysis.candidateIps || [])
            .filter((candidate: any) => candidate.isP2P)
            .map((candidate: any) => ({
                callId: analysis.callId,
                targetJid: analysis.targetJid,
                ip: candidate.ip,
                score: getCandidateScore(candidate),
                confidence: candidate.confidence || 'low',
                networkCategory: candidate.networkCategory || 'unknown_public',
                packets: candidate.packets || 0,
                direction: candidate.direction || 'unknown',
                provider: candidate.provider || 'unknown',
                networkIntelligence: candidate.networkIntelligence || null,
                ports: candidate.ports || [],
                geo: candidate.geo || null,
                reasonCodes: candidate.reasonCodes || [],
                technicalNote: candidate.technicalNote || 'IP publica observada como candidata tecnica. No confirma identidad, ubicacion exacta ni titularidad.',
            })))
        .sort((a: any, b: any) => b.score - a.score || b.packets - a.packets);

    const timeline = auditEvents
        .slice()
        .sort((a, b) => new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime())
        .map(event => ({
            timestampUtc: event.timestampUtc,
            scope: event.scope,
            action: event.action,
            operatorName: event.operatorName,
            targetJid: event.targetJid || null,
            details: event.details || {},
        }));

    const summary = {
        caseId: evidencePackage.manifest.caseId,
        title: caseRecord?.title || evidencePackage.manifest.caseId,
        status: caseRecord?.status || 'unknown',
        generatedAt,
        primaryOperator: caseRecord?.primaryOperator || operators[0] || 'system',
        operators,
        targetCount: targets.length,
        auditEventCount: auditEvents.length,
        evidenceLinkCount: evidenceLinks.length,
        callAnalysisCount: callAnalysis.length,
        networkCaptureCount: evidencePackage.sections.networkSummary?.captureStopCount || 0,
        candidateIpCount: candidateIps.length,
        highestCandidateScore: candidateIps[0]?.score || 0,
    };

    const findings = {
        activity: {
            firstEventUtc: timeline[0]?.timestampUtc || null,
            lastEventUtc: timeline[timeline.length - 1]?.timestampUtc || null,
            actions: Array.from(new Set(timeline.map(item => item.action))),
        },
        network: evidencePackage.sections.networkSummary,
        candidateIps,
        limitations: evidencePackage.manifest.limitations,
    };

    const reportWithoutIntegrity = {
        reportType: 'final-case-report',
        version: '1.0',
        software: evidencePackage.manifest.software,
        summary,
        authorization: {
            caseId: summary.caseId,
            authorizationNote: caseRecord?.authorizationNote || 'Not recorded',
            description: caseRecord?.description || null,
            tags: caseRecord?.tags || [],
        },
        findings,
        timeline,
        evidence: {
            links: evidenceLinks,
            sourceEvidencePackageHash: evidencePackage.integrity.packageHash,
            sourceSectionHashes: evidencePackage.integrity.sectionHashes,
        },
    };

    return {
        ...reportWithoutIntegrity,
        integrity: {
            algorithm: 'SHA-256',
            reportHash: hashJson(reportWithoutIntegrity),
            sourceEvidencePackageHash: evidencePackage.integrity.packageHash,
            canonicalPayload: 'JSON.stringify(finalReportWithoutIntegrity, null, 2)',
        },
    };
}

export function renderFinalCaseReportHtml(report: ReturnType<typeof buildFinalCaseReport>): string {
    const topCandidates = report.findings.candidateIps.slice(0, 10);
    const timelineRows = report.timeline.slice(-80);
    const scoreTone = report.summary.highestCandidateScore >= 75
        ? 'strong'
        : report.summary.highestCandidateScore >= 45
            ? 'medium'
            : 'low';

    const candidateRows = topCandidates.length
        ? topCandidates.map((candidate: any) => `
            <tr>
                <td><code>${escapeHtml(candidate.ip)}</code></td>
                <td><span class="score ${candidate.score >= 75 ? 'strong' : candidate.score >= 45 ? 'medium' : 'low'}">${candidate.score}/100</span></td>
                <td>${escapeHtml(candidate.networkCategory)}</td>
                <td>${escapeHtml(candidate.networkIntelligence?.asn ? `AS${candidate.networkIntelligence.asn}` : '-')}<br><span class="muted">${escapeHtml(candidate.networkIntelligence?.org || '-')}</span></td>
                <td>${escapeHtml(candidate.direction)}</td>
                <td>${escapeHtml(candidate.packets)}</td>
                <td>${escapeHtml(candidate.geo?.country || '-')} / ${escapeHtml(candidate.geo?.city || candidate.geo?.region || '-')}</td>
                <td>${escapeHtml(candidate.technicalNote)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="8" class="muted">No se registraron IPs candidatas en los analisis vinculados.</td></tr>';

    const timelineHtml = timelineRows.length
        ? timelineRows.map(item => `
            <tr>
                <td>${escapeHtml(formatReportDate(item.timestampUtc))}</td>
                <td>${escapeHtml(item.scope)}</td>
                <td>${escapeHtml(item.action)}</td>
                <td>${escapeHtml(item.operatorName)}</td>
                <td><code>${escapeHtml(item.targetJid || '-')}</code></td>
            </tr>
        `).join('')
        : '<tr><td colspan="5" class="muted">No hay eventos de auditoria disponibles.</td></tr>';

    const limitationHtml = report.findings.limitations
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join('');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Final Case Report ${escapeHtml(report.summary.caseId)}</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#637083; --line:#d9e0ea; --soft:#f4f7fb; --brand:#0f766e; --warn:#b45309; --bad:#b91c1c; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: #fff; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px; }
    header { border-bottom: 2px solid var(--ink); padding-bottom: 22px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr auto; gap: 24px; }
    h1 { margin: 0; font-size: 28px; line-height: 1.1; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 16px; text-transform: uppercase; letter-spacing: .06em; }
    h3 { margin: 0 0 8px; font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
    p { margin: 0; line-height: 1.5; }
    code { font-family: "Cascadia Mono", Consolas, monospace; font-size: 11px; }
    .meta { text-align: right; color: var(--muted); font-size: 12px; }
    .brand { color: var(--brand); font-weight: 800; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0 28px; }
    .metric { border: 1px solid var(--line); background: var(--soft); padding: 14px; min-height: 88px; }
    .metric strong { display: block; font-size: 24px; margin-bottom: 4px; }
    .metric span { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    section { margin: 28px 0; break-inside: avoid; }
    .panel { border: 1px solid var(--line); padding: 16px; background: #fff; }
    .notice { border-left: 4px solid var(--warn); background: #fff7ed; padding: 14px 16px; color: #7c2d12; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--line); padding: 9px 8px; }
    td { border-bottom: 1px solid var(--line); padding: 10px 8px; vertical-align: top; }
    .score { display: inline-block; min-width: 58px; text-align: center; padding: 3px 7px; border-radius: 999px; font-weight: 800; }
    .score.strong { background: #dcfce7; color: #166534; }
    .score.medium { background: #fef3c7; color: #92400e; }
    .score.low { background: #e5e7eb; color: #374151; }
    .verdict { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--soft); border: 1px solid var(--line); font-weight: 800; }
    .muted { color: var(--muted); }
    .hash { word-break: break-all; color: var(--muted); font-size: 11px; }
    footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; display: flex; justify-content: space-between; gap: 16px; }
    @media print { main { padding: 18mm; max-width: none; } .no-print { display: none; } section { page-break-inside: avoid; } }
    @media (max-width: 800px) { main { padding: 18px; } header { grid-template-columns: 1fr; } .meta { text-align: left; } .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  </style>
</head>
<body>
<main>
  <header>
    <div>
      <p class="brand">Device Activity Tracker · Developed by Deco31416</p>
      <h1>Informe Final de Caso</h1>
      <p class="muted">${escapeHtml(report.summary.title)} · ${escapeHtml(report.summary.caseId)}</p>
    </div>
    <div class="meta">
      <p>Generado: ${escapeHtml(formatReportDate(report.summary.generatedAt))}</p>
      <p>Estado: ${escapeHtml(report.summary.status)}</p>
      <p>Version: ${escapeHtml(report.version)}</p>
    </div>
  </header>

  <div class="grid">
    <div class="metric"><strong>${escapeHtml(report.summary.auditEventCount)}</strong><span>Eventos de auditoria</span></div>
    <div class="metric"><strong>${escapeHtml(report.summary.evidenceLinkCount)}</strong><span>Evidencias vinculadas</span></div>
    <div class="metric"><strong>${escapeHtml(report.summary.callAnalysisCount)}</strong><span>Analisis de llamada</span></div>
    <div class="metric"><strong><span class="score ${scoreTone}">${escapeHtml(report.summary.highestCandidateScore)}/100</span></strong><span>Mayor score candidato</span></div>
  </div>

  <section class="panel">
    <h2>Resumen Ejecutivo</h2>
    <p>Este informe consolida actividad autorizada, auditoria, enlaces de evidencia, analisis de llamadas y resumen de capturas para el caso <strong>${escapeHtml(report.summary.caseId)}</strong>.</p>
    <p class="muted">Operador principal: ${escapeHtml(report.summary.primaryOperator)} · Objetivos vinculados: ${escapeHtml(report.summary.targetCount)} · Capturas de red completadas: ${escapeHtml(report.summary.networkCaptureCount)}</p>
  </section>

  <section class="panel">
    <h2>Alcance Autorizado</h2>
    <p>${escapeHtml(report.authorization.authorizationNote)}</p>
    ${report.authorization.description ? `<p class="muted">${escapeHtml(report.authorization.description)}</p>` : ''}
  </section>

  <section>
    <h2>Hallazgos de IP Candidata</h2>
    <div class="notice">
      Las IPs listadas son observaciones tecnicas dentro de una ventana autorizada. No prueban identidad, ubicacion exacta ni titularidad de una persona.
    </div>
    <table>
      <thead><tr><th>IP</th><th>Score</th><th>Categoria</th><th>ASN/ORG</th><th>Direccion</th><th>Paquetes</th><th>Geo</th><th>Nota tecnica</th></tr></thead>
      <tbody>${candidateRows}</tbody>
    </table>
  </section>

  <section>
    <h2>Timeline de Auditoria</h2>
    <table>
      <thead><tr><th>UTC</th><th>Scope</th><th>Accion</th><th>Operador</th><th>Target</th></tr></thead>
      <tbody>${timelineHtml}</tbody>
    </table>
  </section>

  <section class="panel">
    <h2>Integridad</h2>
    <h3>Hash del informe</h3>
    <p class="hash">${escapeHtml(report.integrity.reportHash)}</p>
    <h3>Hash del Evidence Package fuente</h3>
    <p class="hash">${escapeHtml(report.integrity.sourceEvidencePackageHash)}</p>
  </section>

  <section class="panel">
    <h2>Limitaciones Tecnicas</h2>
    <ul>${limitationHtml}</ul>
  </section>

  <footer>
    <span>Device Activity Tracker</span>
    <span>Generated by Deco31416 · ${escapeHtml(report.summary.caseId)}</span>
  </footer>
</main>
</body>
</html>`;
}

function toPdfText(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapePdfText(value: unknown): string {
    return toPdfText(value)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function wrapPdfText(value: unknown, maxChars: number): string[] {
    const words = toPdfText(value).split(' ').filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > maxChars && line) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ['-'];
}

class PdfReportCanvas {
    readonly width = 595.28;
    readonly height = 841.89;
    readonly margin = 42;
    private pages: string[] = [];
    private content = '';
    y = this.height - this.margin;
    pageNumber = 0;

    constructor() {
        this.addPage();
    }

    addPage() {
        if (this.pageNumber > 0) {
            this.footer();
            this.pages.push(this.content);
        }
        this.pageNumber += 1;
        this.content = '';
        this.y = this.height - this.margin;
        this.text(this.margin, this.height - 28, 'Device Activity Tracker - Final Case Report', 8, 'F2', '475569');
        this.text(this.width - this.margin - 55, this.height - 28, `Page ${this.pageNumber}`, 8, 'F1', '64748B');
        this.line(this.margin, this.height - 36, this.width - this.margin, this.height - 36, 'CBD5E1');
    }

    finish(): Buffer {
        this.footer();
        this.pages.push(this.content);
        const objects: string[] = [];
        const pageObjectIds: number[] = [];
        const catalogId = 1;
        const pagesId = 2;
        const fontRegularId = 3;
        const fontBoldId = 4;
        const fontMonoId = 5;
        let nextId = 6;

        objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
        objects[fontRegularId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
        objects[fontBoldId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;
        objects[fontMonoId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`;

        for (const page of this.pages) {
            const contentId = nextId++;
            const pageId = nextId++;
            const pageBuffer = Buffer.from(page, 'ascii');
            objects[contentId] = `<< /Length ${pageBuffer.length} >>\nstream\n${page}\nendstream`;
            objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`;
            pageObjectIds.push(pageId);
        }

        objects[pagesId] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

        let pdf = '%PDF-1.4\n';
        const offsets = [0];
        for (let id = 1; id < objects.length; id++) {
            offsets[id] = Buffer.byteLength(pdf, 'ascii');
            pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
        }
        const xrefOffset = Buffer.byteLength(pdf, 'ascii');
        pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
        for (let id = 1; id < objects.length; id++) {
            pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
        }
        pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
        return Buffer.from(pdf, 'ascii');
    }

    ensure(height: number) {
        if (this.y - height < this.margin + 24) this.addPage();
    }

    color(hex: string): string {
        const value = hex.replace('#', '');
        const r = parseInt(value.slice(0, 2), 16) / 255;
        const g = parseInt(value.slice(2, 4), 16) / 255;
        const b = parseInt(value.slice(4, 6), 16) / 255;
        return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
    }

    text(x: number, y: number, value: unknown, size = 10, font = 'F1', color = '172033') {
        this.content += `BT /${font} ${size} Tf ${this.color(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET\n`;
    }

    rect(x: number, y: number, width: number, height: number, fill = 'FFFFFF', stroke = 'CBD5E1') {
        this.content += `${this.color(fill)} rg ${this.color(stroke)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re B\n`;
    }

    line(x1: number, y1: number, x2: number, y2: number, color = 'CBD5E1') {
        this.content += `${this.color(color)} RG 0.6 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
    }

    heading(title: string) {
        this.ensure(42);
        this.y -= 14;
        this.text(this.margin, this.y, title.toUpperCase(), 12, 'F2', '0F766E');
        this.y -= 10;
        this.line(this.margin, this.y, this.width - this.margin, this.y, '99F6E4');
        this.y -= 18;
    }

    paragraph(value: unknown, maxChars = 92, size = 9, color = '334155') {
        const lines = wrapPdfText(value, maxChars);
        this.ensure(lines.length * 13 + 8);
        for (const line of lines) {
            this.text(this.margin, this.y, line, size, 'F1', color);
            this.y -= 13;
        }
        this.y -= 4;
    }

    footer() {
        this.line(this.margin, 30, this.width - this.margin, 30, 'E2E8F0');
        this.text(this.margin, 18, 'Developed by Deco31416', 7, 'F2', '64748B');
    }
}

export function renderFinalCaseReportPdf(report: ReturnType<typeof buildFinalCaseReport>): Buffer {
    const pdf = new PdfReportCanvas();
    const usable = pdf.width - pdf.margin * 2;
    const metricWidth = (usable - 24) / 4;

    pdf.rect(pdf.margin, pdf.y - 82, usable, 78, '0F766E', '0F766E');
    pdf.text(pdf.margin + 18, pdf.y - 30, 'INFORME FINAL DE CASO', 22, 'F2', 'FFFFFF');
    pdf.text(pdf.margin + 18, pdf.y - 52, `${report.summary.caseId} - ${report.summary.title}`, 10, 'F1', 'DDFCF4');
    pdf.text(pdf.margin + 18, pdf.y - 68, `Generado: ${formatReportDate(report.summary.generatedAt)} - Estado: ${report.summary.status}`, 8, 'F1', 'CCFBF1');
    pdf.y -= 112;

    const metrics = [
        ['Eventos', report.summary.auditEventCount],
        ['Evidencias', report.summary.evidenceLinkCount],
        ['Analisis llamada', report.summary.callAnalysisCount],
        ['Score maximo', `${report.summary.highestCandidateScore}/100`],
    ];
    metrics.forEach(([label, value], index) => {
        const x = pdf.margin + index * (metricWidth + 8);
        pdf.rect(x, pdf.y - 54, metricWidth, 54, 'F8FAFC', 'CBD5E1');
        pdf.text(x + 10, pdf.y - 22, value, 18, 'F2', index === 3 ? '0F766E' : '172033');
        pdf.text(x + 10, pdf.y - 40, label, 7, 'F2', '64748B');
    });
    pdf.y -= 82;

    pdf.heading('Resumen ejecutivo');
    pdf.paragraph(`Este informe consolida actividad autorizada, auditoria, enlaces de evidencia, analisis de llamadas y resumen de capturas para el caso ${report.summary.caseId}. Operador principal: ${report.summary.primaryOperator}. Objetivos vinculados: ${report.summary.targetCount}. Capturas de red completadas: ${report.summary.networkCaptureCount}.`);

    pdf.heading('Alcance autorizado');
    pdf.paragraph(report.authorization.authorizationNote);
    if (report.authorization.description) pdf.paragraph(report.authorization.description, 92, 8, '64748B');

    pdf.heading('Hallazgos de IP candidata');
    pdf.rect(pdf.margin, pdf.y - 38, usable, 36, 'FFF7ED', 'FDBA74');
    pdf.text(pdf.margin + 10, pdf.y - 15, 'Nota tecnica', 8, 'F2', '9A3412');
    pdf.text(pdf.margin + 10, pdf.y - 28, 'Las IPs candidatas no prueban identidad, ubicacion exacta ni titularidad de una persona.', 8, 'F1', '9A3412');
    pdf.y -= 54;

    const candidates = report.findings.candidateIps.slice(0, 12);
    pdf.ensure(34);
    pdf.text(pdf.margin, pdf.y, 'IP', 8, 'F2', '64748B');
    pdf.text(pdf.margin + 95, pdf.y, 'Score', 8, 'F2', '64748B');
    pdf.text(pdf.margin + 145, pdf.y, 'Categoria', 8, 'F2', '64748B');
    pdf.text(pdf.margin + 250, pdf.y, 'Paquetes', 8, 'F2', '64748B');
    pdf.text(pdf.margin + 310, pdf.y, 'Geo / nota tecnica', 8, 'F2', '64748B');
    pdf.y -= 10;
    pdf.line(pdf.margin, pdf.y, pdf.width - pdf.margin, pdf.y, 'CBD5E1');
    pdf.y -= 14;

    if (candidates.length === 0) {
        pdf.paragraph('No se registraron IPs candidatas en los analisis vinculados.');
    } else {
        for (const candidate of candidates) {
            const geo = `${candidate.geo?.country || '-'} / ${candidate.geo?.city || candidate.geo?.region || '-'}`;
            const note = `${geo}. ${candidate.technicalNote}`;
            const noteLines = wrapPdfText(note, 45).slice(0, 3);
            const org = candidate.networkIntelligence?.asn
                ? `AS${candidate.networkIntelligence.asn} ${candidate.networkIntelligence.org}`
                : candidate.networkIntelligence?.org || '-';
            const rowHeight = Math.max(36, noteLines.length * 11 + 12);
            pdf.ensure(rowHeight + 8);
            pdf.rect(pdf.margin, pdf.y - rowHeight + 8, usable, rowHeight, 'FFFFFF', 'E2E8F0');
            pdf.text(pdf.margin + 8, pdf.y - 8, candidate.ip, 8, 'F3', '172033');
            pdf.text(pdf.margin + 98, pdf.y - 8, `${candidate.score}/100`, 9, 'F2', candidate.score >= 75 ? '166534' : candidate.score >= 45 ? '92400E' : '475569');
            pdf.text(pdf.margin + 145, pdf.y - 8, candidate.networkCategory, 8, 'F1', '334155');
            pdf.text(pdf.margin + 145, pdf.y - 19, org.slice(0, 22), 6, 'F1', '64748B');
            pdf.text(pdf.margin + 255, pdf.y - 8, String(candidate.packets), 8, 'F1', '334155');
            noteLines.forEach((line, idx) => pdf.text(pdf.margin + 310, pdf.y - 8 - idx * 11, line, 7, 'F1', '475569'));
            pdf.y -= rowHeight + 6;
        }
    }

    pdf.heading('Timeline de auditoria');
    const timeline = report.timeline.slice(-70);
    const drawTimelineHeader = (continued = false) => {
        if (continued) {
            pdf.text(pdf.margin, pdf.y, 'Timeline de auditoria (continuacion)', 9, 'F2', '0F766E');
            pdf.y -= 16;
        }
        pdf.text(pdf.margin, pdf.y, 'UTC', 8, 'F2', '64748B');
        pdf.text(pdf.margin + 125, pdf.y, 'Scope', 8, 'F2', '64748B');
        pdf.text(pdf.margin + 190, pdf.y, 'Accion', 8, 'F2', '64748B');
        pdf.text(pdf.margin + 330, pdf.y, 'Operador / target', 8, 'F2', '64748B');
        pdf.y -= 10;
        pdf.line(pdf.margin, pdf.y, pdf.width - pdf.margin, pdf.y, 'CBD5E1');
        pdf.y -= 14;
    };
    drawTimelineHeader();
    if (timeline.length === 0) {
        pdf.paragraph('No hay eventos de auditoria disponibles.');
    } else {
        for (const item of timeline) {
            if (pdf.y - 20 < pdf.margin + 24) {
                pdf.addPage();
                drawTimelineHeader(true);
            }
            pdf.text(pdf.margin, pdf.y, formatReportDate(item.timestampUtc), 7, 'F3', '334155');
            pdf.text(pdf.margin + 125, pdf.y, item.scope, 7, 'F1', '334155');
            pdf.text(pdf.margin + 190, pdf.y, item.action, 7, 'F1', '172033');
            pdf.text(pdf.margin + 330, pdf.y, `${item.operatorName} / ${item.targetJid || '-'}`, 7, 'F1', '475569');
            pdf.y -= 16;
        }
    }

    pdf.heading('Integridad');
    pdf.paragraph('Hash del informe:', 92, 8, '64748B');
    pdf.paragraph(report.integrity.reportHash, 78, 7, '334155');
    pdf.paragraph('Hash del Evidence Package fuente:', 92, 8, '64748B');
    pdf.paragraph(report.integrity.sourceEvidencePackageHash, 78, 7, '334155');

    pdf.heading('Limitaciones tecnicas');
    for (const item of report.findings.limitations) {
        pdf.paragraph(`- ${item}`, 90, 8, '334155');
    }

    return pdf.finish();
}

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
    const time =
        (date.getHours() << 11) |
        (date.getMinutes() << 5) |
        Math.floor(date.getSeconds() / 2);
    const dosDate =
        ((date.getFullYear() - 1980) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate();
    return { time, dosDate };
}

function createZip(entries: Array<{ name: string; data: string | Buffer }>): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;
    const { time, dosDate } = getDosDateTime();

    for (const entry of entries) {
        const nameBuffer = Buffer.from(entry.name, 'utf8');
        const dataBuffer = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
        const crc = crc32(dataBuffer);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0x0800, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(time, 10);
        localHeader.writeUInt16LE(dosDate, 12);
        localHeader.writeUInt32LE(crc, 14);
        localHeader.writeUInt32LE(dataBuffer.length, 18);
        localHeader.writeUInt32LE(dataBuffer.length, 22);
        localHeader.writeUInt16LE(nameBuffer.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localParts.push(localHeader, nameBuffer, dataBuffer);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x0800, 8);
        centralHeader.writeUInt16LE(0, 10);
        centralHeader.writeUInt16LE(time, 12);
        centralHeader.writeUInt16LE(dosDate, 14);
        centralHeader.writeUInt32LE(crc, 16);
        centralHeader.writeUInt32LE(dataBuffer.length, 20);
        centralHeader.writeUInt32LE(dataBuffer.length, 24);
        centralHeader.writeUInt16LE(nameBuffer.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(offset, 42);
        centralParts.push(centralHeader, nameBuffer);

        offset += localHeader.length + nameBuffer.length + dataBuffer.length;
    }

    const centralOffset = offset;
    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(centralOffset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, end]);
}

export function buildEvidenceZip(evidencePackage: NonNullable<Awaited<ReturnType<typeof buildEvidencePackage>>>): Buffer {
    const json = (value: unknown) => JSON.stringify(value, null, 2);
    const finalReport = buildFinalCaseReport(evidencePackage);
    return createZip([
        { name: 'manifest.json', data: json(evidencePackage.manifest) },
        { name: 'case.json', data: json(evidencePackage.sections.case) },
        { name: 'audit.json', data: json(evidencePackage.sections.audit) },
        { name: 'evidence-links.json', data: json(evidencePackage.sections.evidenceLinks) },
        { name: 'call-analysis.json', data: json(evidencePackage.sections.callAnalysis) },
        { name: 'network-summary.json', data: json(evidencePackage.sections.networkSummary) },
        { name: 'final-report.json', data: json(finalReport) },
        { name: 'final-report.html', data: renderFinalCaseReportHtml(finalReport) },
        { name: 'final-report.pdf', data: renderFinalCaseReportPdf(finalReport) },
        { name: 'integrity.json', data: json(evidencePackage.integrity) },
        { name: 'full-package.json', data: json(evidencePackage) },
    ]);
}


