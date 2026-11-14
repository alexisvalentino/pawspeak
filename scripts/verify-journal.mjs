import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, openSync, closeSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const session = process.env.QA_SESSION || 'pawspeak-journal-regression';
const phase = process.argv[2] || 'layout';
const directory = join(import.meta.dirname, '../docs/qa/journal-20261111');
mkdirSync(directory, { recursive: true });
const executable = join(process.env.APPDATA, 'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const checks = [];
function browser(...args) {
  const path = join(directory, `last-command-${phase}.txt`);
  const fd = openSync(path, 'w');
  const result = spawnSync(executable, ['--session', session, ...args.map(String)], { stdio: ['ignore', fd, fd], timeout: 20000 });
  closeSync(fd);
  const output = readFileSync(path, 'utf8');
  assert.equal(result.status, 0, `${args.join(' ')}\n${output}\n${result.error || ''}`);
  return output;
}
function evaluate(source) {
  const result = JSON.parse(browser('eval', '-b', Buffer.from(source).toString('base64'), '--json'));
  assert.ok(result.success, result.error);
  return result.data.result;
}
function check(name, actual, expected = true) { assert.deepEqual(actual, expected, name); checks.push({ name, actual, status: 'PASS' }); console.log(`PASS: ${name}`); }
function click(name) { browser('snapshot', '-i'); browser('find', 'role', 'button', 'click', '--name', name, '--exact'); }
const state = () => evaluate('JSON.parse(localStorage.getItem("pawspeak.journal.v2"))');
function fill(label, value) { browser('find', 'label', label, 'fill', value); }
function setCue(label, checked) {
  browser('find','role','checkbox','click','--name',label,'--exact');
  assert.equal(evaluate(`[...document.querySelectorAll('.cue-option input')].find(e=>e.getAttribute('aria-label') === ${JSON.stringify(label)})?.checked`), checked, 'cue checkbox reflects input');
}
function startObservation() {
  click('Journal');
  if (evaluate('document.body.innerText.includes("New observation")')) click('New observation');
}
function saveObservation() {
  browser('find', 'label', 'Observed: Relaxed, loose body', 'check');
  browser('find', 'label', 'Observed: Play bow: front down, rear up', 'check');
  fill('Activity', 'Playing with a familiar toy'); fill('Setting', 'Living room');
  fill('Who or what was nearby? (optional)', 'Guardian and another dog'); fill('What happened just before? (optional)', 'Toy presented');
  fill('What happened, in order?', 'Milo lowered his front legs, looked at the toy, then bounced back toward it.');
  click('Save observation');
}
try {
  if (phase === 'fresh') {
    browser('open', process.env.QA_URL || 'http://localhost:3000'); browser('set', 'viewport', 390, 844);
    check('fresh install has no fabricated profiles', state().dogs.length, 0);
    check('fresh install has no fabricated observations', state().observations.length, 0);
    check('translation and game UI absent', evaluate('!document.body.innerText.includes("Soundboard") && !document.body.innerText.includes("XP") && !document.body.innerText.includes("Translate")'));
    click('Journal');
    check('example journal is not offered', evaluate('!document.body.innerText.includes("View an example journal")'));
    check('empty journal offers real profile creation', evaluate('document.body.innerText.includes("Add your first dog")'));
  }
  if (phase === 'profile') {
    click('Journal');
    click('Add your first dog'); fill("Dog's name", 'Scout'); fill('Breed or mix (optional)', 'Border collie');
    click('Add dog and continue'); check('new dog becomes active', state().activeDogId, state().dogs[0].id);
    click('Pets'); click('Edit profile'); fill("Dog's name", 'Scoutie'); click('Save profile changes');
    check('profile edits persist in state', state().dogs[0].name, 'Scoutie');
  }
  if (phase === 'validation') {
    const originalCount = state().observations.length;
    if (!evaluate('document.body.innerText.includes("What did you notice about")')) startObservation();
    const initialCount = state().observations.length;
    if (initialCount !== originalCount) { click('Journal'); click('New observation'); }
    fill('Activity', 'Quiet rest'); fill('Setting', 'Living room'); fill('What happened, in order?', 'Dog was resting quietly.');
    check('observation remains blank before first save', evaluate('[...document.querySelectorAll(".cue-option input")].every(e=>!e.checked)'));
    click('Save observation'); browser('wait', '--text', 'Choose at least one observable cue.');
    check('blank cue selection is rejected', state().observations.length, initialCount);
    browser('find', 'role', 'checkbox', 'check', '--name', 'Observed: Relaxed, loose body', '--exact');
    fill('Activity', ' '); fill('Setting', ' '); fill('What happened, in order?', ' ');
    click('Save observation'); browser('wait', '--text', 'Add the activity and setting');
    check('required context is explained', evaluate('document.body.innerText.includes("Add the activity and setting")'));
    check('unsupported species controls absent', evaluate('!document.body.innerText.includes("Cat / Kitten") && !document.body.innerText.includes("Bird / Parrot")'));
    check('no media permission is requested before consent', evaluate('!!document.querySelector("input[type=file]:disabled")'));
    browser('find', 'first', '.consent-row input', 'check');
    check('consent enables file selection', evaluate('!document.querySelector("input[type=file]").disabled'));
    browser('find', 'first', '.consent-row input', 'check');
  }
  if (phase === 'journal') {
    const originalCount = state().observations.length;
    if (!evaluate('document.body.innerText.includes("What did you notice about")')) startObservation();
    saveObservation();
    check('observation persisted for active dog', state().observations[0].petId, state().activeDogId);
    check('cue-based suggestion stored without fake model claim', state().observations[0].interpretation.includes('playful invitation'));
    click('View observation'); click('Edit observation'); fill('Setting', 'Garden'); click('Save changes');
    check('edit updates rather than duplicates', state().observations.length, originalCount + 1);
    check('edited context saved', state().observations[0].context.environment, 'Garden');
    browser('open', 'http://localhost:3000');
    click('Journal');
    check('saved journal survives reload', evaluate('document.body.innerText.includes("Garden")'));
    click('View observation'); click('Delete'); click('Delete permanently');
    check('delete requires confirmation and removes entry', state().observations.length, originalCount);
  }
  if (phase === 'export') {
    if (state().dogs.length === 0) { click('Journal'); click('Add your first dog'); fill("Dog's name", 'Scoutie'); click('Add dog and continue'); saveObservation(); }
    if (state().observations.length === 0) { startObservation(); saveObservation(); }
    click('Open journal settings');
    browser('snapshot','-i'); browser('find','role','button','click','--name','Export journal (JSON)','--exact');
    browser('snapshot','-i');
    const downloadUrl = evaluate(`(()=>{const original=HTMLAnchorElement.prototype.click;let url='';HTMLAnchorElement.prototype.click=function(){url=this.href};document.querySelector('button.button-primary').click();HTMLAnchorElement.prototype.click=original;return url})()`);
    check('export creates a JSON data URL', downloadUrl.startsWith('data:application/json;charset=utf-8,'));
    const exported = JSON.parse(decodeURIComponent(downloadUrl.split(',')[1]));
    writeFileSync(join(directory,'exported-journal.json'),JSON.stringify(exported,null,2));
    check('downloaded export is valid JSON', exported.product, 'PawSpeak');
    check('downloaded export includes current profile', exported.dogs.some(d=>d.id===state().activeDogId));
    check('downloaded export contains no raw media', !JSON.stringify(exported).includes('blob:'));
    click('Open journal settings'); click('Clear local data'); click('Delete all data');
    check('clear data empties profile and observations', [state().dogs.length, state().observations.length], [0,0]);
    browser('open', 'http://localhost:3000');
    check('clear survives reload', state().dogs.length, 0);
  }
  if (phase === 'media') {
    if (!evaluate('document.body.innerText.includes("What did you notice about")')) startObservation();
    browser('find', 'role', 'checkbox', 'check', '--name', 'I consent to loading this clip in this browser for preview. It will not be uploaded or saved with this observation.', '--exact');
    browser('upload', 'input[type=file]', join(directory,'too-long.wav'));
    browser('wait', '--text', 'Choose a clip no longer than 15 seconds.');
    check('16-second media rejected', evaluate('document.body.innerText.includes("Choose a clip no longer than 15 seconds.")'));
    browser('upload', 'input[type=file]', join(directory,'test-tone.wav'));
    browser('wait', '--text', 'test-tone.wav');
    check('valid media preview rendered', evaluate('!!document.querySelector("audio")'));
    saveObservation();
    check('media consent and reference stored, not raw media', [state().observations[0].mediaConsent, state().observations[0].hasMedia, !!state().observations[0].file], [true,true,false]);
    browser('open', 'http://localhost:3000'); click('Journal'); click('View observation');
    check('media limitation survives reload', evaluate('document.body.innerText.includes("The clip itself is not stored")'));
    click('Close observation'); click('Pets'); click('Add dog');
    fill("Dog's name", 'Second dog'); click('Add dog and continue'); click('Pets');
    browser('find', 'first', 'article button.button-secondary', 'click'); fill("Dog's name", 'Milo edited'); click('Save profile changes');
    check('editing a profile does not change active dog', state().dogs.find(d=>d.id===state().activeDogId).name, 'Second dog');
    click('Delete'); click('Delete dog and journal');
    check('deleted profile and its observations are removed', [state().dogs.length, state().observations.length, state().observations.every(o=>o.petId!==state().dogs[0]?.id)], [1,0,true]);
    browser('open', 'http://localhost:3000');
    check('profile and record deletion survives reload', [state().dogs.length, state().observations.length], [1,0]);
  }
  if (phase === 'layout') {
    const width = Number(process.argv[3] || 390); const height = { 320:568,390:844,768:1024,1024:768 }[width];
    browser('set', 'viewport', width, height);
    if (state().dogs.length === 0) { click('Journal'); click('Add your first dog'); fill("Dog's name", 'Scout'); click('Add dog and continue'); }
    for (const tab of ['Camera','Learn','Journal','Pets']) {
      click(tab);
      const layout = evaluate('({w:innerWidth,scrollWidth:document.documentElement.scrollWidth,header:document.querySelectorAll("header button").length,small:[...document.querySelectorAll("button")].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.width<43.9||r.height<43.9)}).length})');
      check(`${width}x${height} ${tab} layout`, layout, { w:width, scrollWidth:width, header:3, small:0 });
    }
    browser('screenshot', join(directory, `${width}-${process.argv[3]}-layout.png`));
  }
  if (phase === 'cleanup') { writeFileSync(join(directory,'browser-errors.txt'),browser('errors')); writeFileSync(join(directory,'browser-network.txt'),browser('network','requests')); browser('close'); }
} finally { writeFileSync(join(directory, `checks-${phase}-${process.argv[3] || 'flow'}.json`), JSON.stringify(checks,null,2)); }