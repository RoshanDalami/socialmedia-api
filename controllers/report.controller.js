import PDFDocument from 'pdfkit';
import { Project } from '../model/project.model.js';
import { Mention } from '../model/mention.model.js';
import { getProjectMetrics } from '../services/metrics.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';

const FORMAT_DATE_OPTIONS = Object.freeze({
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

const formatDate = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-US', FORMAT_DATE_OPTIONS);
};

const sanitizeSpreadsheetCell = (value) => {
    if (value == null) return '';
    const str = String(value);
    const firstChar = str.trimStart().charAt(0);
    if (['=', '+', '-', '@'].includes(firstChar) || firstChar === '\t' || firstChar === '\r') {
        return `'${str}`;
    }
    return str;
};

const escapeCSV = (value) => {
    if (value == null) return '';
    const str = sanitizeSpreadsheetCell(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const escapeHtml = (value) =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const sanitizeFilenamePart = (value, fallback = 'report') => {
    const cleaned = String(value ?? '')
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return cleaned || fallback;
};

const buildMentionsQuery = (projectId, scope, lastRunAt) => {
    if (scope !== 'last_run') return { projectId };
    if (!lastRunAt) return null;
    const windowEnd = new Date(lastRunAt);
    const windowStart = new Date(windowEnd.getTime() - 5 * 60 * 1000);
    return { projectId, ingestedAt: { $gte: windowStart, $lte: windowEnd } };
};

export const downloadReport = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }
    const safeProjectName = sanitizeFilenamePart(project.name, 'project');

    const allowedScopes = new Set(['summary', 'all', 'mentions', 'last_run']);
    const rawScope = String(req.query?.scope || 'summary');
    const scope = allowedScopes.has(rawScope) ? rawScope : 'summary';
    const includeMetrics = scope === 'summary' || scope === 'all';
    const includeMentions = scope === 'all' || scope === 'mentions' || scope === 'last_run';

    const metrics = includeMetrics ? await getProjectMetrics(project._id) : null;
    let mentions = [];
    if (includeMentions) {
        const mentionsQuery = buildMentionsQuery(project._id, scope, project.lastRunAt);
        mentions = mentionsQuery
            ? await Mention.find(mentionsQuery).sort({ publishedAt: -1 }).lean()
            : [];
    }
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}-report.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text(`NPIP Report: ${project.name}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${formatDate(new Date())}`);
    doc.fontSize(10).text(`Scope: ${scope}`);
    doc.moveDown();

    if (includeMetrics && metrics) {
        doc.fontSize(14).text('Volume Over Time');
        metrics.volume.forEach((row) => {
            const date = `${row._id.year}-${row._id.month}-${row._id.day}`;
            doc.fontSize(10).text(`${date}: ${row.count}`);
        });
        doc.moveDown();

        doc.fontSize(14).text('Sentiment Share');
        metrics.sentimentShare.forEach((row) => {
            doc.fontSize(10).text(`${row._id || 'unknown'}: ${row.count}`);
        });
        doc.moveDown();

        doc.fontSize(14).text('Top Sources');
        metrics.topSources.forEach((row) => {
            doc.fontSize(10).text(`${row._id}: ${row.count}`);
        });
        doc.moveDown();

        doc.fontSize(14).text('Top Authors');
        metrics.topAuthors.forEach((row) => {
            doc.fontSize(10).text(`${row._id || 'unknown'}: ${row.count}`);
        });
        doc.moveDown();
    }

    if (includeMentions) {
        const title = scope === 'last_run' ? 'Mentions (Last Run)' : 'Mentions';
        doc.fontSize(14).text(title);
        doc.moveDown(0.5);
        if (!mentions.length) {
            doc.fontSize(10).text('No mentions found for this scope.');
        } else {
            mentions.forEach((mention) => {
                doc.fontSize(10).text(`- ${mention.title || 'Untitled'}`);
                doc.fontSize(9).text(`  Source: ${mention.source || 'unknown'} | Published: ${formatDate(mention.publishedAt)}`);
                if (mention.keywordMatched) {
                    doc.fontSize(9).text(`  Keyword: ${mention.keywordMatched}`);
                }
                if (mention.url) {
                    doc.fontSize(9).text(`  URL: ${mention.url}`);
                }
                doc.moveDown(0.3);
            });
        }
        doc.moveDown();
    }

    doc.end();
});

