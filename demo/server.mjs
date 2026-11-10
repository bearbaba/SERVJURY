import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { scenarios, demoDecision, validateCase } from '../src/engine.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), 'public');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);
const LIVE = process.env.ENABLE_LIVE_TRANSACTIONS === '1';
if (LIVE && HOST !== '127.0.0.1') throw new Error('LIVE signer is permitted on 127.0.0.1 only. Never expose it publicly.');
const cases = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}
async function body(req) {
  let s = '';
  for await (const ch of req) {
    s += ch;
    if (s.length > 18000) throw new Error('Request too large');
  }
  try { return JSON.parse(s); } catch { throw new Error('Invalid JSON'); }
}
function errorJson(res, error) {
  const status = /Invalid|too large|required|Unknown|not found/.test(error.message) ? 400 : 502;
  return json(res, status, { error: error.message, txHash: error.txHash || null });
}
async function handle(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && pathname === '/api/status') {
    return json(res, 200, { mode: LIVE ? 'LIVE' : 'DEMO', chain: LIVE ? process.env.GENLAYER_NETWORK || 'studionet' : null, partner: 'OpenServ', fixtureCount: Object.keys(scenarios).length });
  }
  if (req.method === 'GET' && pathname === '/api/scenarios') return json(res, 200, scenarios);
  if (req.method === 'POST' && pathname === '/api/cases') {
    try {
      const input = validateCase(await body(req));
      const id = `sj_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
      const record = { id, ...input, state: 'FILED', verdict: null, reason: null, txHash: null, auditMode: LIVE ? 'GENLAYER' : 'FIXTURE' };
      if (LIVE) {
        const { fileLiveCase } = await import('../src/genlayer.mjs');
        const filed = await fileLiveCase(id, input);
        record.txHash = filed.txHash;
      }
      cases.set(id, record);
      return json(res, 201, record);
    } catch (error) { return errorJson(res, error); }
  }
  const found = pathname.match(/^\/api\/cases\/(sj_[a-z0-9]+)(?:\/(judge))?$/);
  if (found) {
    const [, id, action] = found;
    let record = cases.get(id);
    if (!record && LIVE) {
      try {
        const { readLiveCase } = await import('../src/genlayer.mjs');
        const chainCase = await readLiveCase(id);
        record = { id, ...chainCase, state: chainCase.status, auditMode: 'GENLAYER' };
      } catch { return json(res, 404, { error: 'Case not found; check case ID and contract' }); }
    }
    if (!record) return json(res, 404, { error: 'Case not found' });
    if (req.method === 'GET' && !action) {
      if (LIVE) {
        try {
          const { readLiveCase } = await import('../src/genlayer.mjs');
          const state = await readLiveCase(id);
          record = { ...record, state: state.status, verdict: state.verdict, reason: state.reason };
          cases.set(id, record);
        } catch (error) { return errorJson(res, error); }
      }
      return json(res, 200, record);
    }
    if (req.method === 'POST' && action === 'judge') {
      if (record.state !== 'FILED' || record.judging) return json(res, 409, { error: 'Case is already resolved or judging' });
      record.judging = true;
      cases.set(id, record);
      try {
        if (LIVE) {
          const { judgeLiveCase } = await import('../src/genlayer.mjs');
          const judged = await judgeLiveCase(id);
          record = { ...record, state: judged.case.status, verdict: judged.case.verdict, reason: judged.case.reason, txHash: judged.txHash };
        } else {
          const judged = demoDecision(record);
          record = { ...record, state: 'DECIDED', verdict: judged.verdict, reason: judged.reason };
        }
        cases.set(id, record);
        return json(res, 200, record);
      } catch (error) {
        record.judging = false;
        record.lastTxHash = error.txHash || record.lastTxHash;
        cases.set(id, record);
        return errorJson(res, error);
      }
    }
  }
  if (req.method === 'GET') {
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const absolute = resolve(ROOT, file);
    if (absolute !== ROOT && !absolute.startsWith(ROOT + '/')) return json(res, 403, { error: 'Forbidden' });
    try {
      const content = await readFile(absolute);
      res.writeHead(200, { 'Content-Type': mime[extname(absolute)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      return res.end(content);
    } catch { return json(res, 404, { error: 'Not found' }); }
  }
  return json(res, 405, { error: 'Method not allowed' });
}
const server = http.createServer((req,res) => handle(req,res).catch(e=>errorJson(res,e)));
server.listen(PORT, HOST, ()=>console.log(`SERVJURY ${LIVE ? 'LIVE (signing enabled)' : 'DEMO (no-chain)'} on http://${HOST}:${PORT}`));
