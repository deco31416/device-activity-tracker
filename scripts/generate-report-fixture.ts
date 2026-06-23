import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { buildEvidenceZip, buildFinalCaseReport, renderFinalCaseReportHtml, renderFinalCaseReportPdf } from '../src/evidence-package.js';

function sampleEvidencePackage(): any {
    return {
        manifest: {
            packageType: 'evidence-package',
            version: '1.0',
            software: {
                name: 'Device Activity Tracker',
                version: '2.6.0',
                developedBy: 'Deco31416',
            },
            caseId: 'CASE-QA-REPORT-001',
            generatedAt: '2026-06-18T20:30:00.000Z',
            contents: [],
            limitations: [
                'Traffic analysis is based on observed metadata only.',
                'Candidate IPs do not prove identity, exact location, or ownership by a person.',
                'WhatsApp/WebRTC traffic may use relays, NAT, VPNs, CGNAT, or provider infrastructure.',
            ],
        },
        sections: {
            case: {
                caseId: 'CASE-QA-REPORT-001',
                title: 'QA visual de informe final',
                status: 'authorized',
                primaryOperator: 'QA Operator',
                authorizationNote: 'Synthetic authorized QA fixture for final report layout validation.',
                description: 'Fixture estable para revisar resumen, estadisticas, hallazgos, timeline e integridad.',
                tags: ['qa', 'report-fixture'],
            },
            audit: Array.from({ length: 18 }, (_, index) => ({
                caseId: 'CASE-QA-REPORT-001',
                operatorName: index % 2 === 0 ? 'QA Operator' : 'Auditor',
                authorizationNote: 'Synthetic authorized QA fixture',
                action: index % 4 === 0 ? 'call_capture_stop' : index % 4 === 1 ? 'capture_stop' : index % 4 === 2 ? 'final_report_pdf_export_requested' : 'evidence_package_zip_export',
                scope: index % 4 === 1 ? 'network' : index % 4 === 2 ? 'report' : 'call',
                targetJid: index < 14 ? '573001112233@s.whatsapp.net' : '573004445566@s.whatsapp.net',
                details: { callId: index % 4 === 0 ? `CALL-QA-${index}` : undefined, sequence: index },
                timestamp: new Date(Date.UTC(2026, 5, 18, 20, index, 0)),
                timestampUtc: new Date(Date.UTC(2026, 5, 18, 20, index, 0)).toISOString(),
            })),
            evidenceLinks: [
                {
                    caseId: 'CASE-QA-REPORT-001',
                    type: 'call_analysis',
                    refId: 'CALL-QA-0',
                    label: 'Call analysis primary',
                    targetJid: '573001112233@s.whatsapp.net',
                    metadata: { source: 'qa-fixture' },
                    createdAt: new Date('2026-06-18T20:01:00.000Z'),
                    updatedAt: new Date('2026-06-18T20:01:00.000Z'),
                },
                {
                    caseId: 'CASE-QA-REPORT-001',
                    type: 'contact',
                    refId: '573004445566@s.whatsapp.net',
                    label: 'Secondary observed contact',
                    targetJid: '573004445566@s.whatsapp.net',
                    metadata: { source: 'qa-fixture' },
                    createdAt: new Date('2026-06-18T20:02:00.000Z'),
                    updatedAt: new Date('2026-06-18T20:02:00.000Z'),
                },
            ],
            callAnalysis: [
                {
                    callId: 'CALL-QA-0',
                    targetJid: '573001112233@s.whatsapp.net',
                    startTime: new Date('2026-06-18T20:00:00.000Z'),
                    endTime: new Date('2026-06-18T20:02:30.000Z'),
                    durationSec: 150,
                    isVideo: false,
                    totalPackets: 1850,
                    candidateIps: [
                        {
                            ip: '203.0.113.42',
                            packets: 640,
                            bytesTotal: 88400,
                            firstSeen: new Date('2026-06-18T20:00:12.000Z'),
                            lastSeen: new Date('2026-06-18T20:02:21.000Z'),
                            avgSize: 138,
                            ports: [443, 3478],
                            direction: 'bidirectional',
                            provider: 'unknown',
                            networkCategory: 'consumer_isp_or_unknown',
                            networkIntelligence: {
                                asn: null,
                                org: 'Unknown public network',
                                category: 'consumer_isp_or_unknown',
                                source: 'local_rules',
                                isDatacenterLikely: false,
                                caution: 'Observed public network; requires corroboration.',
                            },
                            geo: { country: 'CO', region: 'Bogota D.C.', city: 'Bogota', lat: 4.71, lon: -74.07, timezone: 'America/Bogota' },
                            confidence: 'medium',
                            confidenceScore: 68,
                            reasonCodes: [{ code: 'BIDIRECTIONAL_FLOW', label: 'Bidirectional flow observed', delta: 18 }],
                            technicalNote: 'IP publica observada como candidata tecnica. No confirma identidad, ubicacion exacta ni titularidad.',
                            isP2P: true,
                        },
                    ],
                    metaIps: ['157.240.1.1', '31.13.65.49'],
                    verdict: 'mixed',
                    captureInterface: 'Ethernet QA',
                },
            ],
            activityStats: [
                buildActivityStats('573001112233@s.whatsapp.net', 18420, 44, 22, 34, 82, 92, 'strong'),
                buildActivityStats('573004445566@s.whatsapp.net', 1460, 18, 20, 62, 121, 58, 'usable'),
            ],
            networkSummary: {
                captureStartCount: 1,
                captureStopCount: 1,
                latestStats: { interface: 'Ethernet QA', totalPackets: 1850, dropped: 0 },
                captures: [
                    {
                        timestampUtc: '2026-06-18T20:02:40.000Z',
                        operatorName: 'QA Operator',
                        stats: { interface: 'Ethernet QA', totalPackets: 1850, dropped: 0 },
                    },
                ],
            },
        },
        integrity: {
            algorithm: 'SHA-256',
            sectionHashes: {},
            packageHash: 'qa-source-package-hash',
            canonicalPayload: 'fixture',
        },
    };
}

