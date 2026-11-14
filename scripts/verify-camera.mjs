import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, openSync, closeSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const session = process.env.QA_SESSION || 'pawspeak-camera-layout';
const directory = join(import.meta.dirname, '../docs/qa/camera-20261112');
mkdirSync(directory, { recursive: true });
const executable = join(process.env.APPDATA, 'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const checks = [];
function browser(...args) {
  const path = join(directory, 'last-layout-command.txt');
  const fd = openSync(path, 'w');
  const result = spawnSync(executable, ['--session', session, ...args.map(String)], { stdio: ['ignore', fd, fd], timeout: 20000 });
  closeSync(fd);
  const output = readFileSync(path, 'utf8');
  assert.equal(result.status, 0, `${args.join(' ')}\n${output}`);
  return output;
}
function evaluate(source) {
  const result = JSON.parse(browser('eval', '-b', Buffer.from(source).toString('base64'), '--json'));
  assert.ok(result.success, result.error);
  return result.data.result;
}
function check(name, actual, expected = true) {
  assert.deepEqual(actual, expected, name);
  checks.push({ name, actual, status: 'PASS' });
  console.log(`PASS: ${name}`);
}
function click(name) { browser('snapshot', '-i'); browser('find', 'role', 'button', 'click', '--name', name, '--exact'); }
try {
  browser('open', 'http://localhost:3000');
  click('Learn');
  click('Cats');
  check('cat dictionary includes species-specific cue', evaluate('document.querySelector("main").innerText.includes("Slow blink")'));
  browser('find', 'role', 'searchbox', 'fill', 'tail', '--name', 'Search body language');
  check('search filters cat cues', evaluate('document.querySelector("main").innerText.includes("Tail lashing") && !document.querySelector("main").innerText.includes("Loaf posture")'));
  browser('find', 'role', 'searchbox', 'click', '--name', 'Search body language');
  browser('press', 'Control+A'); browser('press', 'Delete');
  browser('find', 'role', 'button', 'click', '--name', 'Slow blink Often a relaxed, non-threatening signal during calm interaction.', '--exact');
  check('dictionary cue opens details', evaluate('document.querySelector("dialog").innerText.includes("What you may notice")'));
  click('Close cue details');
  for (const [width, height] of [[320,568],[390,844],[768,1024],[1024,768]]) {
    browser('set', 'viewport', width, height);
    for (const tab of ['Camera','Learn','Journal','Pets']) {
      click(tab);
      const actual = evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,header:document.querySelectorAll("header button").length,small:[...document.querySelectorAll("button")].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.width<43.9||r.height<43.9)}).length})');
      check(`${width}x${height} ${tab} layout`, actual, { width, scrollWidth:width, header:3, small:0 });
    }
    click('Camera');
    if (width === 320) {
      const visible = evaluate('(()=>{const b=[...document.querySelectorAll("button")].find(e=>e.textContent.includes("Start camera")).getBoundingClientRect();const nav=document.querySelector("nav").getBoundingClientRect();return b.bottom<=nav.top})()');
      check('320px primary camera action clears bottom navigation', visible);
    }
    browser('screenshot', join(directory, `layout-${width}.png`));
  }
  writeFileSync(join(directory, 'browser-errors.txt'), browser('errors'));
} finally {
  writeFileSync(join(directory, 'layout-checks.json'), JSON.stringify(checks, null, 2));
  browser('close');
}