export const downloadCSV = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }
    const safeProjectName = sanitizeFilenamePart(project.name, 'project');

    const allowedScopes = new Set(['all', 'mentions', 'last_run']);
    const rawScope = String(req.query?.scope || 'all');
    const scope = allowedScopes.has(rawScope) ? rawScope : 'all';

    const mentionsQuery = buildMentionsQuery(project._id, scope, project.lastRunAt);
    const mentions = mentionsQuery
        ? await Mention.find(mentionsQuery).sort({ publishedAt: -1 }).lean()
        : [];

    // CSV Headers
    const headers = [
        'ID',
        'Title',
        'Text',
        'Source',
        'Author',
        'URL',
        'Published At',
        'Keyword Matched',
        'Sentiment',
        'Sentiment Confidence',
        'Reach Estimate',
        'Likes',
        'Comments',
        'Shares',
        'Language',
        'Geo',
        'Ingested At'
    ];

    // Build CSV content
    const rows = mentions.map(mention => [
        escapeCSV(mention._id),
        escapeCSV(mention.title),
        escapeCSV(mention.text?.substring(0, 500)), // Truncate long text
        escapeCSV(mention.source),
        escapeCSV(mention.author),
        escapeCSV(mention.url),
        escapeCSV(mention.publishedAt ? new Date(mention.publishedAt).toISOString() : ''),
        escapeCSV(mention.keywordMatched),
        escapeCSV(mention.sentiment?.label),
        escapeCSV(mention.sentiment?.confidence),
        escapeCSV(mention.reachEstimate),
        escapeCSV(mention.engagement?.likes),
        escapeCSV(mention.engagement?.comments),
        escapeCSV(mention.engagement?.shares),
        escapeCSV(mention.lang),
        escapeCSV(mention.geo),
        escapeCSV(mention.ingestedAt ? new Date(mention.ingestedAt).toISOString() : '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}-mentions.csv"`);
    res.send(csvContent);
});

export const downloadExcel = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }
    const safeProjectName = sanitizeFilenamePart(project.name, 'project');

    const allowedScopes = new Set(['summary', 'all', 'mentions', 'last_run']);
    const rawScope = String(req.query?.scope || 'all');
    const scope = allowedScopes.has(rawScope) ? rawScope : 'all';
    const includeMetrics = scope === 'summary' || scope === 'all';
    const includeMentions = scope === 'all' || scope === 'mentions' || scope === 'last_run';

    const metrics = includeMetrics ? await getProjectMetrics(project._id) : null;
    let mentions = [];
    if (includeMentions) {
        const mentionsQuery = buildMentionsQuery(project._id, scope, project.lastRunAt);
        mentions = mentionsQuery
            ? await Mention.find(mentionsQuery).sort({ publishedAt: -1 }).lean()
            : [];
    }

    // Build Excel-compatible HTML table (works when opened in Excel)
    let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(project.name)} Report</title>
</head>
<body>
<h1>NPIP Report: ${escapeHtml(project.name)}</h1>
<p>Generated: ${escapeHtml(formatDate(new Date()))}</p>
<p>Scope: ${escapeHtml(scope)}</p>
`;

    if (includeMetrics && metrics) {
        html += `
<h2>Volume Over Time</h2>
<table border="1">
<tr><th>Date</th><th>Count</th></tr>
${metrics.volume.map(row => `<tr><td>${escapeHtml(`${row._id.year}-${row._id.month}-${row._id.day}`)}</td><td>${escapeHtml(row.count)}</td></tr>`).join('')}
</table>

<h2>Sentiment Share</h2>
<table border="1">
<tr><th>Sentiment</th><th>Count</th></tr>
${metrics.sentimentShare.map(row => `<tr><td>${escapeHtml(row._id || 'unknown')}</td><td>${escapeHtml(row.count)}</td></tr>`).join('')}
</table>

<h2>Top Sources</h2>
<table border="1">
<tr><th>Source</th><th>Count</th></tr>
${metrics.topSources.map(row => `<tr><td>${escapeHtml(row._id)}</td><td>${escapeHtml(row.count)}</td></tr>`).join('')}
</table>

<h2>Top Authors</h2>
<table border="1">
<tr><th>Author</th><th>Count</th></tr>
${metrics.topAuthors.map(row => `<tr><td>${escapeHtml(row._id || 'unknown')}</td><td>${escapeHtml(row.count)}</td></tr>`).join('')}
</table>
`;
    }

    if (includeMentions) {
        html += `
<h2>Mentions</h2>
<table border="1">
<tr>
<th>Title</th>
<th>Source</th>
<th>Author</th>
<th>Published</th>
<th>Sentiment</th>
<th>Reach</th>
<th>URL</th>
</tr>
${mentions.map(m => `<tr>
<td>${escapeHtml(m.title || 'Untitled')}</td>
<td>${escapeHtml(m.source)}</td>
<td>${escapeHtml(m.author)}</td>
<td>${escapeHtml(formatDate(m.publishedAt))}</td>
<td>${escapeHtml(m.sentiment?.label)}</td>
<td>${escapeHtml(m.reachEstimate || 0)}</td>
<td>${escapeHtml(m.url)}</td>
</tr>`).join('')}
</table>
`;
    }

    html += `</body></html>`;

    // Excel can open HTML files directly
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}-report.xls"`);
    res.send(html);
});