function buildActivityStats(
    targetJid: string,
    totalMeasurements: number,
    online: number,
    standby: number,
    offline: number,
    avgRtt: number,
    reliabilityScore: number,
    reliabilityLabel: 'initial' | 'usable' | 'strong',
) {
    return {
        targetJid,
        stats: {
            online,
            standby,
            offline,
            totalMeasurements,
            firstSeen: new Date('2026-06-04T00:00:00.000Z'),
            lastSeen: new Date('2026-06-18T20:00:00.000Z'),
            lastOnline: new Date('2026-06-18T19:48:00.000Z'),
            avgRtt,
            insights: {
                periods: [
                    { key: 'last24h', label: '24h', totalMeasurements: Math.round(totalMeasurements * 0.08), onlineMeasurements: 160, onlinePct: online, avgRtt, changeOnlinePct: 4 },
                    { key: 'last7d', label: '7d', totalMeasurements: Math.round(totalMeasurements * 0.55), onlineMeasurements: 820, onlinePct: Math.max(0, online - 3), avgRtt, changeOnlinePct: -2 },
                    { key: 'last30d', label: '30d', totalMeasurements, onlineMeasurements: 2100, onlinePct: online, avgRtt, changeOnlinePct: null },
                ],
                dailyCoverage: Array.from({ length: 14 }, (_, index) => ({
                    date: new Date(Date.UTC(2026, 5, 5 + index)).toISOString().slice(0, 10),
                    totalMeasurements: index % 5 === 0 ? 0 : Math.round(totalMeasurements / 14),
                    onlinePct: online,
                    coverageScore: index % 5 === 0 ? 0 : Math.min(100, 55 + index * 3),
                })),
                reliability: {
                    score: reliabilityScore,
                    label: reliabilityLabel,
                    reasonCodes: ['RECENT_SIGNAL', 'MULTI_DAY_COVERAGE'],
                },
            },
        },
    };
}

function countPdfPages(pdf: Buffer): number {
    const text = pdf.toString('latin1');
    return (text.match(/\/Type \/Page\b/g) || []).length;
}

function extractPdfTextLiterals(pdf: Buffer): string {
    const text = pdf.toString('latin1');
    const matches = [...text.matchAll(/\(([^()]*)\)\s*Tj/g)];
    return matches
        .map(match => match[1].replace(/\\([()\\])/g, '$1'))
        .join('\n');
}

