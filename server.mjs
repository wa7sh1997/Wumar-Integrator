import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import * as XLSX from 'xlsx';

const port = Number(process.env.PORT || 8787);
const model = process.env.CODEX_MODEL || 'gpt-5-codex';

const artifactsDir = path.resolve(process.cwd(), 'artifacts');
if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

const generatedFiles = new Map();

const systemPrompt = `You are the Codex execution planner for a production web app.
Return concise updates and call tools for executable work.
For every spreadsheet/report request, call generate_excel with practical structured data.
Use formulas where appropriate (e.g. SUM, AVERAGE, IF).
Always set a professional filename and meaningful sheet names.`;

const tools = [{
  type: 'function',
  name: 'generate_excel',
  description: 'Generate a real Excel file with one or more sheets and return download metadata.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['filename', 'sheets'],
    properties: {
      filename: { type: 'string' },
      sheets: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'data'],
          properties: {
            name: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'array',
                items: {
                  anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }],
                },
              },
            },
          },
        },
      },
    },
  },
}];

const json = (res, status, data) => {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
};

const sanitizeSheetName = (name, existing) => {
  const base = String(name).replace(/[\\/?*\[\]:]/g, '').slice(0, 31) || 'Sheet';
  let candidate = base;
  let counter = 1;
  while (existing.includes(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    counter += 1;
  }
  return candidate;
};

const generateExcel = (payload) => {
  const workbook = XLSX.utils.book_new();
  const sheetNames = [];

  for (const sheet of payload.sheets) {
    const safeName = sanitizeSheetName(sheet.name, sheetNames);
    sheetNames.push(safeName);
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
    const colWidths = sheet.data.reduce((acc, row) => {
      row.forEach((cell, idx) => {
        const len = cell === null || cell === undefined ? 0 : String(cell).length;
        acc[idx] = Math.max(acc[idx] || 0, len + 2);
      });
      return acc;
    }, []);

    worksheet['!cols'] = colWidths.map((wch) => ({ wch: Math.min(wch, 50) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  const id = crypto.randomUUID();
  const fileName = payload.filename.endsWith('.xlsx') ? payload.filename : `${payload.filename}.xlsx`;
  const filePath = path.join(artifactsDir, `${id}-${fileName}`);
  XLSX.writeFile(workbook, filePath);
  generatedFiles.set(id, { filePath, fileName, createdAt: Date.now() });

  return { id, filename: fileName, sheetNames, downloadUrl: `/api/download/${id}` };
};

const readBody = async (req) => {
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
};

const callCodex = async (history, message) => {
  const input = [
    { role: 'system', content: systemPrompt },
    ...history.map((entry) => ({ role: entry.role === 'assistant' ? 'assistant' : 'user', content: entry.content })),
    { role: 'user', content: message },
  ];

  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input, tools }),
  });

  if (!resp.ok) {
    throw new Error(`OpenAI error ${resp.status}: ${await resp.text()}`);
  }

  return resp.json();
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/execute') {
    if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: 'OPENAI_API_KEY is missing.' });
    try {
      const body = await readBody(req);
      if (!body.message || typeof body.message !== 'string') return json(res, 400, { error: 'message is required' });

      const aiResponse = await callCodex(body.history || [], body.message);
      const output = aiResponse.output || [];
      const toolCall = output.find((item) => item.type === 'function_call' && item.name === 'generate_excel');
      let generatedFile;
      if (toolCall?.arguments) {
        generatedFile = generateExcel(JSON.parse(toolCall.arguments));
      }

      return json(res, 200, {
        message: aiResponse.output_text || (generatedFile
          ? `Execution complete. Your Excel file **${generatedFile.filename}** is ready for download.`
          : 'Execution complete.'),
        generatedFile,
      });
    } catch (error) {
      console.error(error);
      return json(res, 500, { error: 'Execution failed.' });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/download/')) {
    const id = url.pathname.split('/').pop();
    const item = id ? generatedFiles.get(id) : undefined;
    if (!item) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File not found or expired.');
    }

    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${item.fileName}"`,
    });
    return fs.createReadStream(item.filePath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, item] of generatedFiles.entries()) {
    if (item.createdAt < cutoff) {
      generatedFiles.delete(id);
      fs.rm(item.filePath, { force: true }, () => {});
    }
  }
}, 5 * 60 * 1000);

server.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening at http://0.0.0.0:${port}`);
});
