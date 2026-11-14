import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraApiUnavailableMessage, cameraStartErrorMessage, detectorErrorDetails, petDetectorErrorMessage } from './cameraMessages';

test('camera API absence explains insecure origins and provides a photo fallback', () => {
  assert.match(cameraApiUnavailableMessage(false), /HTTPS/i);
  assert.match(cameraApiUnavailableMessage(false), /upload a pet photo/i);
  assert.match(cameraApiUnavailableMessage(true), /browser/i);
});

test('opening the dev server from a phone over a LAN address explains why the camera is blocked', () => {
  for (const host of ['10.77.77.33', '192.168.1.20', '172.21.240.1', 'my-pc.local']) {
    const message = cameraApiUnavailableMessage(false, host);
    assert.match(message, /HTTPS/);
    assert.match(message, /network address/i, host);
    assert.match(message, /upload a pet photo/i);
  }
  assert.doesNotMatch(cameraApiUnavailableMessage(false, 'example.com'), /network address/i);
});

test('permission errors explain recovery without exposing platform error names', () => {
  const message = cameraStartErrorMessage({ name: 'NotAllowedError' });
  assert.match(message, /camera access/i);
  assert.match(message, /settings/i);
  assert.match(message, /upload a pet photo/i);
  assert.doesNotMatch(message, /NotAllowedError/);
});

test('missing and busy cameras have distinct next steps', () => {
  assert.match(cameraStartErrorMessage({ name: 'NotFoundError' }), /could not find a camera/i);
  assert.match(cameraStartErrorMessage({ name: 'NotReadableError' }), /close other camera apps/i);
});

test('pet detector recovery copy does not imply a bundled model needs internet', () => {
  assert.match(petDetectorErrorMessage(), /camera is still on/i);
  assert.doesNotMatch(petDetectorErrorMessage(), /internet connection|reconnect/i);
  assert.match(petDetectorErrorMessage(), /pet finder could not start/i);
});

test('detector diagnostics retain the error name and message without a stack', () => {
  const error = new TypeError('Model weights could not load');
  error.stack = 'TypeError: Model weights could not load\n    at private/path.js:2';
  assert.equal(detectorErrorDetails(error), 'TypeError: Model weights could not load');
  assert.equal(detectorErrorDetails({ name: 'FetchError', message: 'Request failed' }), 'FetchError: Request failed');
  assert.equal(detectorErrorDetails({ message: 'x'.repeat(500) }).length, 240);
});
