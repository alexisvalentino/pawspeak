import test from 'node:test';
import assert from 'node:assert/strict';
import { requestCameraStream } from './cameraPermission';

test('camera permission uses a video-only request and returns the live stream', async () => {
  const stream = { getTracks: () => [] } as unknown as MediaStream;
  let requested: MediaStreamConstraints | undefined;

  const result = await requestCameraStream({
    getUserMedia: async constraints => { requested = constraints; return stream; },
  }, true);

  assert.deepEqual(result, { status: 'granted', stream });
  assert.deepEqual(requested, {
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 720 } },
    audio: false,
  });
});

test('camera permission denial returns a human-readable recovery message', async () => {
  const result = await requestCameraStream({
    getUserMedia: async () => { throw { name: 'NotAllowedError' }; },
  }, true);

  assert.equal(result.status, 'error');
  if (result.status === 'error') {
    assert.match(result.message, /Camera access is blocked/);
    assert.match(result.message, /upload a pet photo instead/);
  }
});

test('camera permission explains when the browser API is unavailable on an insecure page', async () => {
  const result = await requestCameraStream(undefined, false);

  assert.deepEqual(result, {
    status: 'error',
    message: 'Camera access needs a secure address (HTTPS). Open PawSpeak over HTTPS, or upload a pet photo.',
  });
});
