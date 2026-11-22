// ── A browser to check the app in ────────────────────────────────────────────
// Serves the repo on a local port, starts a headless Chrome and hands back a
// page that can be driven over the DevTools protocol. Nothing to install: node 22
// (built-in WebSocket and fetch) and a Chrome on the machine.
//   import { withPage } from './harness.mjs';
//   await withPage(async page => { await page.eval(`openPathScreen()`); … });
// Set CHROME to the browser's path if it is not in the usual place.

import fs from 'fs';
import os from 'os';
import http from 'http';
import path from 'path';
import { spawn } from 'child_process';

// APP_ROOT lets the same harness serve another app (the Ukrainian course next door).
const ROOT = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => fs.existsSync(p));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function startChrome() {
  if (!CHROME) throw new Error('No Chrome found: set CHROME to its path');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dutch-app-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--disk-cache-size=1', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  // Chrome prints the address of its DevTools socket on stderr.
  const port = await new Promise((resolve, reject) => {
    let buf = '';
    proc.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//); if (m) resolve(Number(m[1])); });
    proc.on('exit', () => reject(new Error('Chrome exited: ' + buf.slice(-300))));
    setTimeout(() => reject(new Error('Chrome did not start')), 15000);
  });
  return { proc, port, profile };
}

// width × height in CSS pixels; mobile: emulate a phone (touch, mobile viewport)
export async function withPage(fn, { width = 390, height = 844, mobile = true } = {}) {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const chrome = await startChrome();
  try {
    const tab = await (await fetch(`http://127.0.0.1:${chrome.port}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map(), errors = [], dialogs = [];
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
      // With the Page events on, Chrome leaves every alert, confirm and prompt to us, and the page
      // waits until we answer: without an answer it waits for ever. Close it the safe way (OK on an
      // alert, Cancel on a question) and write it down.
      else if (d.method === 'Page.javascriptDialogOpening') {
        dialogs.push(`${d.params.type}: ${d.params.message}`);
        send('Page.handleJavaScriptDialog', { accept: d.params.type === 'alert' || d.params.type === 'beforeunload' }).catch(() => {});
      }
      else if (d.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
      else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map(a => a.value ?? a.description).join(' '));
      else if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push('log: ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
    };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });
    const page = {
      base, errors, dialogs, sleep, send,
      async goto(url = base) { await send('Page.navigate', { url }); await sleep(700); },
      // The snippet is the body of an async function: use return, and await freely.
      // A page that has not answered after `minutes` is stuck: the test stops instead of waiting for ever.
      async eval(body, { minutes = 10 } = {}) {
        let timer;
        const stuck = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`the page did not answer for ${minutes} minutes`)), minutes * 60e3); });
        try {
          const r = await Promise.race([send('Runtime.evaluate', { expression: `(async () => { ${body} })()`, awaitPromise: true, returnByValue: true }), stuck]);
          if (r.exceptionDetails) throw new Error('in the page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
          return r.result.value;
        } finally { clearTimeout(timer); }
      },
      async shot(file, { full = false } = {}) {
        let clip;
        if (full) { const m = await send('Page.getLayoutMetrics'); clip = { x: 0, y: 0, width: m.cssContentSize.width, height: Math.min(m.cssContentSize.height, 8000), scale: 1 }; }
        const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}) });
        fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      },
      // A clean start: the app's own stored data removed, the page loaded again.
      async reset() { await page.goto(); await page.eval(`for (const k of Object.keys(localStorage)) if (k.startsWith('dutch.') || !process.env.APP_ROOT) localStorage.removeItem(k);`.replace('!process.env.APP_ROOT', process.env.APP_ROOT ? 'true' : 'false')); await page.goto(); },
    };
    await page.reset();
    return await fn(page);
  } finally {
    chrome.proc.kill();
    server.close();
    await sleep(200);
    fs.rmSync(chrome.profile, { recursive: true, force: true });
  }
}
