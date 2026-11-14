import { spawnSync } from 'node:child_process';
import { readFileSync, openSync, closeSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const session = process.env.QA_SESSION || 'pawspeak-mvp';
const executable = join(process.env.APPDATA, 'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const directory = mkdtempSync(join(tmpdir(), 'pawspeak-offline-qa-'));
const outputPath = join(directory, 'browser-output.txt');

function browser(...args) {
  const fd = openSync(outputPath, 'w');
  const result = spawnSync(executable, ['--session', session, ...args.map(String)], {
    stdio: ['ignore', fd, fd], timeout: 30000,
  });
  closeSync(fd);
  const output = readFileSync(outputPath, 'utf8');
  assert.equal(result.status, 0, `${args.join(' ')}\n${output}`);
  return output;
}

try {
  browser('set', 'offline', 'on');
  const name = `pawspeak-app-shell-qa-${Date.now()}`;
  const asset = `/assets/qa-previous-${Date.now()}.js`;
  const source = `(async()=>{const cache=await caches.open(${JSON.stringify(name)});await cache.put(${JSON.stringify(asset)},new Response('previous app chunk'));try{const response=await fetch(${JSON.stringify(asset)});const body=await response.text();return JSON.stringify({ok:response.status===200&&body==='previous app chunk',status:response.status,body})}catch(error){return JSON.stringify({ok:false,error:String(error)})}finally{await caches.delete(${JSON.stringify(name)})}})()`;
  const payload = JSON.parse(browser('eval', '-b', Buffer.from(source).toString('base64'), '--json'));
  assert.ok(payload.success, payload.error);
  const result = JSON.parse(payload.data.result);
  assert.deepEqual(result, { ok: true, status: 200, body: 'previous app chunk' });
  console.log('PASS: old app chunks remain available while a new offline shell takes control');
} finally {
  browser('set', 'offline', 'off');
  unlinkSync(outputPath);
  rmdirSync(directory);
}