function findForbiddenTokens(value: string): string[] {
    return ['undefined', 'null', '[object Object]', 'NaN'].filter(token => value.includes(token));
}

async function main() {
    const outDir = join(process.cwd(), '.runtime-logs', 'report-fixture');
    await mkdir(outDir, { recursive: true });

    const evidencePackage = sampleEvidencePackage();
    const report = buildFinalCaseReport(evidencePackage);
    const html = renderFinalCaseReportHtml(report);
    const pdf = renderFinalCaseReportPdf(report);
    const pdfText = extractPdfTextLiterals(pdf);
    const zip = buildEvidenceZip(evidencePackage);
    const htmlForbiddenTokens = findForbiddenTokens(html);
    const pdfForbiddenTokens = findForbiddenTokens(pdfText);
    const summary = {
        generatedAt: new Date().toISOString(),
        reportHash: report.integrity.reportHash,
        htmlBytes: Buffer.byteLength(html, 'utf8'),
        pdfBytes: pdf.length,
        zipBytes: zip.length,
        pdfPages: countPdfPages(pdf),
        activityStatsCount: report.summary.activityStatsCount,
        candidateIpCount: report.summary.candidateIpCount,
        requiredSectionsPresent: {
            statsHtml: html.includes('Estadisticas de Actividad Observada'),
            candidateHtml: html.includes('Hallazgos de IP Candidata'),
            integrityHtml: html.includes('Integridad'),
            zipActivityJson: zip.toString('latin1').includes('activity-stats.json'),
            zipActivityCsv: zip.toString('latin1').includes('annexes/activity-stats.csv'),
        },
        contentChecks: {
            htmlHasBrand: html.includes('Device Activity Tracker') && html.includes('Deco31416'),
            htmlHasLimitations: html.includes('no prueban identidad') || html.includes('do not prove identity'),
            pdfHasTitle: pdfText.includes('INFORME FINAL DE CASO'),
            pdfHasStats: pdfText.includes('ESTADISTICAS DE ACTIVIDAD OBSERVADA'),
            pdfHasCandidateFindings: pdfText.includes('HALLAZGOS DE IP CANDIDATA'),
            pdfHasIntegrity: pdfText.includes('INTEGRIDAD'),
            pdfHasDeveloperMark: pdfText.includes('Developed by Deco31416'),
            pdfHasLimitations: pdfText.includes('LIMITACIONES TECNICAS'),
            htmlForbiddenTokens,
            pdfForbiddenTokens,
        },
        visualRender: {
            pngRendered: false,
            blocker: 'pdftoppm/pdfinfo not available in current local PATH',
        },
    };

    await writeFile(join(outDir, 'final-report-fixture.json'), JSON.stringify(report, null, 2), 'utf8');
    await writeFile(join(outDir, 'final-report-fixture.html'), html, 'utf8');
    await writeFile(join(outDir, 'final-report-fixture.pdf'), pdf);
    await writeFile(join(outDir, 'evidence-package-fixture.zip'), zip);
    await writeFile(join(outDir, 'qa-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

    if (!Object.values(summary.requiredSectionsPresent).every(Boolean)) {
        throw new Error(`Fixture missing required report sections: ${JSON.stringify(summary.requiredSectionsPresent)}`);
    }
    const booleanContentChecks = Object.entries(summary.contentChecks)
        .filter(([, value]) => typeof value === 'boolean');
    const failedContentChecks = booleanContentChecks.filter(([, value]) => value !== true);
    if (failedContentChecks.length > 0) {
        throw new Error(`Fixture failed content checks: ${JSON.stringify(failedContentChecks)}`);
    }
    if (htmlForbiddenTokens.length > 0 || pdfForbiddenTokens.length > 0) {
        throw new Error(`Fixture contains forbidden placeholder tokens: ${JSON.stringify({ htmlForbiddenTokens, pdfForbiddenTokens })}`);
    }
    if (summary.pdfPages < 2) {
        throw new Error(`Expected multi-page PDF fixture, got ${summary.pdfPages} page(s)`);
    }

    console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
