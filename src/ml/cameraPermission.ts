import { cameraApiUnavailableMessage, cameraStartErrorMessage } from './cameraMessages';

export interface CameraMediaDevices {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
}

export type CameraStreamRequest =
  | { status: 'granted'; stream: MediaStream }
  | { status: 'error'; message: string };

/** Call directly from a user action so browsers and native WebViews can show their system prompt. */
export async function requestCameraStream(
  mediaDevices: CameraMediaDevices | undefined,
  isSecureContext: boolean,
  facing: 'environment' | 'user' = 'environment',
  hostname = globalThis.location?.hostname ?? '',
): Promise<CameraStreamRequest> {
  if (!mediaDevices?.getUserMedia) {
    return { status: 'error', message: cameraApiUnavailableMessage(isSecureContext, hostname) };
  }

  try {
    const stream = await mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 960 }, height: { ideal: 720 } },
      audio: false,
    });
    return { status: 'granted', stream };
  } catch (error) {
    return { status: 'error', message: cameraStartErrorMessage(error) };
  }
}
