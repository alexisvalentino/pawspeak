import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, openSync, closeSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const session = process.env.QA_SESSION || 'pawspeak-camera-lifecycle';
const directory = join(import.meta.dirname, '../docs/qa/e2e-20261112');
mkdirSync(directory, { recursive: true });
const executable = join(process.env.APPDATA, 'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const checks = [];
function browser(...args) {
  const path = join(directory, 'last-lifecycle-command.txt');
  const fd = openSync(path, 'w');
  const result = spawnSync(executable, ['--session', session, ...args.map(String)], { stdio: ['ignore', fd, fd], timeout: 20000 });
  closeSync(fd);
  const output = readFileSync(path, 'utf8');
  assert.equal(result.status, 0, `${args.join(' ')}\n${output}`);
  return output;
}
function evaluate(source) {
  const response = JSON.parse(browser('eval', '-b', Buffer.from(source).toString('base64'), '--json'));
  assert.ok(response.success, response.error);
  return response.data.result;
}
function check(name, actual, expected = true) { assert.deepEqual(actual, expected, name); checks.push({ name, actual, status: 'PASS' }); console.log(`PASS: ${name}`); }
function click(name) { browser('snapshot', '-i'); browser('find', 'role', 'button', 'click', '--name', name, '--exact'); }
const createStream = `(()=>{const c=document.createElement('canvas');c.width=320;c.height=240;const context=c.getContext('2d');context.fillStyle='#38bdf8';context.fillRect(0,0,320,240);window.qaStream=c.captureStream(5);return true})()`;
const pendingPermission = `Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>new Promise(resolve=>{window.qaResolve=()=>resolve(window.qaStream)})})`;
const immediatePermission = `Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>window.qaStream})`;
try {
  browser('open', 'http://localhost:3000');
  evaluate(createStream); evaluate(pendingPermission);
  evaluate(`window.qaHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.qaHidden})`);
  click('Start camera');
  evaluate(`window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));window.qaResolve()`);
  browser('wait', '--fn', `window.qaStream.getTracks().every(track=>track.readyState==='ended')`);
  check('late camera grant after page hide releases every track', evaluate(`window.qaStream.getTracks().every(track=>track.readyState==='ended')`));
  check('late camera grant does not reactivate camera UI', evaluate(`!document.body.innerText.includes('Camera is on')`));

  browser('open', 'http://localhost:3000'); evaluate(createStream); evaluate(immediatePermission);
  click('Start camera'); browser('wait', '--text', 'Camera is on');
  click('Open journal settings');
  check('opening settings suspends all camera tracks', evaluate(`window.qaStream.getTracks().every(track=>track.readyState==='ended')`));
  check('settings remains usable after suspension', evaluate(`!!document.querySelector('dialog[open]')`));
  browser('press', 'Escape');

  browser('open', 'http://localhost:3000'); evaluate(createStream); evaluate(pendingPermission);
  click('Start camera'); click('Learn'); evaluate('window.qaResolve()');
  browser('wait', '--fn', `window.qaStream.getTracks().every(track=>track.readyState==='ended')`);
  check('permission granted after navigation releases tracks', evaluate(`window.qaStream.getTracks().every(track=>track.readyState==='ended')`));
  writeFileSync(join(directory, 'camera-lifecycle-checks.json'), JSON.stringify(checks, null, 2));
} finally { browser('close'); }
