import {spawnSync} from 'node:child_process';
import {closeSync, mkdirSync, openSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const session = process.env.QA_SESSION ?? 'pawspeak-camera-flow-20261113';
const outputDir = path.join(projectRoot, 'docs', 'qa', 'camera-20261113');
const sampleDog = path.join(projectRoot, 'docs', 'qa', 'camera-20261112', 'dog-test.jpg');
const executable = path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'agent-browser', 'bin', 'agent-browser-win32-x64.exe');
mkdirSync(outputDir, {recursive: true});

const checks = [];
let browserOpened = false;
writeFileSync(path.join(outputDir, 'camera-flow-command-log.txt'), '');
function browser(...args) {
  const outputPath = path.join(outputDir, 'camera-flow-command-log.txt');
  const fd = openSync(outputPath, 'a');
  const result = spawnSync(executable, ['--session', session, ...args.map(String)], {stdio: ['ignore', fd, fd], timeout: 120000});
  closeSync(fd);
  const output = readFileSync(outputPath, 'utf8');
  assert.equal(result.status, 0, `${args.join(' ')}\n${output}`);
  return output;
}
function evaluate(source) {
  const output = browser('eval', '-b', Buffer.from(source).toString('base64'), '--json');
  const jsonStart = output.indexOf('{"success":');
  assert.notEqual(jsonStart, -1, `browser eval did not return JSON:\n${output}`);
  const response = JSON.parse(output.slice(jsonStart));
  assert.ok(response.success, response.error);
  return response.data.result;
}
function check(name, actual, expected = true) {
  assert.deepEqual(actual, expected, name);
  checks.push({name, actual, status: 'PASS'});
  console.log(`PASS: ${name}`);
}
function click(name) {
  browser('snapshot', '-i');
  browser('find', 'role', 'button', 'click', '--name', name, '--exact');
}

try {
  browser('open', 'http://localhost:4173');
  browserOpened = true;
  browser('set', 'viewport', 320, 568);
  browser('wait', '--fn', `document.body.innerText.includes('No pet profile needed')`);
  const idleState = evaluate(`({profile:document.querySelector('.pet-picker-name')?.textContent.trim(),camera:!![...document.querySelectorAll('button')].find(button=>button.textContent.includes('Start camera')),note:document.body.innerText.includes('No pet profile needed'),overflow:document.documentElement.scrollWidth>innerWidth})`);
  check('camera screen is ready without a pet profile', idleState, {profile: 'Choose dog', camera: true, note: true, overflow: false});
  if (process.env.QA_SCREENSHOTS === '1') browser('screenshot', path.join(outputDir, 'idle-no-profile-320.png'));
  browser('set', 'viewport', 390, 844);

  const dogFrame = await sharp(sampleDog).resize({width: 240}).jpeg({quality: 45}).toBuffer();
  const dataUrl = `data:image/jpeg;base64,${dogFrame.toString('base64')}`;
  const fileUpload = `(()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(dataUrl.slice('data:image/jpeg;base64,'.length))}),char=>char.charCodeAt(0));const file=new File([bytes],'dog-test.jpg',{type:'image/jpeg'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('#pet-photo');input.files=transfer.files;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return {name:input.files[0]?.name,type:input.files[0]?.type}})()`;
  check('sample photo is supplied through the photo input', evaluate(fileUpload), {name: 'dog-test.jpg', type: 'image/jpeg'});
  browser('wait', '--fn', `document.body.innerText.includes('Dog detected')`);
  check('dog photo detects without creating a profile', evaluate(`document.body.innerText.includes('Dog detected') && document.querySelector('.pet-picker-name')?.textContent.trim()==='Choose dog'`));
  check('detector does not claim emotion or posture', evaluate(`document.body.innerText.includes('Behavior reading not available yet')`));
  if (process.env.QA_SCREENSHOTS === '1') browser('screenshot', path.join(outputDir, 'dog-result-no-profile.png'));
  click('Explore dog body language');
  check('dictionary opens from detection without a profile', evaluate(`document.querySelector('main')?.innerText.includes('Learn their little language')`));

  click('PawSpeak home');
  const streamSetup = `(()=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;canvas.getContext('2d').drawImage(image,0,0,320,240);window.qaStream=canvas.captureStream(6);Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>window.qaStream});resolve(true)};image.onerror=reject;image.src=${JSON.stringify(dataUrl)}}))()`;
  check('synthetic live stream initialized', await evaluate(streamSetup));
  click('Start camera');
  browser('wait', '--fn', `document.querySelector('.camera-live-label')?.textContent.includes('Live preview')`);
  browser('wait', '--fn', `document.body.innerText.includes('tracking pets') || document.body.innerText.includes('tracking unavailable')`);
  check('camera opens a live preview and reports tracking state', evaluate(`document.querySelector('video.camera-video')?.srcObject?.active===true && /Live preview/.test(document.querySelector('.camera-live-label')?.textContent??'')`));
  check('live stream tracks the pet in the frame', evaluate(`document.querySelector('.live-pet-label')?.textContent.startsWith('Dog ·')`));
  if (process.env.QA_SCREENSHOTS === '1') browser('screenshot', path.join(outputDir, 'live-tracking-no-profile.png'));
  click('Capture pet');
  browser('wait', '--fn', `document.body.innerText.includes('Dog detected')`);
  check('capture produces a detailed detection and stops the camera', evaluate(`document.body.innerText.includes('Dog detected') && window.qaStream.getTracks().every(track=>track.readyState==='ended')`));
  if (process.env.QA_SCREENSHOTS === '1') browser('screenshot', path.join(outputDir, 'capture-result-no-profile.png'));

  click('Try another photo');
  evaluate(`Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{throw new DOMException('permission denied','NotAllowedError')}})`);
  click('Start camera');
  browser('wait', '--fn', `document.body.innerText.includes('Camera access is blocked')`);
  check('camera permission denial shows recovery and photo fallback', evaluate(`document.body.innerText.includes('Camera access is blocked') && !!document.querySelector('label[for="pet-photo"]')`));
  if (process.env.QA_SCREENSHOTS === '1') browser('screenshot', path.join(outputDir, 'camera-permission-error.png'));
  check('browser reports no unhandled page errors', browser('errors').trim() === '');
} finally {
  writeFileSync(path.join(outputDir, 'camera-flow-checks.json'), JSON.stringify(checks, null, 2));
  if (browserOpened) browser('close');
}
